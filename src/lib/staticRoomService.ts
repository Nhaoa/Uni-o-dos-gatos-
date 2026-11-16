import type { User } from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreSync';
import { fetchLegacyFirestoreRoomPublic, type LegacyImportResult } from './legacyFirestoreImport';
import {
  fromFirestoreGalleryDoc,
  fromFirestoreRoomPayload,
  toFirestoreGalleryPayload,
  toFirestoreRoomPayload,
} from '../logic/firestoreRoomSync';
import { createDefaultSharedState } from '../logic/defaultState';
import { applyRealisticCatDecay } from '../logic/decay';
import { sanitizeGalleryItems } from '../logic/gallery';
import { hashRoomPasswordClient, verifyRoomPasswordClient } from '../logic/passwordClient';
import { resolveRoleByUidAndNick } from '../logic/staticRoomAuth';
import { validateNicknameChange } from '../logic/authMatch';
import {
  ADMIN_OWNER_EMAIL,
  applyAdminFishEdit,
  isAdminAccount,
  parseAdminFishAmount,
} from '../logic/adminHack';
import type { GalleryExhibit, PlayerRole, SharedState } from '../types/game';

const STATE_CACHE_PREFIX = 'uniao_static_room_state_';
const META_CACHE_PREFIX = 'uniao_static_room_meta_';

let backendMissingRuntime = false;
const legacyCache = new Map<string, Promise<LegacyImportResult>>();

export function markBackendUnavailable(): void {
  backendMissingRuntime = true;
}

export function isStaticHostingMode(): boolean {
  if (import.meta.env.VITE_STATIC_HOSTING === 'true') return true;
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('.github.io')) {
    return true;
  }
  return backendMissingRuntime;
}

