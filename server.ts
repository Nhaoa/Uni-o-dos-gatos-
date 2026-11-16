import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { applyChessMove, createInitialChessState } from './src/logic/chess.ts';
import { applyCheckersMove, createInitialCheckersState } from './src/logic/checkers.ts';
import { checkTicTacToeResult, resolveJokenpoWinner } from './src/logic/minigames.ts';
import { applyRealisticCatDecay } from './src/logic/decay.ts';
import { resolveRoleByNickAndMembers, validateNicknameChange } from './src/logic/authMatch.ts';
import {
  applyAchievementEvent,
  mergePlayerStats,
  mergeUnlockedMaps,
} from './src/logic/achievements.ts';
import { createDefaultAchievementStats, createDefaultSudokuOnlineState } from './src/logic/defaultState.ts';
import { computeSudokuReward, generateSudokuPuzzle } from './src/logic/sudoku.ts';
import { sanitizeGalleryItems } from './src/logic/gallery.ts';
import {
  applyAdminFishEdit,
  applyAdminFullHack,
  isAdminAccount,
  parseAdminFishAmount,
} from './src/logic/adminHack.ts';
import {
  applyScoreOutcome,
  isValidMatchScoreOutcome,
  normalizeScores,
} from './src/logic/scores.ts';
import {
  fetchRoomFromAppFirestore,
  getOrSeedRoom,
  saveRoomState,
  updateRoomPassword,
  verifyRoomAccess,
} from './src/db/rooms.ts';
import { getOrCreateUser, getRoomMembers, upsertRoomMembership } from './src/db/users.ts';
import { AuthRequest, requireAuth } from './src/middleware/auth.ts';
import { adminAuth } from './src/lib/firebase-admin.ts';
import {
  PlayerActiveGameStatus,
  PlayerRole,
  SharedState,
  SudokuDifficulty,
  SudokuOnlineRoomState,
  SudokuSize,
} from './src/types/game.ts';

const PORT = Number(process.env.PORT || 3000);
const DEFAULT_ROOM_ID = 'ninho_de_amor_fixo';

interface RoomEntry {
  state: SharedState;
  hasPassword: boolean;
}

interface ClientMeta {
  ws: WebSocket;
  roomId: string;
  role: PlayerRole;
  uid: string;
  activeGames: Set<string>;
  currentGame: PlayerActiveGameStatus | null;
}

const rooms = new Map<string, RoomEntry>();
const roomLoads = new Map<string, Promise<RoomEntry>>();
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const roomClients = new Map<string, Set<ClientMeta>>();
const reactionTimers = new Map<string, ReturnType<typeof setTimeout>>();
const reactionReadyAt = new Map<string, number>();
const airHockeyIntervals = new Map<string, ReturnType<typeof setInterval>>();

function ensureAchievementFields(state: SharedState) {
  if (!state.achievements) {
    state.achievements = { cat1: {}, cat2: {} };
  } else {
    state.achievements = {
      cat1: state.achievements.cat1 || {},
      cat2: state.achievements.cat2 || {},
    };
  }
  if (!state.achievementStats) {
    state.achievementStats = {
      cat1: createDefaultAchievementStats(),
      cat2: createDefaultAchievementStats(),
    };
  } else {
    state.achievementStats = {
      cat1: { ...createDefaultAchievementStats(), ...(state.achievementStats.cat1 || {}) },
      cat2: { ...createDefaultAchievementStats(), ...(state.achievementStats.cat2 || {}) },
    };
  }
}

function recordServerAchievement(
  state: SharedState,
  role: PlayerRole,
  event: Parameters<typeof applyAchievementEvent>[3]
) {
  ensureAchievementFields(state);
  const res = applyAchievementEvent(
    state.achievements,
    state.achievementStats,
    role,
    event
  );
  state.achievements = res.achievements;
  state.achievementStats = res.achievementStats;
}

function ensureSudokuRoom(state: SharedState): SudokuOnlineRoomState {
  if (!state.onlineRooms.sudoku) {
    state.onlineRooms.sudoku = createDefaultSudokuOnlineState();
  }
  return state.onlineRooms.sudoku;
}

function resetTransientRoomPresence(state: SharedState) {
  state.onlineRooms.jokenpo.p1InRoom = false;
  state.onlineRooms.jokenpo.p2InRoom = false;
  state.onlineRooms.reaction.p1InRoom = false;
  state.onlineRooms.reaction.p2InRoom = false;
  state.onlineRooms.tictactoe.p1InRoom = false;
  state.onlineRooms.tictactoe.p2InRoom = false;
  state.onlineRooms.airhockey.p1InRoom = false;
  state.onlineRooms.airhockey.p2InRoom = false;
  state.onlineRooms.airhockey.running = false;
  const sudoku = ensureSudokuRoom(state);
  sudoku.p1InRoom = false;
  sudoku.p2InRoom = false;
  state.activeGames = { cat1: null, cat2: null };
  state.boardGames.chess.config.p1InRoom = false;
  state.boardGames.chess.config.p2InRoom = false;
  state.boardGames.checkers.config.p1InRoom = false;
  state.boardGames.checkers.config.p2InRoom = false;
}

async function ensureRoomLoaded(roomId: string): Promise<RoomEntry> {
  const cached = rooms.get(roomId);
  if (cached) return cached;

  const inflight = roomLoads.get(roomId);
  if (inflight) return inflight;

  const loader = (async (): Promise<RoomEntry> => {
    try {
      const loaded = await getOrSeedRoom(roomId);
      resetTransientRoomPresence(loaded.state);
      const entry: RoomEntry = {
        state: loaded.state,
        hasPassword: loaded.hasPassword,
      };
      rooms.set(roomId, entry);
      return entry;
    } finally {
      roomLoads.delete(roomId);
    }
  })();

  roomLoads.set(roomId, loader);
  return loader;
}

