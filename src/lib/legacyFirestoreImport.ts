import { createDefaultSharedState } from '../logic/defaultState';
import { DEFAULT_UNLOCKED_ITEMS } from '../logic/minigames';
import { normalizeScores } from '../logic/scores';
import type { CatState, PlayerRole, SharedState } from '../types/game';

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

export interface LegacyImportResult {
  state: SharedState;
  legacyPlainPassword: string;
  migrated: boolean;
}

export async function fetchLegacyFirestoreRoomPublic(
  roomId: string
): Promise<LegacyImportResult> {
  const def = createDefaultSharedState();
  const legacyRoomKey =
    roomId === 'ninho_de_amor_preview' ? 'ninho_de_amor_fixo' : roomId;
  try {
    const url = `https://firestore.googleapis.com/v1/projects/jardim-gatos-teste/databases/(default)/documents/artifacts/jardim-dos-gatos-casal/public/data/rooms/${encodeURIComponent(
      legacyRoomKey
    )}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      return { state: def, legacyPlainPassword: '', migrated: false };
    }
    const doc = (await res.json()) as { fields?: Record<string, Record<string, unknown>> };
    if (!doc.fields) {
      return { state: def, legacyPlainPassword: '', migrated: false };
    }

    const data = decodeFirestoreValue({ mapValue: { fields: doc.fields } }) as Record<
      string,
      unknown
    >;
    const legacyPlainPassword =
      typeof data.roomPassword === 'string' ? data.roomPassword.trim() : '';

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
      roomPassword: '',
      loveScore: typeof data.loveScore === 'number' ? data.loveScore : def.loveScore,
      lastStatsUpdateTime:
        typeof data.lastStatsUpdateTime === 'number' ? data.lastStatsUpdateTime : Date.now(),
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

    return { state: migratedState, legacyPlainPassword, migrated: true };
  } catch {
    return { state: def, legacyPlainPassword: '', migrated: false };
  }
}
