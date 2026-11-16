import {
  AchievementGameId,
  AchievementRarity,
  PlayerAchievementStats,
  PlayerRole,
} from '../types/game';
import { createDefaultAchievementStats } from './defaultState';

export interface AchievementDefinition {
  id: string;
  game: AchievementGameId;
  title: string;
  description: string;
  rarity: AchievementRarity;
  icon: string;
  accent: string;
  target: number;
  unit?: string;
}

export const ACHIEVEMENT_GAME_LABELS: Record<
  AchievementGameId,
  { label: string; icon: string }
> = {
  skyhop: { label: 'Pula-Pula Sputnik', icon: '🚀' },
  sudoku: { label: 'Sudoku Club', icon: '🔢' },
  solitaire: { label: 'Solitária Felina', icon: '🃏' },
  termo: { label: 'Termo Diário', icon: '🔤' },
  chess: { label: 'Xadrez de Moscou', icon: '♟️' },
  checkers: { label: 'Damas Brasileiras', icon: '⚪' },
  airhockey: { label: 'Air Hockey', icon: '🏒' },
  tictactoe: { label: 'Jogo da Velha', icon: '⭐' },
  jokenpo: { label: 'Jokenpô', icon: '✊' },
  reaction: { label: 'Pata Rápida', icon: '⚡' },
  global: { label: 'Olimpíadas', icon: '🏆' },
};

export const RARITY_META: Record<
  AchievementRarity,
  { label: string; badgeBg: string; badgeText: string; ringColor: string }
