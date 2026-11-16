import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FallbackDatabaseStore } from './fallbackStore.ts';
import { createDefaultSharedState } from '../logic/defaultState.ts';

function makeTempStorePath() {
  return path.join(
    os.tmpdir(),
    `uniao-fallback-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
  );
}

test('FallbackDatabaseStore persists users, rooms, passwords, and memberships across reloads', () => {
  const filePath = makeTempStorePath();
  try {
    const store1 = new FallbackDatabaseStore(filePath);
    const u1 = store1.getOrCreateUser('uid_1', 'a@example.com', 'Admin');
    const u2 = store1.getOrCreateUser('uid_2', 'b@example.com', 'Amy');
    assert.equal(u1.id, 1);
    assert.equal(u2.id, 2);

    const updatedU1 = store1.getOrCreateUser('uid_1', 'a2@example.com', '');
    assert.equal(updatedU1.id, 1);
    assert.equal(updatedU1.email, 'a2@example.com');
    assert.equal(updatedU1.displayName, 'Admin');

    const initialState = createDefaultSharedState();
    initialState.nicknames = { cat1: 'Admin', cat2: 'Amy' };
    store1.insertRoomIfAbsent({
      id: 'room_1',
      passwordHash: 'salt:hash',
      stateJson: initialState,
      migratedFromFirestore: true,
    });

    store1.upsertRoomMembership('room_1', u1.id, 'cat1');
    store1.upsertRoomMembership('room_1', u2.id, 'cat2');

    // Save state must preserve existing passwordHash
    const nextState = { ...initialState, loveScore: 99 };
    store1.saveRoomState('room_1', nextState);

    // Reload from disk in a fresh instance
    const store2 = new FallbackDatabaseStore(filePath);
    const reloadedRoom = store2.getRoom('room_1');
    assert.ok(reloadedRoom);
    assert.equal(reloadedRoom.passwordHash, 'salt:hash');
    assert.equal(reloadedRoom.stateJson.loveScore, 99);
    assert.equal(reloadedRoom.stateJson.nicknames.cat2, 'Amy');

    const members = store2.getRoomMembers('room_1');
    assert.equal(members.length, 2);
    assert.equal(members[0].role, 'cat1');
    assert.equal(members[1].role, 'cat2');

    store2.updateRoomPasswordHash('room_1', 'new_salt:new_hash');
    assert.equal(store2.getRoom('room_1')?.passwordHash, 'new_salt:new_hash');
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});
