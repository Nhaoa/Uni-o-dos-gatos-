import test from 'node:test';
import assert from 'node:assert/strict';
import { hashRoomPasswordClient, verifyRoomPasswordClient } from './passwordClient.ts';

test('hashRoomPasswordClient and verifyRoomPasswordClient verify matching passwords and reject wrong ones', async () => {
  const hash = await hashRoomPasswordClient('segredo123');
  assert.ok(hash.startsWith('sha256:'));
  assert.equal(await verifyRoomPasswordClient('segredo123', hash), true);
  assert.equal(await verifyRoomPasswordClient('  segredo123 ', hash), true);
  assert.equal(await verifyRoomPasswordClient('errada', hash), false);
  assert.equal(await verifyRoomPasswordClient('', hash), false);
});

test('hashRoomPasswordClient returns empty string for blank input', async () => {
  assert.equal(await hashRoomPasswordClient('   '), '');
  assert.equal(await verifyRoomPasswordClient('abc', ''), false);
});
