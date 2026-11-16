import type { PlayerRole, SharedState, Wallet } from '../types/game.ts';

export const ADMIN_OWNER_EMAIL = 'advbneto29@gmail.com';
export const MAX_ADMIN_FISH = 999999;
export const MAX_ADMIN_CURRENCY = 999999;
export const MAX_ADMIN_DAYS = 99999;
export const MAX_ADMIN_SCORE = 99999;
export const MAX_ADMIN_FOOD = 9999;

export interface AdminAccessCheck {
  email?: string | null;
  role: PlayerRole;
  isDevBypass?: boolean;
}

export interface AdminCatHackValues {
  wallet: Wallet;
  hunger: number;
  energy: number;
  happiness: number;
  speech: string;
  inventory: Record<string, number>;
}

export interface AdminFullHackPayload {
  streak: {
    current: number;
    best: number;
    totalDays: number;
  };
  syncedToday: boolean;
  loveScore: number;
  scores: {
    cat1Wins: number;
    cat2Wins: number;
    ties: number;
  };
  cat1: AdminCatHackValues;
  cat2: AdminCatHackValues;
}

export function isAdminAccount({ email, role, isDevBypass }: AdminAccessCheck): boolean {
  if (role !== 'cat1') return false;
  if (isDevBypass) return true;
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN_OWNER_EMAIL;
}

export function parseAdminFishAmount(
  raw: unknown
): { ok: true; value: number } | { ok: false; error: string } {
  if (raw === '' || raw === null || raw === undefined) {
    return { ok: false, error: 'Digite uma quantidade de peixinhos.' };
  }
  const num = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    return { ok: false, error: 'A quantidade precisa ser um número inteiro válido.' };
  }
  if (num < 0) {
    return { ok: false, error: 'O valor de peixinhos não pode ser negativo.' };
  }
  if (num > MAX_ADMIN_FISH) {
    return { ok: false, error: `O valor máximo permitido é ${MAX_ADMIN_FISH} peixinhos.` };
  }
  return { ok: true, value: num };
}

export function applyAdminFishEdit(
  state: SharedState,
  targetRole: PlayerRole,
  fishAmount: number
): SharedState {
  return {
    ...state,
    lastStatsUpdateTime: Date.now(),
    wallets: {
      ...state.wallets,
      [targetRole]: {
        ...state.wallets[targetRole],
        fish: fishAmount,
      },
    },
  };
}

function clampInt(raw: unknown, min: number, max: number, fallback: number): number {
  const num = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim());
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(num)));
}

function sanitizeInventoryHack(
  raw: Record<string, unknown> | undefined,
  fallback: Record<string, number>
): Record<string, number> {
  const next: Record<string, number> = { ...fallback };
  if (!raw || typeof raw !== 'object') return next;
  for (const [key, val] of Object.entries(raw)) {
    const cleanKey = String(key).trim().slice(0, 64);
    if (!cleanKey) continue;
    next[cleanKey] = clampInt(val, 0, MAX_ADMIN_FOOD, next[cleanKey] || 0);
  }
  return next;
}

export function extractAdminHackDraft(state: SharedState): AdminFullHackPayload {
  return {
    streak: {
      current: state.streak?.current ?? 0,
      best: state.streak?.best ?? 0,
      totalDays: state.streak?.totalDays ?? 0,
    },
    syncedToday: Boolean(state.presence?.syncedToday),
    loveScore: state.loveScore ?? 100,
    scores: {
      cat1Wins: state.scores?.cat1Wins ?? 0,
      cat2Wins: state.scores?.cat2Wins ?? 0,
      ties: state.scores?.ties ?? 0,
    },
    cat1: {
      wallet: { ...state.wallets.cat1 },
      hunger: state.cat1.hunger,
      energy: state.cat1.energy,
      happiness: state.cat1.happiness,
      speech: state.cat1.speech || '',
      inventory: { ...(state.inventories.cat1 || {}) },
    },
    cat2: {
      wallet: { ...state.wallets.cat2 },
      hunger: state.cat2.hunger,
      energy: state.cat2.energy,
      happiness: state.cat2.happiness,
      speech: state.cat2.speech || '',
      inventory: { ...(state.inventories.cat2 || {}) },
    },
  };
}