async function hydrateRoomFromUserFirestoreIfNewer(
  roomId: string,
  authHeader: string | undefined,
  entry: RoomEntry
): Promise<void> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return;
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return;
  try {
    const remote = await fetchRoomFromAppFirestore(roomId, token, entry.state);
    if (!remote) return;
    const currentTs = entry.state.lastStatsUpdateTime || 0;
    if (remote.remoteTs > currentTs) {
      entry.state = remote.state;
      await saveRoomState(roomId, entry.state);
    }
  } catch (err) {
    console.warn('Optional Firestore room hydration skipped:', err instanceof Error ? err.message : err);
  }
}

function getCachedRoom(roomId: string): SharedState | null {
  return rooms.get(roomId)?.state || null;
}

function scheduleRoomSave(roomId: string) {
  if (saveTimers.has(roomId)) return;
  const timer = setTimeout(() => {
    saveTimers.delete(roomId);
    const entry = rooms.get(roomId);
    if (!entry) return;
    void saveRoomState(roomId, entry.state).catch((err) => {
      console.error(`Failed to persist room ${roomId}:`, err);
    });
  }, 1200);
  saveTimers.set(roomId, timer);
}

function sanitizeStateForClient(state: SharedState, role: PlayerRole): SharedState {
  const jkp = state.onlineRooms.jokenpo;
  const hideOppChoice = jkp.state === 'waiting' && !(jkp.p1Choice && jkp.p2Choice);
  if (!hideOppChoice) {
    return { ...state, roomPassword: '' };
  }

  return {
    ...state,
    roomPassword: '',
    onlineRooms: {
      ...state.onlineRooms,
      jokenpo: {
        ...jkp,
        p1Choice: role === 'cat1' ? jkp.p1Choice : (jkp.p1Choice ? 'rock' : ''),
        p2Choice: role === 'cat2' ? jkp.p2Choice : (jkp.p2Choice ? 'rock' : ''),
      },
    },
  };
}

function broadcastRoomState(roomId: string, persist = true) {
  const state = getCachedRoom(roomId);
  if (!state) return;
  const clients = roomClients.get(roomId);
  if (clients) {
    for (const client of clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        const payload = sanitizeStateForClient(state, client.role);
        client.ws.send(JSON.stringify({ type: 'state:sync', state: payload }));
      }
    }
  }
  if (persist) {
    scheduleRoomSave(roomId);
  }
}

function broadcastAirHockeyFrame(roomId: string) {
  const state = getCachedRoom(roomId);
  if (!state) return;
  const clients = roomClients.get(roomId);
  if (!clients) return;
  const msg = JSON.stringify({
    type: 'airhockey:frame',
    airhockey: state.onlineRooms.airhockey,
  });
  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(msg);
    }
  }
}

function updatePresenceFlags(roomId: string) {
  const state = getCachedRoom(roomId);
  if (!state) return;
  const clients = roomClients.get(roomId) || new Set<ClientMeta>();

  const hasRoleInGame = (game: string, role: PlayerRole) => {
    for (const c of clients) {
      if (c.role === role && c.activeGames.has(game)) return true;
    }
    return false;
  };

  const findCurrentGameForRole = (role: PlayerRole): PlayerActiveGameStatus | null => {
    let latest: PlayerActiveGameStatus | null = null;
    for (const c of clients) {
      if (c.role === role && c.currentGame) {
        if (!latest || c.currentGame.updatedAt >= latest.updatedAt) {
          latest = c.currentGame;
        }
      }
    }
    return latest;
  };

  state.activeGames = {
    cat1: findCurrentGameForRole('cat1'),
    cat2: findCurrentGameForRole('cat2'),
  };

  state.onlineRooms.jokenpo.p1InRoom = hasRoleInGame('jokenpo', 'cat1');
  state.onlineRooms.jokenpo.p2InRoom = hasRoleInGame('jokenpo', 'cat2');
  state.onlineRooms.reaction.p1InRoom = hasRoleInGame('reaction', 'cat1');
  state.onlineRooms.reaction.p2InRoom = hasRoleInGame('reaction', 'cat2');
  state.onlineRooms.tictactoe.p1InRoom = hasRoleInGame('tictactoe', 'cat1');
  state.onlineRooms.tictactoe.p2InRoom = hasRoleInGame('tictactoe', 'cat2');
  state.onlineRooms.airhockey.p1InRoom = hasRoleInGame('airhockey', 'cat1');
  state.onlineRooms.airhockey.p2InRoom = hasRoleInGame('airhockey', 'cat2');
  const sudoku = ensureSudokuRoom(state);
  sudoku.p1InRoom = hasRoleInGame('sudoku', 'cat1');
  sudoku.p2InRoom = hasRoleInGame('sudoku', 'cat2');
  state.boardGames.chess.config.p1InRoom = hasRoleInGame('chess', 'cat1');
  state.boardGames.chess.config.p2InRoom = hasRoleInGame('chess', 'cat2');
  state.boardGames.checkers.config.p1InRoom = hasRoleInGame('checkers', 'cat1');
  state.boardGames.checkers.config.p2InRoom = hasRoleInGame('checkers', 'cat2');

  if (!state.onlineRooms.airhockey.p1InRoom || !state.onlineRooms.airhockey.p2InRoom) {
    if (state.onlineRooms.airhockey.running) {
      state.onlineRooms.airhockey.running = false;
      stopAirHockeyLoop(roomId);
    }
  }
}

function stopAirHockeyLoop(roomId: string) {
  const iv = airHockeyIntervals.get(roomId);
  if (iv) {
    clearInterval(iv);
    airHockeyIntervals.delete(roomId);
  }
}

