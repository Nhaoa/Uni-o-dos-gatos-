import test from 'node:test';
import assert from 'node:assert/strict';
import { computeColumnCardOffsets, computeSolitaireLayout } from './solitaireLayout';
import type { PlayingCard } from './solitaire';

function makeCards(downCount: number, upCount: number): PlayingCard[] {
  const out: PlayingCard[] = [];
  for (let i = 0; i < downCount; i++) {
    out.push({ id: `d_${i}`, suit: 'spades', rank: 2, faceUp: false });
  }
  for (let i = 0; i < upCount; i++) {
    out.push({ id: `u_${i}`, suit: 'hearts', rank: 13 - (i % 13), faceUp: true });
  }
  return out;
}

test('portrait mobile 390x844 uses classic-top layout and maximizes card width inside screen', () => {
  const layout = computeSolitaireLayout(390, 844);
  assert.equal(layout.mode, 'classic-top');
  assert.equal(layout.cardSize, 'sm');
  const totalWidth = layout.cardW * 7 + layout.colGap * 6 + layout.padX * 2;
  assert.ok(totalWidth <= 390, `Expected ${totalWidth} <= 390`);
  assert.ok(layout.cardW >= 48, `Expected generous card width on 390px, got ${layout.cardW}`);
  assert.ok(layout.availTableauH > 550);
});

test('desktop landscape 1440x900 uses classic-top layout with large cards fitting height', () => {
  const layout = computeSolitaireLayout(1440, 900);
  assert.equal(layout.mode, 'classic-top');
  assert.equal(layout.cardSize, 'lg');
  assert.ok(layout.cardW >= 120);
  const totalWidth = layout.cardW * 7 + layout.colGap * 6 + layout.padX * 2;
  assert.ok(totalWidth <= 1440);
  assert.ok(layout.cardH + layout.rowGap + layout.availTableauH <= 900);
});

test('compact mobile landscape 844x390 switches to landscape-split so cards do not shrink or clip', () => {
  const layout = computeSolitaireLayout(844, 390);
  assert.equal(layout.mode, 'landscape-split');
  // 2 left dock cols + splitGap + 7 tableau cols + 7 internal colGaps must fit inside 844px
  const totalWidth =
    layout.cardW * 9 + layout.colGap * 7 + layout.splitGap + layout.padX * 2;
  assert.ok(totalWidth <= 844, `Expected ${totalWidth} <= 844`);
  // 3 stacked rows in left dock must fit inside 390px height
  const leftDockHeight = layout.cardH * 3 + layout.rowGap * 2 + 48 + layout.padY * 2;
  assert.ok(leftDockHeight <= 390, `Expected ${leftDockHeight} <= 390`);
  assert.ok(layout.cardW >= 65, `Expected cardW >= 65 on 844x390, got ${layout.cardW}`);
});

test('computeColumnCardOffsets compresses tall stacks gently while preserving readable indices', () => {
  const cards = makeCards(6, 8);
  const { offsets, totalHeight } = computeColumnCardOffsets(cards, 140, 420);
  assert.equal(offsets.length, 14);
  assert.ok(offsets[1] - offsets[0] >= 5);
  // Face-up transition step stays >= 20px when cardH=140
  assert.ok(offsets[7] - offsets[6] >= 20);
  assert.ok(totalHeight <= 490);
});