export function applyAdminFullHack(
  state: SharedState,
  rawPayload: Partial<AdminFullHackPayload>,
  todayDateStr?: string
): SharedState {
  const curStreak = clampInt(
    rawPayload.streak?.current,
    0,
    MAX_ADMIN_DAYS,
    state.streak.current
  );
  const bestStreak = Math.max(
    curStreak,
    clampInt(rawPayload.streak?.best, 0, MAX_ADMIN_DAYS, state.streak.best)
  );
  const totalDays = Math.max(
    curStreak,
    clampInt(rawPayload.streak?.totalDays, 0, MAX_ADMIN_DAYS, state.streak.totalDays)
  );

  const syncedToday =
    typeof rawPayload.syncedToday === 'boolean'
      ? rawPayload.syncedToday
      : state.presence.syncedToday;

  const today =
    todayDateStr ||
    new Date().toISOString().slice(0, 10);

  const buildRoleCat = (role: PlayerRole) => {
    const incoming = rawPayload[role];
    const prevCat = state[role];
    if (!incoming) return prevCat;
    return {
      ...prevCat,
      hunger: clampInt(incoming.hunger, 0, 100, prevCat.hunger),
      energy: clampInt(incoming.energy, 0, 100, prevCat.energy),
      happiness: clampInt(incoming.happiness, 0, 100, prevCat.happiness),
      speech:
        typeof incoming.speech === 'string'
          ? incoming.speech.slice(0, 160)
          : prevCat.speech,
    };
  };

  const buildRoleWallet = (role: PlayerRole): Wallet => {
    const incoming = rawPayload[role]?.wallet;
    const prevWallet = state.wallets[role];
    if (!incoming) return prevWallet;
    return {
      fish: clampInt(incoming.fish, 0, MAX_ADMIN_CURRENCY, prevWallet.fish),
      paws: clampInt(incoming.paws, 0, MAX_ADMIN_CURRENCY, prevWallet.paws),
      coupleCoins: clampInt(
        incoming.coupleCoins,
        0,
        MAX_ADMIN_CURRENCY,
        prevWallet.coupleCoins
      ),
    };
  };

  const buildRoleInventory = (role: PlayerRole): Record<string, number> => {
    const incoming = rawPayload[role]?.inventory;
    const prevInv = state.inventories[role] || {};
    return sanitizeInventoryHack(incoming, prevInv);
  };

  const cat1Wins = clampInt(
    rawPayload.scores?.cat1Wins,
    0,
    MAX_ADMIN_SCORE,
    state.scores.cat1Wins
  );
  const cat2Wins = clampInt(
    rawPayload.scores?.cat2Wins,
    0,
    MAX_ADMIN_SCORE,
    state.scores.cat2Wins
  );
  const ties = clampInt(
    rawPayload.scores?.ties,
    0,
    MAX_ADMIN_SCORE,
    state.scores.ties
  );

  return {
    ...state,
    lastStatsUpdateTime: Math.max((state.lastStatsUpdateTime || 0) + 1, Date.now()),
    loveScore: clampInt(rawPayload.loveScore, 0, 100, state.loveScore),
    streak: {
      current: curStreak,
      best: bestStreak,
      totalDays,
    },
    presence: {
      ...state.presence,
      syncedToday,
      lastSyncedDate: syncedToday
        ? state.presence.lastSyncedDate || today
        : state.presence.lastSyncedDate,
    },
    scores: {
      ...state.scores,
      cat1Wins,
      cat2Wins,
      cat1Losses: cat2Wins,
      cat2Losses: cat1Wins,
      ties,
    },
    wallets: {
      cat1: buildRoleWallet('cat1'),
      cat2: buildRoleWallet('cat2'),
    },
    inventories: {
      cat1: buildRoleInventory('cat1'),
      cat2: buildRoleInventory('cat2'),
    },
    cat1: buildRoleCat('cat1'),
    cat2: buildRoleCat('cat2'),
  };
}
