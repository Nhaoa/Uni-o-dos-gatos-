import {
  BoardCoord,
  CastlingRights,
  ChessPieceType,
  ChessSquarePiece,
  ChessState,
  PieceColor,
} from '../types/game';

export interface ChessMove {
  from: BoardCoord;
  to: BoardCoord;
  isCapture?: boolean;
  isEnPassant?: boolean;
  isCastle?: 'kingside' | 'queenside';
  promotion?: ChessPieceType;
}

export function createInitialChessBoard(): (ChessSquarePiece | null)[][] {
  const b: (ChessSquarePiece | null)[][] = Array.from({ length: 8 }, () =>
    Array<ChessSquarePiece | null>(8).fill(null)
  );
  const backRank: ChessPieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  for (let c = 0; c < 8; c++) {
    b[0][c] = { piece: backRank[c], color: 'black' };
    b[1][c] = { piece: 'p', color: 'black' };
    b[6][c] = { piece: 'p', color: 'white' };
    b[7][c] = { piece: backRank[c], color: 'white' };
  }
  return b;
}

export function createInitialChessState(): ChessState {
  return {
    board: createInitialChessBoard(),
    turn: 'white',
    castlingRights: { wK: true, wQ: true, bK: true, bQ: true },
    enPassantTarget: null,
    halfMoveClock: 0,
    fullMoveNumber: 1,
    moveHistory: [],
    lastMove: null,
    status: 'playing',
    winner: null,
  };
}

export function cloneChessBoard(
  board: (ChessSquarePiece | null)[][]
): (ChessSquarePiece | null)[][] {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export function coordsToAlgebraic(r: number, c: number): string {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  return `${files[c]}${8 - r}`;
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

export function findKing(
  board: (ChessSquarePiece | null)[][],
  color: PieceColor
): BoardCoord | null {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = board[r][c];
      if (sq && sq.color === color && sq.piece === 'k') {
        return { r, c };
      }
    }
  }
  return null;
}

export function isSquareAttacked(
  board: (ChessSquarePiece | null)[][],
  targetR: number,
  targetC: number,
  byColor: PieceColor
): boolean {
  // Pawn attacks (byColor pawns attack toward their forward direction)
  const pawnFromDir = byColor === 'white' ? 1 : -1;
  for (const dc of [-1, 1]) {
    const pr = targetR + pawnFromDir;
    const pc = targetC + dc;
    if (inBounds(pr, pc)) {
      const p = board[pr][pc];
      if (p && p.color === byColor && p.piece === 'p') return true;
    }
  }

  // Knight attacks
  const knightJumps = [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1],
  ];
  for (const [dr, dc] of knightJumps) {
    const nr = targetR + dr;
    const nc = targetC + dc;
    if (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p && p.color === byColor && p.piece === 'n') return true;
    }
  }

  // King attacks
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const kr = targetR + dr;
      const kc = targetC + dc;
      if (inBounds(kr, kc)) {
        const p = board[kr][kc];
        if (p && p.color === byColor && p.piece === 'k') return true;
      }
    }
  }

  // Orthogonal rays (Rook / Queen)
  const orthoDirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (const [dr, dc] of orthoDirs) {
    for (let step = 1; step < 8; step++) {
      const rr = targetR + dr * step;
      const cc = targetC + dc * step;
      if (!inBounds(rr, cc)) break;
      const p = board[rr][cc];
      if (p) {
        if (p.color === byColor && (p.piece === 'r' || p.piece === 'q')) {
          return true;
        }
        break;
      }
    }
  }

  // Diagonal rays (Bishop / Queen)
  const diagDirs = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];
  for (const [dr, dc] of diagDirs) {
    for (let step = 1; step < 8; step++) {
      const rr = targetR + dr * step;
      const cc = targetC + dc * step;
      if (!inBounds(rr, cc)) break;
      const p = board[rr][cc];
      if (p) {
        if (p.color === byColor && (p.piece === 'b' || p.piece === 'q')) {
          return true;
        }
        break;
      }
    }
  }

  return false;
}

