import {
  BoardCoord,
  CheckersSquarePiece,
  CheckersState,
  PieceColor,
} from '../types/game';
import { coordsToAlgebraic } from './chess';

export interface CheckersMove {
  from: BoardCoord;
  to: BoardCoord;
  capture?: BoardCoord;
  maxChainLength?: number;
}

const ALL_DIAGS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

export function createInitialCheckersBoard(): (CheckersSquarePiece | null)[][] {
  const b: (CheckersSquarePiece | null)[][] = Array.from({ length: 8 }, () =>
    Array<CheckersSquarePiece | null>(8).fill(null)
  );
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) b[r][c] = { piece: 'M', color: 'black' };
    }
  }
  for (let r = 5; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) b[r][c] = { piece: 'M', color: 'white' };
    }
  }
  return b;
}

export function createInitialCheckersState(): CheckersState {
  return {
    board: createInitialCheckersBoard(),
    turn: 'white',
    mustContinueFrom: null,
    moveHistory: [],
    lastMove: null,
    status: 'playing',
    winner: null,
  };
}

export function cloneCheckersBoard(
  board: (CheckersSquarePiece | null)[][]
): (CheckersSquarePiece | null)[][] {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

/**
 * Computes all single-step capture jumps available for the piece at (r, c)
 * without crossing already-captured squares in the current chain.
 */
function getSingleStepCaptures(
  board: (CheckersSquarePiece | null)[][],
  r: number,
  c: number,
  piece: CheckersSquarePiece
): { to: BoardCoord; capture: BoardCoord }[] {
  const results: { to: BoardCoord; capture: BoardCoord }[] = [];
  const enemy: PieceColor = piece.color === 'white' ? 'black' : 'white';

  if (piece.piece === 'M') {
    // Brazilian Damas: regular piece (Pedra) captures both forward and backward diagonally
    for (const [dr, dc] of ALL_DIAGS) {
      const mr = r + dr;
      const mc = c + dc;
      const jr = r + 2 * dr;
      const jc = c + 2 * dc;
      if (!inBounds(jr, jc)) continue;
      const mid = board[mr][mc];
      if (mid && mid.color === enemy && !board[jr][jc]) {
        results.push({ to: { r: jr, c: jc }, capture: { r: mr, c: mc } });
      }
    }
  } else {
    // Flying King (Dama): slides any distance along a diagonal, jumps over 1 enemy piece,
    // and can land on ANY empty square beyond it along that same diagonal.
    for (const [dr, dc] of ALL_DIAGS) {
      let step = 1;
      let foundEnemy: BoardCoord | null = null;
      while (true) {
        const cr = r + dr * step;
        const cc = c + dc * step;
        if (!inBounds(cr, cc)) break;
        const sq = board[cr][cc];
        if (!foundEnemy) {
          if (!sq) {
            step++;
            continue;
          }
          if (sq.color === enemy) {
            foundEnemy = { r: cr, c: cc };
            step++;
            continue;
          }
          // Blocked by own piece
          break;
        } else {
          // Past the enemy piece: every consecutive empty square is a valid landing square
          if (!sq) {
            results.push({ to: { r: cr, c: cc }, capture: foundEnemy });
            step++;
            continue;
          }
          // Blocked by another piece
          break;
        }
      }
    }
  }

  return results;
}

/**
 * Recursively computes the maximum capture chain depth achievable from (r, c),
 * and returns the first jumps with their maximum achievable chain length.
 */
function getCaptureMovesWithMaxLength(
  board: (CheckersSquarePiece | null)[][],
  r: number,
  c: number,
  piece: CheckersSquarePiece
): { move: CheckersMove; chainLength: number }[] {
  const firstSteps = getSingleStepCaptures(board, r, c, piece);
  if (firstSteps.length === 0) return [];

  const annotated: { move: CheckersMove; chainLength: number }[] = [];

  for (const step of firstSteps) {
    const nextBoard = cloneCheckersBoard(board);
    nextBoard[r][c] = null;
    nextBoard[step.capture.r][step.capture.c] = null;
    nextBoard[step.to.r][step.to.c] = { ...piece };

    const further = getCaptureMovesWithMaxLength(
      nextBoard,
      step.to.r,
      step.to.c,
      piece
    );
    const maxSub =
      further.length > 0
        ? Math.max(...further.map((f) => f.chainLength))
        : 0;
    const totalLen = 1 + maxSub;

    annotated.push({
      move: {
        from: { r, c },
        to: step.to,
        capture: step.capture,
        maxChainLength: totalLen,
      },
      chainLength: totalLen,
    });
  }

  return annotated;
}

function getSimpleMovesForPiece(
  board: (CheckersSquarePiece | null)[][],
  r: number,
  c: number,
  piece: CheckersSquarePiece
): CheckersMove[] {
  const moves: CheckersMove[] = [];
  if (piece.piece === 'M') {
    const forwardDr = piece.color === 'white' ? -1 : 1;
    for (const dc of [-1, 1]) {
      const tr = r + forwardDr;
      const tc = c + dc;
      if (inBounds(tr, tc) && !board[tr][tc]) {
        moves.push({ from: { r, c }, to: { r: tr, c: tc } });
      }
    }
  } else {
    // Flying King (Dama): moves any number of empty squares along all 4 diagonals
    for (const [dr, dc] of ALL_DIAGS) {
      for (let step = 1; step < 8; step++) {
        const tr = r + dr * step;
        const tc = c + dc * step;
        if (!inBounds(tr, tc)) break;
        if (board[tr][tc]) break;
        moves.push({ from: { r, c }, to: { r: tr, c: tc } });
      }
    }
  }
  return moves;
}

/**
 * Returns ALL legal moves for the active player, enforcing:
 * 1. Continuation lock (`mustContinueFrom`) during multi-jump captures
 * 2. Mandatory capture (if any capture exists, non-captures are illegal)
 * 3. Lei da Maioria (must pick a capture path achieving the maximum capture count)
 */
export function getAllLegalCheckersMoves(state: CheckersState): CheckersMove[] {
  if (state.status === 'finished') return [];

  const { board, turn, mustContinueFrom } = state;

  if (mustContinueFrom) {
    const piece = board[mustContinueFrom.r][mustContinueFrom.c];
    if (!piece || piece.color !== turn) return [];
    const captures = getCaptureMovesWithMaxLength(
      board,
      mustContinueFrom.r,
      mustContinueFrom.c,
      piece
    );
    if (captures.length === 0) return [];
    const maxLen = Math.max(...captures.map((c) => c.chainLength));
    return captures.filter((c) => c.chainLength === maxLen).map((c) => c.move);
  }

  // Check all pieces of current player for captures first
  const allCaptures: { move: CheckersMove; chainLength: number }[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.color === turn) {
        allCaptures.push(...getCaptureMovesWithMaxLength(board, r, c, piece));
      }
    }
  }

  if (allCaptures.length > 0) {
    const maxLen = Math.max(...allCaptures.map((c) => c.chainLength));
    return allCaptures
      .filter((c) => c.chainLength === maxLen)
      .map((c) => c.move);
  }

  // No captures available: collect simple moves
  const simpleMoves: CheckersMove[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.color === turn) {
        simpleMoves.push(...getSimpleMovesForPiece(board, r, c, piece));
      }
    }
  }
  return simpleMoves;
}

