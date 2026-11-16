import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultSharedState } from './defaultState';
import {
  computeExhibitHash,
  decodeBoardRows,
  diffGalleryExhibits,
  encodeBoardRows,
  fromFirestoreGalleryDoc,
  fromFirestoreRoomPayload,
  shouldAcceptRemoteSnapshot,
  toFirestoreGalleryPayload,
  toFirestoreRoomPayload,
} from './firestoreRoomSync';
import type { GalleryExhibit } from '../types/game';

test('encodeBoardRows and decodeBoardRows eliminate nested arrays without data loss', () => {
  const def = createDefaultSharedState();
  const encoded = encodeBoardRows(def.boardGames.chess.state.board);
  assert.equal(Array.isArray(encoded), false);
  for (let r = 0; r < 8; r += 1) {
    assert.equal(Array.isArray(encoded[String(r)]), true);
    assert.equal(encoded[String(r)].length, 8);
  }
  const decoded = decodeBoardRows(encoded, def.boardGames.chess.state.board);
  assert.deepEqual(decoded, def.boardGames.chess.state.board);
});

test('toFirestoreRoomPayload excludes roomPassword and galleryItems and encodes valid schema', () => {
  const state = createDefaultSharedState();
  state.roomPassword = 'secret-should-not-leak';
  state.wallets.cat1.fish = 10;
  state.nicknames = { cat1: 'Admin', cat2: 'Amy' };
  state.cat1.expression = 'normal' as unknown as typeof state.cat1.expression;

  const payload = toFirestoreRoomPayload(state, {
    roomId: 'ninho_de_amor_fixo',
    ownerUid: 'uid_owner_1',
    partnerUid: '',
  });

  assert.equal('roomPassword' in payload, false);
  assert.equal('galleryItems' in payload, false);
  assert.equal('galleryDriveFolder' in payload, false);
  assert.equal(payload.wallets.cat1.fish, 10);
  assert.equal(payload.nicknames.cat1, 'Admin');
  assert.equal(payload.cat1.expression, 'normal');
  assert.deepEqual(payload.galleryOrder, ['starter_wing_1', 'starter_wing_2']);
  assert.equal(typeof payload.galleryHashes.starter_wing_1, 'string');
});

test('toFirestoreRoomPayload and fromFirestoreRoomPayload support optional UID bindings and galleryDriveFolder', () => {
  const local = createDefaultSharedState();
  local.onlineRooms.jokenpo.p1InRoom = true;

  const remoteState = createDefaultSharedState();
  remoteState.wallets.cat1.fish = 77;
  remoteState.nicknames = { cat1: 'Admin', cat2: 'Amy' };
  remoteState.lastStatsUpdateTime = 2000;
  remoteState.galleryDriveFolder = {
    folderId: 'drv_123',
    folderName: 'Memórias',
    ownerEmail: 'advbneto29@gmail.com',
    updatedAt: 1700000000000,
  };

  const encoded = toFirestoreRoomPayload(remoteState, {
    roomId: 'ninho_de_amor_fixo',
    ownerUid: 'uid_owner_1',
    partnerUid: 'uid_partner_2',
    cat1Uid: 'uid_owner_1',
    cat2Uid: 'uid_partner_2',
    roomPasswordHash: 'sha256:salt:digest',
  });

  assert.equal(encoded.cat1Uid, 'uid_owner_1');
  assert.equal(encoded.cat2Uid, 'uid_partner_2');
  assert.equal(encoded.roomPasswordHash, 'sha256:salt:digest');

  const exhibitsById = new Map<string, GalleryExhibit>();
  for (const ex of remoteState.galleryItems || []) {
    exhibitsById.set(ex.id, ex);
  }

  const hydrated = fromFirestoreRoomPayload(
    encoded as unknown as Record<string, unknown>,
    exhibitsById,
    local
  );

  assert.equal(hydrated.wallets.cat1.fish, 77);
  assert.equal(hydrated.nicknames.cat2, 'Amy');
  assert.equal(hydrated.onlineRooms.jokenpo.p1InRoom, true);
  assert.deepEqual(hydrated.boardGames.chess.state.board, remoteState.boardGames.chess.state.board);
  assert.equal(hydrated.galleryItems?.length, 2);
  assert.deepEqual(hydrated.galleryDriveFolder, remoteState.galleryDriveFolder);
});

test('toFirestoreGalleryPayload and fromFirestoreGalleryDoc preserve exhibit fields cleanly', () => {
  const sample: GalleryExhibit = {
    id: 'exh_123',
    kind: 'image',
    title: 'Foto Especial',
    description: 'Nosso passeio no parque.',
    imageUrl: 'data:image/png;base64,AAAA',
    frameStyle: 'crimson',
    addedBy: 'cat1',
    authorName: 'Admin',
    occasionDate: '2026-02-14',
    createdAt: 1700000000000,
    isStarter: false,
  };

  const docPayload = toFirestoreGalleryPayload(sample, {
    roomId: 'ninho_de_amor_fixo',
    authorUid: 'uid_owner_1',
    position: 0,
  });

  assert.equal('url' in docPayload, false);
  assert.equal(docPayload.imageUrl, 'data:image/png;base64,AAAA');
  const parsed = fromFirestoreGalleryDoc(docPayload as unknown as Record<string, unknown>);
  assert.deepEqual(parsed, sample);
});

test('shouldAcceptRemoteSnapshot avoids echo loops and accepts strictly newer timestamps', () => {
  assert.equal(shouldAcceptRemoteSnapshot(1000, 900, 0), true);
  assert.equal(shouldAcceptRemoteSnapshot(1000, 1000, 0), false);
  assert.equal(shouldAcceptRemoteSnapshot(1000, 900, 1000), false);
  assert.equal(shouldAcceptRemoteSnapshot(1200, 1000, 1000), true);
  assert.equal(shouldAcceptRemoteSnapshot(0, 100, 0), false);
});

test('diffGalleryExhibits classifies creates, updates, and deletions accurately', () => {
  const def = createDefaultSharedState();
  const [ex1, ex2] = def.galleryItems!;
  const remoteHashes: Record<string, string> = {
    [ex1.id]: computeExhibitHash(ex1, 0),
    [ex2.id]: computeExhibitHash(ex2, 1),
    removed_id: 'old_hash',
  };

  const editedEx1 = { ...ex1, title: 'Novo Título' };
  const addedEx3: GalleryExhibit = {
    ...ex2,
    id: 'exh_new_3',
    title: 'Terceira Obra',
  };

  const diff = diffGalleryExhibits([editedEx1, ex2, addedEx3], remoteHashes);
  assert.equal(diff.toUpdate.length, 1);
  assert.equal(diff.toUpdate[0].exhibit.id, ex1.id);
  assert.equal(diff.toCreate.length, 1);
  assert.equal(diff.toCreate[0].exhibit.id, 'exh_new_3');
  assert.deepEqual(diff.toDeleteIds, ['removed_id']);
});
