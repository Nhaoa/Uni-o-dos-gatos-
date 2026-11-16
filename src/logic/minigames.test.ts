import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkTicTacToeResult,
  chooseBestTttMove,
  generateDailyCodeForRole,
  resolveJokenpoWinner,
} from './minigames';

test('jokenpo winner resolution covers all outcomes', () => {
  assert.equal(resolveJokenpoWinner('rock', 'scissors'), 'cat1');
  assert.equal(resolveJokenpoWinner('paper', 'rock'), 'cat1');
  assert.equal(resolveJokenpoWinner('scissors', 'paper'), 'cat1');
  assert.equal(resolveJokenpoWinner('rock', 'paper'), 'cat2');
  assert.equal(resolveJokenpoWinner('paper', 'paper'), 'tie');
});

test('tic-tac-toe win/draw detection and bot blocking/winning', () => {
  const winBoard = ['🐾', '🐾', '🐾', '', '🐟', '', '', '', '🐟'];
  const res = checkTicTacToeResult(winBoard);
  assert.equal(res.winnerSymbol, '🐾');
  assert.deepEqual(res.winningLine, [0, 1, 2]);

  // Bot takes winning move
  const botWinBoard = ['🐟', '🐟', '', '🐾', '🐾', '', '', '', ''];
  assert.equal(chooseBestTttMove(botWinBoard, '🐟', '🐾'), 2);

  // Bot blocks human winning move
  const blockBoard = ['🐾', '🐾', '', '', '🐟', '', '', '', ''];
  assert.equal(chooseBestTttMove(blockBoard, '🐟', '🐾'), 2);
});

test('daily code is deterministic 6-digit string per role and date', () => {
  const c1 = generateDailyCodeForRole('cat1', '2026-11-14');
  const c2 = generateDailyCodeForRole('cat2', '2026-11-14');
  assert.equal(c1.length, 6);
  assert.equal(c2.length, 6);
  assert.notEqual(c1, c2);
  assert.equal(c1, generateDailyCodeForRole('cat1', '2026-11-14'));
});