export function isKingInCheck(
  board: (ChessSquarePiece | null)[][],
  color: PieceColor
): boolean {
  const kingPos = findKing(board, color);
  if (!kingPos) return false;
  const enemy: PieceColor = color === 'white' ? 'black' : 'white';
  return isSquareAttacked(board, kingPos.r, kingPos.c, enemy);
}

function getPseudoLegalMovesFor(
  state: ChessState,
  r: number,
  c: number
): ChessMove[] {
  const board = state.board;
  const item = board[r][c];
  if (!item) return [];

  const moves: ChessMove[] = [];
  const { piece, color } = item;
  const enemy: PieceColor = color === 'white' ? 'black' : 'white';

  if (piece === 'p') {
    const dir = color === 'white' ? -1 : 1;
    const startRank = color === 'white' ? 6 : 1;
    const promoRank = color === 'white' ? 0 : 7;

    // 1 step forward
    if (inBounds(r + dir, c) && !board[r + dir][c]) {
      if (r + dir === promoRank) {
        moves.push({ from: { r, c }, to: { r: r + dir, c }, promotion: 'q' });
      } else {
        moves.push({ from: { r, c }, to: { r: r + dir, c } });
        // 2 steps forward from start
        if (r === startRank && inBounds(r + 2 * dir, c) && !board[r + 2 * dir][c]) {
          moves.push({ from: { r, c }, to: { r: r + 2 * dir, c } });
        }
      }
    }

    // Diagonal captures + En Passant
    for (const dc of [-1, 1]) {
      const tr = r + dir;
      const tc = c + dc;
      if (!inBounds(tr, tc)) continue;
      const target = board[tr][tc];
      if (target && target.color === enemy) {
        if (tr === promoRank) {
          moves.push({
            from: { r, c },
            to: { r: tr, c: tc },
            isCapture: true,
            promotion: 'q',
          });
        } else {
          moves.push({
            from: { r, c },
            to: { r: tr, c: tc },
            isCapture: true,
          });
        }
      } else if (
        state.enPassantTarget &&
        state.enPassantTarget.r === tr &&
        state.enPassantTarget.c === tc
      ) {
        const epVictim = board[r][tc];
        if (epVictim && epVictim.color === enemy && epVictim.piece === 'p') {
          moves.push({
            from: { r, c },
            to: { r: tr, c: tc },
            isCapture: true,
            isEnPassant: true,
          });
        }
      }
    }
    return moves;
  }

  if (piece === 'n') {
    const jumps = [
      [-2, -1],
      [-2, 1],
      [-1, -2],
      [-1, 2],
      [1, -2],
      [1, 2],
      [2, -1],
      [2, 1],
    ];
    for (const [dr, dc] of jumps) {
      const tr = r + dr;
      const tc = c + dc;
      if (!inBounds(tr, tc)) continue;
      const target = board[tr][tc];
      if (!target || target.color === enemy) {
        moves.push({
          from: { r, c },
          to: { r: tr, c: tc },
          isCapture: Boolean(target),
        });
      }
    }
    return moves;
  }

  if (piece === 'k') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const tr = r + dr;
        const tc = c + dc;
        if (!inBounds(tr, tc)) continue;
        const target = board[tr][tc];
        if (!target || target.color === enemy) {
          moves.push({
            from: { r, c },
            to: { r: tr, c: tc },
            isCapture: Boolean(target),
          });
        }
      }
    }

    // Castling (Roque)
    const homeRank = color === 'white' ? 7 : 0;
    if (r === homeRank && c === 4 && !isSquareAttacked(board, homeRank, 4, enemy)) {
      const canKingside =
        color === 'white' ? state.castlingRights.wK : state.castlingRights.bK;
      const canQueenside =
        color === 'white' ? state.castlingRights.wQ : state.castlingRights.bQ;

      if (canKingside) {
        const rook = board[homeRank][7];
        if (
          rook &&
          rook.color === color &&
          rook.piece === 'r' &&
          !board[homeRank][5] &&
          !board[homeRank][6] &&
          !isSquareAttacked(board, homeRank, 5, enemy) &&
          !isSquareAttacked(board, homeRank, 6, enemy)
        ) {
          moves.push({
            from: { r, c },
            to: { r: homeRank, c: 6 },
            isCastle: 'kingside',
          });
        }
      }

      if (canQueenside) {
        const rook = board[homeRank][0];
        if (
          rook &&
          rook.color === color &&
          rook.piece === 'r' &&
          !board[homeRank][3] &&
          !board[homeRank][2] &&
          !board[homeRank][1] &&
          !isSquareAttacked(board, homeRank, 3, enemy) &&
          !isSquareAttacked(board, homeRank, 2, enemy)
        ) {
          moves.push({
            from: { r, c },
            to: { r: homeRank, c: 2 },
            isCastle: 'queenside',
          });
        }
      }
    }
    return moves;
  }

  // Sliding pieces: r, b, q
  const dirs: number[][] = [];
  if (piece === 'r' || piece === 'q') {
    dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
  }
  if (piece === 'b' || piece === 'q') {
    dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
  }
  for (const [dr, dc] of dirs) {
    for (let step = 1; step < 8; step++) {
      const tr = r + dr * step;
      const tc = c + dc * step;
      if (!inBounds(tr, tc)) break;
      const target = board[tr][tc];
      if (!target) {
        moves.push({ from: { r, c }, to: { r: tr, c: tc } });
      } else {
        if (target.color === enemy) {
          moves.push({ from: { r, c }, to: { r: tr, c: tc }, isCapture: true });
        }
        break;
      }
    }
  }

  return moves;
}

