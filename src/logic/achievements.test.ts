import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACHIEVEMENTS,
  applyAchievementEvent,
  getAchievementProgress,
  mergePlayerStats,
  mergeUnlockedMaps,
} from './achievements';
import { createDefaultAchievementStats } from './defaultState';

test('achievement catalog covers SkyHop, Sudoku, Solitaire, Termo, all other minigames, and global milestones', () => {
  const games = new Set(ACHIEVEMENTS.map((a) => a.game));
  assert.deepEqual(
    [...games].sort(),
    [
      'airhockey',
      'checkers',
      'chess',
      'global',
      'jokenpo',
      'reaction',
      'skyhop',
      'solitaire',
      'sudoku',
      'termo',
      'tictactoe',
    ]
  );
  assert.ok(ACHIEVEMENTS.some((a) => a.id === 'sky_astronauta_felino'));
  assert.ok(ACHIEVEMENTS.some((a) => a.id === 'sudoku_mente_logica'));
  assert.ok(ACHIEVEMENTS.some((a) => a.id === 'solitaire_pata_real'));
  assert.ok(ACHIEVEMENTS.some((a) => a.id === 'termo_quarteto_mestre'));
  assert.equal(ACHIEVEMENTS.length, 35);
});

test('SkyHop altitude, perfect combo, fish, and portal achievements unlock and stay idempotent', () => {
  let ach = { cat1: {}, cat2: {} };
  let stats = { cat1: createDefaultAchievementStats(), cat2: createDefaultAchievementStats() };

  // Reaching 2000m + 5 combo unlocks Astronauta Felino and Salto Cadente
  const r1 = applyAchievementEvent(
    ach,
    stats,
    'cat1',
    { type: 'skyhop_progress', altitude: 2050, perfectCombo: 5, pawsEarnedDelta: 10, portalsDelta: 2 },
    1000
  );
  ach = r1.achievements;
  stats = r1.achievementStats;
  assert.deepEqual(
    r1.newlyUnlocked.map((a) => a.id).sort(),
    ['sky_astronauta_felino', 'sky_combo_cadente']
  );

  // Repeating same event must NOT re-emit already unlocked emblems
  const rDup = applyAchievementEvent(
    ach,
    stats,
    'cat1',
    { type: 'skyhop_progress', altitude: 2050, perfectCombo: 5 },
    2000
  );
  assert.equal(rDup.newlyUnlocked.length, 0);
  assert.equal(rDup.achievements.cat1.sky_astronauta_felino, 1000);

  // Pushing to 22000m, 12 combo, 30 fish, 5 portals unlocks remaining SkyHop emblems
  const r2 = applyAchievementEvent(
    ach,
    stats,
    'cat1',
    { type: 'skyhop_progress', altitude: 22100, perfectCombo: 12, pawsEarnedDelta: 90, portalsDelta: 3 },
    3000
  );
  const unlockedIds = r2.newlyUnlocked.map((a) => a.id);
  assert.ok(unlockedIds.includes('sky_pioneiro_marte'));
  assert.ok(unlockedIds.includes('sky_senhor_aneis'));
  assert.ok(unlockedIds.includes('sky_mestre_galaxias'));
  assert.ok(unlockedIds.includes('sky_combo_supersonico'));
  assert.ok(unlockedIds.includes('sky_pescador_estelar'));
  assert.ok(unlockedIds.includes('sky_banquete_cosmico'));
  assert.ok(unlockedIds.includes('sky_dobrador_portais'));
});