> = {
  bronze: {
    label: 'Bronze',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-900',
    ringColor: '#b45309',
  },
  prata: {
    label: 'Prata',
    badgeBg: 'bg-slate-200',
    badgeText: 'text-slate-900',
    ringColor: '#64748b',
  },
  ouro: {
    label: 'Ouro',
    badgeBg: 'bg-yellow-300',
    badgeText: 'text-red-950',
    ringColor: '#eab308',
  },
  cosmico: {
    label: 'Cósmico',
    badgeBg: 'bg-indigo-950',
    badgeText: 'text-amber-200',
    ringColor: '#a855f7',
  },
};

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // SkyHop (9)
  {
    id: 'sky_astronauta_felino',
    game: 'skyhop',
    title: 'Astronauta Felino',
    description: 'Rompa a atmosfera terrestre e alcance 2.000 m até a Lua.',
    rarity: 'bronze',
    icon: '🚀',
    accent: '#38bdf8',
    target: 2000,
    unit: 'm',
  },
  {
    id: 'sky_pioneiro_marte',
    game: 'skyhop',
    title: 'Pioneiro de Marte',
    description: 'Pouse entre as tempestades rubras ao atingir 6.000 m de altitude.',
    rarity: 'prata',
    icon: '🪐',
    accent: '#f87171',
    target: 6000,
    unit: 'm',
  },
  {
    id: 'sky_senhor_aneis',
    game: 'skyhop',
    title: 'Guardião dos Anéis',
    description: 'Cruze os anéis de Saturno superando 12.000 m em um voo.',
    rarity: 'ouro',
    icon: '💫',
    accent: '#facc15',
    target: 12000,
    unit: 'm',
  },
  {
    id: 'sky_mestre_galaxias',
    game: 'skyhop',
    title: 'Mestre das Galáxias',
    description: 'Alcance o espaço profundo de Andrômeda aos 22.000 m.',
    rarity: 'cosmico',
    icon: '🌌',
    accent: '#c084fc',
    target: 22000,
    unit: 'm',
  },
  {
    id: 'sky_combo_cadente',
    game: 'skyhop',
    title: 'Salto Cadente',
    description: 'Acerte 5 saltos perfeitos seguidos no centro das plataformas.',
    rarity: 'bronze',
    icon: '✨',
    accent: '#fbbf24',
    target: 5,
    unit: 'combo',
  },
  {
    id: 'sky_combo_supersonico',
    game: 'skyhop',
    title: 'Miau Supersônico',
    description: 'Mantenha uma sequência impecável de 12 saltos perfeitos.',
    rarity: 'ouro',
    icon: '🌠',
    accent: '#f59e0b',
    target: 12,
    unit: 'combo',
  },
  {
    id: 'sky_pescador_estelar',
    game: 'skyhop',
    title: 'Colecionador Estelar',
    description: 'Acumule 30 Patinhas 🐾 subindo níveis espaciais no Sputnik.',
    rarity: 'prata',
    icon: '🐾',
    accent: '#0ea5e9',
    target: 30,
    unit: '🐾',
  },
  {
    id: 'sky_banquete_cosmico',
    game: 'skyhop',
    title: 'Tesouro Cósmico',
    description: 'Reúna 100 Patinhas 🐾 em expedições espaciais no Sputnik.',
    rarity: 'ouro',
    icon: '💰',
    accent: '#0284c7',
    target: 100,
    unit: '🐾',
  },
  {
    id: 'sky_dobrador_portais',
    game: 'skyhop',
    title: 'Dobrador de Portais',
    description: 'Atravesse 5 portais quânticos durante seus lançamentos.',
    rarity: 'prata',
    icon: '🌀',
    accent: '#22d3ee',
    target: 5,
    unit: 'portais',
  },

  // Xadrez de Moscou (3)
  {
    id: 'chess_estrategista_vermelho',
    game: 'chess',
    title: 'Estrategista Vermelho',
    description: 'Aplique seu primeiro xeque-mate no Xadrez de Moscou.',
    rarity: 'bronze',
    icon: '♟️',
    accent: '#dc2626',
    target: 1,
    unit: 'vitórias',
  },
  {
    id: 'chess_coroacao_real',
    game: 'chess',
    title: 'Coroação Revolucionária',
    description: 'Promova um peão na oitava fileira do tabuleiro.',
    rarity: 'prata',
    icon: '👑',
    accent: '#eab308',
    target: 1,
    unit: 'promoções',
  },
  {
    id: 'chess_mestre_blitz',
    game: 'chess',
    title: 'Mestre do Blitz',
    description: 'Vença uma partida em até 25 lances ou acumule 5 vitórias.',
    rarity: 'ouro',
    icon: '⚡',
    accent: '#f97316',
    target: 5,
    unit: 'vitórias',
  },

  // Damas Brasileiras (3)
  {
    id: 'checkers_salto_duplo',
    game: 'checkers',
    title: 'Salto Felino Duplo',
    description: 'Execute uma captura múltipla encadeada nas Damas.',
    rarity: 'bronze',
    icon: '🔥',
    accent: '#ef4444',
    target: 1,
    unit: 'combos',
  },
  {
    id: 'checkers_dama_voadora',
    game: 'checkers',
    title: 'Dama Voadora',
    description: 'Conquiste sua primeira vitória nas Damas Brasileiras.',
    rarity: 'prata',
    icon: '⚪',
    accent: '#94a3b8',
    target: 1,
    unit: 'vitórias',
  },
  {
    id: 'checkers_lenda_tabuleiro',
    game: 'checkers',
    title: 'Lenda das Diagonais',
    description: 'Some 5 vitórias consagradas nas Damas Brasileiras.',
    rarity: 'ouro',
    icon: '🏅',
    accent: '#eab308',
    target: 5,
    unit: 'vitórias',
  },

  // Air Hockey Siberiano (3)
  {
    id: 'hockey_artilheiro_artico',
    game: 'airhockey',
    title: 'Artilheiro Ártico',
    description: 'Marque 10 gols no rinque de Air Hockey Siberiano.',
    rarity: 'bronze',
    icon: '🏒',
    accent: '#0284c7',
    target: 10,
    unit: 'gols',
  },
  {
    id: 'hockey_rei_gelo',
    game: 'airhockey',
    title: 'Rei do Gelo',
    description: 'Vença uma partida completa até 5 gols no Air Hockey.',
    rarity: 'prata',
    icon: '❄️',
    accent: '#38bdf8',
    target: 1,
    unit: 'vitórias',
  },
  {
    id: 'hockey_muralha_siberiana',
    game: 'airhockey',
    title: 'Muralha Siberiana',
    description: 'Aplique um placar perfeito de 5 a 0 sem sofrer nenhum gol.',
    rarity: 'ouro',
    icon: '🛡️',
    accent: '#2563eb',
    target: 1,
    unit: '5x0',
  },

  // Jogo da Velha Coletivo (2)
  {
    id: 'ttt_trio_harmonia',
    game: 'tictactoe',
    title: 'Trio da Harmonia',
    description: 'Feche 3 linhas vencedoras no Jogo da Velha Coletivo.',
    rarity: 'bronze',
    icon: '⭐',
    accent: '#f59e0b',
    target: 3,
    unit: 'vitórias',
  },
  {
    id: 'ttt_pacto_equilibrio',
    game: 'tictactoe',
    title: 'Pacto de Equilíbrio',
    description: 'Alinhe 3 empates estratégicos em igualdade proletária.',
    rarity: 'prata',
    icon: '🤝',
    accent: '#10b981',
    target: 3,
    unit: 'empates',
  },

  // Jokenpô das Patinhas (2)
  {
    id: 'jokenpo_patinha_sorte',
    game: 'jokenpo',
    title: 'Patinha da Sorte',
    description: 'Vença 3 rodadas seguidas no Jokenpô das Patinhas.',
    rarity: 'bronze',
    icon: '🍀',
    accent: '#16a34a',
    target: 3,
    unit: 'seguidas',
  },
  {
    id: 'jokenpo_mestre_blefe',
    game: 'jokenpo',
    title: 'Mestre do Blefe',
    description: 'Acumule 10 vitórias lendo as patinhas do adversário.',
    rarity: 'ouro',
    icon: '🎭',
    accent: '#be123c',
    target: 10,
    unit: 'vitórias',
  },

  // Pata Rápida Stakhanovista (2)
  {
    id: 'reaction_reflexo_felino',
    game: 'reaction',
    title: 'Reflexo Felino',
    description: 'Toque na tigela dourada em até 260 ms de reação.',
    rarity: 'prata',
    icon: '⚡',
    accent: '#eab308',
    target: 260,
    unit: 'ms',
  },
  {
    id: 'reaction_raio_sovietico',
    game: 'reaction',
    title: 'Raio Soviético',
    description: 'Conquiste 5 vitórias ou reaja em impressionantes 190 ms.',
    rarity: 'ouro',
    icon: '🌩️',
    accent: '#f59e0b',
    target: 5,
    unit: 'vitórias',
  },

  // Sudoku Club (3)
  {
    id: 'sudoku_mente_logica',
    game: 'sudoku',
    title: 'Mente Lógica',
    description: 'Complete seu primeiro desafio de Sudoku em qualquer tamanho.',
    rarity: 'bronze',
    icon: '🔢',
    accent: '#0284c7',
    target: 1,
    unit: 'vitórias',
  },
  {
    id: 'sudoku_mestre_9x9',
    game: 'sudoku',
    title: 'Arquiteto 9×9',
    description: 'Vença um Sudoku 9×9 na dificuldade Difícil ou Especialista.',
    rarity: 'prata',
    icon: '📐',
    accent: '#4f46e5',
    target: 1,
    unit: 'vitórias',
  },
  {
    id: 'sudoku_campeao_duelo',
    game: 'sudoku',
    title: 'Relâmpago Numérico',
    description: 'Vença um Duelo Online de Sudoku ou acumule 5 vitórias.',
    rarity: 'ouro',
    icon: '⚔️',
    accent: '#eab308',
    target: 5,
    unit: 'vitórias',
  },

  // Solitária dos Gatinhos (3)
  {
    id: 'solitaire_pata_real',
    game: 'solitaire',
    title: 'Pata Real',
    description: 'Monte todas as 4 fundações e vença na Solitária dos Gatinhos.',
    rarity: 'bronze',
    icon: '🃏',
    accent: '#059669',
    target: 1,
    unit: 'vitórias',
  },
  {
    id: 'solitaire_estrategista_3',
    game: 'solitaire',
    title: 'Baralho Triplo',
    description: 'Vença uma partida de Solitária no nível Difícil (Compra 3).',
    rarity: 'prata',
    icon: '👑',
    accent: '#10b981',
    target: 1,
    unit: 'vitórias',
  },
  {
    id: 'solitaire_colecionador_ases',
    game: 'solitaire',
    title: 'Cascata Dourada',
    description: 'Alcance 5 vitórias completas na Solitária dos Gatinhos.',
    rarity: 'ouro',
    icon: '🌟',
    accent: '#eab308',
    target: 5,
    unit: 'vitórias',
  },

  // Termo Diário (3)
  {
    id: 'termo_primeira_palavra',
    game: 'termo',
    title: 'Vocabulário Afiado',
    description: 'Descubra a palavra secreta no modo Termo.',
    rarity: 'bronze',
    icon: '🔤',
    accent: '#16a34a',
    target: 1,
    unit: 'vitórias',
  },
  {
    id: 'termo_dueto_perfeito',
    game: 'termo',
    title: 'Sintonia em Dueto',
    description: 'Decifre duas palavras simultâneas no modo Dueto.',
    rarity: 'prata',
    icon: '♊',
    accent: '#d97706',
    target: 1,
    unit: 'vitórias',
  },
  {
    id: 'termo_quarteto_mestre',
    game: 'termo',
    title: 'Oráculo do Quarteto',
    description: 'Domine 4 tabuleiros ao mesmo tempo no modo Quarteto.',
    rarity: 'cosmico',
    icon: '💠',
    accent: '#9333ea',
    target: 1,
    unit: 'vitórias',
  },

  // Olimpíadas / Meta (2)
  {
    id: 'global_campeao_olimpico',
    game: 'global',
    title: 'Campeão Olímpico',
    description: 'Desbloqueie ao menos uma conquista em 4 jogos diferentes.',
    rarity: 'cosmico',
    icon: '🏆',
    accent: '#a855f7',
    target: 4,
    unit: 'jogos',
  },
  {
    id: 'global_orgulho_sindicato',
    game: 'global',
    title: 'Orgulho do Sindicato',
    description: 'Conquiste 10 emblemas exclusivos nas Olimpíadas Felinas.',
    rarity: 'ouro',
    icon: '☭',
    accent: '#dc2626',
    target: 10,
    unit: 'emblemas',
  },
];

