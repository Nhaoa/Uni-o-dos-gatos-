import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRoleByUidAndNick } from './staticRoomAuth.ts';

test('resolveRoleByUidAndNick binds new UID to matching nick when slot is unclaimed', () => {
  const res = resolveRoleByUidAndNick({
    typedNick: 'Admin',
    savedNicknames: { cat1: 'Admin', cat2: 'Amy' },
    uid: 'uid_admin',
    cat1Uid: '',
    cat2Uid: '',
  });
  assert.deepEqual(res, { ok: true, role: 'cat1', isNewBinding: true });
});

test('resolveRoleByUidAndNick allows partner UID to claim cat2 when cat1 is bound', () => {
  const res = resolveRoleByUidAndNick({
    typedNick: 'amy',
    savedNicknames: { cat1: 'Admin', cat2: 'Amy' },
    uid: 'uid_amy',
    cat1Uid: 'uid_admin',
    cat2Uid: '',
  });
  assert.deepEqual(res, { ok: true, role: 'cat2', isNewBinding: true });
});

test('resolveRoleByUidAndNick rejects claiming an already bound slot from another UID', () => {
  const res = resolveRoleByUidAndNick({
    typedNick: 'Admin',
    savedNicknames: { cat1: 'Admin', cat2: 'Amy' },
    uid: 'uid_stranger',
    cat1Uid: 'uid_admin',
    cat2Uid: '',
  });
  assert.equal(res.ok, false);
});

test('resolveRoleByUidAndNick rejects wrong nick for an already bound UID', () => {
  const res = resolveRoleByUidAndNick({
    typedNick: 'Amy',
    savedNicknames: { cat1: 'Admin', cat2: 'Amy' },
    uid: 'uid_admin',
    cat1Uid: 'uid_admin',
    cat2Uid: '',
  });
  assert.equal(res.ok, false);
});
