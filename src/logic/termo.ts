import { TERMO_WORD_BANK } from './termoWords';

export type TermoMode = 'termo' | 'dueto' | 'quarteto';
export type LetterEval = 'correct' | 'present' | 'absent';

export function normalizeTermoWord(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}

// Build deduplicated normalized 5-letter bank once
export const CLEAN_TERMO_WORDS: readonly string[] = (() => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of TERMO_WORD_BANK) {
    const norm = normalizeTermoWord(w);
    if (norm.length === 5 && !seen.has(norm)) {
      seen.add(norm);
      out.push(norm);
    }
  }
  return out;
})();

const CLEAN_WORD_SET = new Set<string>(CLEAN_TERMO_WORDS);

export function getTermoConfig(mode: TermoMode): {
  wordCount: number;
  maxAttempts: number;
  rewardPaws: number;
  label: string;
} {
  if (mode === 'dueto') {
    return { wordCount: 2, maxAttempts: 7, rewardPaws: 15, label: 'Dueto (2 palavras)' };
  }
  if (mode === 'quarteto') {
    return { wordCount: 4, maxAttempts: 9, rewardPaws: 22, label: 'Quarteto (4 palavras)' };
  }
  return { wordCount: 1, maxAttempts: 6, rewardPaws: 10, label: 'Termo (1 palavra)' };
}

// Epoch anchored to 2026-01-01 UTC
const TERMO_EPOCH_UTC_DAY = Math.floor(Date.UTC(2026, 0, 1) / 86400000);

export function getDayIndexFromDateString(dateStr: string): number {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return 0;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const utcDay = Math.floor(Date.UTC(year, month, day) / 86400000);
  return Math.max(0, utcDay - TERMO_EPOCH_UTC_DAY);
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

function pickCoprimeStep(n: number): number {
  let step = Math.floor(n * 0.6180339887) | 1;
  while (gcd(step, n) !== 1) {
    step += 2;
  }
  return step;
}

const BANK_LEN = CLEAN_TERMO_WORDS.length;
const PERM_STEP = pickCoprimeStep(BANK_LEN);
const PERM_OFFSET = 137 % BANK_LEN;

/**
 * Guaranteed non-repeating cyclic permutation over the full bank:
 * Because gcd(PERM_STEP, BANK_LEN) === 1, consecutive global slots never repeat
 * until every single word in the bank has been visited once.
 * Each day allocates 7 disjoint slots (1 for Termo, 2 for Dueto, 4 for Quarteto).
 */
export function getWordAtPermutationSlot(slot: number): string {
  const safeSlot = ((Math.floor(slot) % BANK_LEN) + BANK_LEN) % BANK_LEN;
  const idx = (safeSlot * PERM_STEP + PERM_OFFSET) % BANK_LEN;
  return CLEAN_TERMO_WORDS[idx];
}

export function getDailyTermoTargets(dateStr: string, mode: TermoMode): string[] {
  const dayIndex = getDayIndexFromDateString(dateStr);
  const baseSlot = dayIndex * 7;
  if (mode === 'termo') {
    return [getWordAtPermutationSlot(baseSlot)];
  }
  if (mode === 'dueto') {
    return [
      getWordAtPermutationSlot(baseSlot + 1),
      getWordAtPermutationSlot(baseSlot + 2),
    ];
  }
  return [
    getWordAtPermutationSlot(baseSlot + 3),
    getWordAtPermutationSlot(baseSlot + 4),
    getWordAtPermutationSlot(baseSlot + 5),
    getWordAtPermutationSlot(baseSlot + 6),
  ];
}

export function getPracticeTermoTargets(mode: TermoMode): string[] {
  const count = getTermoConfig(mode).wordCount;
  const picked = new Set<string>();
  while (picked.size < count) {
    const w = CLEAN_TERMO_WORDS[Math.floor(Math.random() * CLEAN_TERMO_WORDS.length)];
    picked.add(w);
  }
  return [...picked];
}

export function isValidTermoGuess(guess: string): boolean {
  const norm = normalizeTermoWord(guess);
  return norm.length === 5 && CLEAN_WORD_SET.has(norm);
}

export function evaluateTermoGuess(guessRaw: string, targetRaw: string): LetterEval[] {
  const guess = normalizeTermoWord(guessRaw).padEnd(5, ' ').slice(0, 5);
  const target = normalizeTermoWord(targetRaw).padEnd(5, ' ').slice(0, 5);
  const result: LetterEval[] = ['absent', 'absent', 'absent', 'absent', 'absent'];
  const remainingCounts: Record<string, number> = {};

  for (let i = 0; i < 5; i++) {
    if (guess[i] === target[i]) {
      result[i] = 'correct';
    } else {
      const ch = target[i];
      remainingCounts[ch] = (remainingCounts[ch] || 0) + 1;
    }
  }

  for (let i = 0; i < 5; i++) {
    if (result[i] === 'correct') continue;
    const ch = guess[i];
    if ((remainingCounts[ch] || 0) > 0) {
      result[i] = 'present';
      remainingCounts[ch] -= 1;
    }
  }

  return result;
}

const EVAL_PRIORITY: Record<LetterEval, number> = {
  absent: 1,
  present: 2,
  correct: 3,
};

export function computeKeyboardLetterStates(
  guesses: readonly string[],
  targets: readonly string[]
): Record<string, (LetterEval | null)[]> {
  const map: Record<string, (LetterEval | null)[]> = {};

  for (let b = 0; b < targets.length; b++) {
    const target = targets[b];
    // Once a board is solved, lock keyboard feedback for that board at the solving row
    const solveIdx = guesses.findIndex((g) => normalizeTermoWord(g) === target);
    const activeGuesses = solveIdx >= 0 ? guesses.slice(0, solveIdx + 1) : guesses;

    for (const guess of activeGuesses) {
      const evals = evaluateTermoGuess(guess, target);
      const norm = normalizeTermoWord(guess);
      for (let i = 0; i < 5; i++) {
        const ch = norm[i];
        if (!ch) continue;
        if (!map[ch]) {
          map[ch] = Array(targets.length).fill(null);
        }
        const prev = map[ch][b];
        const next = evals[i];
        if (!prev || EVAL_PRIORITY[next] > EVAL_PRIORITY[prev]) {
          map[ch][b] = next;
        }
      }
    }
  }

  return map;
}

export function getMillisecondsUntilMidnight(now = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return Math.max(0, next.getTime() - now.getTime());
}

export function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}
