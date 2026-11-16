import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyScoreOutcome,
  getPlayerScoreSummary,
  isValidMatchScoreOutcome,
  normalizeScores,
} from './scores';

test('normalizeScores defaults missing loss fields and clamps negative/invalid values', () => {
  assert.deepEqual(normalizeScores({ cat1Wins: 4, cat2Wins: 2, ties: 1 }), {
    cat1Wins: 4,
    cat1Losses: 0,
    cat2Wins: 2,
    cat2Losses: 0,
    ties: 1,
  });
  assert.deepEqual(normalizeScores({ cat1Wins: -3, cat2Losses: 2.9 }), {
    cat1Wins: 0,
    cat1Losses: 0,
    cat2Wins: 0,
    cat2Losses: 2,
    ties: 0,
  });
});

test('applyScoreOutcome tracks PvP wins/losses, solo wins/losses, and ties accurately', () => {
  let s = normalizeScores(undefined);
  s = applyScoreOutcome(s, { kind: 'pvp_win', winner: 'cat1' });
  assert.deepEqual(s, {
    cat1Wins: 1,
    cat1Losses: 0,
    cat2Wins: 0,
    cat2Losses: 1,
    ties: 0,
  });

  s = applyScoreOutcome(s, { kind: 'solo_loss', role: 'cat1' });
  assert.deepEqual(s, {
    cat1Wins: 1,
    cat1Losses: 1,
    cat2Wins: 0,
    cat2Losses: 1,
    ties: 0,
  });

  s = applyScoreOutcome(s, { kind: 'solo_win', role: 'cat2' });
  assert.deepEqual(s, {
    cat1Wins: 1,
    cat1Losses: 1,
    cat2Wins: 1,
    cat2Losses: 1,
    ties: 0,
  });

  s = applyScoreOutcome(s, { kind: 'tie' });
  assert.deepEqual(s, {
    cat1Wins: 1,
    cat1Losses: 1,
    cat2Wins: 1,
    cat2Losses: 1,
    ties: 1,
  });

  assert.deepEqual(getPlayerScoreSummary(s, 'cat1'), {
    wins: 1,
    losses: 1,
    ties: 1,
    total: 3,
  });
});

test('isValidMatchScoreOutcome validates payload shapes safely', () => {
  assert.equal(isValidMatchScoreOutcome({ kind: 'pvp_win', winner: 'cat2' }), true);
  assert.equal(isValidMatchScoreOutcome({ kind: 'solo_loss', role: 'cat1' }), true);
  assert.equal(isValidMatchScoreOutcome({ kind: 'tie' }), true);
  assert.equal(isValidMatchScoreOutcome({ kind: 'pvp_win', winner: 'bot' }), false);
  assert.equal(isValidMatchScoreOutcome(null), false);
});
