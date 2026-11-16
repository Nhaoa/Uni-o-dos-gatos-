import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeSudokuReward,
  countCorrectFilledCells,
  generateSudokuPuzzle,
  getRemainingCounts,
  isPlacementValid,
  isSudokuSolved,
} from './sudoku';

test('generates valid unique puzzles for 4x4, 6x6, and 9x9', () => {
  for (const size of [4, 6, 9] as const) {
    const gen = generateSudokuPuzzle(size, 'medium');
    assert.equal(gen.puzzle.length, size * size);
    assert.equal(gen.solution.length, size * size);
    assert.equal(isSudokuSolved(gen.solution, gen.solution), true);
    assert.equal(isSudokuSolved(gen.puzzle, gen.solution), false);

    // Every prefilled clue matches solution and respects row/col/box constraints
    let emptyCount = 0;
    for (let i = 0; i < gen.puzzle.length; i++) {
      if (gen.puzzle[i] === 0) {
        emptyCount++;
      } else {
        assert.equal(gen.puzzle[i], gen.solution[i]);
        assert.equal(isPlacementValid(gen.solution, size, i, gen.solution[i]), true);
      }
    }
    assert.ok(emptyCount > 0);
  }
});

test('tracks remaining digit counts and player progress accurately', () => {
  const gen = generateSudokuPuzzle(4, 'easy');
  const rem = getRemainingCounts(gen.solution, 4);
  for (let n = 1; n <= 4; n++) {
    assert.equal(rem[n], 0);
  }

  const progStart = countCorrectFilledCells(gen.puzzle, gen.puzzle, gen.solution);
  assert.equal(progStart.filled, 0);
  assert.ok(progStart.totalToFill > 0);

  const progDone = countCorrectFilledCells(gen.solution, gen.puzzle, gen.solution);
  assert.equal(progDone.filled, progDone.totalToFill);
});

test('computes higher paws reward for harder sizes and online victory', () => {
  const solo4 = computeSudokuReward(4, 'easy', false);
  const solo9 = computeSudokuReward(9, 'expert', false);
  const online9 = computeSudokuReward(9, 'expert', true);
  assert.ok(solo9 > solo4);
  assert.equal(online9, solo9 + 8);
});
