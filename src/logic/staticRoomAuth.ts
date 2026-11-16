import type { PlayerRole } from '../types/game.ts';

export interface StaticUidResolutionParams {
  typedNick: string;
  savedNicknames: Record<PlayerRole, string>;
  uid: string;
  cat1Uid: string;
  cat2Uid: string;
}

export type StaticUidResolutionResult =
  | { ok: true; role: PlayerRole; isNewBinding: boolean }
  | { ok: false; error: string };

export function resolveRoleByUidAndNick(
  params: StaticUidResolutionParams
): StaticUidResolutionResult {
  const clean = params.typedNick.trim();
  if (!clean) {
    return { ok: false, error: 'Digite seu último nick para confirmar sua identidade.' };
  }

  const typedLower = clean.toLowerCase();
  const cat1Lower = (params.savedNicknames.cat1 || '').trim().toLowerCase();
  const cat2Lower = (params.savedNicknames.cat2 || '').trim().toLowerCase();

  if (params.cat1Uid && params.cat1Uid === params.uid) {
    if (typedLower !== cat1Lower) {
      return {
        ok: false,
        error: 'O nick digitado não confere com o último nick associado a esta conta Google.',
      };
    }
    return { ok: true, role: 'cat1', isNewBinding: false };
  }

  if (params.cat2Uid && params.cat2Uid === params.uid) {
    if (typedLower !== cat2Lower) {
      return {
        ok: false,
        error: 'O nick digitado não confere com o último nick associado a esta conta Google.',
      };
    }
    return { ok: true, role: 'cat2', isNewBinding: false };
  }

  const candidates: PlayerRole[] = [];
  if (typedLower === cat1Lower) candidates.push('cat1');
  if (typedLower === cat2Lower) candidates.push('cat2');

  if (candidates.length === 0) {
    return {
      ok: false,
      error: 'Nick não encontrado nesta sala. Digite exatamente o seu último nick usado no jardim.',
    };
  }

  for (const candidate of candidates) {
    const slotUid = candidate === 'cat1' ? params.cat1Uid : params.cat2Uid;
    if (!slotUid || slotUid === params.uid) {
      return { ok: true, role: candidate, isNewBinding: true };
    }
  }

  return {
    ok: false,
    error: 'Esse perfil já está vinculado a outra conta Google.',
  };
}
