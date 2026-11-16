import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRoleByNickAndMembers, validateNicknameChange } from './authMatch.ts';

test('recovers unclaimed cat2 profile (Amy) on first Google sign-in when nick matches', () => {
  const res = resolveRoleByNickAndMembers({
    typedNick: 'amy',
    savedNicknames: { cat1: 'Admin', cat2: 'Amy' },
    userId: 2,
    members: [{ userId: 1, role: 'cat1' }],
  });
  assert.deepEqual(res, { ok: true, role: 'cat2', isNewBinding: true });
});

test('prevents another Google account from hijacking an already-claimed profile', () => {
  const res = resolveRoleByNickAndMembers({
    typedNick: 'Admin',
    savedNicknames: { cat1: 'Admin', cat2: 'Amy' },
    userId: 99,
    members: [{ userId: 1, role: 'cat1' }],
  });
  assert.equal(res.ok, false);
});

test('requires returning Google account to enter its own bound nick', () => {
  const fail = resolveRoleByNickAndMembers({
    typedNick: 'Amy',
    savedNicknames: { cat1: 'Admin', cat2: 'Amy' },
    userId: 1,
    members: [{ userId: 1, role: 'cat1' }],
  });
  assert.equal(fail.ok, false);

  const ok = resolveRoleByNickAndMembers({
    typedNick: 'Admin',
    savedNicknames: { cat1: 'Admin', cat2: 'Amy' },
    userId: 1,
    members: [{ userId: 1, role: 'cat1' }],
  });
  assert.deepEqual(ok, { ok: true, role: 'cat1', isNewBinding: false });
});

test('rejects unknown nicknames cleanly', () => {
  const res = resolveRoleByNickAndMembers({
    typedNick: 'Desconhecido',
    savedNicknames: { cat1: 'Admin', cat2: 'Amy' },
    userId: 2,
    members: [],
  });
  assert.equal(res.ok, false);
});

test('validates nickname change length and prevents colliding with partner nick', () => {
  const dup = validateNicknameChange({
    newNickname: 'amy',
    role: 'cat1',
    savedNicknames: { cat1: 'Admin', cat2: 'Amy' },
  });
  assert.equal(dup.ok, false);

  const short = validateNicknameChange({
    newNickname: 'A',
    role: 'cat1',
    savedNicknames: { cat1: 'Admin', cat2: 'Amy' },
  });
  assert.equal(short.ok, false);

  const ok = validateNicknameChange({
    newNickname: 'Comandante',
    role: 'cat1',
    savedNicknames: { cat1: 'Admin', cat2: 'Amy' },
  });
  assert.deepEqual(ok, { ok: true, nickname: 'Comandante' });
});
