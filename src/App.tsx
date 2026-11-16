import { useCallback, useEffect, useRef, useState } from 'react';
import { onIdTokenChanged, User } from 'firebase/auth';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  auth,
  isFirebaseConfigured,
  subscribeFirebaseConfig,
} from './lib/firebase';
import { useFirestoreRoomSync } from './lib/firestoreSync';
import {
  adminSaveFishStatic,
  adminSaveFullHackStatic,
  checkSessionStatic,
  isStaticHostingMode,
  markBackendUnavailable,
  updateNicknameStatic,
  updateRoomPasswordStatic,
} from './lib/staticRoomService';
import {
  GalleryDriveFolderConfig,
  GalleryExhibit,
  MinigamePlayMode,
  PlayerRole,
  SharedState,
  SkyHopLeaderboardEntry,
} from './types/game';
import {
  FOOD_ITEMS,
  generateDailyCodeForRole,
  getTodayDateString,
} from './logic/minigames';
import { recordSkyHopLeaderboard } from './logic/skyHop';
import {
  AchievementEvent,
  ACHIEVEMENTS,
  applyAchievementEvent,
} from './logic/achievements';
import { applyScoreOutcome, MatchScoreOutcome } from './logic/scores';
import { applyRealisticCatDecay } from './logic/decay';
import { DEFAULT_ROOM_ID, useGameSocket } from './hooks/useGameSocket';
import { useOrientation } from './hooks/useOrientation';
import { isSoundMuted, setSoundMuted, sfx } from './utils/sound';
import { HeaderBar } from './components/HeaderBar';
import { GardenStage } from './components/GardenStage';
import { BottomDock, SCREEN_TABS, ScreenTabId } from './components/BottomDock';
import { LoginModal } from './components/LoginModal';
import { SyncModal } from './components/SecondaryModals';
import { AdminFishModal } from './components/AdminFishModal';
import { AdminFullHackPayload, isAdminAccount } from './logic/adminHack';
import { WarehouseScreen } from './components/screens/WarehouseScreen';
import { MarketScreen } from './components/screens/MarketScreen';
import { GamesScreen } from './components/screens/GamesScreen';
import { GalleryScreen } from './components/screens/GalleryScreen';
import { PartyScreen } from './components/screens/PartyScreen';
import { RadioScreen } from './components/screens/RadioScreen';
import { AtelierScreen } from './components/screens/AtelierScreen';
import { AchievementsScreen } from './components/screens/AchievementsScreen';
import { MinigameId } from './components/games/GamesHubModal';
import { JokenpoModal } from './components/games/JokenpoModal';
import { TicTacToeModal } from './components/games/TicTacToeModal';
import { ReactionModal } from './components/games/ReactionModal';
import { AirHockeyModal } from './components/games/AirHockeyModal';
import { SkyHopModal } from './components/games/SkyHopModal';
import { ChessCheckersModal } from './components/games/ChessCheckersModal';
import { SudokuModal } from './components/games/SudokuModal';
import { SolitaireModal } from './components/games/SolitaireModal';
import { TermoModal } from './components/games/TermoModal';

const GAME_META_LABELS: Record<MinigameId, { label: string; icon: string }> = {
  sudoku: { label: 'Sudoku Club', icon: '🔢' },
  solitaire: { label: 'Solitária dos Gatinhos', icon: '🃏' },
  termo: { label: 'Termo Diário', icon: '🔤' },
  chess: { label: 'Xadrez de Moscou', icon: '♟️' },
  checkers: { label: 'Damas Brasileiras', icon: '⚪' },
  airhockey: { label: 'Air Hockey Siberiano', icon: '🏒' },
  tictactoe: { label: 'Jogo da Velha', icon: '⭐' },
  jokenpo: { label: 'Jokenpô', icon: '✊' },
  reaction: { label: 'Pata Rápida', icon: '⚡' },
  skyhop: { label: 'Pula-Pula Sputnik', icon: '🚀' },
};

const ROLE_STORAGE_KEY = 'casal_meu_gatinho';

function getInitialPreferences(): { role: PlayerRole; devBypass: boolean } {
  const params = new URLSearchParams(window.location.search);
  const urlRole = params.get('role');
  const savedRole = localStorage.getItem(ROLE_STORAGE_KEY);
  const role: PlayerRole =
    urlRole === 'cat2' || (urlRole !== 'cat1' && savedRole === 'cat2') ? 'cat2' : 'cat1';
  const devBypass = Boolean(import.meta.env.DEV && params.get('autostart') === '1');
  return {
    role,
    devBypass,
  };
}

