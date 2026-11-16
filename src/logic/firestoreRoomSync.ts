import { sanitizeGalleryItems } from './gallery.ts';
import {
  createDefaultAchievementStats,
  createDefaultSharedState,
  createDefaultSudokuOnlineState,
} from './defaultState.ts';
import { preserveTransientPresence } from './roomSync.ts';
import type {
  CheckersSquarePiece,
  ChessSquarePiece,
  GalleryExhibit,
  PlayerRole,
  SharedState,
} from '../types/game.ts';

export const FIRESTORE_MAX_GALLERY_ITEMS = 60;
export const FIRESTORE_MAX_IMAGE_URL_LENGTH = 500_000;

export function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return value;
}

export function encodeBoardRows<T>(board: (T | null)[][]): Record<string, (T | null)[]> {
  const rows: Record<string, (T | null)[]> = {};
  if (!Array.isArray(board)) return rows;
  for (let i = 0; i < board.length; i += 1) {
    const row = Array.isArray(board[i]) ? board[i] : [];
    rows[String(i)] = row.map((cell) => (cell ? stripUndefinedDeep(cell) : null));
  }
  return rows;
}

export function decodeBoardRows<T>(
  raw: unknown,
  fallbackBoard: (T | null)[][]
): (T | null)[][] {
  if (Array.isArray(raw)) {
    return raw.map((row) => (Array.isArray(row) ? row : []));
  }
  if (!raw || typeof raw !== 'object') {
    return fallbackBoard;
  }
  const map = raw as Record<string, unknown>;
  const keys = Object.keys(map)
    .filter((k) => /^\d+$/.test(k))
    .sort((a, b) => Number(a) - Number(b));
  if (keys.length === 0) return fallbackBoard;
  return keys.map((k) => {
    const row = map[k];
    return Array.isArray(row) ? (row as (T | null)[]) : [];
  });
}