function applyRawBoardMove(
  board: (ChessSquarePiece | null)[][],
  move: ChessMove
): (ChessSquarePiece | null)[][] {
  const next = cloneChessBoard(board);
  const moving = next[move.from.r][move.from.c];
  if (!moving) return next;

  next[move.to.r][move.to.c] = move.promotion
    ? { piece: move.promotion, color: moving.color }
    : moving;
  next[move.from.r][move.from.c] = null;

  if (move.isEnPassant) {
    next[move.from.r][move.to.c] = null;
  }

  if (move.isCastle === 'kingside') {
    const rook = next[move.from.r][7];
    next[move.from.r][5] = rook;
    next[move.from.r][7] = null;
  } else if (move.isCastle === 'queenside') {
    const rook = next[move.from.r][0];
    next[move.from.r][3] = rook;
    next[move.from.r][0] = null;
  }

  return next;
}

export function getLegalChessMovesFor(
  state: ChessState,
  r: number,
  c: number
): ChessMove[] {
  const item = state.board[r][c];
  if (!item || item.color !== state.turn) return [];
  const pseudo = getPseudoLegalMovesFor(state, r, c);
  return pseudo.filter((move) => {
    const nextBoard = applyRawBoardMove(state.board, move);
    return !isKingInCheck(nextBoard, item.color);
  });
}

export function getAllLegalChessMoves(state: ChessState): ChessMove[] {
  const all: ChessMove[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = state.board[r][c];
      if (sq && sq.color === state.turn) {
        all.push(...getLegalChessMovesFor(state, r, c));
      }
    }
  }
  return all;
}

function hasInsufficientMaterial(board: (ChessSquarePiece | null)[][]): boolean {
  const nonKingPieces: { piece: ChessPieceType; color: PieceColor; squareColor: number }[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = board[r][c];
      if (sq && sq.piece !== 'k') {
        nonKingPieces.push({ piece: sq.piece, color: sq.color, squareColor: (r + c) % 2 });
      }
    }
  }
  if (nonKingPieces.length === 0) return true;
  if (
    nonKingPieces.length === 1 &&
    (nonKingPieces[0].piece === 'n' || nonKingPieces[0].piece === 'b')
  ) {
    return true;
  }
  if (
    nonKingPieces.length === 2 &&
    nonKingPieces[0].piece === 'b' &&
    nonKingPieces[1].piece === 'b' &&
    nonKingPieces[0].color !== nonKingPieces[1].color &&
    nonKingPieces[0].squareColor === nonKingPieces[1].squareColor
  ) {
    return true;
  }
  return false;
}