export default function App() {
  const initialPrefs = getInitialPreferences();
  const [myRole, setMyRole] = useState<PlayerRole>(initialPrefs.role);
  const [devBypass] = useState<boolean>(initialPrefs.devBypass);
  const [firebaseReady, setFirebaseReady] = useState<boolean>(() =>
    isFirebaseConfigured()
  );
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(() => !isFirebaseConfigured());
  const [linkedRole, setLinkedRole] = useState<PlayerRole | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(initialPrefs.devBypass);
  const [muted, setMuted] = useState<boolean>(isSoundMuted());
  const [toast, setToast] = useState<string>('');
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionStartRef = useRef<number>(Date.now());
  const toastedAchievementIdsRef = useRef<Set<string>>(new Set());
  const [pendingAchievementCelebrations, setPendingAchievementCelebrations] = useState<
    Record<PlayerRole, string[]>
  >({ cat1: [], cat2: [] });
  const petTimerRef = useRef<Record<PlayerRole, ReturnType<typeof setTimeout> | null>>({
    cat1: null,
    cat2: null,
  });

  // Swipeable page state
  const [activeTab, setActiveTab] = useState<ScreenTabId>('jardim');
  const [dockHidden, setDockHidden] = useState<boolean>(false);
  const [dragOffsetPx, setDragOffsetPx] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const swipeStartRef = useRef<{ x: number; y: number; time: number; locked: 'x' | 'y' | null } | null>(null);
  const wheelCooldownRef = useRef<number>(0);

  // Overlays / Minigames
  const [syncOpen, setSyncOpen] = useState(false);
  const [adminFishOpen, setAdminFishOpen] = useState(false);
  const [activeGame, setActiveGame] = useState<{
    id: MinigameId;
    mode: MinigamePlayMode;
  } | null>(null);

  const vp = useOrientation();
  const {
    state,
    setState,
    hasRoomPassword,
    setHasRoomPassword,
    connected,
    hasServerState,
    airHockeyFrame,
    sendSocket,
    patchState,
    applyExternalSyncState,
  } = useGameSocket({
    myRole,
    idToken,
    enabled: isLoggedIn,
    devBypass,
  });

  useFirestoreRoomSync({
    roomId: DEFAULT_ROOM_ID,
    enabled: isLoggedIn && !devBypass,
    serverReady: hasServerState,
    firebaseUser,
    state,
    onApplyRemoteState: applyExternalSyncState,
  });

  const activeIndex = Math.max(
    0,
    SCREEN_TABS.findIndex((t) => t.id === activeTab)
  );

  const goToTab = useCallback((tab: ScreenTabId) => {
    setActiveTab(tab);
    setDragOffsetPx(0);
    setIsDragging(false);
  }, []);

  const stepTab = useCallback(
    (delta: number) => {
      const nextIdx = Math.max(0, Math.min(SCREEN_TABS.length - 1, activeIndex + delta));
      if (nextIdx !== activeIndex) {
        setActiveTab(SCREEN_TABS[nextIdx].id);
        sfx.move();
      }
      setDragOffsetPx(0);
      setIsDragging(false);
    },
    [activeIndex]
  );

  useEffect(() => {
    return subscribeFirebaseConfig(() => {
      setFirebaseReady(isFirebaseConfigured());
    });
  }, []);

  useEffect(() => {
    if (!firebaseReady || !auth) {
      setFirebaseUser(null);
      setIdToken(null);
      setLinkedRole(null);
      setAuthReady(true);
      return;
    }

    setAuthReady(false);
    const unsub = onIdTokenChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const token = await user.getIdToken();
          setIdToken(token);
          if (isStaticHostingMode()) {
            const session = await checkSessionStatic(DEFAULT_ROOM_ID, user);
            setHasRoomPassword(session.hasPassword);
            setLinkedRole(session.linkedRole);
          } else {
            await fetch('/api/auth/session', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ roomId: DEFAULT_ROOM_ID }),
            })
              .then(async (r) => {
                const ct = r.headers.get('content-type') || '';
                if (!r.ok || !ct.includes('application/json')) {
                  markBackendUnavailable();
                  return checkSessionStatic(DEFAULT_ROOM_ID, user);
                }
                return r.json();
              })
              .then((data) => {
                if (data) {
                  setHasRoomPassword(Boolean(data.hasPassword));
                  setLinkedRole(
                    data.linkedRole === 'cat2'
                      ? 'cat2'
                      : data.linkedRole === 'cat1'
                      ? 'cat1'
                      : null
                  );
                }
              })
              .catch(async () => {
                markBackendUnavailable();
                const session = await checkSessionStatic(DEFAULT_ROOM_ID, user);
                setHasRoomPassword(session.hasPassword);
                setLinkedRole(session.linkedRole);
              });
          }
        } catch {
          setIdToken(null);
        }
      } else {
        setIdToken(null);
        setLinkedRole(null);
        if (!devBypass) {
          setIsLoggedIn(false);
        }
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, [firebaseReady, devBypass, setHasRoomPassword]);

  useEffect(() => {
    document.body.dataset.state = isLoggedIn ? 'playing' : 'login';
  }, [isLoggedIn]);

  // Periodic realistic slow stat decay check while active (every 5 minutes)
  useEffect(() => {
    if (!isLoggedIn) return;
    const iv = setInterval(() => {
      setState((prev) => {
        const decayed = applyRealisticCatDecay(prev);
        return decayed.changed ? decayed.state : prev;
      });
    }, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, [isLoggedIn, setState]);

  // Keyboard arrow navigation between screens when idle
  useEffect(() => {
    if (!isLoggedIn || syncOpen || adminFishOpen || activeGame) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowRight') {
        stepTab(1);
      } else if (e.key === 'ArrowLeft') {
        stepTab(-1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isLoggedIn, syncOpen, adminFishOpen, activeGame, stepTab]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 3200);
  }, []);

  const handleLoginSuccess = (
    role: PlayerRole,
    nickname: string,
    hydratedState: SharedState,
    hasPassword: boolean,
    recovered: boolean
  ) => {
    setMyRole(role);
    setLinkedRole(role);
    localStorage.setItem(ROLE_STORAGE_KEY, role);
    setState(hydratedState);
    setHasRoomPassword(hasPassword);
    setIsLoggedIn(true);
    sfx.purr();
    showToast(
      recovered
        ? `Conta vinculada e dados de ${nickname} recuperados! ☭`
        : `Bem-vindo(a) de volta, ${nickname}! ☭`
    );
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  const handleUpdateNickname = async (
    newNickname: string
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!idToken) {
      return { ok: false, error: 'Sessão expirada. Entre novamente com o Google.' };
    }
    try {
      if (isStaticHostingMode()) {
        const res = await updateNicknameStatic({
          roomId: DEFAULT_ROOM_ID,
          role: myRole,
          newNickname,
          state,
          firebaseUser,
        });
        if (!res.ok) return { ok: false, error: res.error };
        setState(res.state);
        showToast(`Nick atualizado para ${res.nickname}! 🪪`);
        return { ok: true };
      }

      const res = await fetch('/api/room/nickname', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          roomId: DEFAULT_ROOM_ID,
          newNickname,
        }),
      });
      const ct = res.headers.get('content-type') || '';
      if (res.status === 404 || !ct.includes('application/json')) {
        markBackendUnavailable();
        const fallback = await updateNicknameStatic({
          roomId: DEFAULT_ROOM_ID,
          role: myRole,
          newNickname,
          state,
          firebaseUser,
        });
        if (!fallback.ok) return { ok: false, error: fallback.error };
        setState(fallback.state);
        showToast(`Nick atualizado para ${fallback.nickname}! 🪪`);
        return { ok: true };
      }
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data?.error || 'Não foi possível alterar o nick.' };
      }
      if (data.state) {
        setState(data.state);
      }
      showToast(`Nick atualizado para ${data.nickname}! 🪪`);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Erro de conexão ao atualizar o nick.' };
    }
  };

  const handleUpdateRoomPassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!idToken) {
      return { ok: false, error: 'Sessão expirada. Entre novamente com o Google.' };
    }
    try {
      if (isStaticHostingMode()) {
        const res = await updateRoomPasswordStatic({
          roomId: DEFAULT_ROOM_ID,
          currentPassword,
          newPassword,
          firebaseUser,
        });
        if (!res.ok) return { ok: false, error: res.error };
        setHasRoomPassword(true);
        showToast('Código secreto da sala atualizado! 🔐');
        return { ok: true };
      }

      const res = await fetch('/api/room/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          roomId: DEFAULT_ROOM_ID,
          currentPassword,
          newPassword,
        }),
      });
      const ct = res.headers.get('content-type') || '';
      if (res.status === 404 || !ct.includes('application/json')) {
        markBackendUnavailable();
        const fallback = await updateRoomPasswordStatic({
          roomId: DEFAULT_ROOM_ID,
          currentPassword,
          newPassword,
          firebaseUser,
        });
        if (!fallback.ok) return { ok: false, error: fallback.error };
        setHasRoomPassword(true);
        showToast('Código secreto da sala atualizado! 🔐');
        return { ok: true };
      }
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data?.error || 'Não foi possível atualizar.' };
      }
      setHasRoomPassword(true);
      showToast('Código secreto da sala atualizado! 🔐');
      return { ok: true };
    } catch {
      return { ok: false, error: 'Erro de conexão ao atualizar o código.' };
    }
  };

  const isAdmin = isAdminAccount({
    email: firebaseUser?.email,
    role: myRole,
    isDevBypass: Boolean(import.meta.env.DEV && devBypass && !idToken),
  });

  const handleAdminSaveFish = async (
    targetRole: PlayerRole,
    fish: number
  ): Promise<{ ok: boolean; error?: string }> => {
    const canDevBypass = Boolean(import.meta.env.DEV && devBypass && !idToken);
    if (!idToken && !canDevBypass) {
      return { ok: false, error: 'Sessão expirada. Entre novamente com o Google.' };
    }
    try {
      if (isStaticHostingMode()) {
        const res = await adminSaveFishStatic({
          roomId: DEFAULT_ROOM_ID,
          targetRole,
          fish,
          callerRole: myRole,
          firebaseUser,
          isDevBypass: canDevBypass,
          state,
        });
        if (!res.ok) return { ok: false, error: res.error };
        setState(res.state);
        sfx.purr();
        const nick = state.nicknames[targetRole] || (targetRole === 'cat1' ? 'Admin' : 'Camarada 2');
        showToast(`Peixinhos de ${nick} ajustados para ${fish} 🐟`);
        return { ok: true };
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) {
        headers.Authorization = `Bearer ${idToken}`;
      }
      const res = await fetch('/api/room/admin-fish', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          roomId: DEFAULT_ROOM_ID,
          targetRole,
          fish,
          ...(canDevBypass ? { devBypass: true, callerRole: myRole } : {}),
        }),
      });
      const ct = res.headers.get('content-type') || '';
      if (res.status === 404 || !ct.includes('application/json')) {
        markBackendUnavailable();
        const fallback = await adminSaveFishStatic({
          roomId: DEFAULT_ROOM_ID,
          targetRole,
          fish,
          callerRole: myRole,
          firebaseUser,
          isDevBypass: canDevBypass,
          state,
        });
        if (!fallback.ok) return { ok: false, error: fallback.error };
        setState(fallback.state);
        sfx.purr();
        const nick = state.nicknames[targetRole] || (targetRole === 'cat1' ? 'Admin' : 'Camarada 2');
        showToast(`Peixinhos de ${nick} ajustados para ${fish} 🐟`);
        return { ok: true };
      }
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data?.error || 'Não foi possível editar os peixinhos.' };
      }
      if (data.state) {
        setState(data.state);
      }
      sfx.purr();
      const nick = state.nicknames[targetRole] || (targetRole === 'cat1' ? 'Admin' : 'Camarada 2');
      showToast(`Peixinhos de ${nick} ajustados para ${fish} 🐟`);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Erro de conexão ao salvar os peixinhos.' };
    }
  };

  const handleAdminSaveHack = async (
    hackPayload: AdminFullHackPayload
  ): Promise<{ ok: boolean; error?: string }> => {
    const canDevBypass = Boolean(import.meta.env.DEV && devBypass && !idToken);
    if (!idToken && !canDevBypass) {
      return { ok: false, error: 'Sessão expirada. Entre novamente com o Google.' };
    }
    try {
      if (isStaticHostingMode()) {
        const res = await adminSaveFullHackStatic({
          roomId: DEFAULT_ROOM_ID,
          hackPayload,
          callerRole: myRole,
          firebaseUser,
          isDevBypass: canDevBypass,
          state,
        });
        if (!res.ok) return { ok: false, error: res.error };
        setState(res.state);
        sfx.win();
        showToast(
          `Hack Admin aplicado! 🔥 ${res.state.streak.current} dias · ${state.nicknames.cat1} & ${state.nicknames.cat2} sincronizados ⚡`
        );
        return { ok: true };
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) {
        headers.Authorization = `Bearer ${idToken}`;
      }
      const res = await fetch('/api/room/admin-fish', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          roomId: DEFAULT_ROOM_ID,
          hackPayload,
          ...(canDevBypass ? { devBypass: true, callerRole: myRole } : {}),
        }),
      });
      const ct = res.headers.get('content-type') || '';
      if (res.status === 404 || !ct.includes('application/json')) {
        markBackendUnavailable();
        const fallback = await adminSaveFullHackStatic({
          roomId: DEFAULT_ROOM_ID,
          hackPayload,
          callerRole: myRole,
          firebaseUser,
          isDevBypass: canDevBypass,
          state,
        });
        if (!fallback.ok) return { ok: false, error: fallback.error };
        setState(fallback.state);
        sfx.win();
        showToast(
          `Hack Admin aplicado! 🔥 ${fallback.state.streak.current} dias · ${state.nicknames.cat1} & ${state.nicknames.cat2} sincronizados ⚡`
        );
        return { ok: true };
      }
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data?.error || 'Não foi possível aplicar o Hack do Admin.' };
      }
      if (data.state) {
        setState(data.state);
      }
      sfx.win();
      showToast(
        `Hack Admin aplicado! 🔥 ${data.state?.streak?.current ?? hackPayload.streak.current} dias · ${state.nicknames.cat1} & ${state.nicknames.cat2} sincronizados ⚡`
      );
      return { ok: true };
    } catch {
      return { ok: false, error: 'Erro de conexão ao salvar o Hack do Admin.' };
    }
  };

  const handleToggleIdentity = () => {
    if (!devBypass || idToken) {
      goToTab('partido');
      return;
    }
    const nextRole: PlayerRole = myRole === 'cat1' ? 'cat2' : 'cat1';
    setMyRole(nextRole);
    localStorage.setItem(ROLE_STORAGE_KEY, nextRole);
    sfx.move();
    showToast(`Identidade alternada para ${state.nicknames[nextRole]}`);
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    setSoundMuted(next);
  };

  const handleClaimDaily = () => {
    const today = getTodayDateString();
    if (state.lastRewardDates[myRole] === today) {
      showToast('Você já resgatou sua ração diária de hoje! Volte amanhã 🐟');
      sfx.error();
      return;
    }
    patchState((prev) => ({
      wallets: {
        ...prev.wallets,
        [myRole]: {
          ...prev.wallets[myRole],
          fish: prev.wallets[myRole].fish + 1,
        },
      },
      lastRewardDates: {
        ...prev.lastRewardDates,
        [myRole]: today,
      },
    }));
    sfx.win();
    showToast('+1 Peixe do Estado 🐟 adicionado à sua carteira!');
  };

  const handlePetCat = (target: PlayerRole) => {
    sfx.purr();
    const isPartner = target !== myRole;
    patchState((prev) => ({
      loveScore: Math.min(100, prev.loveScore + (isPartner ? 2 : 1)),
      [target]: {
        ...prev[target],
        happiness: Math.min(100, prev[target].happiness + 5),
        expression: 'pet' as const,
        speech: isPartner ? 'Ronronando pelo carinho do amor! 💖' : 'Miau feliz! 🐾',
      },
    }));

    if (petTimerRef.current[target]) clearTimeout(petTimerRef.current[target]!);
    petTimerRef.current[target] = setTimeout(() => {
      patchState((prev) => ({
        [target]: {
          ...prev[target],
          expression: 'normal' as const,
        },
      }));
    }, 1500);
  };

  const handleToggleSleep = (target: PlayerRole) => {
    const currentlySleeping = Boolean(state[target].isSleeping);
    const nextSleeping = !currentlySleeping;
    sfx.move();
    patchState((prev) => ({
      [target]: {
        ...prev[target],
        isSleeping: nextSleeping,
        speech: nextSleeping
          ? 'Hora da soneca na caminha... zZz 🌙'
          : 'Acordei com energia renovada! ☀️',
      },
    }));
    showToast(
      nextSleeping
        ? `${state.nicknames[target]} foi tirar uma soneca na caminha! 🌙`
        : `${state.nicknames[target]} acordou da soneca! ☀️`
    );
  };

  const handleFeedCat = (target: PlayerRole, foodId: string) => {
    const qty = Number(state.inventories[myRole]?.[foodId] || 0);
    if (qty <= 0) {
      showToast('Ração esgotada no Armazém! Visite o Mercado.');
      sfx.error();
      return;
    }
    const def = FOOD_ITEMS.find((f) => f.id === foodId);
    if (!def) return;

    const isPartner = target !== myRole;
    sfx.purr();
    patchState((prev) => {
      const nextInv = { ...prev.inventories[myRole] };
      nextInv[foodId] = Math.max(0, Number(nextInv[foodId] || 0) - 1);
      return {
        inventories: {
          ...prev.inventories,
          [myRole]: nextInv,
        },
        loveScore: Math.min(100, prev.loveScore + (isPartner ? 4 : 1)),
        [target]: {
          ...prev[target],
          hunger: Math.min(100, prev[target].hunger + def.hunger),
          happiness: Math.min(100, prev[target].happiness + def.joy),
          energy: Math.min(100, prev[target].energy + 8),
          expression: 'pet' as const,
          speech: `Nham nham! ${def.name} delicioso! ${def.icon}`,
        },
      };
    });

    if (petTimerRef.current[target]) clearTimeout(petTimerRef.current[target]!);
    petTimerRef.current[target] = setTimeout(() => {
      patchState((prev) => ({
        [target]: {
          ...prev[target],
          expression: 'normal' as const,
        },
      }));
    }, 1800);

    showToast(`${def.icon} ${def.name} entregue para ${state.nicknames[target]}!`);
  };

  const handleBuyFood = (foodId: string, qty = 1) => {
    const count = Math.max(1, Math.floor(qty));
    const def = FOOD_ITEMS.find((f) => f.id === foodId);
    if (!def) return;
    const totalCost = def.price * count;
    if (state.wallets[myRole].paws < totalCost) {
      showToast('Patinhas 🐾 insuficientes! Jogue nas Olimpíadas para ganhar.');
      sfx.error();
      return;
    }
    sfx.buy();
    patchState((prev) => ({
      wallets: {
        ...prev.wallets,
        [myRole]: {
          ...prev.wallets[myRole],
          paws: prev.wallets[myRole].paws - totalCost,
        },
      },
      inventories: {
        ...prev.inventories,
        [myRole]: {
          ...prev.inventories[myRole],
          [foodId]: Number(prev.inventories[myRole]?.[foodId] || 0) + count,
        },
      },
    }));
    showToast(`Comprou ${count}x ${def.icon} ${def.name}! Confira no Armazém 🎒.`);
  };

  const handleEquipOrBuy = (
    itemId: string,
    type: 'outfit' | 'pupil' | 'eyeShape' | 'accessory' | 'breed' | 'mouth' | 'bed',
    val: string,
    price: number,
    currency: 'fish' | 'couple'
  ) => {
    const unlocked = state.unlockedItems[myRole] || [];
    const alreadyUnlocked = unlocked.includes(itemId) || price === 0;

    if (!alreadyUnlocked) {
      if (currency === 'couple') {
        if (state.wallets[myRole].coupleCoins < price) {
          showToast(`Você precisa de ${price} 💖 Medalhas do Partido! Valide o Ponto Diário.`);
          sfx.error();
          return;
        }
      } else if (state.wallets[myRole].fish < price) {
        showToast(`Você precisa de ${price} 🐟 Peixes do Estado!`);
        sfx.error();
        return;
      }
    }

    sfx.win();
    patchState((prev) => {
      const curWallet = prev.wallets[myRole];
      const nextWallet = alreadyUnlocked
        ? curWallet
        : currency === 'couple'
        ? { ...curWallet, coupleCoins: curWallet.coupleCoins - price }
        : { ...curWallet, fish: curWallet.fish - price };

      const prevUnlocked = prev.unlockedItems[myRole] || [];
      const nextUnlocked = prevUnlocked.includes(itemId)
        ? prevUnlocked
        : [...prevUnlocked, itemId];

      return {
        wallets: {
          ...prev.wallets,
          [myRole]: nextWallet,
        },
        unlockedItems: {
          ...prev.unlockedItems,
          [myRole]: nextUnlocked,
        },
        [myRole]: {
          ...prev[myRole],
          [type]: val,
        },
      };
    });
    showToast(alreadyUnlocked ? 'Visual equipado com estilo!' : 'Novo item desbloqueado e vestido! ✨');
  };

  const handleApplyColor = (
    target: 'outfit' | 'accessory' | 'eyeShape' | 'pupil' | 'bed',
    hex: string,
    costFish: number
  ) => {
    if (state.wallets[myRole].fish < costFish) {
      showToast(`Tintura custa ${costFish} 🐟 Peixe do Estado!`);
      sfx.error();
      return;
    }
    const colorFieldMap: Record<
      'outfit' | 'accessory' | 'eyeShape' | 'pupil' | 'bed',
      'outfitColor' | 'accessoryColor' | 'eyeColor' | 'pupilColor' | 'bedColor'
    > = {
      outfit: 'outfitColor',
      accessory: 'accessoryColor',
      eyeShape: 'eyeColor',
      pupil: 'pupilColor',
      bed: 'bedColor',
    };
    sfx.move();
    patchState((prev) => ({
      wallets: {
        ...prev.wallets,
        [myRole]: {
          ...prev.wallets[myRole],
          fish: prev.wallets[myRole].fish - costFish,
        },
      },
      [myRole]: {
        ...prev[myRole],
        [colorFieldMap[target]]: hex,
      },
    }));
    showToast('Tinta aplicada ao visual revolucionário! 🎨');
  };

  const handleValidateSyncCode = (code: string): boolean => {
    const today = getTodayDateString();
    const partnerRole: PlayerRole = myRole === 'cat1' ? 'cat2' : 'cat1';
    const expectedCode = generateDailyCodeForRole(partnerRole, today);
    if (code !== expectedCode) {
      showToast('Código incorreto! Confira o código de 6 dígitos do seu Camarada.');
      sfx.error();
      return false;
    }

    if (state.presence.syncedToday && state.presence.lastSyncedDate === today) {
      showToast('O Ponto Diário de hoje já foi validado pelo casal! 💖');
      return true;
    }

    sfx.win();
    patchState((prev) => ({
      presence: {
        ...prev.presence,
        syncedToday: true,
        lastSyncedDate: today,
      },
      streak: {
        current: prev.streak.current + 1,
        best: Math.max(prev.streak.best, prev.streak.current + 1),
        totalDays: prev.streak.totalDays + 1,
      },
      wallets: {
        cat1: { ...prev.wallets.cat1, coupleCoins: prev.wallets.cat1.coupleCoins + 1 },
        cat2: { ...prev.wallets.cat2, coupleCoins: prev.wallets.cat2.coupleCoins + 1 },
      },
      loveScore: Math.min(100, prev.loveScore + 10),
    }));
    showToast('Ponto do Sindicato validado! +1 💖 Medalha do Partido para ambos!');
    return true;
  };

  const handleSendChat = (text: string) => {
    const sent = sendSocket({ type: 'chat:send', text });
    if (!sent) {
      const now = new Date();
      patchState((prev) => ({
        letters: [
          ...prev.letters.slice(-79),
          {
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            from: myRole,
            authorName: prev.nicknames[myRole],
            text,
            timestamp: Date.now(),
            timeFormatted: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ],
      }));
    }
    sfx.move();
  };

  const handleAwardPaws = useCallback(
    (role: PlayerRole, amount: number) => {
      if (amount <= 0) return;
      patchState((prev) => ({
        wallets: {
          ...prev.wallets,
          [role]: {
            ...prev.wallets[role],
            paws: prev.wallets[role].paws + amount,
          },
        },
      }));
    },
    [patchState]
  );

  const handleRecordSkyHopScore = useCallback(
    (entry: SkyHopLeaderboardEntry) => {
      patchState((prev) => ({
        skyHopLeaderboard: recordSkyHopLeaderboard(prev.skyHopLeaderboard || [], entry, 10),
      }));
    },
    [patchState]
  );

  const handleUpdateGallery = useCallback(
    (nextItems: GalleryExhibit[]) => {
      patchState(() => ({
        galleryItems: nextItems,
      }));
    },
    [patchState]
  );

  const handleUpdateDriveFolder = useCallback(
    (folder: GalleryDriveFolderConfig | null) => {
      patchState(() => ({
        galleryDriveFolder: folder,
      }));
    },
    [patchState]
  );

  const handleAchievementEvent = useCallback(
    (role: PlayerRole, event: AchievementEvent) => {
      patchState((prev) => {
        const res = applyAchievementEvent(
          prev.achievements,
          prev.achievementStats,
          role,
          event
        );
        return {
          achievements: res.achievements,
          achievementStats: res.achievementStats,
        };
      });
    },
    [patchState]
  );

  // Toast freshly unlocked achievements and queue celebration for the Conquistas screen
  const myAchievementsMap = state.achievements?.[myRole];
  useEffect(() => {
    if (!isLoggedIn || !myAchievementsMap) return;
    const freshDefs = ACHIEVEMENTS.filter((def) => {
      const ts = myAchievementsMap[def.id];
      return (
        typeof ts === 'number' &&
        ts >= sessionStartRef.current - 5000 &&
        !toastedAchievementIdsRef.current.has(`${myRole}:${def.id}`)
      );
    });
    if (freshDefs.length === 0) return;
    for (const def of freshDefs) {
      toastedAchievementIdsRef.current.add(`${myRole}:${def.id}`);
    }
    const freshIds = freshDefs.map((a) => a.id);
    setPendingAchievementCelebrations((prev) => ({
      ...prev,
      [myRole]: [...new Set([...prev[myRole], ...freshIds])],
    }));
    const names = freshDefs.map((a) => `${a.icon} ${a.title}`).join(' · ');
    sfx.win();
    showToast(`🏆 Nova Conquista: ${names}`);
  }, [isLoggedIn, myRole, myAchievementsMap, showToast]);

  const handleConsumeAchievementCelebrations = useCallback((role: PlayerRole, ids: string[]) => {
    if (ids.length === 0) return;
    const consumed = new Set(ids);
    setPendingAchievementCelebrations((prev) => {
      const remaining = prev[role].filter((id) => !consumed.has(id));
      if (remaining.length === prev[role].length) return prev;
      return { ...prev, [role]: remaining };
    });
  }, []);

  const handleRecordOutcome = useCallback(
    (outcome: MatchScoreOutcome) => {
      const sent = sendSocket({ type: 'score:record', outcome });
      if (sent) {
        setState((prev) => ({
          ...prev,
          scores: applyScoreOutcome(prev.scores, outcome),
        }));
        return;
      }
      patchState((prev) => ({
        scores: applyScoreOutcome(prev.scores, outcome),
      }));
    },
    [sendSocket, patchState, setState]
  );

  const handleLaunchGame = (game: MinigameId, mode: MinigamePlayMode = 'bot') => {
    setActiveGame({ id: game, mode });
    sfx.select();
  };

  // Broadcast live active-game presence when player opens/closes a minigame
  useEffect(() => {
    if (!isLoggedIn) return;
    const status = activeGame
      ? {
          game: activeGame.id,
          mode: activeGame.mode,
          label: GAME_META_LABELS[activeGame.id].label,
          icon: GAME_META_LABELS[activeGame.id].icon,
          updatedAt: Date.now(),
        }
      : null;

    setState((prev) => ({
      ...prev,
      activeGames: {
        cat1: prev.activeGames?.cat1 || null,
        cat2: prev.activeGames?.cat2 || null,
        [myRole]: status,
      },
    }));
    sendSocket({ type: 'presence:game', active: status });
  }, [isLoggedIn, activeGame, myRole, connected, sendSocket, setState]);

  // Swipe gesture handlers (touch & trackpad)
  const shouldIgnoreSwipe = (target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    if (!el) return false;
    if (el.closest('[data-no-swipe="true"]')) return true;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isLoggedIn || syncOpen || activeGame || e.touches.length !== 1) return;
    if (shouldIgnoreSwipe(e.target)) return;
    const t = e.touches[0];
    swipeStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now(), locked: null };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const start = swipeStartRef.current;
    if (!start || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;

    if (!start.locked) {
      if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        start.locked = 'x';
        setIsDragging(true);
      } else if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) {
        start.locked = 'y';
      }
    }

    if (start.locked === 'x') {
      const atStartEdge = activeIndex === 0 && dx > 0;
      const atEndEdge = activeIndex === SCREEN_TABS.length - 1 && dx < 0;
      setDragOffsetPx(atStartEdge || atEndEdge ? dx * 0.25 : dx);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || start.locked !== 'x') {
      setDragOffsetPx(0);
      setIsDragging(false);
      return;
    }
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const elapsed = Math.max(1, Date.now() - start.time);
    const velocity = Math.abs(dx) / elapsed;

    if (Math.abs(dx) > 60 || (Math.abs(dx) > 25 && velocity > 0.45)) {
      stepTab(dx < 0 ? 1 : -1);
    } else {
      setDragOffsetPx(0);
      setIsDragging(false);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!isLoggedIn || syncOpen || adminFishOpen || activeGame) return;
    if (shouldIgnoreSwipe(e.target)) return;
    if (Math.abs(e.deltaX) > 36 && Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.4) {
      const now = Date.now();
      if (now - wheelCooldownRef.current < 420) return;
      wheelCooldownRef.current = now;
      stepTab(e.deltaX > 0 ? 1 : -1);
    }
  };

  const today = getTodayDateString();
  const isSyncedToday =
    state.presence.syncedToday && state.presence.lastSyncedDate === today;

  return (
    <div
      className={`h-[100dvh] w-full flex flex-col items-center relative overflow-hidden ${
        vp.isCompactLandscape
          ? `px-2 pt-1.5 ${dockHidden ? 'pb-11' : 'pb-16'} gap-1`
          : `px-2 sm:px-4 pt-2 sm:pt-3 ${dockHidden ? 'pb-11 sm:pb-12' : 'pb-24 sm:pb-28'} gap-2 sm:gap-3`
      }`}
    >
      {/* Floating Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[150] bg-red-900 text-amber-100 border-2 border-amber-300 px-4 py-2 rounded-2xl shadow-2xl text-xs sm:text-sm font-bold max-w-[92vw] text-center"
        >
          {toast}
        </div>
      )}

      <HeaderBar
        myRole={myRole}
        myNick={state.nicknames[myRole]}
        partnerNick={state.nicknames[myRole === 'cat1' ? 'cat2' : 'cat1']}
        partnerActiveGame={state.activeGames?.[myRole === 'cat1' ? 'cat2' : 'cat1'] || null}
        wallet={state.wallets[myRole]}
        connected={connected}
        isSyncedToday={isSyncedToday}
        lettersCount={state.letters.length}
        muted={muted}
        vp={vp}
        isAdmin={isAdmin}
        onOpenAdminFish={() => setAdminFishOpen(true)}
        onClaimDaily={handleClaimDaily}
        onOpenSync={() => setSyncOpen(true)}
        onToggleIdentity={handleToggleIdentity}
        onLogout={handleLogout}
        onOpenLetters={() => goToTab('radio')}
        onToggleMute={handleToggleMute}
      />

      {/* Horizontal Swipeable Screens Viewport */}
      <div
        className="w-full flex-1 min-h-0 relative overflow-clip flex items-center"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {/* Subtle Desktop Edge Navigation Chevrons */}
        {activeIndex > 0 && (
          <button
            type="button"
            onClick={() => stepTab(-1)}
            aria-label={`Tela anterior: ${SCREEN_TABS[activeIndex - 1].label}`}
            className="hidden lg:flex items-center justify-center w-10 h-10 rounded-full bg-[#fff8ed]/90 hover:bg-amber-200 border-2 border-[#2b1111] shadow-md absolute left-2 z-30 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 text-red-950" />
          </button>
        )}
        {activeIndex < SCREEN_TABS.length - 1 && (
          <button
            type="button"
            onClick={() => stepTab(1)}
            aria-label={`Próxima tela: ${SCREEN_TABS[activeIndex + 1].label}`}
            className="hidden lg:flex items-center justify-center w-10 h-10 rounded-full bg-[#fff8ed]/90 hover:bg-amber-200 border-2 border-[#2b1111] shadow-md absolute right-2 z-30 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5 text-red-950" />
          </button>
        )}

        <div
          className={`flex w-full h-full ${
            isDragging ? '' : 'transition-transform duration-300 ease-out motion-reduce:transition-none'
          }`}
          style={{
            transform: `translate3d(calc(-${activeIndex * 100}% + ${dragOffsetPx}px), 0, 0)`,
          }}
        >
          {/* 0. Jardim */}
          <div className="w-full shrink-0 h-full overflow-y-auto custom-scroll flex flex-col items-center px-1 sm:px-3 py-1">
            <div className="w-full my-auto flex justify-center">
              <GardenStage
                state={state}
                myRole={myRole}
                vp={vp}
                onPetCat={handlePetCat}
                onToggleSleep={handleToggleSleep}
                onOpenDiary={() => goToTab('partido')}
                onOpenLetters={() => goToTab('radio')}
              />
            </div>
          </div>

          {/* 1. Armazém */}
          <div className="w-full shrink-0 h-full overflow-y-auto custom-scroll flex flex-col items-center px-1 sm:px-3 py-1">
            <div className="w-full my-auto flex justify-center">
              <WarehouseScreen
                state={state}
                myRole={myRole}
                vp={vp}
                onFeedCat={handleFeedCat}
                onGoToMarket={() => goToTab('mercado')}
              />
            </div>
          </div>

          {/* 2. Mercado */}
          <div className="w-full shrink-0 h-full overflow-y-auto custom-scroll flex flex-col items-center px-1 sm:px-3 py-1">
            <div className="w-full my-auto flex justify-center">
              <MarketScreen
                paws={state.wallets[myRole].paws}
                inventory={state.inventories[myRole] || {}}
                onBuyFood={handleBuyFood}
                onGoToWarehouse={() => goToTab('armazem')}
              />
            </div>
          </div>

          {/* 3. Jogos */}
          <div className="w-full shrink-0 h-full overflow-y-auto custom-scroll flex flex-col items-center px-1 sm:px-3 py-1">
            <div className="w-full my-auto flex justify-center">
              <GamesScreen
                state={state}
                myRole={myRole}
                onLaunchGame={handleLaunchGame}
                unlockedCount={Object.keys(state.achievements?.[myRole] || {}).length}
                totalAchievements={ACHIEVEMENTS.length}
                onOpenAchievements={() => goToTab('conquistas')}
              />
            </div>
          </div>

          {/* 4. Galeria & Museu */}
          <div className="w-full shrink-0 h-full overflow-y-auto custom-scroll flex flex-col items-center px-1 sm:px-3 py-1">
            <div className="w-full my-auto flex justify-center">
              <GalleryScreen
                state={state}
                myRole={myRole}
                isActiveTab={
                  activeTab === 'galeria' && isLoggedIn && !syncOpen && !adminFishOpen && !activeGame
                }
                onUpdateGallery={handleUpdateGallery}
                onUpdateDriveFolder={handleUpdateDriveFolder}
                onToast={showToast}
              />
            </div>
          </div>

          {/* 5. Partido */}
          <div className="w-full shrink-0 h-full overflow-y-auto custom-scroll flex flex-col items-center px-1 sm:px-3 py-1">
            <div className="w-full my-auto flex justify-center">
              <PartyScreen
                myRole={myRole}
                state={state}
                hasRoomPassword={hasRoomPassword}
                canManageAccount={Boolean(idToken)}
                isAdmin={isAdmin}
                onOpenAdminFish={() => setAdminFishOpen(true)}
                onOpenSync={() => setSyncOpen(true)}
                onUpdateNickname={handleUpdateNickname}
                onUpdateRoomPassword={handleUpdateRoomPassword}
              />
            </div>
          </div>

          {/* 5. Rádio */}
          <div className="w-full shrink-0 h-full overflow-y-auto custom-scroll flex flex-col items-center px-1 sm:px-3 py-1">
            <div className="w-full my-auto flex justify-center">
              <RadioScreen
                myRole={myRole}
                state={state}
                onSend={handleSendChat}
              />
            </div>
          </div>

          {/* 6. Ateliê */}
          <div className="w-full shrink-0 h-full overflow-y-auto custom-scroll flex flex-col items-center px-1 sm:px-3 py-1">
            <div className="w-full my-auto flex justify-center">
              <AtelierScreen
                key={`${myRole}_atelier`}
                myCat={state[myRole]}
                wallet={state.wallets[myRole]}
                unlockedItems={state.unlockedItems[myRole] || []}
                onEquipOrBuy={handleEquipOrBuy}
                onApplyColor={handleApplyColor}
              />
            </div>
          </div>

          {/* 7. Conquistas */}
          <div className="w-full shrink-0 h-full overflow-y-auto custom-scroll flex flex-col items-center px-1 sm:px-3 py-1">
            <div className="w-full my-auto flex justify-center">
              <AchievementsScreen
                myRole={myRole}
                state={state}
                isActiveTab={
                  activeTab === 'conquistas' &&
                  isLoggedIn &&
                  !syncOpen &&
                  !adminFishOpen &&
                  !activeGame
                }
                pendingCelebrationIds={pendingAchievementCelebrations[myRole]}
                onConsumeCelebrations={handleConsumeAchievementCelebrations}
              />
            </div>
          </div>
        </div>
      </div>

      <BottomDock
        vp={vp}
        activeTab={activeTab}
        lettersCount={state.letters.length}
        isHidden={dockHidden}
        onSelectTab={goToTab}
        onToggleHidden={() => setDockHidden((v) => !v)}
      />

      {/* Core Overlays */}
      <LoginModal
        open={!isLoggedIn}
        hasRoomPassword={hasRoomPassword}
        firebaseUser={firebaseUser}
        idToken={idToken}
        authReady={authReady}
        linkedRole={linkedRole}
        onLoginSuccess={handleLoginSuccess}
      />

      <SyncModal
        open={syncOpen}
        myRole={myRole}
        onClose={() => setSyncOpen(false)}
        onValidateCode={handleValidateSyncCode}
        onToast={showToast}
      />

      {isAdmin && (
        <AdminFishModal
          open={adminFishOpen}
          state={state}
          onClose={() => setAdminFishOpen(false)}
          onSaveHack={handleAdminSaveHack}
          onSaveFish={handleAdminSaveFish}
        />
      )}

      {/* Minigames */}
      <JokenpoModal
        open={activeGame?.id === 'jokenpo'}
        initialMode={activeGame?.mode || 'bot'}
        myRole={myRole}
        state={state}
        onClose={() => setActiveGame(null)}
        onSendSocket={sendSocket}
        onAwardPaws={handleAwardPaws}
        onRecordOutcome={handleRecordOutcome}
        onAchievementEvent={handleAchievementEvent}
      />

      <TicTacToeModal
        open={activeGame?.id === 'tictactoe'}
        initialMode={activeGame?.mode || 'bot'}
        myRole={myRole}
        state={state}
        onClose={() => setActiveGame(null)}
        onSendSocket={sendSocket}
        onAwardPaws={handleAwardPaws}
        onRecordOutcome={handleRecordOutcome}
        onAchievementEvent={handleAchievementEvent}
      />

      <ReactionModal
        open={activeGame?.id === 'reaction'}
        initialMode={activeGame?.mode || 'bot'}
        myRole={myRole}
        state={state}
        onClose={() => setActiveGame(null)}
        onSendSocket={sendSocket}
        onAwardPaws={handleAwardPaws}
        onRecordOutcome={handleRecordOutcome}
        onAchievementEvent={handleAchievementEvent}
      />

      <AirHockeyModal
        open={activeGame?.id === 'airhockey'}
        initialMode={activeGame?.mode || 'bot'}
        myRole={myRole}
        state={state}
        airHockeyFrame={airHockeyFrame}
        vp={vp}
        onClose={() => setActiveGame(null)}
        onSendSocket={sendSocket}
        onAwardPaws={handleAwardPaws}
        onRecordOutcome={handleRecordOutcome}
        onAchievementEvent={handleAchievementEvent}
      />

      <SkyHopModal
        open={activeGame?.id === 'skyhop'}
        myRole={myRole}
        myNick={state.nicknames[myRole]}
        myCat={state[myRole]}
        leaderboard={state.skyHopLeaderboard || []}
        vp={vp}
        onClose={() => setActiveGame(null)}
        onAwardPaws={handleAwardPaws}
        onRecordScore={handleRecordSkyHopScore}
        onAchievementEvent={handleAchievementEvent}
      />

      <SudokuModal
        open={activeGame?.id === 'sudoku'}
        initialMode={activeGame?.mode || 'bot'}
        myRole={myRole}
        state={state}
        onClose={() => setActiveGame(null)}
        onSendSocket={sendSocket}
        onAwardPaws={handleAwardPaws}
        onRecordOutcome={handleRecordOutcome}
        onAchievementEvent={handleAchievementEvent}
      />

      <SolitaireModal
        open={activeGame?.id === 'solitaire'}
        myRole={myRole}
        vp={vp}
        onClose={() => setActiveGame(null)}
        onAwardPaws={handleAwardPaws}
        onRecordOutcome={handleRecordOutcome}
        onAchievementEvent={handleAchievementEvent}
      />

      <TermoModal
        open={activeGame?.id === 'termo'}
        myRole={myRole}
        onClose={() => setActiveGame(null)}
        onAwardPaws={handleAwardPaws}
        onRecordOutcome={handleRecordOutcome}
        onAchievementEvent={handleAchievementEvent}
      />

      {(activeGame?.id === 'chess' || activeGame?.id === 'checkers') && (
        <ChessCheckersModal
          open
          initialBoardGame={activeGame.id}
          initialPlayMode={activeGame.mode}
          myRole={myRole}
          state={state}
          vp={vp}
          onClose={() => setActiveGame(null)}
          onSendSocket={sendSocket}
          onAwardPaws={handleAwardPaws}
          onRecordOutcome={handleRecordOutcome}
          onAchievementEvent={handleAchievementEvent}
        />
      )}
    </div>
  );
}
