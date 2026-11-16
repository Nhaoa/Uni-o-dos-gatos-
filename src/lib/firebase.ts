import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  User,
  UserCredential,
} from 'firebase/auth';
import { doc, Firestore, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
] as const;

export const FIREBASE_API_KEY_STORAGE_KEY = 'uniao_firebase_api_key';

export const googleAuthProvider = new GoogleAuthProvider();
for (const scope of DRIVE_SCOPES) {
  googleAuthProvider.addScope(scope);
}

const optionalFirestoreDbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;

let currentApp: FirebaseApp | null = null;
export let auth: Auth = null as unknown as Auth;
export let db: Firestore = null as unknown as Firestore;

// In-memory only cache for the Google Drive OAuth access token (never localStorage/sessionStorage)
let cachedDriveAccessToken: string | null = null;
let cachedDriveTokenUid: string | null = null;
let authUnsubscribe: (() => void) | null = null;

const configListeners = new Set<() => void>();

function notifyConfigListeners(): void {
  for (const listener of configListeners) {
    listener();
  }
}

export function subscribeFirebaseConfig(listener: () => void): () => void {
  configListeners.add(listener);
  return () => {
    configListeners.delete(listener);
  };
}

export function isValidFirebaseApiKey(rawKey: string | null | undefined): boolean {
  if (!rawKey || typeof rawKey !== 'string') return false;
  const trimmed = rawKey.trim();
  return /^AIza[0-9A-Za-z_-]{25,60}$/.test(trimmed);
}

export function getStoredFirebaseApiKey(): string {
  const fromConfig = typeof firebaseConfig.apiKey === 'string' ? firebaseConfig.apiKey.trim() : '';
  if (isValidFirebaseApiKey(fromConfig)) return fromConfig;

  const envKey =
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    typeof import.meta.env.VITE_FIREBASE_API_KEY === 'string'
      ? import.meta.env.VITE_FIREBASE_API_KEY.trim()
      : '';
  if (isValidFirebaseApiKey(envKey)) return envKey;

  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(FIREBASE_API_KEY_STORAGE_KEY)?.trim() || '';
      if (isValidFirebaseApiKey(saved)) return saved;
    } catch {
      // ignore localStorage read errors
    }
  }
  return '';
}

function initFirebaseWithKey(apiKey: string): boolean {
  const cleanKey = apiKey.trim();
  if (!isValidFirebaseApiKey(cleanKey)) return false;

  try {
    const appName = `uniao_app_${cleanKey.slice(-8)}`;
    const existing = getApps().find((a) => a.name === appName);
    currentApp =
      existing ||
      initializeApp(
        {
          ...firebaseConfig,
          apiKey: cleanKey,
        },
        appName
      );
    auth = getAuth(currentApp);
    db = optionalFirestoreDbId
      ? getFirestore(currentApp, optionalFirestoreDbId)
      : getFirestore(currentApp);

    if (authUnsubscribe) {
      authUnsubscribe();
      authUnsubscribe = null;
    }
    authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user || (cachedDriveTokenUid && cachedDriveTokenUid !== user.uid)) {
        cachedDriveAccessToken = null;
        cachedDriveTokenUid = null;
      }
    });
    return true;
  } catch (err) {
    console.error('Falha ao inicializar Firebase com a chave informada:', err);
    return false;
  }
}

// Initialize immediately if a valid key is already stored in localStorage / env
const initialKey = getStoredFirebaseApiKey();
if (initialKey) {
  initFirebaseWithKey(initialKey);
}

export function isFirebaseConfigured(): boolean {
  return Boolean(currentApp && auth && db);
}

export function saveFirebaseApiKey(rawKey: string): { ok: true } | { ok: false; error: string } {
  const cleanKey = rawKey.trim();
  if (!isValidFirebaseApiKey(cleanKey)) {
    return {
      ok: false,
      error: 'Chave inválida. Insira uma chave Firebase válida começando com "AIza...".',
    };
  }
  const initialized = initFirebaseWithKey(cleanKey);
  if (!initialized) {
    return {
      ok: false,
      error: 'Não foi possível inicializar o Firebase com essa chave.',
    };
  }
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(FIREBASE_API_KEY_STORAGE_KEY, cleanKey);
    } catch {
      // ignore storage errors
    }
  }
  notifyConfigListeners();
  return { ok: true };
}

export function clearFirebaseApiKey(): void {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(FIREBASE_API_KEY_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  }
  if (authUnsubscribe) {
    authUnsubscribe();
    authUnsubscribe = null;
  }
  currentApp = null;
  auth = null as unknown as Auth;
  db = null as unknown as Firestore;
  cachedDriveAccessToken = null;
  cachedDriveTokenUid = null;
  notifyConfigListeners();
}

export function captureGoogleCredentialToken(result: UserCredential): string | null {
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken || null;
  if (accessToken && result.user) {
    cachedDriveAccessToken = accessToken;
    cachedDriveTokenUid = result.user.uid;
  }
  return accessToken;
}

export function getDriveAccessToken(): string | null {
  if (!auth) return null;
  const curUid = auth.currentUser?.uid || null;
  if (!curUid || (cachedDriveTokenUid && cachedDriveTokenUid !== curUid)) {
    return null;
  }
  return cachedDriveAccessToken;
}

export function clearDriveAccessToken(): void {
  cachedDriveAccessToken = null;
  cachedDriveTokenUid = null;
}

export async function connectGoogleDriveWithPopup(): Promise<{
  user: User;
  accessToken: string;
}> {
  if (!auth) {
    throw new Error('Configure a chave da API Firebase na tela de login primeiro.');
  }
  const driveProvider = new GoogleAuthProvider();
  for (const scope of DRIVE_SCOPES) {
    driveProvider.addScope(scope);
  }
  driveProvider.setCustomParameters({
    prompt: 'consent',
    include_granted_scopes: 'true',
  });

  const result = await signInWithPopup(auth, driveProvider);
  const token = captureGoogleCredentialToken(result);
  if (!token) {
    throw new Error('Não foi possível obter permissão de acesso ao Google Drive.');
  }
  return { user: result.user, accessToken: token };
}

export async function checkOptionalFirestoreConnection(): Promise<boolean> {
  if (!optionalFirestoreDbId || !db) return false;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch {
    return false;
  }
}
