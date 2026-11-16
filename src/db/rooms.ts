import { fallbackDb } from './fallbackStore.ts';
import { createDefaultSharedState } from '../logic/defaultState.ts';
import { applyRealisticCatDecay } from '../logic/decay.ts';
import { hashRoomPassword, verifyRoomPassword } from '../logic/password.ts';
import { DEFAULT_UNLOCKED_ITEMS } from '../logic/minigames.ts';
import { sanitizeGalleryItems } from '../logic/gallery.ts';
import { normalizeScores } from '../logic/scores.ts';
import { fromFirestoreGalleryDoc, fromFirestoreRoomPayload } from '../logic/firestoreRoomSync.ts';
import firebaseConfig from '../../firebase-applet-config.json';
import type { CatState, GalleryExhibit, PlayerRole, SharedState } from '../types/game.ts';

function decodeFirestoreValue(v: Record<string, unknown> | undefined): unknown {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) {
    const arr = v.arrayValue as { values?: Record<string, unknown>[] } | undefined;
    return (arr?.values || []).map((item) => decodeFirestoreValue(item));
  }
  if ('mapValue' in v) {
    const map = v.mapValue as { fields?: Record<string, Record<string, unknown>> } | undefined;
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(map?.fields || {})) {
      out[k] = decodeFirestoreValue(val);
    }
    return out;
  }
  return null;
}

export async function fetchRoomFromAppFirestore(
  roomId: string,
  idToken: string,
  fallbackLocalState: SharedState
): Promise<{ state: SharedState; remoteTs: number } | null> {
  const firestoreDbId =
    (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId || '(default)';
  if (!idToken || !firebaseConfig.projectId) {
    return null;
  }
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    firebaseConfig.projectId
  )}/databases/${encodeURIComponent(
    firestoreDbId
  )}/documents/rooms/${encodeURIComponent(roomId)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${idToken}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const docJson = (await res.json()) as { fields?: Record<string, Record<string, unknown>> };
    if (!docJson.fields) return null;

    const data = decodeFirestoreValue({ mapValue: { fields: docJson.fields } }) as Record<
      string,
      unknown
    >;
    const remoteTs = Number(data.lastStatsUpdateTime || 0);
    const galleryOrder = Array.isArray(data.galleryOrder)
      ? data.galleryOrder.filter((id): id is string => typeof id === 'string').slice(0, 60)
      : [];

    const exhibitsMap = new Map<string, GalleryExhibit>();
    if (galleryOrder.length > 0) {
      await Promise.all(
        galleryOrder.map(async (exhibitId) => {
          if (!/^[a-zA-Z0-9_-]{1,128}$/.test(exhibitId)) return;
          try {
            const exCtrl = new AbortController();
            const exTimer = setTimeout(() => exCtrl.abort(), 3500);
            const exRes = await fetch(`${baseUrl}/gallery/${encodeURIComponent(exhibitId)}`, {
              headers: { Authorization: `Bearer ${idToken}` },
              signal: exCtrl.signal,
            });
            clearTimeout(exTimer);
            if (!exRes.ok) return;
            const exDoc = (await exRes.json()) as { fields?: Record<string, Record<string, unknown>> };
            if (!exDoc.fields) return;
            const exData = decodeFirestoreValue({ mapValue: { fields: exDoc.fields } }) as Record<
              string,
              unknown
            >;
            const parsed = fromFirestoreGalleryDoc(exData);
            if (parsed) exhibitsMap.set(exhibitId, parsed);
          } catch {
            // ignore individual exhibit fetch timeout
          }
        })
      );
    }

    const hydrated = fromFirestoreRoomPayload(data, exhibitsMap, fallbackLocalState);
    return { state: hydrated, remoteTs };
  } catch {
    return null;
  }
}

