import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAutoComplete,
  canPlaceOnFoundation,
  canPlaceOnTableau,
  computeSolitaireReward,
  createInitialSolitaireState,
  drawFromStock,
  isSolitaireWon,
  moveTableauToFoundation,
  moveTableauToTableau,
  PlayingCard,
  stepAutoComplete,
  SUIT_ORDER,
} from './solitaire';

test('initializes standard Klondike layout with 28 tableau and 24 stock cards', () => {
  const easy = createInitialSolitaireState('easy');
  assert.equal(easy.drawCount, 1);
  assert.equal(easy.stock.length, 24);
  assert.equal(easy.waste.length, 0);
  assert.equal(easy.tableau.length, 7);
  easy.tableau.forEach((col, i) => {
    assert.equal(col.length, i + 1);
    assert.equal(col[col.length - 1].faceUp, true);
    for (let j = 0; j < col.length - 1; j++) {
      assert.equal(col[j].faceUp, false);
    }
  });

  const medium = createInitialSolitaireState('medium');
  assert.equal(medium.drawCount, 2);
  const hard = createInitialSolitaireState('hard');
  assert.equal(hard.drawCount, 3);
  assert.ok(computeSolitaireReward('hard') > computeSolitaireReward('easy'));
});

test('drawFromStock draws drawCount cards and recycles waste when stock is empty', () => {
  let state = createInitialSolitaireState('hard');
  state = drawFromStock(state);
  assert.equal(state.waste.length, 3);
  assert.equal(state.stock.length, 21);
  assert.ok(state.waste.every((c) => c.faceUp));

  while (state.stock.length > 0) {
    state = drawFromStock(state);
  }
  assert.equal(state.waste.length, 24);
  state = drawFromStock(state);
  assert.equal(state.stock.length, 24);
  assert.equal(state.waste.length, 0);
});

test('validates foundation and alternating-color tableau placement rules', () => {
  const aceSpades: PlayingCard = { id: 'spades_1', suit: 'spades', rank: 1, faceUp: true };
  const twoSpades: PlayingCard = { id: 'spades_2', suit: 'spades', rank: 2, faceUp: true };
  const queenHearts: PlayingCard = { id: 'hearts_12', suit: 'hearts', rank: 12, faceUp: true };
  const jackClubs: PlayingCard = { id: 'clubs_11', suit: 'clubs', rank: 11, faceUp: true };
  const kingSpades: PlayingCard = { id: 'spades_13', suit: 'spades', rank: 13, faceUp: true };

  assert.equal(canPlaceOnFoundation(aceSpades, []), true);
  assert.equal(canPlaceOnFoundation(twoSpades, []), false);
  assert.equal(canPlaceOnFoundation(twoSpades, [aceSpades]), true);

  assert.equal(canPlaceOnTableau(kingSpades, []), true);
  assert.equal(canPlaceOnTableau(queenHearts, []), false);
  assert.equal(canPlaceOnTableau(jackClubs, [queenHearts]), true);
  assert.equal(canPlaceOnTableau(jackClubs, [kingSpades]), false);
});

test('completes game via auto-complete when all cards are face-up', () => {
  let state = createInitialSolitaireState('easy');
  state.stock = [];
  state.waste = [];
  state.tableau = [[], [], [], [], [], [], []];
  for (let rank = 13; rank >= 1; rank--) {
    SUIT_ORDER.forEach((suit, idx) => {
      state.tableau[idx].push({ id: `${suit}_${rank}`, suit, rank, faceUp: true });
    });
  }
  assert.equal(canAutoComplete(state), true);

  let steps = 0;
  while (!state.won && steps < 60) {
    const next = stepAutoComplete(state);
    assert.ok(next);
    state = next!;
    steps++;
  }
  assert.equal(isSolitaireWon(state), true);
  assert.equal(state.won, true);

  // Also test tableau->foundation & tableau->tableau move helper
  const s2 = createInitialSolitaireState('easy');
  s2.tableau[0] = [{ id: 'hearts_1', suit: 'hearts', rank: 1, faceUp: true }];
  s2.tableau[1] = [
    { id: 'spades_5', suit: 'spades', rank: 5, faceUp: true },
  ];
  s2.tableau[2] = [{ id: 'hearts_4', suit: 'hearts', rank: 4, faceUp: true }];
  const afterFound = moveTableauToFoundation(s2, 0);
  assert.ok(afterFound);
  assert.equal(afterFound!.foundations.hearts.length, 1);
  const afterTab = moveTableauToTableau(afterFound!, 2, 0, 1);
  assert.ok(afterTab);
  assert.equal(afterTab!.tableau[1].length, 2);
});