function startAirHockeyLoop(roomId: string) {
  stopAirHockeyLoop(roomId);
  const state = getCachedRoom(roomId);
  if (!state) return;
  const ah = state.onlineRooms.airhockey;
  ah.running = true;
  ah.score1 = 0;
  ah.score2 = 0;
  ah.winner = '';
  ah.puck = { x: 0.5, y: 0.5, vx: 0, vy: 0 };
  ah.p1 = { x: 0.5, y: 0.84 };
  ah.p2 = { x: 0.5, y: 0.16 };

  let pauseTicks = 0;
  const PADDLE_R = 0.075;
  const PUCK_R = 0.04;
  const GOAL_HALF_W = 0.17;

  const iv = setInterval(() => {
    const liveState = getCachedRoom(roomId);
    if (!liveState) {
      stopAirHockeyLoop(roomId);
      return;
    }
    const cur = liveState.onlineRooms.airhockey;
    if (!cur.running) {
      stopAirHockeyLoop(roomId);
      return;
    }

    if (pauseTicks > 0) {
      pauseTicks--;
      if (pauseTicks === 0) {
        cur.puck = { x: 0.5, y: 0.5, vx: 0, vy: 0 };
      }
      broadcastAirHockeyFrame(roomId);
      return;
    }

    cur.puck.vx *= 0.992;
    cur.puck.vy *= 0.992;
    cur.puck.x += cur.puck.vx;
    cur.puck.y += cur.puck.vy;

    if (cur.puck.x - PUCK_R < 0.02) {
      cur.puck.x = 0.02 + PUCK_R;
      cur.puck.vx = Math.abs(cur.puck.vx) * 0.9;
    } else if (cur.puck.x + PUCK_R > 0.98) {
      cur.puck.x = 0.98 - PUCK_R;
      cur.puck.vx = -Math.abs(cur.puck.vx) * 0.9;
    }

    const inGoalX = cur.puck.x >= 0.5 - GOAL_HALF_W && cur.puck.x <= 0.5 + GOAL_HALF_W;
    if (cur.puck.y - PUCK_R <= 0.02) {
      if (inGoalX) {
        cur.score1 += 1;
        recordServerAchievement(liveState, 'cat1', { type: 'airhockey_goal' });
        if (cur.score1 >= 5) {
          cur.running = false;
          cur.winner = 'cat1';
          liveState.wallets.cat1.paws += 10;
          liveState.scores = applyScoreOutcome(liveState.scores, {
            kind: 'pvp_win',
            winner: 'cat1',
          });
          recordServerAchievement(liveState, 'cat1', {
            type: 'airhockey_win',
            conceded: cur.score2,
          });
          broadcastRoomState(roomId);
          stopAirHockeyLoop(roomId);
          return;
        }
        pauseTicks = 25;
      } else {
        cur.puck.y = 0.02 + PUCK_R;
        cur.puck.vy = Math.abs(cur.puck.vy) * 0.9;
      }
    } else if (cur.puck.y + PUCK_R >= 0.98) {
      if (inGoalX) {
        cur.score2 += 1;
        recordServerAchievement(liveState, 'cat2', { type: 'airhockey_goal' });
        if (cur.score2 >= 5) {
          cur.running = false;
          cur.winner = 'cat2';
          liveState.wallets.cat2.paws += 10;
          liveState.scores = applyScoreOutcome(liveState.scores, {
            kind: 'pvp_win',
            winner: 'cat2',
          });
          recordServerAchievement(liveState, 'cat2', {
            type: 'airhockey_win',
            conceded: cur.score1,
          });
          broadcastRoomState(roomId);
          stopAirHockeyLoop(roomId);
          return;
        }
        pauseTicks = 25;
      } else {
        cur.puck.y = 0.98 - PUCK_R;
        cur.puck.vy = -Math.abs(cur.puck.vy) * 0.9;
      }
    }

    for (const paddle of [cur.p1, cur.p2]) {
      const dx = cur.puck.x - paddle.x;
      const dy = cur.puck.y - paddle.y;
      const dist = Math.hypot(dx, dy);
      const minDist = PADDLE_R + PUCK_R;
      if (dist < minDist && dist > 0.0001) {
        const nx = dx / dist;
        const ny = dy / dist;
        cur.puck.x = paddle.x + nx * (minDist + 0.003);
        cur.puck.y = paddle.y + ny * (minDist + 0.003);
        const speed = Math.min(0.036, Math.max(0.018, Math.hypot(cur.puck.vx, cur.puck.vy) * 1.05));
        cur.puck.vx = nx * speed;
        cur.puck.vy = ny * speed;
      }
    }

    broadcastAirHockeyFrame(roomId);
  }, 33);

  airHockeyIntervals.set(roomId, iv);
}