export function computeExhibitHash(exhibit: GalleryExhibit, position: number): string {
  const raw = [
    exhibit.id,
    exhibit.kind,
    exhibit.title,
    exhibit.description,
    exhibit.url || '',
    exhibit.imageUrl || '',
    exhibit.videoUrl || '',
    exhibit.driveFileId || '',
    exhibit.driveFolderId || '',
    exhibit.storage || '',
    exhibit.frameStyle,
    exhibit.addedBy,
    exhibit.authorName,
    exhibit.occasionDate || '',
    String(exhibit.createdAt || 0),
    String(Boolean(exhibit.isStarter)),
    String(position),
  ].join('|');

  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(36)}_${(h2 >>> 0).toString(36)}_${raw.length}`;
}

function clamp(num: unknown, min: number, max: number, fallback: number): number {
  const n = typeof num === 'number' && Number.isFinite(num) ? num : fallback;
  return Math.max(min, Math.min(max, n));
}

function sanitizeCatForFirestore(
  cat: SharedState['cat1'],
  fallback: SharedState['cat1']
) {
  const expr =
    cat?.expression === 'pet'
      ? 'pet'
      : (cat?.expression as string) === 'normal'
      ? 'normal'
      : 'happy';
  return {
    breed: String(cat?.breed || fallback.breed).slice(0, 32) || fallback.breed,
    outfit: String(cat?.outfit || fallback.outfit).slice(0, 40) || fallback.outfit,
    outfitColor: String(cat?.outfitColor || fallback.outfitColor).slice(0, 16) || fallback.outfitColor,
    accessory: String(cat?.accessory || fallback.accessory).slice(0, 40) || fallback.accessory,
    accessoryColor:
      String(cat?.accessoryColor || fallback.accessoryColor).slice(0, 16) || fallback.accessoryColor,
    expression: expr,
    eyeShape: String(cat?.eyeShape || fallback.eyeShape).slice(0, 24) || fallback.eyeShape,
    eyeColor: String(cat?.eyeColor || fallback.eyeColor).slice(0, 16) || fallback.eyeColor,
    pupil: String(cat?.pupil || fallback.pupil).slice(0, 24) || fallback.pupil,
    pupilColor: String(cat?.pupilColor || fallback.pupilColor).slice(0, 16) || fallback.pupilColor,
    mouth: String(cat?.mouth || fallback.mouth).slice(0, 24) || fallback.mouth,
    bed: String(cat?.bed || fallback.bed || 'classic').slice(0, 24) || 'classic',
    bedColor: String(cat?.bedColor || fallback.bedColor || '#b91c1c').slice(0, 16) || '#b91c1c',
    isSleeping: Boolean(cat?.isSleeping),
    hunger: clamp(cat?.hunger, 0, 100, fallback.hunger),
    energy: clamp(cat?.energy, 0, 100, fallback.energy),
    happiness: clamp(cat?.happiness, 0, 100, fallback.happiness),
    speech: String(cat?.speech ?? fallback.speech).slice(0, 160),
  };
}

function sanitizeInventoryMap(raw: Record<string, number> | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw).slice(0, 50)) {
    const cleanKey = String(k).slice(0, 64);
    if (!cleanKey) continue;
    out[cleanKey] = Math.max(0, Math.floor(Number(v) || 0));
  }
  return out;
}

function sanitizeUnlockedList(raw: string[] | undefined): string[] {
  if (!Array.isArray(raw)) return [];
  const unique = new Set<string>();
  for (const item of raw) {
    const clean = String(item || '').trim().slice(0, 128);
    if (clean) unique.add(clean);
    if (unique.size >= 200) break;
  }
  return Array.from(unique);
}

function sanitizeAchievementsMap(raw: Record<string, number> | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw).slice(0, 100)) {
    const cleanKey = String(k).slice(0, 64);
    if (!cleanKey) continue;
    out[cleanKey] = Math.max(0, Number(v) || 0);
  }
  return out;
}

function sanitizeStatsMap(raw: unknown): Record<string, number | null> {
  const def = createDefaultAchievementStats();
  const merged = { ...def, ...((raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>) };
  const out: Record<string, number | null> = {};
  for (const [k, v] of Object.entries(merged).slice(0, 60)) {
    out[k] = v === null ? null : Number(v) || 0;
  }
  return out;
}

export interface FirestoreRoomDocument {
  roomId: string;
  ownerUid: string;
  partnerUid: string;
  cat1Uid?: string;
  cat2Uid?: string;
  roomPasswordHash?: string;
  lastStatsUpdateTime: number;
  nicknames: { cat1: string; cat2: string };
  loveScore: number;
  streak: { current: number; best: number; totalDays: number };
  scores: { cat1Wins: number; cat2Wins: number; ties: number };
  presence: { syncedToday: boolean; lastSyncedDate: string };
  wallets: Record<PlayerRole, { fish: number; paws: number; coupleCoins: number }>;
  inventories: Record<PlayerRole, Record<string, number>>;
  unlockedItems: Record<PlayerRole, string[]>;
  lastRewardDates: Record<PlayerRole, string>;
  cat1: ReturnType<typeof sanitizeCatForFirestore>;
  cat2: ReturnType<typeof sanitizeCatForFirestore>;
  letters: SharedState['letters'];
  onlineRooms: Record<string, unknown>;
  boardGames: Record<string, unknown>;
  skyHopLeaderboard: NonNullable<SharedState['skyHopLeaderboard']>;
  achievements: Record<PlayerRole, Record<string, number>>;
  achievementStats: Record<PlayerRole, Record<string, number | null>>;
  galleryOrder: string[];
  galleryHashes: Record<string, string>;
  galleryDriveFolder?: SharedState['galleryDriveFolder'];
}

export function toFirestoreRoomPayload(
  state: SharedState,
  meta: {
    roomId: string;
    ownerUid: string;
    partnerUid: string;
    cat1Uid?: string;
    cat2Uid?: string;
    roomPasswordHash?: string;
  }
): FirestoreRoomDocument {
  const def = createDefaultSharedState();
  const cleanGallery = sanitizeGalleryItems(state.galleryItems).slice(0, FIRESTORE_MAX_GALLERY_ITEMS);
  const galleryOrder: string[] = [];
  const galleryHashes: Record<string, string> = {};

  for (let i = 0; i < cleanGallery.length; i += 1) {
    const ex = cleanGallery[i];
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(ex.id)) continue;
    galleryOrder.push(ex.id);
    galleryHashes[ex.id] = computeExhibitHash(ex, i);
  }

  const sudoku = state.onlineRooms?.sudoku || createDefaultSudokuOnlineState();

  const payload: FirestoreRoomDocument = {
    roomId: meta.roomId.slice(0, 64),
    ownerUid: meta.ownerUid.slice(0, 128),
    partnerUid: meta.partnerUid.slice(0, 128),
    lastStatsUpdateTime: Math.max(0, Number(state.lastStatsUpdateTime) || 0),
    nicknames: {
      cat1: (state.nicknames?.cat1 || 'Camarada 1').trim().slice(0, 18) || 'Camarada 1',
      cat2: (state.nicknames?.cat2 || 'Camarada 2').trim().slice(0, 18) || 'Camarada 2',
    },
    loveScore: clamp(state.loveScore, 0, 100, def.loveScore),
    streak: {
      current: Math.max(0, Math.floor(Number(state.streak?.current) || 0)),
      best: Math.max(0, Math.floor(Number(state.streak?.best) || 0)),
      totalDays: Math.max(0, Math.floor(Number(state.streak?.totalDays) || 0)),
    },
    scores: {
      cat1Wins: Math.max(0, Math.floor(Number(state.scores?.cat1Wins) || 0)),
      cat2Wins: Math.max(0, Math.floor(Number(state.scores?.cat2Wins) || 0)),
      ties: Math.max(0, Math.floor(Number(state.scores?.ties) || 0)),
    },
    presence: {
      syncedToday: Boolean(state.presence?.syncedToday),
      lastSyncedDate: String(state.presence?.lastSyncedDate || '').slice(0, 24),
    },
    wallets: {
      cat1: {
        fish: clamp(state.wallets?.cat1?.fish, 0, 10_000_000, def.wallets.cat1.fish),
        paws: clamp(state.wallets?.cat1?.paws, 0, 10_000_000, def.wallets.cat1.paws),
        coupleCoins: clamp(
          state.wallets?.cat1?.coupleCoins,
          0,
          10_000_000,
          def.wallets.cat1.coupleCoins
        ),
      },
      cat2: {
        fish: clamp(state.wallets?.cat2?.fish, 0, 10_000_000, def.wallets.cat2.fish),
        paws: clamp(state.wallets?.cat2?.paws, 0, 10_000_000, def.wallets.cat2.paws),
        coupleCoins: clamp(
          state.wallets?.cat2?.coupleCoins,
          0,
          10_000_000,
          def.wallets.cat2.coupleCoins
        ),
      },
    },
    inventories: {
      cat1: sanitizeInventoryMap(state.inventories?.cat1),
      cat2: sanitizeInventoryMap(state.inventories?.cat2),
    },
    unlockedItems: {
      cat1: sanitizeUnlockedList(state.unlockedItems?.cat1),
      cat2: sanitizeUnlockedList(state.unlockedItems?.cat2),
    },
    lastRewardDates: {
      cat1: String(state.lastRewardDates?.cat1 || '').slice(0, 24),
      cat2: String(state.lastRewardDates?.cat2 || '').slice(0, 24),
    },
    cat1: sanitizeCatForFirestore(state.cat1, def.cat1),
    cat2: sanitizeCatForFirestore(state.cat2, def.cat2),
    letters: stripUndefinedDeep((state.letters || []).slice(-80)),
    onlineRooms: stripUndefinedDeep({
      jokenpo: {
        ...def.onlineRooms.jokenpo,
        ...(state.onlineRooms?.jokenpo || {}),
        p1InRoom: false,
        p2InRoom: false,
      },
      reaction: {
        ...def.onlineRooms.reaction,
        ...(state.onlineRooms?.reaction || {}),
        p1InRoom: false,
        p2InRoom: false,
      },
      tictactoe: {
        ...def.onlineRooms.tictactoe,
        ...(state.onlineRooms?.tictactoe || {}),
        p1InRoom: false,
        p2InRoom: false,
      },
      airhockey: {
        ...def.onlineRooms.airhockey,
        ...(state.onlineRooms?.airhockey || {}),
        p1InRoom: false,
        p2InRoom: false,
        running: false,
      },
      sudoku: {
        ...sudoku,
        p1InRoom: false,
        p2InRoom: false,
      },
    }),
    boardGames: stripUndefinedDeep({
      chess: {
        state: {
          ...def.boardGames.chess.state,
          ...(state.boardGames?.chess?.state || {}),
          board: encodeBoardRows<ChessSquarePiece>(
            state.boardGames?.chess?.state?.board || def.boardGames.chess.state.board
          ),
        },
        config: {
          ...def.boardGames.chess.config,
          ...(state.boardGames?.chess?.config || {}),
          p1InRoom: false,
          p2InRoom: false,
        },
      },
      checkers: {
        state: {
          ...def.boardGames.checkers.state,
          ...(state.boardGames?.checkers?.state || {}),
          board: encodeBoardRows<CheckersSquarePiece>(
            state.boardGames?.checkers?.state?.board || def.boardGames.checkers.state.board
          ),
        },
        config: {
          ...def.boardGames.checkers.config,
          ...(state.boardGames?.checkers?.config || {}),
          p1InRoom: false,
          p2InRoom: false,
        },
      },
    }),
    skyHopLeaderboard: stripUndefinedDeep((state.skyHopLeaderboard || []).slice(0, 10)),
    achievements: {
      cat1: sanitizeAchievementsMap(state.achievements?.cat1),
      cat2: sanitizeAchievementsMap(state.achievements?.cat2),
    },
    achievementStats: {
      cat1: sanitizeStatsMap(state.achievementStats?.cat1),
      cat2: sanitizeStatsMap(state.achievementStats?.cat2),
    },
    galleryOrder,
    galleryHashes,
  };

  if (state.galleryDriveFolder) {
    payload.galleryDriveFolder = stripUndefinedDeep(state.galleryDriveFolder);
  }
  if (typeof meta.cat1Uid === 'string') {
    payload.cat1Uid = meta.cat1Uid.slice(0, 128);
  }
  if (typeof meta.cat2Uid === 'string') {
    payload.cat2Uid = meta.cat2Uid.slice(0, 128);
  }
  if (typeof meta.roomPasswordHash === 'string') {
    payload.roomPasswordHash = meta.roomPasswordHash.slice(0, 160);
  }

  return payload;
}

export interface FirestoreGalleryExhibitDoc {
  id: string;
  roomId: string;
  authorUid: string;
  kind: 'site' | 'image' | 'video';
  title: string;
  description: string;
  url?: string;
  imageUrl?: string;
  videoUrl?: string;
  driveFileId?: string;
  driveFolderId?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  storage?: 'drive' | 'url' | 'inline';
  frameStyle: 'gold' | 'oak' | 'modern' | 'crimson';
  addedBy: PlayerRole;
  authorName: string;
  occasionDate?: string;
  position: number;
  exhibitCreatedAt: number;
  isStarter: boolean;
}

export function toFirestoreGalleryPayload(
  exhibit: GalleryExhibit,
  meta: { roomId: string; authorUid: string; position: number }
): FirestoreGalleryExhibitDoc {
  const title = exhibit.title.trim().slice(0, 80);
  const description = exhibit.description.trim().slice(0, 420);
  const safeTitle = title.length >= 2 ? title : `${title || 'Obra'} ★`.slice(0, 80);
  const safeDescription =
    description.length >= 3 ? description : `${description || 'Lembrança'} ✨`.slice(0, 420);

  const out: FirestoreGalleryExhibitDoc = {
    id: exhibit.id.slice(0, 128),
    roomId: meta.roomId.slice(0, 64),
    authorUid: meta.authorUid.slice(0, 128),
    kind: exhibit.kind === 'site' ? 'site' : exhibit.kind === 'video' ? 'video' : 'image',
    title: safeTitle,
    description: safeDescription,
    frameStyle:
      exhibit.frameStyle === 'oak' ||
      exhibit.frameStyle === 'modern' ||
      exhibit.frameStyle === 'crimson'
        ? exhibit.frameStyle
        : 'gold',
    addedBy: exhibit.addedBy === 'cat2' ? 'cat2' : 'cat1',
    authorName: exhibit.authorName.trim().slice(0, 32) || 'Curador',
    position: clamp(meta.position, 0, FIRESTORE_MAX_GALLERY_ITEMS, 0),
    exhibitCreatedAt: Math.max(0, Number(exhibit.createdAt) || Date.now()),
    isStarter: Boolean(exhibit.isStarter),
  };

  if (typeof exhibit.url === 'string' && exhibit.url.trim()) {
    out.url = exhibit.url.trim().slice(0, 2000);
  }
  if (
    typeof exhibit.imageUrl === 'string' &&
    exhibit.imageUrl.trim() &&
    exhibit.imageUrl.length <= FIRESTORE_MAX_IMAGE_URL_LENGTH
  ) {
    out.imageUrl = exhibit.imageUrl.trim();
  }
  if (typeof exhibit.videoUrl === 'string' && exhibit.videoUrl.trim()) {
    out.videoUrl = exhibit.videoUrl.trim().slice(0, 2000);
  }
  if (typeof exhibit.driveFileId === 'string' && exhibit.driveFileId.trim()) {
    out.driveFileId = exhibit.driveFileId.trim().slice(0, 128);
  }
  if (typeof exhibit.driveFolderId === 'string' && exhibit.driveFolderId.trim()) {
    out.driveFolderId = exhibit.driveFolderId.trim().slice(0, 128);
  }
  if (typeof exhibit.mimeType === 'string' && exhibit.mimeType.trim()) {
    out.mimeType = exhibit.mimeType.trim().slice(0, 96);
  }
  if (typeof exhibit.fileSizeBytes === 'number' && exhibit.fileSizeBytes > 0) {
    out.fileSizeBytes = Math.floor(exhibit.fileSizeBytes);
  }
  if (exhibit.storage === 'drive' || exhibit.storage === 'url' || exhibit.storage === 'inline') {
    out.storage = exhibit.storage;
  }
  if (typeof exhibit.occasionDate === 'string' && exhibit.occasionDate.trim()) {
    out.occasionDate = exhibit.occasionDate.trim().slice(0, 24);
  }

  return out;
}

export function fromFirestoreGalleryDoc(raw: Record<string, unknown>): GalleryExhibit | null {
  if (!raw || typeof raw.id !== 'string' || typeof raw.title !== 'string') return null;
  const sanitized = sanitizeGalleryItems([
    {
      id: raw.id,
      kind: raw.kind === 'site' ? 'site' : raw.kind === 'video' ? 'video' : 'image',
      title: raw.title,
      description: String(raw.description || ''),
      url: typeof raw.url === 'string' ? raw.url : undefined,
      imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : undefined,
      videoUrl: typeof raw.videoUrl === 'string' ? raw.videoUrl : undefined,
      driveFileId: typeof raw.driveFileId === 'string' ? raw.driveFileId : undefined,
      driveFolderId: typeof raw.driveFolderId === 'string' ? raw.driveFolderId : undefined,
      mimeType: typeof raw.mimeType === 'string' ? raw.mimeType : undefined,
      fileSizeBytes: typeof raw.fileSizeBytes === 'number' ? raw.fileSizeBytes : undefined,
      storage: raw.storage,
      frameStyle: raw.frameStyle,
      addedBy: raw.addedBy === 'cat2' ? 'cat2' : 'cat1',
      authorName: String(raw.authorName || 'Curador'),
      occasionDate: typeof raw.occasionDate === 'string' ? raw.occasionDate : undefined,
      createdAt: typeof raw.exhibitCreatedAt === 'number' ? raw.exhibitCreatedAt : Date.now(),
      isStarter: Boolean(raw.isStarter),
    },
  ]);
  return sanitized[0] ? stripUndefinedDeep(sanitized[0]) : null;
}

export function fromFirestoreRoomPayload(
  rawDoc: Record<string, unknown>,
  exhibitsById: Map<string, GalleryExhibit>,
  localState: SharedState
): SharedState {
  const def = createDefaultSharedState();
  const rawBoardGames = (rawDoc.boardGames || {}) as Record<string, Record<string, unknown>>;
  const rawChess = rawBoardGames.chess || {};
  const rawCheckers = rawBoardGames.checkers || {};
  const rawChessState = (rawChess.state || {}) as Record<string, unknown>;
  const rawCheckersState = (rawCheckers.state || {}) as Record<string, unknown>;

  const galleryOrder = Array.isArray(rawDoc.galleryOrder)
    ? rawDoc.galleryOrder.filter((id): id is string => typeof id === 'string')
    : [];

  let galleryItems: GalleryExhibit[];
  if (galleryOrder.length === 0) {
    galleryItems = [];
  } else {
    const resolved: GalleryExhibit[] = [];
    for (const id of galleryOrder) {
      const found = exhibitsById.get(id) || localState.galleryItems?.find((g) => g.id === id);
      if (found) resolved.push(found);
    }
    galleryItems = resolved;
  }

  const nextState: SharedState = {
    ...def,
    roomPassword: '',
    nicknames: {
      cat1: String((rawDoc.nicknames as Record<string, unknown>)?.cat1 || def.nicknames.cat1),
      cat2: String((rawDoc.nicknames as Record<string, unknown>)?.cat2 || def.nicknames.cat2),
    },
    loveScore:
      typeof rawDoc.loveScore === 'number' ? rawDoc.loveScore : def.loveScore,
    streak: {
      ...def.streak,
      ...((rawDoc.streak as SharedState['streak']) || {}),
    },
    scores: {
      ...def.scores,
      ...((rawDoc.scores as SharedState['scores']) || {}),
    },
    presence: {
      ...def.presence,
      ...((rawDoc.presence as SharedState['presence']) || {}),
    },
    wallets: {
      cat1: {
        ...def.wallets.cat1,
        ...((rawDoc.wallets as SharedState['wallets'])?.cat1 || {}),
      },
      cat2: {
        ...def.wallets.cat2,
        ...((rawDoc.wallets as SharedState['wallets'])?.cat2 || {}),
      },
    },
    inventories: {
      cat1: { ...((rawDoc.inventories as SharedState['inventories'])?.cat1 || {}) },
      cat2: { ...((rawDoc.inventories as SharedState['inventories'])?.cat2 || {}) },
    },
    unlockedItems: {
      cat1: Array.isArray((rawDoc.unlockedItems as SharedState['unlockedItems'])?.cat1)
        ? [...(rawDoc.unlockedItems as SharedState['unlockedItems']).cat1]
        : [...def.unlockedItems.cat1],
      cat2: Array.isArray((rawDoc.unlockedItems as SharedState['unlockedItems'])?.cat2)
        ? [...(rawDoc.unlockedItems as SharedState['unlockedItems']).cat2]
        : [...def.unlockedItems.cat2],
    },
    lastRewardDates: {
      ...def.lastRewardDates,
      ...((rawDoc.lastRewardDates as SharedState['lastRewardDates']) || {}),
    },
    lastStatsUpdateTime:
      typeof rawDoc.lastStatsUpdateTime === 'number'
        ? rawDoc.lastStatsUpdateTime
        : localState.lastStatsUpdateTime,
    cat1: {
      ...def.cat1,
      ...((rawDoc.cat1 as SharedState['cat1']) || {}),
    },
    cat2: {
      ...def.cat2,
      ...((rawDoc.cat2 as SharedState['cat2']) || {}),
    },
    letters: Array.isArray(rawDoc.letters)
      ? (rawDoc.letters as SharedState['letters']).slice(-80)
      : [],
    onlineRooms: {
      ...def.onlineRooms,
      ...((rawDoc.onlineRooms as SharedState['onlineRooms']) || {}),
      sudoku: {
        ...createDefaultSudokuOnlineState(),
        ...((rawDoc.onlineRooms as SharedState['onlineRooms'])?.sudoku || {}),
      },
    },
    boardGames: {
      chess: {
        state: {
          ...def.boardGames.chess.state,
          ...(rawChessState as Partial<SharedState['boardGames']['chess']['state']>),
          board: decodeBoardRows<ChessSquarePiece>(
            rawChessState.board,
            def.boardGames.chess.state.board
          ),
        },
        config: {
          ...def.boardGames.chess.config,
          ...((rawChess.config as SharedState['boardGames']['chess']['config']) || {}),
        },
      },
      checkers: {
        state: {
          ...def.boardGames.checkers.state,
          ...(rawCheckersState as Partial<SharedState['boardGames']['checkers']['state']>),
          board: decodeBoardRows<CheckersSquarePiece>(
            rawCheckersState.board,
            def.boardGames.checkers.state.board
          ),
        },
        config: {
          ...def.boardGames.checkers.config,
          ...((rawCheckers.config as SharedState['boardGames']['checkers']['config']) || {}),
        },
      },
    },
    skyHopLeaderboard: Array.isArray(rawDoc.skyHopLeaderboard)
      ? (rawDoc.skyHopLeaderboard as NonNullable<SharedState['skyHopLeaderboard']>).slice(0, 10)
      : [],
    achievements: {
      cat1: { ...((rawDoc.achievements as SharedState['achievements'])?.cat1 || {}) },
      cat2: { ...((rawDoc.achievements as SharedState['achievements'])?.cat2 || {}) },
    },
    achievementStats: {
      cat1: {
        ...createDefaultAchievementStats(),
        ...((rawDoc.achievementStats as SharedState['achievementStats'])?.cat1 || {}),
      },
      cat2: {
        ...createDefaultAchievementStats(),
        ...((rawDoc.achievementStats as SharedState['achievementStats'])?.cat2 || {}),
      },
    },
    galleryItems,
    galleryDriveFolder:
      rawDoc.galleryDriveFolder && typeof rawDoc.galleryDriveFolder === 'object'
        ? (rawDoc.galleryDriveFolder as SharedState['galleryDriveFolder'])
        : null,
  };

  return preserveTransientPresence(nextState, localState);
}

export function shouldAcceptRemoteSnapshot(
  remoteTs: number,
  localTs: number,
  lastHandledTs: number
): boolean {
  if (!Number.isFinite(remoteTs) || remoteTs <= 0) return false;
  return remoteTs > Math.max(localTs || 0, lastHandledTs || 0);
}

export function diffGalleryExhibits(
  desiredItems: GalleryExhibit[],
  remoteHashes: Record<string, string>
): {
  toCreate: Array<{ exhibit: GalleryExhibit; position: number }>;
  toUpdate: Array<{ exhibit: GalleryExhibit; position: number }>;
  toDeleteIds: string[];
} {
  const clean = sanitizeGalleryItems(desiredItems).slice(0, FIRESTORE_MAX_GALLERY_ITEMS);
  const desiredIds = new Set<string>();
  const toCreate: Array<{ exhibit: GalleryExhibit; position: number }> = [];
  const toUpdate: Array<{ exhibit: GalleryExhibit; position: number }> = [];

  for (let i = 0; i < clean.length; i += 1) {
    const exhibit = clean[i];
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(exhibit.id)) continue;
    desiredIds.add(exhibit.id);
    const nextHash = computeExhibitHash(exhibit, i);
    const prevHash = remoteHashes[exhibit.id];
    if (!prevHash) {
      toCreate.push({ exhibit, position: i });
    } else if (prevHash !== nextHash) {
      toUpdate.push({ exhibit, position: i });
    }
  }

  const toDeleteIds = Object.keys(remoteHashes).filter((id) => !desiredIds.has(id));
  return { toCreate, toUpdate, toDeleteIds };
}
