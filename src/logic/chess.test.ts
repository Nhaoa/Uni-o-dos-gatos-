import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyChessMove,
  chooseBestChessMove,
  createInitialChessState,
  getLegalChessMovesFor,
} from './chess';
import { ChessState } from '../types/game';

function emptyChessState(turn: 'white' | 'black' = 'white'): ChessState {
  return {
    board: Array.from({ length: 8 }, () => Array(8).fill(null)),
    turn,
    castlingRights: { wK: false, wQ: false, bK: false, bQ: false },
    enPassantTarget: null,
    halfMoveClock: 0,
    fullMoveNumber: 1,
    moveHistory: [],
    lastMove: null,
    status: 'playing',
    winner: null,
  };
}

test('chess kingside and queenside castling work and move rook', () => {
  const s = emptyChessState('white');
  s.castlingRights = { wK: true, wQ: true, bK: false, bQ: false };
  s.board[7][4] = { piece: 'k', color: 'white' };
  s.board[7][7] = { piece: 'r', color: 'white' };
  s.board[7][0] = { piece: 'r', color: 'white' };
  s.board[0][4] = { piece: 'k', color: 'black' };

  const moves = getLegalChessMovesFor(s, 7, 4);
  assert.ok(moves.some((m) => m.to.r === 7 && m.to.c === 6 && m.isCastle === 'kingside'));
  assert.ok(moves.some((m) => m.to.r === 7 && m.to.c === 2 && m.isCastle === 'queenside'));

  const afterKingside = applyChessMove(s, { from: { r: 7, c: 4 }, to: { r: 7, c: 6 } });
  assert.equal(afterKingside.board[7][6]?.piece, 'k');
  assert.equal(afterKingside.board[7][5]?.piece, 'r');
  assert.equal(afterKingside.board[7][7], null);
  assert.equal(afterKingside.castlingRights.wK, false);
  assert.equal(afterKingside.castlingRights.wQ, false);
});

test('chess castling is blocked when passing through attacked square or in check', () => {
  const s = emptyChessState('white');
  s.castlingRights = { wK: true, wQ: false, bK: false, bQ: false };
  s.board[7][4] = { piece: 'k', color: 'white' };
  s.board[7][7] = { piece: 'r', color: 'white' };
  s.board[0][4] = { piece: 'k', color: 'black' };
  // Black rook attacking f1 (7, 5)
  s.board[2][5] = { piece: 'r', color: 'black' };

  const moves = getLegalChessMovesFor(s, 7, 4);
  assert.equal(moves.some((m) => m.isCastle === 'kingside'), false);
});

test('chess en passant capture works immediately after double pawn push', () => {
  let s = createInitialChessState();
  // 1. e4
  s = applyChessMove(s, { from: { r: 6, c: 4 }, to: { r: 4, c: 4 } });
  // 1... a6
  s = applyChessMove(s, { from: { r: 1, c: 0 }, to: { r: 2, c: 0 } });
  // 2. e5
  s = applyChessMove(s, { from: { r: 4, c: 4 }, to: { r: 3, c: 4 } });
  // 2... d5 (double push next to e5 pawn)
  s = applyChessMove(s, { from: { r: 1, c: 3 }, to: { r: 3, c: 3 } });

  assert.deepEqual(s.enPassantTarget, { r: 2, c: 3 });

  const whitePawnMoves = getLegalChessMovesFor(s, 3, 4);
  const epMove = whitePawnMoves.find((m) => m.to.r === 2 && m.to.c === 3);
  assert.ok(epMove?.isEnPassant);

  s = applyChessMove(s, epMove!);
  assert.equal(s.board[2][3]?.piece, 'p');
  assert.equal(s.board[2][3]?.color, 'white');
  assert.equal(s.board[3][3], null); // black pawn captured en passant!
});

test('chess prevents self-check and detects checkmate (Fools Mate)', () => {
  let s = createInitialChessState();
  // 1. f3 e5 2. g4 Qh4#
  s = applyChessMove(s, { from: { r: 6, c: 5 }, to: { r: 5, c: 5 } });
  s = applyChessMove(s, { from: { r: 1, c: 4 }, to: { r: 3, c: 4 } });
  s = applyChessMove(s, { from: { r: 6, c: 6 }, to: { r: 4, c: 6 } });
  s = applyChessMove(s, { from: { r: 0, c: 3 }, to: { r: 4, c: 7 } });

  assert.equal(s.status, 'checkmate');
  assert.equal(s.winner, 'black');
});

test('chess pawn promotion supports choosing knight or queen', () => {
  const s = emptyChessState('white');
  s.board[7][4] = { piece: 'k', color: 'white' };
  s.board[0][0] = { piece: 'k', color: 'black' };
  s.board[1][4] = { piece: 'p', color: 'white' };

  const promoState = applyChessMove(s, {
    from: { r: 1, c: 4 },
    to: { r: 0, c: 4 },
    promotion: 'n',
  });
  assert.equal(promoState.board[0][4]?.piece, 'n');
  assert.equal(promoState.board[0][4]?.color, 'white');
});

test('chess bot chooses a valid legal move', () => {
  const s = createInitialChessState();
  const botMove = chooseBestChessMove(s, 2);
  assert.ok(botMove);
  const next = applyChessMove(s, botMove!);
  assert.equal(next.turn, 'black');
  assert.equal(next.moveHistory.length, 1);
});