export type AchievementEvent =
  | {
      type: 'skyhop_progress';
      altitude: number;
      pawsEarnedDelta?: number;
      fishEarnedDelta?: number;
      perfectCombo?: number;
      portalsDelta?: number;
    }
  | {
      type: 'skyhop_run_end';
      altitude: number;
      maxCombo: number;
      portalsUsed?: number;
    }
  | { type: 'chess_promotion' }
  | { type: 'chess_win'; moveCount: number }
  | { type: 'checkers_multi_capture' }
  | { type: 'checkers_win' }
  | { type: 'airhockey_goal' }
  | { type: 'airhockey_win'; conceded: number }
  | { type: 'ttt_win' }
  | { type: 'ttt_draw' }
  | { type: 'jokenpo_result'; outcome: 'win' | 'loss' | 'tie' }
  | { type: 'reaction_win'; timeMs: number | null }
  | { type: 'sudoku_win'; size: 4 | 6 | 9; difficulty: 'easy' | 'medium' | 'hard' | 'expert'; online?: boolean }
  | { type: 'solitaire_win'; difficulty: 'easy' | 'medium' | 'hard' }
  | { type: 'termo_win'; mode: 'termo' | 'dueto' | 'quarteto' };

export function normalizePlayerStats(
  raw?: Partial<PlayerAchievementStats> | null
): PlayerAchievementStats {
  const base = createDefaultAchievementStats();
  if (!raw) return base;
  return {
    ...base,
    ...raw,
    reactionBestMs:
      typeof raw.reactionBestMs === 'number' && raw.reactionBestMs > 0
        ? raw.reactionBestMs
        : null,
  };
}