function normalizeDateString(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return raw.trim();
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(
      parsed.getDate()
    ).padStart(2, '0')}`;
  }
  return '';
}

function normalizeLegacyCat(raw: unknown, fallback: CatState): CatState {
  if (!raw || typeof raw !== 'object') return fallback;
  const c = raw as Record<string, unknown>;
  return {
    ...fallback,
    breed: (c.breed as CatState['breed']) || fallback.breed,
    outfit: (c.outfit as CatState['outfit']) || fallback.outfit,
    outfitColor: String(c.outfitColor || fallback.outfitColor),
    accessory: (c.accessory as CatState['accessory']) || fallback.accessory,
    accessoryColor: String(c.accessoryColor || c.accColor || fallback.accessoryColor),
    expression: c.expression === 'pet' ? 'pet' : 'happy',
    eyeShape: (c.eyeShape as CatState['eyeShape']) || fallback.eyeShape,
    eyeColor: String(c.eyeColor || fallback.eyeColor),
    pupil: (c.pupil as CatState['pupil']) || fallback.pupil,
    pupilColor: String(c.pupilColor || fallback.pupilColor),
    mouth: (c.mouth as CatState['mouth']) || fallback.mouth,
    hunger: typeof c.hunger === 'number' ? c.hunger : fallback.hunger,
    energy: typeof c.energy === 'number' ? c.energy : fallback.energy,
    happiness: typeof c.happiness === 'number' ? c.happiness : fallback.happiness,
    speech: typeof c.speech === 'string' && c.speech ? c.speech : fallback.speech,
  };
}

export async function fetchLegacyFirestoreRoom(
  roomId: string
): Promise<{ state: SharedState; passwordHash: string; migrated: boolean }> {
  const def = createDefaultSharedState();

  try {
    const url = `https://firestore.googleapis.com/v1/projects/jardim-gatos-teste/databases/(default)/documents/artifacts/jardim-dos-gatos-casal/public/data/rooms/${encodeURIComponent(
      roomId
    )}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      return { state: def, passwordHash: '', migrated: false };
    }

    const doc = (await res.json()) as { fields?: Record<string, Record<string, unknown>> };
    if (!doc.fields) {
      return { state: def, passwordHash: '', migrated: false };
    }

    const data = decodeFirestoreValue({ mapValue: { fields: doc.fields } }) as Record<
      string,
      unknown
    >;

    const rawPassword = typeof data.roomPassword === 'string' ? data.roomPassword.trim() : '';
    const passwordHash = rawPassword ? hashRoomPassword(rawPassword) : '';

    const rawUnlocked = (data.unlockedItems || {}) as Partial<Record<PlayerRole, string[]>>;
    const rawWallets = (data.wallets || {}) as Partial<SharedState['wallets']>;
    const rawInv = (data.inventories || {}) as Partial<SharedState['inventories']>;
    const rawNick = (data.nicknames || {}) as Partial<SharedState['nicknames']>;
    const rawStreak = (data.streak || {}) as Partial<SharedState['streak']>;
    const rawScores = (data.scores || {}) as Partial<SharedState['scores']>;
    const rawPresence = (data.presence || {}) as Partial<SharedState['presence']>;
    const rawRewards = (data.lastRewardDates || {}) as Partial<Record<PlayerRole, string>>;
    const rawLetters = Array.isArray(data.letters)
      ? (data.letters as SharedState['letters']).slice(-80)
      : [];

    const migratedState: SharedState = {
      ...def,
      roomPassword: '', // Never expose or keep plaintext passwords in SharedState
      loveScore: typeof data.loveScore === 'number' ? data.loveScore : def.loveScore,
      lastStatsUpdateTime:
        typeof data.lastStatsUpdateTime === 'number'
          ? data.lastStatsUpdateTime
          : Date.now(),
      nicknames: {
        cat1: rawNick.cat1 || def.nicknames.cat1,
        cat2: rawNick.cat2 || def.nicknames.cat2,
      },
      streak: {
        current: typeof rawStreak.current === 'number' ? rawStreak.current : def.streak.current,
        best: typeof rawStreak.best === 'number' ? rawStreak.best : def.streak.best,
        totalDays:
          typeof rawStreak.totalDays === 'number' ? rawStreak.totalDays : def.streak.totalDays,
      },
      scores: normalizeScores(rawScores),
      presence: {
        syncedToday: Boolean(rawPresence.syncedToday),
        lastSyncedDate: normalizeDateString(rawPresence.lastSyncedDate),
      },
      wallets: {
        cat1: { ...def.wallets.cat1, ...(rawWallets.cat1 || {}) },
        cat2: { ...def.wallets.cat2, ...(rawWallets.cat2 || {}) },
      },
      inventories: {
        cat1: { ...(rawInv.cat1 || {}) },
        cat2: { ...(rawInv.cat2 || {}) },
      },
      unlockedItems: {
        cat1: Array.from(new Set([...DEFAULT_UNLOCKED_ITEMS, ...(rawUnlocked.cat1 || [])])),
        cat2: Array.from(new Set([...DEFAULT_UNLOCKED_ITEMS, ...(rawUnlocked.cat2 || [])])),
      },
      lastRewardDates: {
        cat1: normalizeDateString(rawRewards.cat1),
        cat2: normalizeDateString(rawRewards.cat2),
      },
      cat1: normalizeLegacyCat(data.cat1, def.cat1),
      cat2: normalizeLegacyCat(data.cat2, def.cat2),
      letters: rawLetters,
    };

    return { state: migratedState, passwordHash, migrated: true };
  } catch (err) {
    console.warn('Legacy Firestore fetch skipped or failed:', err);
    return { state: def, passwordHash: '', migrated: false };
  }
}

