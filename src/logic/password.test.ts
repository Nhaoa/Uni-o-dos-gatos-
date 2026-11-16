import test from 'node:test';
import assert from 'node:assert/strict';
import { hashRoomPassword, verifyRoomPassword } from './password.ts';

test('hashes and verifies matching room password via scrypt', () => {
  const hash = hashRoomPassword('camarada123');
  assert.ok(hash.includes(':'));
  assert.equal(verifyRoomPassword('camarada123', hash), true);
});

test('rejects incorrect or empty room passwords cleanly', () => {
  const hash = hashRoomPassword('segredo456');
  assert.equal(verifyRoomPassword('errada', hash), false);
  assert.equal(verifyRoomPassword('', hash), false);
  assert.equal(verifyRoomPassword('segredo456', ''), false);
  assert.equal(verifyRoomPassword('segredo456', 'malformed'), false);
});