export function mergePlayerStats(
  a?: Partial<PlayerAchievementStats> | null,
  b?: Partial<PlayerAchievementStats> | null
): PlayerAchievementStats {
  const sa = normalizePlayerStats(a);
  const sb = normalizePlayerStats(b);
  let bestMs: number | null = null;
  if (sa.reactionBestMs !== null && sb.reactionBestMs !== null) {
    bestMs = Math.min(sa.reactionBestMs, sb.reactionBestMs);
  } else {
    bestMs = sa.reactionBestMs ?? sb.reactionBestMs;
  }

  return {
    skyhopMaxAltitude: Math.max(sa.skyhopMaxAltitude, sb.skyhopMaxAltitude),
    skyhopTotalAltitude: Math.max(sa.skyhopTotalAltitude, sb.skyhopTotalAltitude),
    skyhopFishEarned: Math.max(sa.skyhopFishEarned, sb.skyhopFishEarned),
    skyhopPawsEarned: Math.max(sa.skyhopPawsEarned || 0, sb.skyhopPawsEarned || 0),
    skyhopMaxPerfectCombo: Math.max(sa.skyhopMaxPerfectCombo, sb.skyhopMaxPerfectCombo),
    skyhopPortalsUsed: Math.max(sa.skyhopPortalsUsed, sb.skyhopPortalsUsed),
    skyhopGamesPlayed: Math.max(sa.skyhopGamesPlayed, sb.skyhopGamesPlayed),
    chessWins: Math.max(sa.chessWins, sb.chessWins),
    chessFastWins: Math.max(sa.chessFastWins, sb.chessFastWins),
    chessPromotions: Math.max(sa.chessPromotions, sb.chessPromotions),
    checkersWins: Math.max(sa.checkersWins, sb.checkersWins),
    checkersMultiCaptures: Math.max(sa.checkersMultiCaptures, sb.checkersMultiCaptures),
    airhockeyWins: Math.max(sa.airhockeyWins, sb.airhockeyWins),
    airhockeyShutouts: Math.max(sa.airhockeyShutouts, sb.airhockeyShutouts),
    airhockeyGoals: Math.max(sa.airhockeyGoals, sb.airhockeyGoals),
    tttWins: Math.max(sa.tttWins, sb.tttWins),
    tttDraws: Math.max(sa.tttDraws, sb.tttDraws),
    jokenpoWins: Math.max(sa.jokenpoWins, sb.jokenpoWins),
    jokenpoWinStreak: Math.max(sa.jokenpoWinStreak, sb.jokenpoWinStreak),
    jokenpoBestStreak: Math.max(sa.jokenpoBestStreak, sb.jokenpoBestStreak),
    reactionWins: Math.max(sa.reactionWins, sb.reactionWins),
    reactionBestMs: bestMs,
    sudokuWins: Math.max(sa.sudokuWins, sb.sudokuWins),
    sudokuHard9Wins: Math.max(sa.sudokuHard9Wins, sb.sudokuHard9Wins),
    sudokuOnlineWins: Math.max(sa.sudokuOnlineWins, sb.sudokuOnlineWins),
    solitaireWins: Math.max(sa.solitaireWins, sb.solitaireWins),
    solitaireHardWins: Math.max(sa.solitaireHardWins, sb.solitaireHardWins),
    termoWins: Math.max(sa.termoWins, sb.termoWins),
    termoDuetoWins: Math.max(sa.termoDuetoWins, sb.termoDuetoWins),
    termoQuartetoWins: Math.max(sa.termoQuartetoWins, sb.termoQuartetoWins),
  };
}

