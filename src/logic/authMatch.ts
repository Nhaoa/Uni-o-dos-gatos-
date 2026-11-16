import { PlayerRole } from '../types/game';

export interface MemberBinding {
  userId: number;
  role: string;
}

export type RoleResolutionResult =
  | { ok: true; role: PlayerRole; isNewBinding: boolean }
  | { ok: false; error: string };

export function resolveRoleByNickAndMembers(params: {
  typedNick: string;
  savedNicknames: Record<PlayerRole, string>;
  userId: number;
  members: MemberBinding[];
}): RoleResolutionResult {
  const clean = params.typedNick.trim();
  if (!clean) {
    return { ok: false, error: 'Digite seu último nick para confirmar sua identidade.' };
  }

  const typedLower = clean.toLowerCase();
  const cat1Lower = (params.savedNicknames.cat1 || '').trim().toLowerCase();
  const cat2Lower = (params.savedNicknames.cat2 || '').trim().toLowerCase();

  const existingForUser = params.members.find((m) => m.userId === params.userId);
  if (existingForUser) {
    const boundRole: PlayerRole = existingForUser.role === 'cat2' ? 'cat2' : 'cat1';
    const expectedLower = boundRole === 'cat1' ? cat1Lower : cat2Lower;
    if (typedLower !== expectedLower) {
      return {
        ok: false,
        error: 'O nick digitado não confere com o último nick associado a esta conta Google.',
      };
    }
    return { ok: true, role: boundRole, isNewBinding: false };
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
    const claimedByOther = params.members.some(
      (m) => m.role === candidate && m.userId !== params.userId
    );
    if (!claimedByOther) {
      return { ok: true, role: candidate, isNewBinding: true };
    }
  }

  return {
    ok: false,
    error: 'Esse perfil já está vinculado a outra conta Google.',
  };
}

export function validateNicknameChange(params: {
  newNickname: string;
  role: PlayerRole;
  savedNicknames: Record<PlayerRole, string>;
}): { ok: true; nickname: string } | { ok: false; error: string } {
  const clean = params.newNickname.trim().slice(0, 18);
  if (clean.length < 2) {
    return { ok: false, error: 'O nick deve ter entre 2 e 18 caracteres.' };
  }
  const otherRole: PlayerRole = params.role === 'cat1' ? 'cat2' : 'cat1';
  const otherLower = (params.savedNicknames[otherRole] || '').trim().toLowerCase();
  if (clean.toLowerCase() === otherLower) {
    return { ok: false, error: 'Esse nick já está sendo usado pelo outro jogador.' };
  }
  return { ok: true, nickname: clean };
}
