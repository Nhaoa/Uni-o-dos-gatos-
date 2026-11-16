import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultSharedState } from './defaultState.ts';
import { applyClientGameAction } from './clientGameAction.ts';

test('applyClientGameAction appends radio telegram and updates timestamp', () => {
  const initial = createDefaultSharedState();
  const prevCount = initial.letters.length;
  const res = applyClientGameAction(initial, 'cat1', {
    type: 'chat:send',
    text: 'Olá pelo GitHub Pages!',
  });
  assert.equal(res.shouldPersist, true);
  assert.equal(res.nextState.letters.length, prevCount + 1);
  assert.equal(res.nextState.letters.at(-1)?.text, 'Olá pelo GitHub Pages!');
  assert.equal(res.nextState.letters.at(-1)?.from, 'cat1');
});

test('applyClientGameAction resolves online jokenpo round and awards paws', () => {
  let state = createDefaultSharedState();
  state = applyClientGameAction(state, 'cat1', { type: 'jokenpo:choice', choice: 'rock' }).nextState;
  assert.equal(state.onlineRooms.jokenpo.state, 'waiting');
  const res = applyClientGameAction(state, 'cat2', { type: 'jokenpo:choice', choice: 'scissors' });
  assert.equal(res.nextState.onlineRooms.jokenpo.state, 'finished');
  assert.equal(res.nextState.wallets.cat1.paws, state.wallets.cat1.paws + 6);
  assert.equal(res.nextState.scores.cat1Wins, 1);
});

test('applyClientGameAction executes tictactoe moves and resets board', () => {
  let state = createDefaultSharedState();
  state = applyClientGameAction(state, 'cat1', { type: 'ttt:move', index: 0 }).nextState;
  assert.equal(state.onlineRooms.tictactoe.board[0], '🐾');
  assert.equal(state.onlineRooms.tictactoe.turn, 'cat2');
  const reset = applyClientGameAction(state, 'cat1', { type: 'ttt:reset', starter: 'cat2' });
  assert.equal(reset.nextState.onlineRooms.tictactoe.board.every((c) => c === ''), true);
  assert.equal(reset.nextState.onlineRooms.tictactoe.turn, 'cat2');
});