test('Chess, Checkers, Air Hockey, TicTacToe, Jokenpo, Reaction, and Global unlocks work independently per player', () => {
  let ach = { cat1: {}, cat2: {} };
  let stats = { cat1: createDefaultAchievementStats(), cat2: createDefaultAchievementStats() };

  const apply = (role: 'cat1' | 'cat2', event: Parameters<typeof applyAchievementEvent>[3]) => {
    const res = applyAchievementEvent(ach, stats, role, event, 5000);
    ach = res.achievements;
    stats = res.achievementStats;
    return res.newlyUnlocked.map((a) => a.id);
  };

  assert.ok(apply('cat1', { type: 'chess_promotion' }).includes('chess_coroacao_real'));
  const chessWinIds = apply('cat1', { type: 'chess_win', moveCount: 18 });
  assert.ok(chessWinIds.includes('chess_estrategista_vermelho'));
  assert.ok(chessWinIds.includes('chess_mestre_blitz'));

  assert.ok(apply('cat1', { type: 'checkers_multi_capture' }).includes('checkers_salto_duplo'));
  assert.ok(apply('cat1', { type: 'checkers_win' }).includes('checkers_dama_voadora'));

  for (let i = 0; i < 9; i++) apply('cat1', { type: 'airhockey_goal' });
  assert.ok(apply('cat1', { type: 'airhockey_goal' }).includes('hockey_artilheiro_artico'));
  const hockeyWinIds = apply('cat1', { type: 'airhockey_win', conceded: 0 });
  assert.ok(hockeyWinIds.includes('hockey_rei_gelo'));
  assert.ok(hockeyWinIds.includes('hockey_muralha_siberiana'));

  // 4th distinct game for cat1 triggers global_campeao_olimpico!
  assert.deepEqual(apply('cat1', { type: 'ttt_win' }), []);
  assert.deepEqual(apply('cat1', { type: 'ttt_win' }), []);
  const tttWin3 = apply('cat1', { type: 'ttt_win' });
  assert.ok(tttWin3.includes('ttt_trio_harmonia'));
  assert.ok(tttWin3.includes('global_campeao_olimpico'));

  // cat2 streak resets on loss and unlocks at 3 consecutive wins
  apply('cat2', { type: 'jokenpo_result', outcome: 'win' });
  apply('cat2', { type: 'jokenpo_result', outcome: 'win' });
  apply('cat2', { type: 'jokenpo_result', outcome: 'loss' });
  assert.equal(stats.cat2.jokenpoWinStreak, 0);
  apply('cat2', { type: 'jokenpo_result', outcome: 'win' });
  apply('cat2', { type: 'jokenpo_result', outcome: 'win' });
  assert.ok(apply('cat2', { type: 'jokenpo_result', outcome: 'win' }).includes('jokenpo_patinha_sorte'));
  // cat1 remains unaffected by cat2
  assert.equal(stats.cat1.jokenpoWins, 0);

  // Fast reaction <= 190ms unlocks both reflexo_felino and raio_sovietico
  const reactIds = apply('cat2', { type: 'reaction_win', timeMs: 185 });
  assert.ok(reactIds.includes('reaction_reflexo_felino'));
  assert.ok(reactIds.includes('reaction_raio_sovietico'));
});

test('mergePlayerStats, mergeUnlockedMaps, and getAchievementProgress preserve monotonic progress', () => {
  const s1 = { ...createDefaultAchievementStats(), skyhopMaxAltitude: 3200, reactionBestMs: 240 };
  const s2 = { ...createDefaultAchievementStats(), skyhopMaxAltitude: 1500, reactionBestMs: 195, chessWins: 2 };
  const merged = mergePlayerStats(s1, s2);
  assert.equal(merged.skyhopMaxAltitude, 3200);
  assert.equal(merged.reactionBestMs, 195);
  assert.equal(merged.chessWins, 2);

  const u = mergeUnlockedMaps({ a: 2000, b: 3000 }, { a: 1500, c: 4000 });
  assert.deepEqual(u, { a: 1500, b: 3000, c: 4000 });

  const marsDef = ACHIEVEMENTS.find((d) => d.id === 'sky_pioneiro_marte')!;
  const prog = getAchievementProgress(marsDef, s1, {});
  assert.equal(prog.current, 3200);
  assert.equal(prog.percent, 53);
});

test('Sudoku, Solitaire, and Termo unlock their dedicated badges accurately', () => {
  let ach = { cat1: {}, cat2: {} };
  let stats = { cat1: createDefaultAchievementStats(), cat2: createDefaultAchievementStats() };

  const emit = (ev: Parameters<typeof applyAchievementEvent>[3]) => {
    const res = applyAchievementEvent(ach, stats, 'cat1', ev, 9000);
    ach = res.achievements;
    stats = res.achievementStats;
    return res.newlyUnlocked.map((a) => a.id);
  };

  const sud = emit({ type: 'sudoku_win', size: 9, difficulty: 'hard', online: true });
  assert.ok(sud.includes('sudoku_mente_logica'));
  assert.ok(sud.includes('sudoku_mestre_9x9'));
  assert.ok(sud.includes('sudoku_campeao_duelo'));

  const sol = emit({ type: 'solitaire_win', difficulty: 'hard' });
  assert.ok(sol.includes('solitaire_pata_real'));
  assert.ok(sol.includes('solitaire_estrategista_3'));

  const ter = emit({ type: 'termo_win', mode: 'quarteto' });
  assert.ok(ter.includes('termo_primeira_palavra'));
  assert.ok(ter.includes('termo_quarteto_mestre'));
});

test('findUncelebratedUnlockIds detects session unlocks while skipping old baseline and already-celebrated badges', async () => {
  const { findUncelebratedUnlockIds } = await import('./achievements');
  const sessionStart = 100_000;
  const baseline = new Set(['sky_astronauta_felino']);
  const celebrated = new Set(['termo_primeira_palavra']);
  const unlockedMap: Record<string, number> = {
    sky_astronauta_felino: 50_000, // old pre-session unlock
    termo_primeira_palavra: 102_000, // already celebrated
    solitaire_pata_real: 98_000, // unlocked right after session start (even with minor clock skew)
    chess_estrategista_vermelho: 105_000, // fresh unlock during session
  };

  const result = findUncelebratedUnlockIds(unlockedMap, baseline, celebrated, sessionStart);
  assert.deepEqual(result, ['chess_estrategista_vermelho', 'solitaire_pata_real']);
});

