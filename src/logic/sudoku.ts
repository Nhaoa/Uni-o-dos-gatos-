import { SudokuDifficulty, SudokuSize } from '../types/game';

export interface SudokuPuzzle {
  size: SudokuSize;
  difficulty: SudokuDifficulty;
  puzzle: number[];
  solution: number[];
}

export function getBoxDimensions(size: SudokuSize): { boxRows: number; boxCols: number } {
  if (size === 4) return { boxRows: 2, boxCols: 2 };
  if (size === 6) return { boxRows: 2, boxCols: 3 };
  return { boxRows: 3, boxCols: 3 };
}

function shuffled<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function isPlacementValid(
  board: readonly number[],
  size: SudokuSize,
  idx: number,
  val: number
): boolean {
  if (val < 1 || val > size) return false;
  const r = Math.floor(idx / size);
  const c = idx % size;
  const { boxRows, boxCols } = getBoxDimensions(size);

  for (let col = 0; col < size; col++) {
    const pos = r * size + col;
    if (pos !== idx && board[pos] === val) return false;
  }
  for (let row = 0; row < size; row++) {
    const pos = row * size + c;
    if (pos !== idx && board[pos] === val) return false;
  }

  const startR = Math.floor(r / boxRows) * boxRows;
  const startC = Math.floor(c / boxCols) * boxCols;
  for (let dr = 0; dr < boxRows; dr++) {
    for (let dc = 0; dc < boxCols; dc++) {
      const pos = (startR + dr) * size + (startC + dc);
      if (pos !== idx && board[pos] === val) return false;
    }
  }
  return true;
}

function getCandidates(board: readonly number[], size: SudokuSize, idx: number): number[] {
  const out: number[] = [];
  for (let n = 1; n <= size; n++) {
    if (isPlacementValid(board, size, idx, n)) out.push(n);
  }
  return out;
}

function findBestEmptyCell(board: readonly number[], size: SudokuSize): { idx: number; cands: number[] } | null {
  let bestIdx = -1;
  let bestCands: number[] | null = null;
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== 0) continue;
    const cands = getCandidates(board, size, i);
    if (cands.length === 0) return { idx: i, cands: [] };
    if (bestCands === null || cands.length < bestCands.length) {
      bestIdx = i;
      bestCands = cands;
      if (cands.length === 1) break;
    }
  }
  if (bestIdx === -1 || !bestCands) return null;
  return { idx: bestIdx, cands: bestCands };
}

export function solveSudokuBoard(
  initial: readonly number[],
  size: SudokuSize,
  randomize = false
): number[] | null {
  const board = [...initial];
  function backtrack(): boolean {
    const pick = findBestEmptyCell(board, size);
    if (!pick) return true;
    if (pick.cands.length === 0) return false;
    const order = randomize ? shuffled(pick.cands) : pick.cands;
    for (const val of order) {
      board[pick.idx] = val;
      if (backtrack()) return true;
      board[pick.idx] = 0;
    }
    return false;
  }
  return backtrack() ? board : null;
}

export function countSudokuSolutions(
  initial: readonly number[],
  size: SudokuSize,
  limit = 2,
  maxSteps = 8000
): number {
  const board = [...initial];
  let count = 0;
  let steps = 0;

  function backtrack() {
    if (count >= limit || steps >= maxSteps) return;
    steps++;
    const pick = findBestEmptyCell(board, size);
    if (!pick) {
      count++;
      return;
    }
    if (pick.cands.length === 0) return;
    for (const val of pick.cands) {
      board[pick.idx] = val;
      backtrack();
      board[pick.idx] = 0;
      if (count >= limit || steps >= maxSteps) return;
    }
  }

  backtrack();
  return count;
}

const TARGET_HOLES: Record<SudokuSize, Record<SudokuDifficulty, number>> = {
  4: { easy: 6, medium: 8, hard: 10, expert: 11 },
  6: { easy: 13, medium: 17, hard: 21, expert: 23 },
  9: { easy: 32, medium: 42, hard: 50, expert: 56 },
};