export function readCachedRoomState(roomId: string): SharedState | null {
  try {
    const raw = localStorage.getItem(`${STATE_CACHE_PREFIX}${roomId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SharedState;
    if (!parsed || typeof parsed !== 'object' || !parsed.nicknames) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedRoomState(roomId: string, state: SharedState): void {
  try {
    const sanitized: SharedState = { ...state, roomPassword: '' };
    localStorage.setItem(`${STATE_CACHE_PREFIX}${roomId}`, JSON.stringify(sanitized));
  } catch {
    // ignore storage quota errors
  }
}

function readCachedRoomMeta(roomId: string): { hasPassword: boolean } | null {
  try {
    const raw = localStorage.getItem(`${META_CACHE_PREFIX}${roomId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { hasPassword?: boolean };
    return { hasPassword: Boolean(parsed?.hasPassword) };
  } catch {
    return null;
  }
}

function writeCachedRoomMeta(roomId: string, hasPassword: boolean): void {
  try {
    localStorage.setItem(`${META_CACHE_PREFIX}${roomId}`, JSON.stringify({ hasPassword }));
  } catch {
    // ignore storage errors
  }
}

function getLegacyRoomCached(roomId: string): Promise<LegacyImportResult> {
  let pending = legacyCache.get(roomId);
  if (!pending) {
    pending = fetchLegacyFirestoreRoomPublic(roomId).catch(() => ({
      state: createDefaultSharedState(),
      legacyPlainPassword: '',
      migrated: false,
    }));
    legacyCache.set(roomId, pending);
  }
  return pending;
}

export async function fetchPublicRoomMetaStatic(roomId: string): Promise<{
  hasPassword: boolean;
}> {
  const cached = readCachedRoomMeta(roomId);
  const legacy = await getLegacyRoomCached(roomId);
  const hasPassword = Boolean(cached?.hasPassword || legacy.legacyPlainPassword);
  if (legacy.legacyPlainPassword) {
    writeCachedRoomMeta(roomId, true);
  }
  return { hasPassword };
}

export async function checkSessionStatic(
  roomId: string,
  firebaseUser: User | null
): Promise<{ hasPassword: boolean; linkedRole: PlayerRole | null }> {
  const fallbackMeta = readCachedRoomMeta(roomId);
  if (!firebaseUser || firebaseUser.emailVerified === false) {
    const pub = await fetchPublicRoomMetaStatic(roomId);
    return { hasPassword: pub.hasPassword, linkedRole: null };
  }

  try {
    const snap = await getDoc(doc(db, 'rooms', roomId));
    if (snap.exists()) {
      const data = snap.data() as Record<string, unknown>;
      const hasPassword = Boolean(data.roomPasswordHash || fallbackMeta?.hasPassword);
      writeCachedRoomMeta(roomId, hasPassword);
      let linkedRole: PlayerRole | null = null;
      if (data.cat1Uid === firebaseUser.uid) linkedRole = 'cat1';
      else if (data.cat2Uid === firebaseUser.uid) linkedRole = 'cat2';
      return { hasPassword, linkedRole };
    }
  } catch {
    // permission-denied or offline fallback
  }

  const pub = await fetchPublicRoomMetaStatic(roomId);
  return { hasPassword: pub.hasPassword, linkedRole: null };
}

export type StaticEnterRoomResult =
  | {
      ok: true;
      role: PlayerRole;
      state: SharedState;
      hasPassword: boolean;
      recovered: boolean;
    }
  | { ok: false; error: string };

export async function enterRoomStatic(params: {
  roomId: string;
  nickname: string;
  password: string;
  firebaseUser: User;
}): Promise<StaticEnterRoomResult> {
  const { roomId, nickname, password, firebaseUser } = params;

  if (!firebaseUser || firebaseUser.emailVerified === false) {
    return { ok: false, error: 'Sua conta Google precisa estar verificada para entrar.' };
  }

  const roomRef = doc(db, 'rooms', roomId);
  let snapExists = false;
  let roomData: Record<string, unknown> | null = null;

  try {
    const snap = await getDoc(roomRef);
    snapExists = snap.exists();
    roomData = snapExists ? (snap.data() as Record<string, unknown>) : null;
  } catch (err) {
    const code = (err as { code?: string })?.code || '';
    if (code === 'permission-denied') {
      return {
        ok: false,
        error: 'Esta sala já possui duas contas Google vinculadas e não pode ser acessada por outra conta.',
      };
    }
    return {
      ok: false,
      error: 'Não foi possível conectar ao banco gratuito do Firebase. Verifique sua internet.',
    };
  }

  // First entry into new Firestore DB: import legacy data from jardim-gatos-teste
  if (!snapExists || !roomData) {
    const legacy = await getLegacyRoomCached(roomId);
    const savedNicknames = legacy.state.nicknames;
    const roleRes = resolveRoleByUidAndNick({
      typedNick: nickname,
      savedNicknames,
      uid: firebaseUser.uid,
      cat1Uid: '',
      cat2Uid: '',
    });
    if (!roleRes.ok) {
      return { ok: false, error: roleRes.error };
    }

    const cleanTypedPass = password.trim();
    if (legacy.legacyPlainPassword) {
      if (cleanTypedPass !== legacy.legacyPlainPassword) {
        return { ok: false, error: 'Senha da sala incorreta.' };
      }
    } else if (cleanTypedPass && cleanTypedPass.length < 4) {
      return { ok: false, error: 'A senha da sala deve ter pelo menos 4 caracteres.' };
    }

    const plainForHash = legacy.legacyPlainPassword || cleanTypedPass;
    const passwordHash = plainForHash ? await hashRoomPasswordClient(plainForHash) : '';
    const decayed = applyRealisticCatDecay(legacy.state);
    const initialState: SharedState = {
      ...decayed.state,
      roomPassword: '',
      lastStatsUpdateTime: Math.max(decayed.state.lastStatsUpdateTime || 0, Date.now()),
    };

    const payload = toFirestoreRoomPayload(initialState, {
      roomId,
      ownerUid: firebaseUser.uid,
      partnerUid: '',
      cat1Uid: roleRes.role === 'cat1' ? firebaseUser.uid : '',
      cat2Uid: roleRes.role === 'cat2' ? firebaseUser.uid : '',
      roomPasswordHash: passwordHash,
    });

    try {
      await setDoc(roomRef, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `rooms/${roomId}`);
    }

    const cleanGallery = sanitizeGalleryItems(initialState.galleryItems);
    await Promise.all(
      cleanGallery.map(async (exhibit, position) => {
        if (!/^[a-zA-Z0-9_-]{1,128}$/.test(exhibit.id)) return;
        const exPayload = toFirestoreGalleryPayload(exhibit, {
          roomId,
          authorUid: firebaseUser.uid,
          position,
        });
        const exPath = `rooms/${roomId}/gallery/${exhibit.id}`;
        try {
          await setDoc(doc(db, 'rooms', roomId, 'gallery', exhibit.id), {
            ...exPayload,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, exPath);
        }
      })
    );

    const hasPassword = Boolean(passwordHash);
    writeCachedRoomMeta(roomId, hasPassword);
    writeCachedRoomState(roomId, initialState);

    return {
      ok: true,
      role: roleRes.role,
      state: initialState,
      hasPassword,
      recovered: true,
    };
  }

  // Existing room in new Firestore DB
  const storedHash = typeof roomData.roomPasswordHash === 'string' ? roomData.roomPasswordHash : '';
  let effectiveHash = storedHash;

  if (storedHash) {
    const validPass = await verifyRoomPasswordClient(password, storedHash);
    if (!validPass) {
      return { ok: false, error: 'Senha da sala incorreta.' };
    }
  } else if (password.trim()) {
    if (password.trim().length < 4) {
      return { ok: false, error: 'A senha da sala deve ter pelo menos 4 caracteres.' };
    }
    effectiveHash = await hashRoomPasswordClient(password.trim());
  }

  const rawNick = (roomData.nicknames || {}) as Record<string, unknown>;
  const savedNicknames: Record<PlayerRole, string> = {
    cat1: String(rawNick.cat1 || 'Camarada 1'),
    cat2: String(rawNick.cat2 || 'Camarada 2'),
  };

  let cat1Uid = typeof roomData.cat1Uid === 'string' ? roomData.cat1Uid : '';
  let cat2Uid = typeof roomData.cat2Uid === 'string' ? roomData.cat2Uid : '';

  const roleRes = resolveRoleByUidAndNick({
    typedNick: nickname,
    savedNicknames,
    uid: firebaseUser.uid,
    cat1Uid,
    cat2Uid,
  });

  if (!roleRes.ok) {
    return { ok: false, error: roleRes.error };
  }

  const ownerUid = String(roomData.ownerUid || '');
  const partnerUid = String(roomData.partnerUid || '');
  const isOwnerOrPartner = ownerUid === firebaseUser.uid || partnerUid === firebaseUser.uid;
  const isAdminEmail = (firebaseUser.email || '').trim().toLowerCase() === ADMIN_OWNER_EMAIL;

  if (!isOwnerOrPartner) {
    if (partnerUid === '') {
      const nextCat1Uid = roleRes.role === 'cat1' ? firebaseUser.uid : cat1Uid;
      const nextCat2Uid = roleRes.role === 'cat2' ? firebaseUser.uid : cat2Uid;
      try {
        await updateDoc(roomRef, {
          partnerUid: firebaseUser.uid,
          cat1Uid: nextCat1Uid,
          cat2Uid: nextCat2Uid,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`);
      }
      cat1Uid = nextCat1Uid;
      cat2Uid = nextCat2Uid;
    } else if (!isAdminEmail) {
      return { ok: false, error: 'Esta sala já possui duas contas Google vinculadas.' };
    }
  }

  if (effectiveHash && !storedHash && (isOwnerOrPartner || isAdminEmail)) {
    try {
      await updateDoc(roomRef, {
        roomPasswordHash: effectiveHash,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`);
    }
  }

  const order = Array.isArray(roomData.galleryOrder)
    ? roomData.galleryOrder.filter((id): id is string => typeof id === 'string').slice(0, 60)
    : [];
  const exhibitsMap = new Map<string, GalleryExhibit>();
  await Promise.all(
    order.map(async (exhibitId) => {
      if (!/^[a-zA-Z0-9_-]{1,128}$/.test(exhibitId)) return;
      try {
        const exSnap = await getDoc(doc(db, 'rooms', roomId, 'gallery', exhibitId));
        if (exSnap.exists()) {
          const parsed = fromFirestoreGalleryDoc(exSnap.data() as Record<string, unknown>);
          if (parsed) exhibitsMap.set(exhibitId, parsed);
        }
      } catch {
        // ignore missing exhibit
      }
    })
  );

  const hydrated = fromFirestoreRoomPayload(
    roomData,
    exhibitsMap,
    readCachedRoomState(roomId) || createDefaultSharedState()
  );
  const decayed = applyRealisticCatDecay(hydrated);
  const finalState: SharedState = {
    ...decayed.state,
    roomPassword: '',
    lastStatsUpdateTime: Math.max(decayed.state.lastStatsUpdateTime || 0, Date.now()),
  };

  const hasPassword = Boolean(effectiveHash);
  writeCachedRoomMeta(roomId, hasPassword);
  writeCachedRoomState(roomId, finalState);

  return {
    ok: true,
    role: roleRes.role,
    state: finalState,
    hasPassword,
    recovered: roleRes.isNewBinding,
  };
}

export async function updateNicknameStatic(params: {
  roomId: string;
  role: PlayerRole;
  newNickname: string;
  state: SharedState;
  firebaseUser: User | null;
}): Promise<{ ok: true; nickname: string; state: SharedState } | { ok: false; error: string }> {
  const { roomId, role, newNickname, state, firebaseUser } = params;
  const check = validateNicknameChange({
    newNickname,
    role,
    savedNicknames: state.nicknames,
  });
  if (!check.ok) {
    return { ok: false, error: check.error };
  }

  const nextState: SharedState = {
    ...state,
    nicknames: {
      ...state.nicknames,
      [role]: check.nickname,
    },
    lastStatsUpdateTime: Math.max((state.lastStatsUpdateTime || 0) + 1, Date.now()),
  };

  if (firebaseUser) {
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        nicknames: nextState.nicknames,
        lastStatsUpdateTime: nextState.lastStatsUpdateTime,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`);
    }
  }
  writeCachedRoomState(roomId, nextState);
  return { ok: true, nickname: check.nickname, state: nextState };
}

export async function updateRoomPasswordStatic(params: {
  roomId: string;
  currentPassword: string;
  newPassword: string;
  firebaseUser: User | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { roomId, currentPassword, newPassword, firebaseUser } = params;
  const cleanNew = newPassword.trim();
  if (cleanNew.length < 4 || cleanNew.length > 32) {
    return { ok: false, error: 'A senha da sala deve ter entre 4 e 32 caracteres.' };
  }
  if (!firebaseUser) {
    return { ok: false, error: 'Sessão expirada. Entre novamente com o Google.' };
  }

  const roomRef = doc(db, 'rooms', roomId);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) {
    return { ok: false, error: 'Sala ainda não inicializada.' };
  }
  const data = snap.data() as Record<string, unknown>;
  const storedHash = typeof data.roomPasswordHash === 'string' ? data.roomPasswordHash : '';
  if (storedHash) {
    const valid = await verifyRoomPasswordClient(currentPassword, storedHash);
    if (!valid) {
      return { ok: false, error: 'Senha atual incorreta.' };
    }
  }

  const nextHash = await hashRoomPasswordClient(cleanNew);
  try {
    await updateDoc(roomRef, {
      roomPasswordHash: nextHash,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`);
  }
  writeCachedRoomMeta(roomId, true);
  return { ok: true };
}

export async function adminSaveFishStatic(params: {
  roomId: string;
  targetRole: PlayerRole;
  fish: number;
  callerRole: PlayerRole;
  firebaseUser: User | null;
  isDevBypass: boolean;
  state: SharedState;
}): Promise<{ ok: true; state: SharedState } | { ok: false; error: string }> {
  const { roomId, targetRole, fish, callerRole, firebaseUser, isDevBypass, state } = params;
  if (
    !isAdminAccount({
      email: firebaseUser?.email,
      role: callerRole,
      isDevBypass,
    })
  ) {
    return { ok: false, error: 'Acesso restrito ao administrador.' };
  }

  const parsed = parseAdminFishAmount(fish);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const nextState = applyAdminFishEdit(state, targetRole, parsed.value);
  if (firebaseUser && !isDevBypass) {
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        wallets: nextState.wallets,
        lastStatsUpdateTime: nextState.lastStatsUpdateTime,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`);
    }
  }
  writeCachedRoomState(roomId, nextState);
  return { ok: true, state: nextState };
}
