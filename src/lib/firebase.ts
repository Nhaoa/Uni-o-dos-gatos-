import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  User,
  UserCredential,
} from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
] as const;

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
for (const scope of DRIVE_SCOPES) {
  googleAuthProvider.addScope(scope);
}
const optionalFirestoreDbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
export const db = optionalFirestoreDbId ? getFirestore(app, optionalFirestoreDbId) : getFirestore(app);

// In-memory only cache for the Google Drive OAuth access token (never localStorage/sessionStorage)
let cachedDriveAccessToken: string | null = null;
let cachedDriveTokenUid: string | null = null;

onAuthStateChanged(auth, (user) => {
  if (!user || (cachedDriveTokenUid && cachedDriveTokenUid !== user.uid)) {
    cachedDriveAccessToken = null;
    cachedDriveTokenUid = null;
  }
});

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
  if (!optionalFirestoreDbId) return false;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch {
    return false;
  }
}