export function generateSudokuPuzzle(
  size: SudokuSize,
  difficulty: SudokuDifficulty
): SudokuPuzzle {
  const empty = Array(size * size).fill(0);
  const solution = solveSudokuBoard(empty, size, true);
  if (!solution) {
    throw new Error(`Failed to generate Sudoku solution for size ${size}`);
  }

  const puzzle = [...solution];
  const targetHoles = TARGET_HOLES[size][difficulty];
  const indices = shuffled(Array.from({ length: size * size }, (_, i) => i));
  let removed = 0;

  for (const idx of indices) {
    if (removed >= targetHoles) break;
    const backup = puzzle[idx];
    puzzle[idx] = 0;

    // Ensure unique solution cleanly; enforce stricter limit on larger grids
    const solutions = countSudokuSolutions(puzzle, size, 2, size === 9 ? 2500 : 8000);
    if (solutions === 1) {
      removed++;
    } else {
      puzzle[idx] = backup;
    }
  }

  return {
    size,
    difficulty,
    puzzle,
    solution,
  };
}

export function getRelatedIndices(size: SudokuSize, idx: number): Set<number> {
  const related = new Set<number>();
  if (idx < 0 || idx >= size * size) return related;
  const r = Math.floor(idx / size);
  const c = idx % size;
  const { boxRows, boxCols } = getBoxDimensions(size);

  for (let col = 0; col < size; col++) related.add(r * size + col);
  for (let row = 0; row < size; row++) related.add(row * size + c);

  const startR = Math.floor(r / boxRows) * boxRows;
  const startC = Math.floor(c / boxCols) * boxCols;
  for (let dr = 0; dr < boxRows; dr++) {
    for (let dc = 0; dc < boxCols; dc++) {
      related.add((startR + dr) * size + (startC + dc));
    }
  }
  return related;
}

export function getRemainingCounts(board: readonly number[], size: SudokuSize): Record<number, number> {
  const counts: Record<number, number> = {};
  for (let n = 1; n <= size; n++) counts[n] = size;
  for (const v of board) {
    if (v >= 1 && v <= size) {
      counts[v] = Math.max(0, counts[v] - 1);
    }
  }
  return counts;
}

export function isSudokuSolved(board: readonly number[], solution: readonly number[]): boolean {
  if (board.length !== solution.length || board.length === 0) return false;
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== solution[i]) return false;
  }
  return true;
}

export function countCorrectFilledCells(
  board: readonly number[],
  puzzle: readonly number[],
  solution: readonly number[]
): { filled: number; totalToFill: number } {
  let filled = 0;
  let totalToFill = 0;
  for (let i = 0; i < puzzle.length; i++) {
    if (puzzle[i] === 0) {
      totalToFill++;
      if (board[i] !== 0 && board[i] === solution[i]) {
        filled++;
      }
    }
  }
  return { filled, totalToFill };
}

export function getTimedModeSeconds(size: SudokuSize, difficulty: SudokuDifficulty): number {
  const baseBySize: Record<SudokuSize, number> = { 4: 90, 6: 210, 9: 480 };
  const mult: Record<SudokuDifficulty, number> = {
    easy: 1.25,
    medium: 1.0,
    hard: 0.85,
    expert: 0.72,
  };
  return Math.round(baseBySize[size] * mult[difficulty]);
}

export function computeSudokuReward(
  size: SudokuSize,
  difficulty: SudokuDifficulty,
  isOnlineWin = false
): number {
  const base: Record<SudokuSize, Record<SudokuDifficulty, number>> = {
    4: { easy: 5, medium: 6, hard: 8, expert: 10 },
    6: { easy: 8, medium: 10, hard: 13, expert: 16 },
    9: { easy: 10, medium: 14, hard: 18, expert: 24 },
  };
  return base[size][difficulty] + (isOnlineWin ? 8 : 0);
}