export function applyChessMove(
  state: ChessState,
  move: ChessMove,
  actorName?: string
): ChessState {
  if (state.status === 'checkmate' || state.status === 'stalemate' || state.status === 'draw') {
    return state;
  }

  const legal = getLegalChessMovesFor(state, move.from.r, move.from.c);
  const matched = legal.find(
    (m) => m.to.r === move.to.r && m.to.c === move.to.c
  );
  if (!matched) return state;

  const finalMove: ChessMove = {
    ...matched,
    promotion: matched.promotion ? move.promotion || matched.promotion : undefined,
  };

  const movingPiece = state.board[finalMove.from.r][finalMove.from.c]!;
  const capturedPiece = state.board[finalMove.to.r][finalMove.to.c];
  const nextBoard = applyRawBoardMove(state.board, finalMove);

  // Update castling rights
  const nextRights: CastlingRights = { ...state.castlingRights };
  if (movingPiece.piece === 'k') {
    if (movingPiece.color === 'white') {
      nextRights.wK = false;
      nextRights.wQ = false;
    } else {
      nextRights.bK = false;
      nextRights.bQ = false;
    }
  }
  if (movingPiece.piece === 'r') {
    if (finalMove.from.r === 7 && finalMove.from.c === 7) nextRights.wK = false;
    if (finalMove.from.r === 7 && finalMove.from.c === 0) nextRights.wQ = false;
    if (finalMove.from.r === 0 && finalMove.from.c === 7) nextRights.bK = false;
    if (finalMove.from.r === 0 && finalMove.from.c === 0) nextRights.bQ = false;
  }
  // If a rook is captured on its corner
  if (finalMove.to.r === 7 && finalMove.to.c === 7) nextRights.wK = false;
  if (finalMove.to.r === 7 && finalMove.to.c === 0) nextRights.wQ = false;
  if (finalMove.to.r === 0 && finalMove.to.c === 7) nextRights.bK = false;
  if (finalMove.to.r === 0 && finalMove.to.c === 0) nextRights.bQ = false;

  // En passant target if pawn jumped 2 squares
  let nextEnPassant: BoardCoord | null = null;
  if (
    movingPiece.piece === 'p' &&
    Math.abs(finalMove.to.r - finalMove.from.r) === 2
  ) {
    nextEnPassant = {
      r: (finalMove.from.r + finalMove.to.r) / 2,
      c: finalMove.from.c,
    };
  }

  const nextTurn: PieceColor = state.turn === 'white' ? 'black' : 'white';
  const nextHalfMoveClock =
    movingPiece.piece === 'p' || capturedPiece || finalMove.isEnPassant
      ? 0
      : state.halfMoveClock + 1;
  const nextFullMove =
    state.turn === 'black' ? state.fullMoveNumber + 1 : state.fullMoveNumber;

  const tentativeState: ChessState = {
    board: nextBoard,
    turn: nextTurn,
    castlingRights: nextRights,
    enPassantTarget: nextEnPassant,
    halfMoveClock: nextHalfMoveClock,
    fullMoveNumber: nextFullMove,
    moveHistory: state.moveHistory,
    lastMove: { from: finalMove.from, to: finalMove.to },
    status: 'playing',
    winner: null,
  };

  const inCheck = isKingInCheck(nextBoard, nextTurn);
  const opponentMoves = getAllLegalChessMoves(tentativeState);

  let status: ChessState['status'] = 'playing';
  let winner: ChessState['winner'] = null;
  let suffix = '';

  if (opponentMoves.length === 0) {
    if (inCheck) {
      status = 'checkmate';
      winner = state.turn;
      suffix = '#';
    } else {
      status = 'stalemate';
      winner = 'draw';
    }
  } else if (hasInsufficientMaterial(nextBoard) || nextHalfMoveClock >= 100) {
    status = 'draw';
    winner = 'draw';
  } else if (inCheck) {
    status = 'check';
    suffix = '+';
  }

  const fromStr = coordsToAlgebraic(finalMove.from.r, finalMove.from.c);
  const toStr = coordsToAlgebraic(finalMove.to.r, finalMove.to.c);
  const pieceSymbol: Record<ChessPieceType, string> = {
    p: '',
    r: 'T',
    n: 'C',
    b: 'B',
    q: 'D',
    k: 'R',
  };
  let notation = '';
  if (finalMove.isCastle === 'kingside') {
    notation = `O-O${suffix}`;
  } else if (finalMove.isCastle === 'queenside') {
    notation = `O-O-O${suffix}`;
  } else {
    const cap = finalMove.isCapture ? 'x' : '→';
    const promo = finalMove.promotion ? `=${pieceSymbol[finalMove.promotion]}` : '';
    notation = `${pieceSymbol[movingPiece.piece]}${fromStr}${cap}${toStr}${promo}${suffix}`;
  }
  const icon = state.turn === 'white' ? '⭐' : '🚩';
  const entry = actorName ? `${icon} ${actorName}: ${notation}` : `${icon} ${notation}`;

  return {
    ...tentativeState,
    moveHistory: [...state.moveHistory, entry],
    status,
    winner,
  };
}

