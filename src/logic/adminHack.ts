import type { PlayerRole, SharedState } from '../types/game.ts';

export const ADMIN_OWNER_EMAIL = 'advbneto29@gmail.com';
export const MAX_ADMIN_FISH = 999999;

export interface AdminAccessCheck {
  email?: string | null;
  role: PlayerRole;
  isDevBypass?: boolean;
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