export function mergeUnlockedMaps(
  a?: Record<string, number> | null,
  b?: Record<string, number> | null
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(a || {})) {
    if (typeof v === 'number' && v > 0) out[k] = v;
  }
  for (const [k, v] of Object.entries(b || {})) {
    if (typeof v === 'number' && v > 0) {
      out[k] = out[k] ? Math.min(out[k], v) : v;
    }
  }
  return out;
}

export function countDistinctGamesUnlocked(unlocked: Record<string, number>): number {
  const games = new Set<AchievementGameId>();
  for (const def of ACHIEVEMENTS) {
    if (def.game !== 'global' && unlocked[def.id]) {
      games.add(def.game);
    }
  }
  return games.size;
}

export function countNonGlobalOrAllUnlocked(unlocked: Record<string, number>): number {
  return ACHIEVEMENTS.filter((d) => Boolean(unlocked[d.id])).length;
}

function isAchievementConditionMet(
  id: string,
  stats: PlayerAchievementStats,
  unlocked: Record<string, number>
): boolean {
  switch (id) {
    case 'sky_astronauta_felino':
      return stats.skyhopMaxAltitude >= 2000;
    case 'sky_pioneiro_marte':
      return stats.skyhopMaxAltitude >= 6000;
    case 'sky_senhor_aneis':
      return stats.skyhopMaxAltitude >= 12000;
    case 'sky_mestre_galaxias':
      return stats.skyhopMaxAltitude >= 22000;
    case 'sky_combo_cadente':
      return stats.skyhopMaxPerfectCombo >= 5;
    case 'sky_combo_supersonico':
      return stats.skyhopMaxPerfectCombo >= 12;
    case 'sky_pescador_estelar':
      return Math.max(stats.skyhopPawsEarned || 0, stats.skyhopFishEarned) >= 30;
    case 'sky_banquete_cosmico':
      return Math.max(stats.skyhopPawsEarned || 0, stats.skyhopFishEarned) >= 100;
    case 'sky_dobrador_portais':
      return stats.skyhopPortalsUsed >= 5;
    case 'chess_estrategista_vermelho':
      return stats.chessWins >= 1;
    case 'chess_coroacao_real':
      return stats.chessPromotions >= 1;
    case 'chess_mestre_blitz':
      return stats.chessFastWins >= 1 || stats.chessWins >= 5;
    case 'checkers_salto_duplo':
      return stats.checkersMultiCaptures >= 1;
    case 'checkers_dama_voadora':
      return stats.checkersWins >= 1;
    case 'checkers_lenda_tabuleiro':
      return stats.checkersWins >= 5;
    case 'hockey_artilheiro_artico':
      return stats.airhockeyGoals >= 10;
    case 'hockey_rei_gelo':
      return stats.airhockeyWins >= 1;
    case 'hockey_muralha_siberiana':
      return stats.airhockeyShutouts >= 1;
    case 'ttt_trio_harmonia':
      return stats.tttWins >= 3;
    case 'ttt_pacto_equilibrio':
      return stats.tttDraws >= 3;
    case 'jokenpo_patinha_sorte':
      return stats.jokenpoBestStreak >= 3;
    case 'jokenpo_mestre_blefe':
      return stats.jokenpoWins >= 10;
    case 'reaction_reflexo_felino':
      return stats.reactionBestMs !== null && stats.reactionBestMs <= 260;
    case 'reaction_raio_sovietico':
      return (
        stats.reactionWins >= 5 ||
        (stats.reactionBestMs !== null && stats.reactionBestMs <= 190)
      );
    case 'sudoku_mente_logica':
      return stats.sudokuWins >= 1;
    case 'sudoku_mestre_9x9':
      return stats.sudokuHard9Wins >= 1;
    case 'sudoku_campeao_duelo':
      return stats.sudokuOnlineWins >= 1 || stats.sudokuWins >= 5;
    case 'solitaire_pata_real':
      return stats.solitaireWins >= 1;
    case 'solitaire_estrategista_3':
      return stats.solitaireHardWins >= 1;
    case 'solitaire_colecionador_ases':
      return stats.solitaireWins >= 5;
    case 'termo_primeira_palavra':
      return stats.termoWins >= 1;
    case 'termo_dueto_perfeito':
      return stats.termoDuetoWins >= 1;
    case 'termo_quarteto_mestre':
      return stats.termoQuartetoWins >= 1;
    case 'global_campeao_olimpico':
      return countDistinctGamesUnlocked(unlocked) >= 4;
    case 'global_orgulho_sindicato':
      return countNonGlobalOrAllUnlocked(unlocked) >= 10;
    default:
      return false;
  }
}

