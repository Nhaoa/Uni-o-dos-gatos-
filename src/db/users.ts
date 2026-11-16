import { fallbackDb } from './fallbackStore.ts';
import type { PlayerRole } from '../types/game.ts';

export async function getOrCreateUser(uid: string, email: string, displayName = '') {
  return fallbackDb.getOrCreateUser(uid, email, displayName);
}

export async function upsertRoomMembership(roomId: string, userId: number, role: PlayerRole) {
  return fallbackDb.upsertRoomMembership(roomId, userId, role);
}

export async function getRoomMembers(roomId: string) {
  return fallbackDb.getRoomMembers(roomId);
}
