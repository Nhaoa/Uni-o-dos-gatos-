import type { PlayerRole, SharedState } from '../types/game.ts';

export type NormalizedScores = {
  cat1Wins: number;
  cat1Losses: number;
  cat2Wins: number;
  cat2Losses: number;
  ties: number;
};

export type MatchScoreOutcome =
  | { kind: 'pvp_win'; winner: PlayerRole }
  | { kind: 'solo_win'; role: PlayerRole }
  | { kind: 'solo_loss'; role: PlayerRole }
  | { kind: 'tie' };

function toNonNegInt(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.floor(num);
}

export function normalizeScores(raw?: Partial<SharedState['scores']> | null): NormalizedScores {
  return {
    cat1Wins: toNonNegInt(raw?.cat1Wins),
    cat1Losses: toNonNegInt(raw?.cat1Losses),
    cat2Wins: toNonNegInt(raw?.cat2Wins),
    cat2Losses: toNonNegInt(raw?.cat2Losses),
    ties: toNonNegInt(raw?.ties),
  };
}

export function applyScoreOutcome(
  rawScores: Partial<SharedState['scores']> | undefined | null,
  outcome: MatchScoreOutcome
): NormalizedScores {
  const cur = normalizeScores(rawScores);

  switch (outcome.kind) {
    case 'pvp_win': {
      if (outcome.winner === 'cat1') {
        return {
          ...cur,
          cat1Wins: cur.cat1Wins + 1,
          cat2Losses: cur.cat2Losses + 1,
        };
      }
      return {
        ...cur,
        cat2Wins: cur.cat2Wins + 1,
        cat1Losses: cur.cat1Losses + 1,
      };
    }

    case 'solo_win': {
      if (outcome.role === 'cat1') {
        return { ...cur, cat1Wins: cur.cat1Wins + 1 };
      }
      return { ...cur, cat2Wins: cur.cat2Wins + 1 };
    }

    case 'solo_loss': {
      if (outcome.role === 'cat1') {
        return { ...cur, cat1Losses: cur.cat1Losses + 1 };
      }
      return { ...cur, cat2Losses: cur.cat2Losses + 1 };
    }

    case 'tie': {
      return { ...cur, ties: cur.ties + 1 };
    }
  }
}

export function isValidMatchScoreOutcome(raw: unknown): raw is MatchScoreOutcome {
  if (!raw || typeof raw !== 'object') return false;
  const o = raw as Record<string, unknown>;
  if (o.kind === 'tie') return true;
  if (o.kind === 'pvp_win') return o.winner === 'cat1' || o.winner === 'cat2';
  if (o.kind === 'solo_win' || o.kind === 'solo_loss') {
    return o.role === 'cat1' || o.role === 'cat2';
  }
  return false;
}

export function getPlayerScoreSummary(
  rawScores: Partial<SharedState['scores']> | undefined | null,
  role: PlayerRole
): { wins: number; losses: number; ties: number; total: number } {
  const s = normalizeScores(rawScores);
  const wins = role === 'cat1' ? s.cat1Wins : s.cat2Wins;
  const losses = role === 'cat1' ? s.cat1Losses : s.cat2Losses;
  const ties = s.ties;
  return {
    wins,
    losses,
    ties,
    total: wins + losses + ties,
  };
}