export function getLegalCheckersMovesFor(
  state: CheckersState,
  r: number,
  c: number
): CheckersMove[] {
  return getAllLegalCheckersMoves(state).filter(
    (m) => m.from.r === r && m.from.c === c
  );
}

export function hasAnyMandatoryCapture(state: CheckersState): boolean {
  const all = getAllLegalCheckersMoves(state);
  return all.some((m) => Boolean(m.capture));
}

export function applyCheckersMove(
  state: CheckersState,
  move: CheckersMove,
  actorName?: string
): CheckersState {
  if (state.status === 'finished') return state;

  const legal = getLegalCheckersMovesFor(state, move.from.r, move.from.c);
  const matched = legal.find(
    (m) => m.to.r === move.to.r && m.to.c === move.to.c
  );
  if (!matched) return state;

  const nextBoard = cloneCheckersBoard(state.board);
  const movingPiece = nextBoard[matched.from.r][matched.from.c]!;
  nextBoard[matched.from.r][matched.from.c] = null;

  if (matched.capture) {
    nextBoard[matched.capture.r][matched.capture.c] = null;
  }

  nextBoard[matched.to.r][matched.to.c] = { ...movingPiece };

  const fromStr = coordsToAlgebraic(matched.from.r, matched.from.c);
  const toStr = coordsToAlgebraic(matched.to.r, matched.to.c);
  const icon = state.turn === 'white' ? '⭐' : '🚩';
  const actionChar = matched.capture ? 'x' : '→';
  const prefix = actorName ? `${icon} ${actorName}: ` : `${icon} `;

  // Check if this was a capture AND the same piece has further captures in its chain
  if (matched.capture) {
    const moreCaptures = getCaptureMovesWithMaxLength(
      nextBoard,
      matched.to.r,
      matched.to.c,
      movingPiece
    );
    if (moreCaptures.length > 0) {
      // Multi-jump continues: do NOT promote yet and keep turn on current player!
      return {
        board: nextBoard,
        turn: state.turn,
        mustContinueFrom: { r: matched.to.r, c: matched.to.c },
        moveHistory: [
          ...state.moveHistory,
          `${prefix}${fromStr}${actionChar}${toStr} (Combo!)`,
        ],
        lastMove: { from: matched.from, to: matched.to },
        status: 'playing',
        winner: null,
      };
    }
  }

  // Turn ends: promote Pedra if it landed on opponent's back rank
  let promoted = false;
  if (movingPiece.piece === 'M') {
    if (movingPiece.color === 'white' && matched.to.r === 0) {
      nextBoard[matched.to.r][matched.to.c] = { piece: 'K', color: 'white' };
      promoted = true;
    } else if (movingPiece.color === 'black' && matched.to.r === 7) {
      nextBoard[matched.to.r][matched.to.c] = { piece: 'K', color: 'black' };
      promoted = true;
    }
  }

  const nextTurn: PieceColor = state.turn === 'white' ? 'black' : 'white';
  const tentativeNext: CheckersState = {
    board: nextBoard,
    turn: nextTurn,
    mustContinueFrom: null,
    moveHistory: [
      ...state.moveHistory,
      `${prefix}${fromStr}${actionChar}${toStr}${promoted ? ' 👑' : ''}`,
    ],
    lastMove: { from: matched.from, to: matched.to },
    status: 'playing',
    winner: null,
  };

  // Check if opponent has any legal moves remaining
  const oppMoves = getAllLegalCheckersMoves(tentativeNext);
  if (oppMoves.length === 0) {
    return {
      ...tentativeNext,
      status: 'finished',
      winner: state.turn,
    };
  }

  return tentativeNext;
}

