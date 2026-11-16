import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyCheckersMove,
  chooseBestCheckersMove,
  getAllLegalCheckersMoves,
  getLegalCheckersMovesFor,
} from './checkers';
import { CheckersState } from '../types/game';

function emptyCheckersState(turn: 'white' | 'black' = 'white'): CheckersState {
  return {
    board: Array.from({ length: 8 }, () => Array(8).fill(null)),
    turn,
    mustContinueFrom: null,
    moveHistory: [],
    lastMove: null,
    status: 'playing',
    winner: null,
  };
}

test('checkers enforces mandatory capture (no simple moves allowed when capture exists)', () => {
  const s = emptyCheckersState('white');
  s.board[5][2] = { piece: 'M', color: 'white' };
  s.board[4][3] = { piece: 'M', color: 'black' };
  s.board[5][6] = { piece: 'M', color: 'white' }; // Another piece with simple moves

  // Piece at (5,6) cannot do a simple move because (5,2) can capture (4,3) -> (3,4)
  const simplePieceMoves = getLegalCheckersMovesFor(s, 5, 6);
  assert.equal(simplePieceMoves.length, 0);

  const capturePieceMoves = getLegalCheckersMovesFor(s, 5, 2);
  assert.equal(capturePieceMoves.length, 1);
  assert.deepEqual(capturePieceMoves[0].to, { r: 3, c: 4 });
  assert.deepEqual(capturePieceMoves[0].capture, { r: 4, c: 3 });
});

test('checkers supports multi-jump capture chains and keeps turn until chain ends', () => {
  const s = emptyCheckersState('white');
  s.board[6][1] = { piece: 'M', color: 'white' };
  s.board[5][2] = { piece: 'M', color: 'black' };
  s.board[3][4] = { piece: 'M', color: 'black' };
  s.board[1][4] = { piece: 'M', color: 'black' };

  // Step 1: (6,1) -> (4,3) capturing (5,2)
  const s1 = applyCheckersMove(s, { from: { r: 6, c: 1 }, to: { r: 4, c: 3 } });
  assert.equal(s1.board[5][2], null);
  assert.equal(s1.turn, 'white'); // Still white's turn!
  assert.deepEqual(s1.mustContinueFrom, { r: 4, c: 3 });

  // Step 2: (4,3) -> (2,5) capturing (3,4)
  const s2 = applyCheckersMove(s1, { from: { r: 4, c: 3 }, to: { r: 2, c: 5 } });
  assert.equal(s2.board[3][4], null);
  assert.equal(s2.turn, 'white'); // Still white's turn for 3rd jump!
  assert.deepEqual(s2.mustContinueFrom, { r: 2, c: 5 });

  // Step 3: backwards/forward jump (2,5) -> (0,3) capturing (1,4)
  const s3 = applyCheckersMove(s2, { from: { r: 2, c: 5 }, to: { r: 0, c: 3 } });
  assert.equal(s3.board[1][4], null);
  assert.equal(s3.mustContinueFrom, null);
  assert.equal(s3.board[0][3]?.piece, 'K'); // Promoted at end of chain!
  assert.equal(s3.status, 'finished');
  assert.equal(s3.winner, 'white');
});

test('checkers enforces Lei da Maioria (must choose maximum-length capture chain)', () => {
  const s = emptyCheckersState('white');
  // Piece A can capture 1 piece
  s.board[5][0] = { piece: 'M', color: 'white' };
  s.board[4][1] = { piece: 'M', color: 'black' };
  // Piece B can capture 2 pieces in a chain
  s.board[6][5] = { piece: 'M', color: 'white' };
  s.board[5][4] = { piece: 'M', color: 'black' };
  s.board[3][4] = { piece: 'M', color: 'black' };

  const all = getAllLegalCheckersMoves(s);
  assert.equal(all.length, 1);
  assert.deepEqual(all[0].from, { r: 6, c: 5 });
  assert.deepEqual(all[0].to, { r: 4, c: 3 });
});

test('checkers Flying King (Dama) slides across multiple empty squares and captures at long range', () => {
  const s = emptyCheckersState('white');
  s.board[7][0] = { piece: 'K', color: 'white' };
  s.board[0][7] = { piece: 'M', color: 'black' }; // Out of immediate reach

  // Simple sliding moves along the long diagonal: (6,1), (5,2), (4,3), (3,4), (2,5), (1,6)
  const simpleMoves = getLegalCheckersMovesFor(s, 7, 0);
  assert.equal(simpleMoves.length, 6);
  assert.ok(simpleMoves.some((m) => m.to.r === 1 && m.to.c === 6));

  // Now put an enemy piece at (4,3) -> Flying King at (7,0) must capture it and can land on (3,4), (2,5), or (1,6)
  s.board[4][3] = { piece: 'M', color: 'black' };
  const capMoves = getLegalCheckersMovesFor(s, 7, 0);
  assert.equal(capMoves.length, 3);
  assert.ok(capMoves.every((m) => m.capture?.r === 4 && m.capture?.c === 3));
  assert.ok(capMoves.some((m) => m.to.r === 3 && m.to.c === 4));
  assert.ok(capMoves.some((m) => m.to.r === 2 && m.to.c === 5));
  assert.ok(capMoves.some((m) => m.to.r === 1 && m.to.c === 6));
});

test('checkers bot picks a valid legal move', () => {
  const s = emptyCheckersState('black');
  s.board[2][1] = { piece: 'M', color: 'black' };
  s.board[3][2] = { piece: 'M', color: 'white' };
  s.board[5][6] = { piece: 'M', color: 'white' };

  const botMove = chooseBestCheckersMove(s, 3);
  assert.ok(botMove);
  assert.deepEqual(botMove!.to, { r: 4, c: 3 });
});
