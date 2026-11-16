import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultSharedState } from './defaultState.ts';
import {
  mergeExternalRoomState,
  preserveTransientPresence,
} from './roomSync.ts';

test('mergeExternalRoomState preserves external DB wallet edits when only galleryItems is dirty locally', () => {
  const dbState = createDefaultSharedState();
  dbState.wallets.cat1.fish = 10;

  const localState = createDefaultSharedState();
  localState.wallets.cat1.fish = 289;
  localState.galleryItems = [
    ...(localState.galleryItems || []),
    {
      id: 'site_novo',
      kind: 'site',
      title: 'Site Romântico',
      description: 'Feito com carinho',
      url: 'https://example.com',
      frameStyle: 'gold',
      addedBy: 'cat1',
      authorName: 'Admin',
      createdAt: 1000,
    },
  ];

  const merged = mergeExternalRoomState(dbState, localState, ['galleryItems']);
  assert.equal(merged.wallets.cat1.fish, 10);
  assert.equal(merged.galleryItems?.some((g) => g.id === 'site_novo'), true);
});

test('mergeExternalRoomState unions chat letters by id in chronological order', () => {
  const dbState = createDefaultSharedState();
  dbState.letters = [
    {
      id: 'm1',
      from: 'cat2',
      authorName: 'Amy',
      text: 'Oi amor',
      timestamp: 100,
      timeFormatted: '03:00',
    },
  ];

  const localState = createDefaultSharedState();
  localState.letters = [
    {
      id: 'm2',
      from: 'cat1',
      authorName: 'Admin',
      text: 'Oi gatinha',
      timestamp: 200,
      timeFormatted: '03:01',
    },
  ];

  const merged = mergeExternalRoomState(dbState, localState, ['letters']);
  assert.deepEqual(
    merged.letters.map((m) => m.id),
    ['m1', 'm2']
  );
});

test('preserveTransientPresence retains local WebSocket room presence flags across DB reloads', () => {
  const dbState = createDefaultSharedState();
  dbState.onlineRooms.jokenpo.p1InRoom = false;

  const current = createDefaultSharedState();
  current.onlineRooms.jokenpo.p1InRoom = true;
  current.activeGames = {
    cat1: { game: 'skyhop', mode: 'bot', label: 'SkyHop', icon: '🚀', updatedAt: 500 },
    cat2: null,
  };

  const next = preserveTransientPresence(dbState, current);
  assert.equal(next.onlineRooms.jokenpo.p1InRoom, true);
  assert.equal(next.activeGames?.cat1?.game, 'skyhop');
});