// --- Checkers Bot AI (Alpha-Beta Search) ---
function evaluateCheckersState(
  state: CheckersState,
  botColor: PieceColor
): number {
  if (state.status === 'finished') {
    return state.winner === botColor ? 100000 : -100000;
  }

  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = state.board[r][c];
      if (!sq) continue;
      let val = sq.piece === 'K' ? 380 : 100;
      if (sq.piece === 'M') {
        const advance = sq.color === 'white' ? 7 - r : r;
        val += advance * 6;
      }
      // Slight center control bonus
      if (r >= 2 && r <= 5 && c >= 2 && c <= 5) {
        val += 12;
      }
      score += sq.color === botColor ? val : -val;
    }
  }
  return score;
}

function alphaBetaCheckers(
  state: CheckersState,
  depth: number,
  alpha: number,
  beta: number,
  botColor: PieceColor
): number {
  if (depth <= 0 || state.status === 'finished') {
    return evaluateCheckersState(state, botColor);
  }

  const moves = getAllLegalCheckersMoves(state);
  if (moves.length === 0) {
    return state.turn === botColor ? -100000 : 100000;
  }

  const maximizing = state.turn === botColor;
  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      const next = applyCheckersMove(state, m);
      // Do not consume depth for forced continuation inside same turn
      const nextDepth = next.mustContinueFrom ? depth : depth - 1;
      const val = alphaBetaCheckers(next, nextDepth, alpha, beta, botColor);
      if (val > best) best = val;
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      const next = applyCheckersMove(state, m);
      const nextDepth = next.mustContinueFrom ? depth : depth - 1;
      const val = alphaBetaCheckers(next, nextDepth, alpha, beta, botColor);
      if (val < best) best = val;
      if (best < beta) beta = best;
      if (beta <= alpha) break;
    }
    return best;
  }
}

export function chooseBestCheckersMove(
  state: CheckersState,
  depth = 4
): CheckersMove | null {
  const moves = getAllLegalCheckersMoves(state);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  const botColor = state.turn;
  let bestScore = -Infinity;
  let bestMoves: CheckersMove[] = [];

  for (const m of moves) {
    const next = applyCheckersMove(state, m);
    const nextDepth = next.mustContinueFrom ? depth : depth - 1;
    const val = alphaBetaCheckers(
      next,
      nextDepth,
      -Infinity,
      Infinity,
      botColor
    );
    if (val > bestScore) {
      bestScore = val;
      bestMoves = [m];
    } else if (val === bestScore) {
      bestMoves.push(m);
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)] || moves[0];
}