function hydrateRoomRow(rowState: SharedState): SharedState {
  const def = createDefaultSharedState();
  return {
    ...def,
    ...rowState,
    roomPassword: '',
    scores: normalizeScores(rowState.scores),
    activeGames: {
      cat1: null,
      cat2: null,
    },
    onlineRooms: {
      ...def.onlineRooms,
      ...(rowState.onlineRooms || {}),
      sudoku: {
        ...def.onlineRooms.sudoku!,
        ...(rowState.onlineRooms?.sudoku || {}),
      },
    },
    boardGames: {
      ...def.boardGames,
      ...(rowState.boardGames || {}),
    },
    achievements: {
      cat1: { ...(rowState.achievements?.cat1 || {}) },
      cat2: { ...(rowState.achievements?.cat2 || {}) },
    },
    achievementStats: {
      cat1: { ...def.achievementStats!.cat1, ...(rowState.achievementStats?.cat1 || {}) },
      cat2: { ...def.achievementStats!.cat2, ...(rowState.achievementStats?.cat2 || {}) },
    },
    galleryItems: sanitizeGalleryItems(rowState.galleryItems),
  };
}

export async function getRoomFreshness(roomId: string): Promise<{
  updatedAtMs: number;
  hasPassword: boolean;
} | null> {
  const row = fallbackDb.getRoom(roomId);
  if (!row) return null;
  return {
    updatedAtMs: row.updatedAt.getTime(),
    hasPassword: Boolean(row.passwordHash),
  };
}

export async function getOrSeedRoom(roomId: string): Promise<{
  state: SharedState;
  hasPassword: boolean;
  updatedAtMs: number;
}> {
  const existing = fallbackDb.getRoom(roomId);
  if (existing) {
    const hydrated = hydrateRoomRow(existing.stateJson);
    const decayed = applyRealisticCatDecay(hydrated);
    let updatedAtMs = existing.updatedAt.getTime();
    if (decayed.changed) {
      updatedAtMs = fallbackDb.saveRoomState(roomId, decayed.state).updatedAtMs;
    }
    decayed.state.lastStatsUpdateTime = Math.max(
      decayed.state.lastStatsUpdateTime || 0,
      updatedAtMs
    );
    return {
      state: decayed.state,
      hasPassword: Boolean(existing.passwordHash),
      updatedAtMs,
    };
  }

  const legacy = await fetchLegacyFirestoreRoom(roomId);
  const decayed = applyRealisticCatDecay(legacy.state);
  const inserted = fallbackDb.insertRoomIfAbsent({
    id: roomId,
    passwordHash: legacy.passwordHash,
    stateJson: decayed.state,
    migratedFromFirestore: legacy.migrated,
  });

  return {
    state: decayed.state,
    hasPassword: Boolean(inserted.passwordHash),
    updatedAtMs: inserted.updatedAt.getTime(),
  };
}

export async function saveRoomState(
  roomId: string,
  state: SharedState
): Promise<{ updatedAtMs: number }> {
  const sanitized: SharedState = {
    ...state,
    roomPassword: '',
  };

  return fallbackDb.saveRoomState(roomId, sanitized);
}

export async function verifyRoomAccess(
  roomId: string,
  plainPassword: string
): Promise<{ valid: boolean; hasPassword: boolean }> {
  const row = fallbackDb.getRoom(roomId);
  if (!row || !row.passwordHash) return { valid: true, hasPassword: false };
  return {
    valid: verifyRoomPassword(plainPassword, row.passwordHash),
    hasPassword: true,
  };
}

export async function updateRoomPassword(roomId: string, plainPassword: string): Promise<void> {
  const nextHash = hashRoomPassword(plainPassword);
  fallbackDb.updateRoomPasswordHash(roomId, nextHash);
}