// --- Bot AI (Minimax + Alpha-Beta) ---
const PIECE_VALUES: Record<ChessPieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

const CENTER_BONUS = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [5, 10, 18, 22, 22, 18, 10, 5],
  [0, 5, 18, 28, 28, 18, 5, 0],
  [0, 5, 18, 28, 28, 18, 5, 0],
  [5, 10, 18, 22, 22, 18, 10, 5],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

function evaluateChessState(state: ChessState, botColor: PieceColor): number {
  if (state.status === 'checkmate') {
    return state.winner === botColor ? 100000 : -100000;
  }
  if (state.status === 'stalemate' || state.status === 'draw') {
    return 0;
  }

  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = state.board[r][c];
      if (!sq) continue;
      let val = PIECE_VALUES[sq.piece];
      if (sq.piece !== 'k') {
        val += CENTER_BONUS[r][c];
      }
      if (sq.piece === 'p') {
        const advance = sq.color === 'white' ? 6 - r : r - 1;
        val += advance * 8;
      }
      score += sq.color === botColor ? val : -val;
    }
  }
  if (state.status === 'check') {
    score += state.turn === botColor ? -35 : 35;
  }
  return score;
}

function alphaBetaChess(
  state: ChessState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  botColor: PieceColor
): number {
  if (
    depth === 0 ||
    state.status === 'checkmate' ||
    state.status === 'stalemate' ||
    state.status === 'draw'
  ) {
    const evalScore = evaluateChessState(state, botColor);
    if (state.status === 'checkmate') {
      return evalScore > 0 ? evalScore + depth : evalScore - depth;
    }
    return evalScore;
  }

  const moves = getAllLegalChessMoves(state);
  // Order captures first for faster alpha-beta pruning
  moves.sort((a, b) => (b.isCapture ? 1 : 0) - (a.isCapture ? 1 : 0));

  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      const next = applyChessMove(state, m);
      const val = alphaBetaChess(next, depth - 1, alpha, beta, false, botColor);
      if (val > best) best = val;
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      const next = applyChessMove(state, m);
      const val = alphaBetaChess(next, depth - 1, alpha, beta, true, botColor);
      if (val < best) best = val;
      if (best < beta) beta = best;
      if (beta <= alpha) break;
    }
    return best;
  }
}

export function chooseBestChessMove(
  state: ChessState,
  depth = 2
): ChessMove | null {
  const moves = getAllLegalChessMoves(state);
  if (moves.length === 0) return null;

  const botColor = state.turn;
  moves.sort((a, b) => (b.isCapture ? 1 : 0) - (a.isCapture ? 1 : 0));

  let bestScore = -Infinity;
  let bestMoves: ChessMove[] = [];

  for (const m of moves) {
    const next = applyChessMove(state, m);
    const val = alphaBetaChess(
      next,
      depth - 1,
      -Infinity,
      Infinity,
      false,
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