async function bootstrap() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Public login screen metadata only (never reveal nicknames before login!)
  app.get('/api/room/public-meta', async (req, res) => {
    const roomId = String(req.query.roomId || DEFAULT_ROOM_ID);
    try {
      const entry = await ensureRoomLoaded(roomId);
      res.json({
        roomId,
        hasPassword: entry.hasPassword,
      });
    } catch (err) {
      console.error('Failed to load room public metadata:', err);
      res.status(500).json({
        error: 'Não foi possível carregar os dados iniciais da sala.',
        hasPassword: false,
      });
    }
  });

  app.post('/api/auth/session', requireAuth, async (req: AuthRequest, res) => {
    const firebaseUser = req.user!;
    const roomId = String(req.body?.roomId || DEFAULT_ROOM_ID);
    try {
      const user = await getOrCreateUser(
        firebaseUser.uid,
        firebaseUser.email || '',
        firebaseUser.name || ''
      );
      const entry = await ensureRoomLoaded(roomId);
      await hydrateRoomFromUserFirestoreIfNewer(roomId, req.headers.authorization, entry);
      const members = await getRoomMembers(roomId);
      const existingMember = members.find((m) => m.userId === user.id);
      const linkedRole: PlayerRole | null = existingMember
        ? existingMember.role === 'cat2'
          ? 'cat2'
          : 'cat1'
        : null;

      res.json({
        user: {
          id: user.id,
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        },
        roomId,
        hasPassword: entry.hasPassword,
        linkedRole,
      });
    } catch (err) {
      console.error('Session initialization failed:', err);
      res.status(500).json({ error: 'Falha ao autenticar sessão do usuário.' });
    }
  });

  app.get('/api/room', requireAuth, async (req: AuthRequest, res) => {
    const firebaseUser = req.user!;
    const roomId = String(req.query.roomId || DEFAULT_ROOM_ID);
    try {
      const entry = await ensureRoomLoaded(roomId);
      await hydrateRoomFromUserFirestoreIfNewer(roomId, req.headers.authorization, entry);
      const user = await getOrCreateUser(
        firebaseUser.uid,
        firebaseUser.email || '',
        firebaseUser.name || ''
      );
      const members = await getRoomMembers(roomId);
      const member = members.find((m) => m.userId === user.id);
      if (!member) {
        res.status(403).json({ error: 'Conta ainda não vinculada a um perfil nesta sala.' });
        return;
      }
      const role: PlayerRole = member.role === 'cat2' ? 'cat2' : 'cat1';
      res.json({
        role,
        state: sanitizeStateForClient(entry.state, role),
        hasPassword: entry.hasPassword,
      });
    } catch (err) {
      console.error('GET /api/room failed:', err);
      res.status(500).json({ error: 'Falha ao carregar o jardim.' });
    }
  });

  app.post('/api/room/enter', requireAuth, async (req: AuthRequest, res) => {
    const firebaseUser = req.user!;
    const roomId = String(req.body?.roomId || DEFAULT_ROOM_ID);
    const nickname = String(req.body?.nickname || '').trim().slice(0, 18);
    const password = String(req.body?.password || '').trim();

    if (!nickname) {
      res.status(400).json({ error: 'Digite seu último nick para entrar.' });
      return;
    }

    try {
      const entry = await ensureRoomLoaded(roomId);
      await hydrateRoomFromUserFirestoreIfNewer(roomId, req.headers.authorization, entry);
      if (entry.hasPassword) {
        const access = await verifyRoomAccess(roomId, password);
        if (!access.valid) {
          res.status(403).json({ error: 'Senha da sala incorreta! Tente novamente.' });
          return;
        }
      } else if (password.length >= 4) {
        await updateRoomPassword(roomId, password);
        entry.hasPassword = true;
      }

      const user = await getOrCreateUser(
        firebaseUser.uid,
        firebaseUser.email || '',
        firebaseUser.name || nickname
      );
      const members = await getRoomMembers(roomId);
      const resolved = resolveRoleByNickAndMembers({
        typedNick: nickname,
        savedNicknames: entry.state.nicknames,
        userId: user.id,
        members,
      });

      if (!resolved.ok) {
        res.status(403).json({ error: resolved.error });
        return;
      }

      if (resolved.isNewBinding) {
        await upsertRoomMembership(roomId, user.id, resolved.role);
      }

      res.json({
        role: resolved.role,
        recovered: resolved.isNewBinding,
        state: sanitizeStateForClient(entry.state, resolved.role),
        hasPassword: entry.hasPassword,
      });
    } catch (err) {
      console.error('POST /api/room/enter failed:', err);
      res.status(500).json({ error: 'Não foi possível ingressar na sala.' });
    }
  });

  app.post('/api/room/nickname', requireAuth, async (req: AuthRequest, res) => {
    const firebaseUser = req.user!;
    const roomId = String(req.body?.roomId || DEFAULT_ROOM_ID);
    const newNickname = String(req.body?.newNickname || '');

    try {
      const entry = await ensureRoomLoaded(roomId);
      const user = await getOrCreateUser(
        firebaseUser.uid,
        firebaseUser.email || '',
        firebaseUser.name || ''
      );
      const members = await getRoomMembers(roomId);
      const member = members.find((m) => m.userId === user.id);
      if (!member) {
        res.status(403).json({ error: 'Entre na sala antes de alterar seu nick.' });
        return;
      }

      const role: PlayerRole = member.role === 'cat2' ? 'cat2' : 'cat1';
      const check = validateNicknameChange({
        newNickname,
        role,
        savedNicknames: entry.state.nicknames,
      });
      if (!check.ok) {
        res.status(400).json({ error: check.error });
        return;
      }

      entry.state.nicknames[role] = check.nickname;
      entry.state.lastStatsUpdateTime = Date.now();
      await saveRoomState(roomId, entry.state);
      broadcastRoomState(roomId, false);

      res.json({
        ok: true,
        role,
        nickname: check.nickname,
        state: sanitizeStateForClient(entry.state, role),
      });
    } catch (err) {
      console.error('POST /api/room/nickname failed:', err);
      res.status(500).json({ error: 'Não foi possível atualizar o nick.' });
    }
  });

  app.post('/api/room/password', requireAuth, async (req: AuthRequest, res) => {
    const roomId = String(req.body?.roomId || DEFAULT_ROOM_ID);
    const currentPassword = String(req.body?.currentPassword || '').trim();
    const newPassword = String(req.body?.newPassword || '').trim();

    if (newPassword.length < 4 || newPassword.length > 32) {
      res.status(400).json({ error: 'O novo código deve ter entre 4 e 32 caracteres.' });
      return;
    }

    try {
      const entry = await ensureRoomLoaded(roomId);
      if (entry.hasPassword) {
        const access = await verifyRoomAccess(roomId, currentPassword);
        if (!access.valid) {
          res.status(403).json({ error: 'Código atual incorreto.' });
          return;
        }
      }

      await updateRoomPassword(roomId, newPassword);
      entry.hasPassword = true;
      res.json({ ok: true, hasPassword: true });
    } catch (err) {
      console.error('POST /api/room/password failed:', err);
      res.status(500).json({ error: 'Não foi possível atualizar o código secreto.' });
    }
  });

  app.post('/api/room/admin-fish', async (req, res) => {
    const roomId = String(req.body?.roomId || DEFAULT_ROOM_ID);
    const targetRole: PlayerRole = req.body?.targetRole === 'cat2' ? 'cat2' : 'cat1';
    const authHeader = req.headers.authorization;
    const isDevBypassRequest =
      process.env.NODE_ENV !== 'production' &&
      !authHeader &&
      req.body?.devBypass === true;

    try {
      const entry = await ensureRoomLoaded(roomId);

      if (isDevBypassRequest) {
        const callerRole: PlayerRole = req.body?.callerRole === 'cat2' ? 'cat2' : 'cat1';
        if (!isAdminAccount({ role: callerRole, isDevBypass: true })) {
          res.status(403).json({ error: 'Apenas o Admin pode editar os peixinhos.' });
          return;
        }
      } else {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          res.status(401).json({ error: 'Autenticação necessária.' });
          return;
        }
        const token = authHeader.split('Bearer ')[1];
        let decoded;
        try {
          decoded = await adminAuth.verifyIdToken(token);
        } catch {
          res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
          return;
        }

        const user = await getOrCreateUser(
          decoded.uid,
          decoded.email || '',
          decoded.name || ''
        );
        const members = await getRoomMembers(roomId);
        const member = members.find((m) => m.userId === user.id);
        const callerRole: PlayerRole = member?.role === 'cat2' ? 'cat2' : 'cat1';

        if (
          !member ||
          decoded.email_verified === false ||
          !isAdminAccount({ email: decoded.email, role: callerRole, isDevBypass: false })
        ) {
          res.status(403).json({ error: 'Acesso restrito exclusivamente ao Admin.' });
          return;
        }
      }

      if (req.body?.hackPayload && typeof req.body.hackPayload === 'object') {
        entry.state = applyAdminFullHack(entry.state, req.body.hackPayload);
        await saveRoomState(roomId, entry.state);
        broadcastRoomState(roomId, false);
        res.json({
          ok: true,
          state: sanitizeStateForClient(entry.state, 'cat1'),
        });
        return;
      }

      const parsed = parseAdminFishAmount(req.body?.fish);
      if (!parsed.ok) {
        res.status(400).json({ error: parsed.error });
        return;
      }

      entry.state = applyAdminFishEdit(entry.state, targetRole, parsed.value);
      await saveRoomState(roomId, entry.state);
      broadcastRoomState(roomId, false);

      res.json({
        ok: true,
        targetRole,
        fish: parsed.value,
        wallets: entry.state.wallets,
        state: sanitizeStateForClient(entry.state, 'cat1'),
      });
    } catch (err) {
      console.error('POST /api/room/admin-fish failed:', err);
      res.status(500).json({ error: 'Não foi possível salvar as alterações do Admin.' });
    }
  });

  // Periodic slow realistic stat decay for active cached rooms (runs every 5 min)
  setInterval(() => {
    for (const [roomId, entry] of rooms.entries()) {
      const decayed = applyRealisticCatDecay(entry.state);
      if (decayed.changed) {
        entry.state = decayed.state;
        broadcastRoomState(roomId, true);
      }
    }
  }, 5 * 60 * 1000);

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const pathname = (req.url || '').split('?')[0];
    if (pathname === '/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }
  });

  wss.on('connection', (ws) => {
    let clientMeta: ClientMeta | null = null;

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg.type === 'auth') {
          const roomId = String(msg.roomId || DEFAULT_ROOM_ID);
          let role: PlayerRole = msg.role === 'cat2' ? 'cat2' : 'cat1';
          const idToken = typeof msg.idToken === 'string' ? msg.idToken : '';
          const allowDevBypass =
            process.env.NODE_ENV !== 'production' && msg.devBypass === true && !idToken;

          let uid = '';
          if (idToken) {
            try {
              const decoded = await adminAuth.verifyIdToken(idToken);
              uid = decoded.uid;
              const user = await getOrCreateUser(
                decoded.uid,
                decoded.email || '',
                decoded.name || ''
              );
              const members = await getRoomMembers(roomId);
              const member = members.find((m) => m.userId === user.id);
              if (!member) {
                ws.send(JSON.stringify({ type: 'auth:error', error: 'Perfil não vinculado à sala.' }));
                ws.close(4003, 'Forbidden');
                return;
              }
              role = member.role === 'cat2' ? 'cat2' : 'cat1';
            } catch (err) {
              console.error('WS Firebase token verification failed:', err);
              ws.send(JSON.stringify({ type: 'auth:error', error: 'Sessão expirada.' }));
              ws.close(4001, 'Unauthorized');
              return;
            }
          } else if (allowDevBypass) {
            uid = 'dev-preview-user';
          } else {
            ws.send(JSON.stringify({ type: 'auth:error', error: 'Autenticação necessária.' }));
            ws.close(4001, 'Unauthorized');
            return;
          }

          const entry = await ensureRoomLoaded(roomId);
          const decayed = applyRealisticCatDecay(entry.state);
          if (decayed.changed) {
            entry.state = decayed.state;
            scheduleRoomSave(roomId);
          }

          if (clientMeta) {
            roomClients.get(clientMeta.roomId)?.delete(clientMeta);
            updatePresenceFlags(clientMeta.roomId);
          }

          clientMeta = { ws, roomId, role, uid, activeGames: new Set(), currentGame: null };
          if (!roomClients.has(roomId)) roomClients.set(roomId, new Set());
          roomClients.get(roomId)!.add(clientMeta);

          ws.send(
            JSON.stringify({
              type: 'state:sync',
              state: sanitizeStateForClient(entry.state, role),
            })
          );
          broadcastRoomState(roomId, false);
          return;
        }

        if (!clientMeta) return;
        const { roomId, role } = clientMeta;
        const entry = await ensureRoomLoaded(roomId);
        const state = entry.state;

        switch (msg.type) {
          case 'role:switch': {
            if (clientMeta.uid !== 'dev-preview-user') break;
            clientMeta.role = msg.role === 'cat2' ? 'cat2' : 'cat1';
            updatePresenceFlags(roomId);
            broadcastRoomState(roomId, false);
            break;
          }

          case 'state:patch': {
            const p = msg.patch || {};
            if (p.cat1) state.cat1 = { ...state.cat1, ...p.cat1 };
            if (p.cat2) state.cat2 = { ...state.cat2, ...p.cat2 };
            if (typeof p.loveScore === 'number') state.loveScore = p.loveScore;
            if (p.streak) state.streak = { ...state.streak, ...p.streak };
            if (p.scores) state.scores = normalizeScores({ ...state.scores, ...p.scores });
            if (p.presence) state.presence = { ...state.presence, ...p.presence };
            if (p.wallets) state.wallets = { ...state.wallets, ...p.wallets };
            if (p.inventories) state.inventories = { ...state.inventories, ...p.inventories };
            if (p.unlockedItems) state.unlockedItems = { ...state.unlockedItems, ...p.unlockedItems };
            if (p.lastRewardDates) state.lastRewardDates = { ...state.lastRewardDates, ...p.lastRewardDates };
            if (Array.isArray(p.skyHopLeaderboard)) {
              const filtered: NonNullable<SharedState['skyHopLeaderboard']> = p.skyHopLeaderboard.filter(
                (e: unknown): e is NonNullable<SharedState['skyHopLeaderboard']>[number] =>
                  Boolean(e && typeof e === 'object' && typeof (e as { altitude?: unknown }).altitude === 'number')
              );
              state.skyHopLeaderboard = filtered
                .sort((a, b) => b.altitude - a.altitude || b.timestamp - a.timestamp)
                .slice(0, 10);
            }
            if (p.achievements && typeof p.achievements === 'object') {
              ensureAchievementFields(state);
              state.achievements = {
                cat1: mergeUnlockedMaps(state.achievements?.cat1, p.achievements.cat1),
                cat2: mergeUnlockedMaps(state.achievements?.cat2, p.achievements.cat2),
              };
            }
            if (p.achievementStats && typeof p.achievementStats === 'object') {
              ensureAchievementFields(state);
              state.achievementStats = {
                cat1: mergePlayerStats(state.achievementStats?.cat1, p.achievementStats.cat1),
                cat2: mergePlayerStats(state.achievementStats?.cat2, p.achievementStats.cat2),
              };
            }
            if (Array.isArray(p.galleryItems)) {
              state.galleryItems = sanitizeGalleryItems(p.galleryItems);
            }
            if ('galleryDriveFolder' in p) {
              state.galleryDriveFolder = p.galleryDriveFolder || null;
            }
            state.lastStatsUpdateTime =
              typeof msg.syncTimestamp === 'number' && Number.isFinite(msg.syncTimestamp)
                ? Math.max(state.lastStatsUpdateTime || 0, msg.syncTimestamp)
                : Date.now();
            broadcastRoomState(roomId, true);
            break;
          }

          case 'score:record': {
            if (isValidMatchScoreOutcome(msg.outcome)) {
              state.scores = applyScoreOutcome(state.scores, msg.outcome);
              state.lastStatsUpdateTime = Date.now();
              broadcastRoomState(roomId, true);
            }
            break;
          }

          case 'chat:send': {
            const text = String(msg.text || '').trim().slice(0, 220);
            if (!text) return;
            const authorName =
              state.nicknames[role] || (role === 'cat1' ? 'Camarada 1' : 'Camarada 2');
            const now = new Date();
            state.letters = [
              ...state.letters.slice(-79),
              {
                id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                from: role,
                authorName,
                text,
                timestamp: Date.now(),
                timeFormatted: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ];
            broadcastRoomState(roomId, true);
            break;
          }

          case 'room:join': {
            clientMeta.activeGames.add(String(msg.game));
            updatePresenceFlags(roomId);
            broadcastRoomState(roomId, false);
            break;
          }

          case 'room:leave': {
            clientMeta.activeGames.delete(String(msg.game));
            updatePresenceFlags(roomId);
            broadcastRoomState(roomId, false);
            break;
          }

          case 'presence:game': {
            if (msg.active && typeof msg.active === 'object' && msg.active.game) {
              clientMeta.currentGame = {
                game: String(msg.active.game).slice(0, 24) as PlayerActiveGameStatus['game'],
                mode: (msg.active.mode === 'online' || msg.active.mode === 'local' ? msg.active.mode : 'bot'),
                label: String(msg.active.label || msg.active.game).slice(0, 40),
                icon: String(msg.active.icon || '🎮').slice(0, 8),
                updatedAt: Date.now(),
              };
            } else {
              clientMeta.currentGame = null;
            }
            updatePresenceFlags(roomId);
            broadcastRoomState(roomId, false);
            break;
          }

          case 'sudoku:start': {
            const sudoku = ensureSudokuRoom(state);
            const rawSize = Number(msg.size);
            const size: SudokuSize = rawSize === 4 || rawSize === 6 ? rawSize : 9;
            const rawDiff = String(msg.difficulty || 'medium');
            const difficulty: SudokuDifficulty =
              rawDiff === 'easy' || rawDiff === 'hard' || rawDiff === 'expert' ? rawDiff : 'medium';
            const generated = generateSudokuPuzzle(size, difficulty);
            const totalToFill = generated.puzzle.filter((v) => v === 0).length;
            sudoku.status = 'playing';
            sudoku.matchId = (sudoku.matchId || 0) + 1;
            sudoku.size = size;
            sudoku.difficulty = difficulty;
            sudoku.puzzle = generated.puzzle;
            sudoku.solution = generated.solution;
            sudoku.startedAt = Date.now();
            sudoku.winner = '';
            sudoku.progress = {
              cat1: { filled: 0, totalToFill, mistakes: 0, finished: false, elapsedMs: null },
              cat2: { filled: 0, totalToFill, mistakes: 0, finished: false, elapsedMs: null },
            };
            broadcastRoomState(roomId, true);
            break;
          }

          case 'sudoku:progress': {
            const sudoku = ensureSudokuRoom(state);
            if (sudoku.status !== 'playing') return;
            const matchId = Number(msg.matchId || 0);
            if (matchId && matchId !== sudoku.matchId) return;
            const totalToFill = Math.max(1, sudoku.puzzle.filter((v) => v === 0).length);
            const filled = Math.max(0, Math.min(totalToFill, Math.floor(Number(msg.filled) || 0)));
            const mistakes = Math.max(0, Math.floor(Number(msg.mistakes) || 0));
            const finished = Boolean(msg.finished) && filled >= totalToFill;
            const elapsedMs = sudoku.startedAt ? Math.max(500, Date.now() - sudoku.startedAt) : null;
            sudoku.progress[role] = {
              filled,
              totalToFill,
              mistakes,
              finished,
              elapsedMs: finished ? elapsedMs : null,
            };
            if (finished && !sudoku.winner) {
              sudoku.winner = role;
              sudoku.status = 'finished';
              const reward = computeSudokuReward(sudoku.size, sudoku.difficulty, true);
              state.wallets[role].paws += reward;
              state.scores = applyScoreOutcome(state.scores, { kind: 'pvp_win', winner: role });
              recordServerAchievement(state, role, {
                type: 'sudoku_win',
                size: sudoku.size,
                difficulty: sudoku.difficulty,
                online: true,
              });
            }
            broadcastRoomState(roomId, finished);
            break;
          }

          case 'sudoku:reset': {
            const sudoku = ensureSudokuRoom(state);
            const p1InRoom = sudoku.p1InRoom;
            const p2InRoom = sudoku.p2InRoom;
            state.onlineRooms.sudoku = {
              ...createDefaultSudokuOnlineState(),
              p1InRoom,
              p2InRoom,
              matchId: (sudoku.matchId || 0) + 1,
            };
            broadcastRoomState(roomId, true);
            break;
          }

          case 'jokenpo:choice': {
            const choice = msg.choice;
            if (!['rock', 'paper', 'scissors'].includes(choice)) return;
            const jkp = state.onlineRooms.jokenpo;
            if (jkp.state !== 'waiting') return;
            if (role === 'cat1') jkp.p1Choice = choice;
            else jkp.p2Choice = choice;

            if (jkp.p1Choice && jkp.p2Choice) {
              jkp.state = 'finished';
              const win = resolveJokenpoWinner(jkp.p1Choice, jkp.p2Choice);
              if (win === 'cat1') {
                state.wallets.cat1.paws += 6;
                state.scores = applyScoreOutcome(state.scores, {
                  kind: 'pvp_win',
                  winner: 'cat1',
                });
                recordServerAchievement(state, 'cat1', { type: 'jokenpo_result', outcome: 'win' });
                recordServerAchievement(state, 'cat2', { type: 'jokenpo_result', outcome: 'loss' });
              } else if (win === 'cat2') {
                state.wallets.cat2.paws += 6;
                state.scores = applyScoreOutcome(state.scores, {
                  kind: 'pvp_win',
                  winner: 'cat2',
                });
                recordServerAchievement(state, 'cat2', { type: 'jokenpo_result', outcome: 'win' });
                recordServerAchievement(state, 'cat1', { type: 'jokenpo_result', outcome: 'loss' });
              } else {
                state.scores = applyScoreOutcome(state.scores, { kind: 'tie' });
                recordServerAchievement(state, 'cat1', { type: 'jokenpo_result', outcome: 'tie' });
                recordServerAchievement(state, 'cat2', { type: 'jokenpo_result', outcome: 'tie' });
              }
            }
            broadcastRoomState(roomId, true);
            break;
          }

          case 'jokenpo:reset': {
            state.onlineRooms.jokenpo = {
              ...state.onlineRooms.jokenpo,
              p1Choice: '',
              p2Choice: '',
              state: 'waiting',
              roundId: (state.onlineRooms.jokenpo.roundId || 1) + 1,
            };
            broadcastRoomState(roomId, true);
            break;
          }

          case 'ttt:set_starter': {
            const starter: PlayerRole = msg.starter === 'cat2' ? 'cat2' : 'cat1';
            state.onlineRooms.tictactoe.turn = starter;
            broadcastRoomState(roomId, true);
            break;
          }

          case 'ttt:move': {
            const idx = Number(msg.index);
            const ttt = state.onlineRooms.tictactoe;
            if (idx < 0 || idx > 8 || ttt.winner || ttt.board[idx] !== '' || ttt.turn !== role) {
              return;
            }
            ttt.board[idx] = role === 'cat1' ? '🐾' : '🐟';
            const res = checkTicTacToeResult(ttt.board);
            if (res.winnerSymbol) {
              ttt.winner = role === 'cat1' ? `${state.nicknames.cat1} ⭐` : `${state.nicknames.cat2} 🚩`;
              ttt.winningLine = res.winningLine;
              state.scores = applyScoreOutcome(state.scores, { kind: 'pvp_win', winner: role });
              state.wallets[role].paws += 8;
              recordServerAchievement(state, role, { type: 'ttt_win' });
            } else if (res.isDraw) {
              ttt.winner = 'Empate Coletivo 🤝';
              ttt.winningLine = null;
              state.scores = applyScoreOutcome(state.scores, { kind: 'tie' });
              state.wallets.cat1.paws += 4;
              state.wallets.cat2.paws += 4;
              recordServerAchievement(state, 'cat1', { type: 'ttt_draw' });
              recordServerAchievement(state, 'cat2', { type: 'ttt_draw' });
            } else {
              ttt.turn = role === 'cat1' ? 'cat2' : 'cat1';
            }
            broadcastRoomState(roomId, true);
            break;
          }

          case 'ttt:reset': {
            const nextStarter: PlayerRole = msg.starter === 'cat2' ? 'cat2' : 'cat1';
            state.onlineRooms.tictactoe = {
              ...state.onlineRooms.tictactoe,
              board: Array(9).fill(''),
              turn: nextStarter,
              winner: '',
              winningLine: null,
            };
            broadcastRoomState(roomId, true);
            break;
          }

          case 'reaction:start': {
            const rec = state.onlineRooms.reaction;
            if (!rec.p1InRoom || !rec.p2InRoom) return;
            const existing = reactionTimers.get(roomId);
            if (existing) clearTimeout(existing);
            reactionReadyAt.delete(roomId);
            rec.state = 'waiting';
            rec.winner = '';
            rec.winnerTimeMs = undefined;
            broadcastRoomState(roomId, false);

            const delay = Math.floor(Math.random() * 2400) + 1500;
            const timer = setTimeout(() => {
              const live = getCachedRoom(roomId);
              if (live && live.onlineRooms.reaction.state === 'waiting') {
                live.onlineRooms.reaction.state = 'ready';
                reactionReadyAt.set(roomId, Date.now());
                broadcastRoomState(roomId, false);
              }
            }, delay);
            reactionTimers.set(roomId, timer);
            break;
          }

          case 'reaction:tap': {
            const rec = state.onlineRooms.reaction;
            if (rec.state === 'ready') {
              const startedAt = reactionReadyAt.get(roomId);
              const elapsedMs = startedAt ? Math.max(40, Date.now() - startedAt) : null;
              reactionReadyAt.delete(roomId);
              rec.state = 'finished';
              rec.winner = role;
              if (elapsedMs !== null) rec.winnerTimeMs = elapsedMs;
              state.wallets[role].paws += 6;
              state.scores = applyScoreOutcome(state.scores, { kind: 'pvp_win', winner: role });
              recordServerAchievement(state, role, { type: 'reaction_win', timeMs: elapsedMs });
              broadcastRoomState(roomId, true);
            } else if (rec.state === 'waiting') {
              const existing = reactionTimers.get(roomId);
              if (existing) clearTimeout(existing);
              reactionReadyAt.delete(roomId);
              rec.state = 'idle';
              rec.winner = '';
              broadcastRoomState(roomId, false);
            }
            break;
          }

          case 'airhockey:start': {
            const ah = state.onlineRooms.airhockey;
            if (!ah.p1InRoom || !ah.p2InRoom) return;
            startAirHockeyLoop(roomId);
            broadcastRoomState(roomId, false);
            break;
          }

          case 'airhockey:paddle': {
            const ah = state.onlineRooms.airhockey;
            const x = Math.max(0.08, Math.min(0.92, Number(msg.x) || 0.5));
            const rawY = Number(msg.y) || 0.5;
            if (role === 'cat1') {
              ah.p1 = { x, y: Math.max(0.54, Math.min(0.94, rawY)) };
            } else {
              ah.p2 = { x, y: Math.max(0.06, Math.min(0.46, rawY)) };
            }
            break;
          }

          case 'boardgame:move': {
            const game = msg.game === 'checkers' ? 'checkers' : 'chess';
            const boardEntry = state.boardGames[game];
            if (!boardEntry.config.isMatchStarted) return;

            const isCat1White = boardEntry.config.colorAssignment === 'cat1_white';
            const actorColor =
              role === 'cat1'
                ? isCat1White
                  ? 'white'
                  : 'black'
                : isCat1White
                ? 'black'
                : 'white';

            if (boardEntry.state.turn !== actorColor) return;
            const actorName =
              state.nicknames[role] || (role === 'cat1' ? 'Camarada 1' : 'Camarada 2');

            if (game === 'chess') {
              const prevStatus = state.boardGames.chess.state.status;
              state.boardGames.chess.state = applyChessMove(
                state.boardGames.chess.state,
                msg.move,
                actorName
              );
              if (msg.move && typeof msg.move === 'object' && 'promotion' in msg.move && msg.move.promotion) {
                recordServerAchievement(state, role, { type: 'chess_promotion' });
              }
              const nextStatus = state.boardGames.chess.state.status;
              if (prevStatus !== 'checkmate' && nextStatus === 'checkmate') {
                state.wallets[role].paws += 12;
                state.scores = applyScoreOutcome(state.scores, { kind: 'pvp_win', winner: role });
                recordServerAchievement(state, role, {
                  type: 'chess_win',
                  moveCount: state.boardGames.chess.state.moveHistory.length,
                });
              } else if (
                prevStatus !== 'stalemate' &&
                prevStatus !== 'draw' &&
                (nextStatus === 'stalemate' || nextStatus === 'draw')
              ) {
                state.scores = applyScoreOutcome(state.scores, { kind: 'tie' });
              }
            } else {
              const prevStatus = state.boardGames.checkers.state.status;
              state.boardGames.checkers.state = applyCheckersMove(
                state.boardGames.checkers.state,
                msg.move,
                actorName
              );
              if (state.boardGames.checkers.state.mustContinueFrom) {
                recordServerAchievement(state, role, { type: 'checkers_multi_capture' });
              }
              if (prevStatus !== 'finished' && state.boardGames.checkers.state.status === 'finished') {
                if (state.boardGames.checkers.state.winner === 'draw') {
                  state.scores = applyScoreOutcome(state.scores, { kind: 'tie' });
                } else {
                  state.wallets[role].paws += 12;
                  state.scores = applyScoreOutcome(state.scores, { kind: 'pvp_win', winner: role });
                  recordServerAchievement(state, role, { type: 'checkers_win' });
                }
              }
            }
            broadcastRoomState(roomId, true);
            break;
          }

          case 'boardgame:reset': {
            const game = msg.game === 'checkers' ? 'checkers' : 'chess';
            if (game === 'chess') {
              state.boardGames.chess.state = createInitialChessState();
            } else {
              state.boardGames.checkers.state = createInitialCheckersState();
            }
            state.boardGames[game].config.isMatchStarted = true;
            if (state.boardGames[game].config.timeLimit) {
              state.boardGames[game].config.whiteTime = state.boardGames[game].config.timeLimit!;
              state.boardGames[game].config.blackTime = state.boardGames[game].config.timeLimit!;
            }
            broadcastRoomState(roomId, true);
            break;
          }

          case 'boardgame:config': {
            const game = msg.game === 'checkers' ? 'checkers' : 'chess';
            const cur = state.boardGames[game].config;
            state.boardGames[game].config = {
              ...cur,
              ...(msg.config || {}),
            };
            broadcastRoomState(roomId, true);
            break;
          }

          case 'boardgame:chat': {
            const game = msg.game === 'checkers' ? 'checkers' : 'chess';
            const text = String(msg.text || '').trim().slice(0, 120);
            if (!text) return;
            const author =
              state.nicknames[role] || (role === 'cat1' ? 'Camarada 1' : 'Camarada 2');
            const cfg = state.boardGames[game].config;
            cfg.chatMessages = [
              ...cfg.chatMessages.slice(-49),
              {
                id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                author,
                text,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ];
            broadcastRoomState(roomId, true);
            break;
          }
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });

    ws.on('close', () => {
      if (!clientMeta) return;
      const set = roomClients.get(clientMeta.roomId);
      set?.delete(clientMeta);
      updatePresenceFlags(clientMeta.roomId);
      broadcastRoomState(clientMeta.roomId, false);
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`União dos Camaradas Felinos rodando na porta ${PORT}`);
  });
}

bootstrap();