export function getAchievementProgress(
  def: AchievementDefinition,
  rawStats: Partial<PlayerAchievementStats> | undefined,
  unlocked: Record<string, number>
): { current: number; target: number; percent: number; label: string } {
  const stats = normalizePlayerStats(rawStats);
  const isUnlocked = Boolean(unlocked[def.id]);
  if (isUnlocked) {
    if (def.id === 'reaction_reflexo_felino' && stats.reactionBestMs !== null) {
      return {
        current: def.target,
        target: def.target,
        percent: 100,
        label: `Melhor: ${stats.reactionBestMs} ms`,
      };
    }
    return {
      current: def.target,
      target: def.target,
      percent: 100,
      label: 'Concluído',
    };
  }

  let current = 0;
  switch (def.id) {
    case 'sky_astronauta_felino':
    case 'sky_pioneiro_marte':
    case 'sky_senhor_aneis':
    case 'sky_mestre_galaxias':
      current = stats.skyhopMaxAltitude;
      break;
    case 'sky_combo_cadente':
    case 'sky_combo_supersonico':
      current = stats.skyhopMaxPerfectCombo;
      break;
    case 'sky_pescador_estelar':
    case 'sky_banquete_cosmico':
      current = Math.max(stats.skyhopPawsEarned || 0, stats.skyhopFishEarned);
      break;
    case 'sky_dobrador_portais':
      current = stats.skyhopPortalsUsed;
      break;
    case 'chess_estrategista_vermelho':
    case 'chess_mestre_blitz':
      current = stats.chessWins;
      break;
    case 'chess_coroacao_real':
      current = stats.chessPromotions;
      break;
    case 'checkers_salto_duplo':
      current = stats.checkersMultiCaptures;
      break;
    case 'checkers_dama_voadora':
    case 'checkers_lenda_tabuleiro':
      current = stats.checkersWins;
      break;
    case 'hockey_artilheiro_artico':
      current = stats.airhockeyGoals;
      break;
    case 'hockey_rei_gelo':
      current = stats.airhockeyWins;
      break;
    case 'hockey_muralha_siberiana':
      current = stats.airhockeyShutouts;
      break;
    case 'ttt_trio_harmonia':
      current = stats.tttWins;
      break;
    case 'ttt_pacto_equilibrio':
      current = stats.tttDraws;
      break;
    case 'jokenpo_patinha_sorte':
      current = stats.jokenpoBestStreak;
      break;
    case 'jokenpo_mestre_blefe':
      current = stats.jokenpoWins;
      break;
    case 'reaction_reflexo_felino': {
      const best = stats.reactionBestMs;
      if (best === null) {
        return { current: 0, target: 260, percent: 0, label: 'Meta ≤ 260 ms' };
      }
      const pct = Math.max(0, Math.min(99, Math.round((260 / best) * 100)));
      return { current: best, target: 260, percent: pct, label: `Melhor: ${best} ms` };
    }
    case 'reaction_raio_sovietico':
      current = stats.reactionWins;
      break;
    case 'sudoku_mente_logica':
    case 'sudoku_campeao_duelo':
      current = stats.sudokuWins;
      break;
    case 'sudoku_mestre_9x9':
      current = stats.sudokuHard9Wins;
      break;
    case 'solitaire_pata_real':
    case 'solitaire_colecionador_ases':
      current = stats.solitaireWins;
      break;
    case 'solitaire_estrategista_3':
      current = stats.solitaireHardWins;
      break;
    case 'termo_primeira_palavra':
      current = stats.termoWins;
      break;
    case 'termo_dueto_perfeito':
      current = stats.termoDuetoWins;
      break;
    case 'termo_quarteto_mestre':
      current = stats.termoQuartetoWins;
      break;
    case 'global_campeao_olimpico':
      current = countDistinctGamesUnlocked(unlocked);
      break;
    case 'global_orgulho_sindicato':
      current = countNonGlobalOrAllUnlocked(unlocked);
      break;
  }

  const clamped = Math.min(def.target, Math.max(0, current));
  const percent = def.target > 0 ? Math.min(100, Math.round((clamped / def.target) * 100)) : 0;
  return {
    current: clamped,
    target: def.target,
    percent,
    label: `${clamped.toLocaleString('pt-BR')} / ${def.target.toLocaleString('pt-BR')}${
      def.unit ? ` ${def.unit}` : ''
    }`,
  };
}

