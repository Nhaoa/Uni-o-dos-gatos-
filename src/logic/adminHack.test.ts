import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_OWNER_EMAIL,
  applyAdminFishEdit,
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
