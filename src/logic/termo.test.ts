import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLEAN_TERMO_WORDS,
  computeKeyboardLetterStates,
  evaluateTermoGuess,
  getDailyTermoTargets,
  isValidTermoGuess,
} from './termo';

test('word bank contains hundreds of unique 5-letter normalized words', () => {
  assert.ok(CLEAN_TERMO_WORDS.length >= 600);
  for (const w of CLEAN_TERMO_WORDS) {
    assert.equal(w.length, 5);
    assert.match(w, /^[A-Z]{5}$/);
  }
  assert.equal(isValidTermoGuess('termo'), true);
  assert.equal(isValidTermoGuess('ações'), false);
  assert.equal(isValidTermoGuess('coracao'), false);
});

test('daily words never repeat across 100 consecutive days or across modes on same day', () => {
  const seen = new Set<string>();
  const baseDate = new Date(Date.UTC(2026, 0, 1));

  for (let d = 0; d < 100; d++) {
    const dt = new Date(baseDate.getTime() + d * 86400000);
    const dateStr = dt.toISOString().slice(0, 10);
    const t = getDailyTermoTargets(dateStr, 'termo');
    const duo = getDailyTermoTargets(dateStr, 'dueto');
    const quad = getDailyTermoTargets(dateStr, 'quarteto');

    assert.equal(t.length, 1);
    assert.equal(duo.length, 2);
    assert.equal(quad.length, 4);

    for (const w of [...t, ...duo, ...quad]) {
      assert.equal(seen.has(w), false, `Repeated word ${w} on day ${dateStr}`);
      seen.add(w);
    }
  }
});

test('evaluates guesses accurately including duplicate letters', () => {
  // Target: CASAS (A at 1,3; S at 2,4)
  // Guess:  ABACO -> A(present), B(absent), A(present? wait: A is at 1 only remaining after none exact -> 2 A's in CASAS!), C(present), O(absent)
  assert.deepEqual(evaluateTermoGuess('TERMO', 'TERMO'), [
    'correct',
    'correct',
    'correct',
    'correct',
    'correct',
  ]);

  // Target: GATOS -> Guess: TTTTT (only 1 T at index 2!)
  assert.deepEqual(evaluateTermoGuess('TTTTT', 'GATOS'), [
    'absent',
    'absent',
    'correct',
    'absent',
    'absent',
  ]);

  // Target: LIVRO -> Guess: ARARA (R at idx 1,3 -> target has one R at idx 3 -> idx 3 correct, idx 1 absent!)
  assert.deepEqual(evaluateTermoGuess('ARARA', 'LIVRO'), [
    'absent',
    'absent',
    'absent',
    'correct',
    'absent',
  ]);
});

test('computes per-board keyboard letter states for dueto', () => {
  const states = computeKeyboardLetterStates(['GATOS'], ['GATOS', 'PRAIA']);
  assert.deepEqual(states['G'], ['correct', 'absent']);
  assert.deepEqual(states['A'], ['correct', 'present']);
});