export function applyAchievementEvent(
  prevAchievements: Record<PlayerRole, Record<string, number>> | undefined,
  prevStats: Record<PlayerRole, PlayerAchievementStats> | undefined,
  role: PlayerRole,
  event: AchievementEvent,
  now = Date.now()
): {
  achievements: Record<PlayerRole, Record<string, number>>;
  achievementStats: Record<PlayerRole, PlayerAchievementStats>;
  newlyUnlocked: AchievementDefinition[];
} {
  const safeAchievements: Record<PlayerRole, Record<string, number>> = {
    cat1: { ...(prevAchievements?.cat1 || {}) },
    cat2: { ...(prevAchievements?.cat2 || {}) },
  };
  const safeStats: Record<PlayerRole, PlayerAchievementStats> = {
    cat1: normalizePlayerStats(prevStats?.cat1),
    cat2: normalizePlayerStats(prevStats?.cat2),
  };

  const s = { ...safeStats[role] };
  const unlocked = { ...safeAchievements[role] };

  switch (event.type) {
    case 'skyhop_progress': {
      const alt = Math.max(0, Math.floor(event.altitude));
      s.skyhopMaxAltitude = Math.max(s.skyhopMaxAltitude, alt);
      const earnedDelta = Math.max(event.pawsEarnedDelta || 0, event.fishEarnedDelta || 0);
      if (earnedDelta > 0) {
        s.skyhopPawsEarned = (s.skyhopPawsEarned || 0) + Math.floor(earnedDelta);
        s.skyhopFishEarned += Math.floor(earnedDelta);
      }
      if (event.perfectCombo && event.perfectCombo > 0) {
        s.skyhopMaxPerfectCombo = Math.max(s.skyhopMaxPerfectCombo, Math.floor(event.perfectCombo));
      }
      if (event.portalsDelta && event.portalsDelta > 0) {
        s.skyhopPortalsUsed += Math.floor(event.portalsDelta);
      }
      break;
    }
    case 'skyhop_run_end': {
      const alt = Math.max(0, Math.floor(event.altitude));
      s.skyhopGamesPlayed += 1;
      s.skyhopTotalAltitude += alt;
      s.skyhopMaxAltitude = Math.max(s.skyhopMaxAltitude, alt);
      s.skyhopMaxPerfectCombo = Math.max(s.skyhopMaxPerfectCombo, Math.floor(event.maxCombo || 0));
      if (event.portalsUsed && event.portalsUsed > 0) {
        s.skyhopPortalsUsed += Math.floor(event.portalsUsed);
      }
      break;
    }
    case 'chess_promotion':
      s.chessPromotions += 1;
      break;
    case 'chess_win':
      s.chessWins += 1;
      if (event.moveCount > 0 && event.moveCount <= 25) {
        s.chessFastWins += 1;
      }
      break;
    case 'checkers_multi_capture':
      s.checkersMultiCaptures += 1;
      break;
    case 'checkers_win':
      s.checkersWins += 1;
      break;
    case 'airhockey_goal':
      s.airhockeyGoals += 1;
      break;
    case 'airhockey_win':
      s.airhockeyWins += 1;
      if (event.conceded === 0) {
        s.airhockeyShutouts += 1;
      }
      break;
    case 'ttt_win':
      s.tttWins += 1;
      break;
    case 'ttt_draw':
      s.tttDraws += 1;
      break;
    case 'jokenpo_result':
      if (event.outcome === 'win') {
        s.jokenpoWins += 1;
        s.jokenpoWinStreak += 1;
        s.jokenpoBestStreak = Math.max(s.jokenpoBestStreak, s.jokenpoWinStreak);
      } else if (event.outcome === 'loss') {
        s.jokenpoWinStreak = 0;
      }
      break;
    case 'reaction_win':
      s.reactionWins += 1;
      if (typeof event.timeMs === 'number' && event.timeMs > 0) {
        s.reactionBestMs =
          s.reactionBestMs === null ? event.timeMs : Math.min(s.reactionBestMs, event.timeMs);
      }
      break;
    case 'sudoku_win':
      s.sudokuWins += 1;
      if (event.size === 9 && (event.difficulty === 'hard' || event.difficulty === 'expert')) {
        s.sudokuHard9Wins += 1;
      }
      if (event.online) {
        s.sudokuOnlineWins += 1;
      }
      break;
    case 'solitaire_win':
      s.solitaireWins += 1;
      if (event.difficulty === 'hard') {
        s.solitaireHardWins += 1;
      }
      break;
    case 'termo_win':
      s.termoWins += 1;
      if (event.mode === 'dueto') s.termoDuetoWins += 1;
      if (event.mode === 'quarteto') s.termoQuartetoWins += 1;
      break;
  }

  const newlyUnlocked: AchievementDefinition[] = [];
  // Evaluate game-specific achievements first, then global meta achievements
  for (const def of ACHIEVEMENTS) {
    if (def.game === 'global' || unlocked[def.id]) continue;
    if (isAchievementConditionMet(def.id, s, unlocked)) {
      unlocked[def.id] = now;
      newlyUnlocked.push(def);
    }
  }
  for (const def of ACHIEVEMENTS) {
    if (def.game !== 'global' || unlocked[def.id]) continue;
    if (isAchievementConditionMet(def.id, s, unlocked)) {
      unlocked[def.id] = now;
      newlyUnlocked.push(def);
    }
  }

  return {
    achievements: {
      ...safeAchievements,
      [role]: unlocked,
    },
    achievementStats: {
      ...safeStats,
      [role]: s,
    },
    newlyUnlocked,
  };
}

export function findUncelebratedUnlockIds(
  unlockedMap: Record<string, number> | undefined,
  baselineIds: ReadonlySet<string>,
  celebratedIds: ReadonlySet<string>,
  sessionStartMs: number
): string[] {
  if (!unlockedMap) return [];
  const fresh: string[] = [];
  for (const def of ACHIEVEMENTS) {
    const ts = unlockedMap[def.id];
    if (typeof ts !== 'number' || !Number.isFinite(ts)) continue;
    if (celebratedIds.has(def.id)) continue;
    if (!baselineIds.has(def.id) || ts >= sessionStartMs - 5000) {
      fresh.push(def.id);
    }
  }
  return fresh;
}

