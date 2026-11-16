import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { PlayerRole, SharedState } from '../types/game.ts';

export interface FallbackUserRecord {
  id: number;
  uid: string;
  email: string;
  displayName: string;
  preferredRole: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FallbackRoomRecord {
  id: string;
  passwordHash: string;
  stateJson: SharedState;
  migratedFromFirestore: boolean;
  updatedAt: Date;
}

export interface FallbackRoomMemberRecord {
  id: number;
  roomId: string;
  userId: number;
  role: string;
  createdAt: Date;
}

interface SerializedFallbackStore {
  nextUserId: number;
  nextMemberId: number;
  users: Array<Omit<FallbackUserRecord, 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string }>;
  rooms: Array<Omit<FallbackRoomRecord, 'updatedAt'> & { updatedAt: string }>;
  roomMembers: Array<Omit<FallbackRoomMemberRecord, 'createdAt'> & { createdAt: string }>;
}

const DEFAULT_FALLBACK_DB_PATH = path.join(os.tmpdir(), 'uniao-camaradas-fallback-db.json');

export class FallbackDatabaseStore {
  private readonly filePath: string;
  private loaded = false;
  private nextUserId = 1;
  private nextMemberId = 1;
  private usersByUid = new Map<string, FallbackUserRecord>();
  private roomsById = new Map<string, FallbackRoomRecord>();
  private members: FallbackRoomMemberRecord[] = [];

  constructor(filePath = DEFAULT_FALLBACK_DB_PATH) {
    this.filePath = filePath;
  }

  private ensureLoaded() {
    if (this.loaded) return;
    this.loaded = true;
    try {
      if (!fs.existsSync(this.filePath)) return;
      const raw = fs.readFileSync(this.filePath, 'utf8');
      if (!raw.trim()) return;
      const parsed = JSON.parse(raw) as Partial<SerializedFallbackStore>;
      this.nextUserId = Math.max(1, Number(parsed.nextUserId) || 1);
      this.nextMemberId = Math.max(1, Number(parsed.nextMemberId) || 1);

      this.usersByUid.clear();
      for (const u of parsed.users || []) {
        if (!u?.uid) continue;
        const record: FallbackUserRecord = {
          id: Number(u.id) || this.nextUserId++,
          uid: String(u.uid),
          email: String(u.email || ''),
          displayName: String(u.displayName || ''),
          preferredRole: String(u.preferredRole || 'cat1'),
          createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
          updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date(),
        };
        this.usersByUid.set(record.uid, record);
        if (record.id >= this.nextUserId) this.nextUserId = record.id + 1;
      }

      this.roomsById.clear();
      for (const r of parsed.rooms || []) {
        if (!r?.id || !r.stateJson) continue;
        this.roomsById.set(String(r.id), {
          id: String(r.id),
          passwordHash: String(r.passwordHash || ''),
          stateJson: r.stateJson,
          migratedFromFirestore: Boolean(r.migratedFromFirestore),
          updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
        });
      }

      this.members = (parsed.roomMembers || [])
        .filter((m) => m && m.roomId && typeof m.userId === 'number')
        .map((m) => {
          const id = Number(m.id) || this.nextMemberId++;
          if (id >= this.nextMemberId) this.nextMemberId = id + 1;
          return {
            id,
            roomId: String(m.roomId),
            userId: Number(m.userId),
            role: String(m.role || 'cat1'),
            createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
          };
        });
    } catch (err) {
      console.warn('Fallback DB load warning (starting fresh in-memory):', err instanceof Error ? err.message : err);
    }
  }

  private flush() {
    try {
      const dir = path.dirname(this.filePath);
      fs.mkdirSync(dir, { recursive: true });
      const payload: SerializedFallbackStore = {
        nextUserId: this.nextUserId,
        nextMemberId: this.nextMemberId,
        users: Array.from(this.usersByUid.values()).map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
          updatedAt: u.updatedAt.toISOString(),
        })),
        rooms: Array.from(this.roomsById.values()).map((r) => ({
          ...r,
          updatedAt: r.updatedAt.toISOString(),
        })),
        roomMembers: this.members.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
        })),
      };
      const tmpPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(payload), 'utf8');
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      console.warn('Fallback DB flush warning:', err instanceof Error ? err.message : err);
    }
  }

  getOrCreateUser(uid: string, email: string, displayName = ''): FallbackUserRecord {
    this.ensureLoaded();
    const now = new Date();
    const existing = this.usersByUid.get(uid);
    if (existing) {
      const updated: FallbackUserRecord = {
        ...existing,
        email,
        displayName: displayName || existing.displayName,
        updatedAt: now,
      };
      this.usersByUid.set(uid, updated);
      this.flush();
      return updated;
    }

    const created: FallbackUserRecord = {
      id: this.nextUserId++,
      uid,
      email,
      displayName,
      preferredRole: 'cat1',
      createdAt: now,
      updatedAt: now,
    };
    this.usersByUid.set(uid, created);
    this.flush();
    return created;
  }

  getRoomMembers(roomId: string): FallbackRoomMemberRecord[] {
    this.ensureLoaded();
    return this.members.filter((m) => m.roomId === roomId).map((m) => ({ ...m }));
  }

  upsertRoomMembership(roomId: string, userId: number, role: PlayerRole): FallbackRoomMemberRecord {
    this.ensureLoaded();
    const existing = this.members.find((m) => m.roomId === roomId && m.userId === userId);
    if (existing) {
      existing.role = role;
      this.flush();
      return { ...existing };
    }

    const created: FallbackRoomMemberRecord = {
      id: this.nextMemberId++,
      roomId,
      userId,
      role,
      createdAt: new Date(),
    };
    this.members.push(created);
    this.flush();
    return { ...created };
  }

  getRoom(roomId: string): FallbackRoomRecord | null {
    this.ensureLoaded();
    const found = this.roomsById.get(roomId);
    return found ? { ...found, updatedAt: new Date(found.updatedAt) } : null;
  }

  insertRoomIfAbsent(params: {
    id: string;
    passwordHash: string;
    stateJson: SharedState;
    migratedFromFirestore: boolean;
  }): FallbackRoomRecord {
    this.ensureLoaded();
    const existing = this.roomsById.get(params.id);
    if (existing) {
      return { ...existing, updatedAt: new Date(existing.updatedAt) };
    }

    const created: FallbackRoomRecord = {
      id: params.id,
      passwordHash: params.passwordHash,
      stateJson: params.stateJson,
      migratedFromFirestore: params.migratedFromFirestore,
      updatedAt: new Date(),
    };
    this.roomsById.set(params.id, created);
    this.flush();
    return { ...created, updatedAt: new Date(created.updatedAt) };
  }

  saveRoomState(roomId: string, stateJson: SharedState): { updatedAtMs: number } {
    this.ensureLoaded();
    const now = new Date();
    const existing = this.roomsById.get(roomId);
    if (existing) {
      this.roomsById.set(roomId, {
        ...existing,
        stateJson,
        updatedAt: now,
      });
    } else {
      this.roomsById.set(roomId, {
        id: roomId,
        passwordHash: '',
        stateJson,
        migratedFromFirestore: false,
        updatedAt: now,
      });
    }
    this.flush();
    return { updatedAtMs: now.getTime() };
  }

  updateRoomPasswordHash(roomId: string, passwordHash: string): void {
    this.ensureLoaded();
    const existing = this.roomsById.get(roomId);
    if (!existing) return;
    this.roomsById.set(roomId, {
      ...existing,
      passwordHash,
      updatedAt: new Date(),
    });
    this.flush();
  }
}

export const fallbackDb = new FallbackDatabaseStore();
