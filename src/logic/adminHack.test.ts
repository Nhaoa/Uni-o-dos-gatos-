import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_OWNER_EMAIL,
  applyAdminFishEdit,
  applyAdminFullHack,
  extractAdminHackDraft,
  isAdminAccount,
  MAX_ADMIN_FISH,
  parseAdminFishAmount,
} from './adminHack';
import { createDefaultSharedState } from './defaultState';

test('isAdminAccount grants access only to cat1 with admin email or devBypass', () => {
  assert.equal(
    isAdminAccount({ email: ADMIN_OWNER_EMAIL, role: 'cat1', isDevBypass: false }),
    true
  );
  assert.equal(
    isAdminAccount({ email: 'ADVBNETO29@GMAIL.COM ', role: 'cat1', isDevBypass: false }),
    true
  );
  assert.equal(
    isAdminAccount({ email: 'parceira@gmail.com', role: 'cat1', isDevBypass: false }),
    false
  );
  assert.equal(
    isAdminAccount({ email: ADMIN_OWNER_EMAIL, role: 'cat2', isDevBypass: false }),
    false
  );
  assert.equal(isAdminAccount({ email: null, role: 'cat1', isDevBypass: false }), false);
  assert.equal(isAdminAccount({ email: null, role: 'cat1', isDevBypass: true }), true);
  assert.equal(isAdminAccount({ email: null, role: 'cat2', isDevBypass: true }), false);
});

test('parseAdminFishAmount validates non-negative integer fish values up to max', () => {
  assert.deepEqual(parseAdminFishAmount(10), { ok: true, value: 10 });
  assert.deepEqual(parseAdminFishAmount('0'), { ok: true, value: 0 });
  assert.deepEqual(parseAdminFishAmount(' 250 '), { ok: true, value: 250 });
  assert.equal(parseAdminFishAmount(-1).ok, false);
  assert.equal(parseAdminFishAmount(12.5).ok, false);
  assert.equal(parseAdminFishAmount('abc').ok, false);
  assert.equal(parseAdminFishAmount('').ok, false);
  assert.equal(parseAdminFishAmount(MAX_ADMIN_FISH + 1).ok, false);
});

test('applyAdminFishEdit updates only target role fish while preserving paws and coins', () => {
  const base = createDefaultSharedState();
  base.wallets.cat1 = { fish: 289, paws: 436, coupleCoins: 29 };
  base.wallets.cat2 = { fish: 3, paws: 3, coupleCoins: 29 };

  const updated = applyAdminFishEdit(base, 'cat1', 10);
  assert.deepEqual(updated.wallets.cat1, { fish: 10, paws: 436, coupleCoins: 29 });
  assert.deepEqual(updated.wallets.cat2, { fish: 3, paws: 3, coupleCoins: 29 });
  assert.equal(base.wallets.cat1.fish, 289);
});

test('applyAdminFullHack edits Admin and Amy values, wallets, vitals, and streak counter', () => {
  const base = createDefaultSharedState();
  const draft = extractAdminHackDraft(base);
  draft.streak = { current: 45, best: 50, totalDays: 60 };
  draft.syncedToday = true;
  draft.loveScore = 99;
  draft.scores = { cat1Wins: 12, cat2Wins: 15, ties: 4 };
  draft.cat1.wallet = { fish: 777, paws: 888, coupleCoins: 55 };
  draft.cat1.hunger = 95;
  draft.cat1.energy = 90;
  draft.cat1.happiness = 100;
  draft.cat1.speech = 'Hack do Admin ativo!';
  draft.cat1.inventory.food_salmon = 25;

  draft.cat2.wallet = { fish: 500, paws: 600, coupleCoins: 55 };
  draft.cat2.hunger = 100;
  draft.cat2.energy = 100;
  draft.cat2.happiness = 100;
  draft.cat2.speech = 'Amy 100% feliz!';
  draft.cat2.inventory.food_starfruit = 30;

  const updated = applyAdminFullHack(base, draft, '2026-11-16');
  assert.deepEqual(updated.streak, { current: 45, best: 50, totalDays: 60 });
  assert.equal(updated.presence.syncedToday, true);
  assert.equal(updated.loveScore, 99);
  assert.equal(updated.scores.cat1Wins, 12);
  assert.equal(updated.scores.cat2Wins, 15);
  assert.equal(updated.scores.ties, 4);
  assert.deepEqual(updated.wallets.cat1, { fish: 777, paws: 888, coupleCoins: 55 });
  assert.deepEqual(updated.wallets.cat2, { fish: 500, paws: 600, coupleCoins: 55 });
  assert.equal(updated.cat1.hunger, 95);
  assert.equal(updated.cat2.happiness, 100);
  assert.equal(updated.inventories.cat1.food_salmon, 25);
  assert.equal(updated.inventories.cat2.food_starfruit, 30);
});
