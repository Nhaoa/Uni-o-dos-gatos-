import { useEffect, useRef } from 'react';
import type { User } from 'firebase/auth';
import {
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { sanitizeGalleryItems } from '../logic/gallery';
import {
  computeExhibitHash,
  diffGalleryExhibits,
  fromFirestoreGalleryDoc,
  fromFirestoreRoomPayload,
  shouldAcceptRemoteSnapshot,
  toFirestoreGalleryPayload,
  toFirestoreRoomPayload,
} from '../logic/firestoreRoomSync';
import type { GalleryExhibit, SharedState } from '../types/game';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const ADMIN_EMAIL = 'advbneto29@gmail.com';

interface UseFirestoreRoomSyncOptions {
  roomId: string;
  enabled: boolean;
  serverReady: boolean;
  firebaseUser: User | null;
  state: SharedState;
  onApplyRemoteState: (remoteState: SharedState) => void;
}

export function useFirestoreRoomSync({
  roomId,
  enabled,
  serverReady,
  firebaseUser,
  state,
  onApplyRemoteState,
}: UseFirestoreRoomSyncOptions) {
  const stateRef = useRef<SharedState>(state);
  const applyRemoteRef = useRef(onApplyRemoteState);
  stateRef.current = state;
  applyRemoteRef.current = onApplyRemoteState;

  const lastHandledTsRef = useRef<number>(0);
  const snapshotBootstrappedRef = useRef<boolean>(false);
  const syncingDownRef = useRef<boolean>(false);
  const pushInFlightRef = useRef<boolean>(false);
  const pushQueuedRef = useRef<boolean>(false);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exhibitCacheRef = useRef<Map<string, { hash: string; item: GalleryExhibit }>>(new Map());
  const remoteMetaRef = useRef<{
    exists: boolean;
    ownerUid: string;
    partnerUid: string;
    remoteTs: number;
    galleryHashes: Record<string, string>;
  }>({
    exists: false,
    ownerUid: '',
    partnerUid: '',
    remoteTs: 0,
    galleryHashes: {},
  });

  const canSync = Boolean(
    enabled &&
      serverReady &&
      db &&
      auth &&
      firebaseUser &&
      firebaseUser.emailVerified === true
  );

  const pushRoomToFirestore = async (targetState: SharedState, user: User) => {
    if (pushInFlightRef.current) {
      pushQueuedRef.current = true;
      return;
    }
    pushInFlightRef.current = true;
    const roomPath = `rooms/${roomId}`;
    const roomRef = doc(db, 'rooms', roomId);

    try {
      const cleanGallery = sanitizeGalleryItems(targetState.galleryItems);
      let meta = remoteMetaRef.current;

      if (!meta.exists) {
        try {
          const checkSnap = await getDoc(roomRef);
          if (checkSnap.exists()) {
            const data = checkSnap.data() as Record<string, unknown>;
            meta = {
              exists: true,
              ownerUid: String(data.ownerUid || user.uid),
              partnerUid: String(data.partnerUid || ''),
              remoteTs: Number(data.lastStatsUpdateTime || 0),
              galleryHashes: (data.galleryHashes as Record<string, string>) || {},
            };
            remoteMetaRef.current = meta;
          }
        } catch {
          // ignore check error and proceed with create if needed
        }
      }

      if (!meta.exists) {
        const payload = toFirestoreRoomPayload(targetState, {
          roomId,
          ownerUid: user.uid,
          partnerUid: '',
        });

        try {
          await setDoc(roomRef, {
            ...payload,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (createErr) {
          try {
            await updateDoc(roomRef, {
              lastStatsUpdateTime: payload.lastStatsUpdateTime,
              nicknames: payload.nicknames,
              loveScore: payload.loveScore,
              streak: payload.streak,
              scores: payload.scores,
              presence: payload.presence,
              wallets: payload.wallets,
              inventories: payload.inventories,
              unlockedItems: payload.unlockedItems,
              lastRewardDates: payload.lastRewardDates,
              cat1: payload.cat1,
              cat2: payload.cat2,
              letters: payload.letters,
              onlineRooms: payload.onlineRooms,
              boardGames: payload.boardGames,
              skyHopLeaderboard: payload.skyHopLeaderboard,
              achievements: payload.achievements,
              achievementStats: payload.achievementStats,
              galleryOrder: payload.galleryOrder,
              galleryHashes: payload.galleryHashes,
              galleryDriveFolder: payload.galleryDriveFolder ?? deleteField(),
              updatedAt: serverTimestamp(),
            });
          } catch {
            handleFirestoreError(createErr, OperationType.CREATE, roomPath);
          }
        }

        const writtenHashes: Record<string, string> = {};
        await Promise.all(
          cleanGallery.map(async (exhibit, position) => {
            if (!/^[a-zA-Z0-9_-]{1,128}$/.test(exhibit.id)) return;
            const exPath = `${roomPath}/gallery/${exhibit.id}`;
            const exPayload = toFirestoreGalleryPayload(exhibit, {
              roomId,
              authorUid: user.uid,
              position,
            });
            const { id: _id, roomId: _roomId, authorUid: _authorUid, ...mutableExPayload } = exPayload;
            try {
              await setDoc(doc(db, 'rooms', roomId, 'gallery', exhibit.id), {
                ...exPayload,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              const hash = computeExhibitHash(exhibit, position);
              writtenHashes[exhibit.id] = hash;
              exhibitCacheRef.current.set(exhibit.id, { hash, item: exhibit });
            } catch (createErr) {
              try {
                await updateDoc(doc(db, 'rooms', roomId, 'gallery', exhibit.id), {
                  ...mutableExPayload,
                  updatedAt: serverTimestamp(),
                });
                const hash = computeExhibitHash(exhibit, position);
                writtenHashes[exhibit.id] = hash;
                exhibitCacheRef.current.set(exhibit.id, { hash, item: exhibit });
              } catch {
                handleFirestoreError(createErr, OperationType.CREATE, exPath);
              }
            }
          })
        );

        remoteMetaRef.current = {
          exists: true,
          ownerUid: user.uid,
          partnerUid: '',
          remoteTs: payload.lastStatsUpdateTime,
          galleryHashes: writtenHashes,
        };
        lastHandledTsRef.current = Math.max(
          lastHandledTsRef.current,
          payload.lastStatsUpdateTime
        );
      } else {
        const isMember =
          meta.ownerUid === user.uid ||
          meta.partnerUid === user.uid ||
          user.email === ADMIN_EMAIL;
        if (!isMember) return;

        const payload = toFirestoreRoomPayload(targetState, {
          roomId,
          ownerUid: meta.ownerUid,
          partnerUid: meta.partnerUid,
        });

        const diff = diffGalleryExhibits(cleanGallery, meta.galleryHashes);

        await Promise.all(
          diff.toCreate.map(async ({ exhibit, position }) => {
            const exPath = `${roomPath}/gallery/${exhibit.id}`;
            const exPayload = toFirestoreGalleryPayload(exhibit, {
              roomId,
              authorUid: user.uid,
              position,
            });
            const { id: _id, roomId: _roomId, authorUid: _authorUid, ...mutableExPayload } = exPayload;
            try {
              await setDoc(doc(db, 'rooms', roomId, 'gallery', exhibit.id), {
                ...exPayload,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              const hash = computeExhibitHash(exhibit, position);
              exhibitCacheRef.current.set(exhibit.id, { hash, item: exhibit });
            } catch (createErr) {
              try {
                await updateDoc(doc(db, 'rooms', roomId, 'gallery', exhibit.id), {
                  ...mutableExPayload,
                  updatedAt: serverTimestamp(),
                });
                const hash = computeExhibitHash(exhibit, position);
                exhibitCacheRef.current.set(exhibit.id, { hash, item: exhibit });
              } catch {
                handleFirestoreError(createErr, OperationType.CREATE, exPath);
              }
            }
          })
        );

        await Promise.all(
          diff.toUpdate.map(async ({ exhibit, position }) => {
            const exPath = `${roomPath}/gallery/${exhibit.id}`;
            const exPayload = toFirestoreGalleryPayload(exhibit, {
              roomId,
              authorUid: user.uid,
              position,
            });
            try {
              await updateDoc(doc(db, 'rooms', roomId, 'gallery', exhibit.id), {
                kind: exPayload.kind,
                title: exPayload.title,
                description: exPayload.description,
                url: exPayload.url !== undefined ? exPayload.url : deleteField(),
                imageUrl:
                  exPayload.imageUrl !== undefined ? exPayload.imageUrl : deleteField(),
                videoUrl:
                  exPayload.videoUrl !== undefined ? exPayload.videoUrl : deleteField(),
                driveFileId:
                  exPayload.driveFileId !== undefined ? exPayload.driveFileId : deleteField(),
                driveFolderId:
                  exPayload.driveFolderId !== undefined ? exPayload.driveFolderId : deleteField(),
                mimeType:
                  exPayload.mimeType !== undefined ? exPayload.mimeType : deleteField(),
                fileSizeBytes:
                  exPayload.fileSizeBytes !== undefined ? exPayload.fileSizeBytes : deleteField(),
                storage:
                  exPayload.storage !== undefined ? exPayload.storage : deleteField(),
                frameStyle: exPayload.frameStyle,
                addedBy: exPayload.addedBy,
                authorName: exPayload.authorName,
                occasionDate:
                  exPayload.occasionDate !== undefined
                    ? exPayload.occasionDate
                    : deleteField(),
                position: exPayload.position,
                isStarter: exPayload.isStarter,
                updatedAt: serverTimestamp(),
              });
              const hash = computeExhibitHash(exhibit, position);
              exhibitCacheRef.current.set(exhibit.id, { hash, item: exhibit });
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, exPath);
            }
          })
        );

        await Promise.all(
          diff.toDeleteIds.map(async (exhibitId) => {
            const exPath = `${roomPath}/gallery/${exhibitId}`;
            try {
              await deleteDoc(doc(db, 'rooms', roomId, 'gallery', exhibitId));
              exhibitCacheRef.current.delete(exhibitId);
            } catch (err) {
              handleFirestoreError(err, OperationType.DELETE, exPath);
            }
          })
        );

        try {
          await updateDoc(roomRef, {
            lastStatsUpdateTime: payload.lastStatsUpdateTime,
            nicknames: payload.nicknames,
            loveScore: payload.loveScore,
            streak: payload.streak,
            scores: payload.scores,
            presence: payload.presence,
            wallets: payload.wallets,
            inventories: payload.inventories,
            unlockedItems: payload.unlockedItems,
            lastRewardDates: payload.lastRewardDates,
            cat1: payload.cat1,
            cat2: payload.cat2,
            letters: payload.letters,
            onlineRooms: payload.onlineRooms,
            boardGames: payload.boardGames,
            skyHopLeaderboard: payload.skyHopLeaderboard,
            achievements: payload.achievements,
            achievementStats: payload.achievementStats,
            galleryOrder: payload.galleryOrder,
            galleryHashes: payload.galleryHashes,
            galleryDriveFolder: payload.galleryDriveFolder ?? deleteField(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, roomPath);
        }

        remoteMetaRef.current = {
          ...meta,
          remoteTs: payload.lastStatsUpdateTime,
          galleryHashes: payload.galleryHashes,
        };
        lastHandledTsRef.current = Math.max(
          lastHandledTsRef.current,
          payload.lastStatsUpdateTime
        );
      }
    } finally {
      pushInFlightRef.current = false;
      if (pushQueuedRef.current) {
        pushQueuedRef.current = false;
        void pushRoomToFirestore(stateRef.current, user);
      }
    }
  };

  // Subscribe to real-time Firestore room snapshot once authenticated and server hydrated
  useEffect(() => {
    if (!canSync || !firebaseUser) {
      snapshotBootstrappedRef.current = false;
      return;
    }

    const roomPath = `rooms/${roomId}`;
    const roomRef = doc(db, 'rooms', roomId);

    const unsub = onSnapshot(
      roomRef,
      async (snap) => {
        if (snap.metadata.hasPendingWrites) return;
        if (snap.metadata.fromCache && !snap.exists()) return;
        snapshotBootstrappedRef.current = true;

        if (!snap.exists()) {
          remoteMetaRef.current = {
            exists: false,
            ownerUid: '',
            partnerUid: '',
            remoteTs: 0,
            galleryHashes: {},
          };
          await pushRoomToFirestore(stateRef.current, firebaseUser);
          return;
        }

        const data = snap.data() as Record<string, unknown>;
        const ownerUid = String(data.ownerUid || '');
        let partnerUid = String(data.partnerUid || '');
        const remoteTs = Number(data.lastStatsUpdateTime || 0);
        const remoteHashes =
          data.galleryHashes && typeof data.galleryHashes === 'object'
            ? (data.galleryHashes as Record<string, string>)
            : {};

        if (partnerUid === '' && ownerUid && ownerUid !== firebaseUser.uid) {
          try {
            await updateDoc(roomRef, {
              partnerUid: firebaseUser.uid,
              updatedAt: serverTimestamp(),
            });
            partnerUid = firebaseUser.uid;
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, roomPath);
          }
        }

        remoteMetaRef.current = {
          exists: true,
          ownerUid,
          partnerUid,
          remoteTs,
          galleryHashes: remoteHashes,
        };

        const localTs = stateRef.current.lastStatsUpdateTime || 0;

        if (shouldAcceptRemoteSnapshot(remoteTs, localTs, lastHandledTsRef.current)) {
          lastHandledTsRef.current = remoteTs;
          syncingDownRef.current = true;
          try {
            const order = Array.isArray(data.galleryOrder)
              ? data.galleryOrder.filter((id): id is string => typeof id === 'string')
              : [];
            const exhibitsMap = new Map<string, GalleryExhibit>();

            await Promise.all(
              order.map(async (exhibitId) => {
                const expectedHash = remoteHashes[exhibitId] || '';
                const cached = exhibitCacheRef.current.get(exhibitId);
                if (cached && expectedHash && cached.hash === expectedHash) {
                  exhibitsMap.set(exhibitId, cached.item);
                  return;
                }
                const exPath = `${roomPath}/gallery/${exhibitId}`;
                try {
                  const exSnap = await getDoc(doc(db, 'rooms', roomId, 'gallery', exhibitId));
                  if (exSnap.exists()) {
                    const parsed = fromFirestoreGalleryDoc(
                      exSnap.data() as Record<string, unknown>
                    );
                    if (parsed) {
                      exhibitsMap.set(exhibitId, parsed);
                      exhibitCacheRef.current.set(exhibitId, {
                        hash: expectedHash || computeExhibitHash(parsed, order.indexOf(exhibitId)),
                        item: parsed,
                      });
                    }
                  }
                } catch (err) {
                  handleFirestoreError(err, OperationType.GET, exPath);
                }
              })
            );

            const hydrated = fromFirestoreRoomPayload(
              data,
              exhibitsMap,
              stateRef.current
            );
            applyRemoteRef.current(hydrated);
          } finally {
            syncingDownRef.current = false;
          }
          return;
        }

        if (
          localTs > remoteTs &&
          (ownerUid === firebaseUser.uid ||
            partnerUid === firebaseUser.uid ||
            firebaseUser.email === ADMIN_EMAIL)
        ) {
          lastHandledTsRef.current = Math.max(lastHandledTsRef.current, localTs);
          await pushRoomToFirestore(stateRef.current, firebaseUser);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, roomPath);
      }
    );

    return () => {
      unsub();
      if (pushTimerRef.current) {
        clearTimeout(pushTimerRef.current);
        pushTimerRef.current = null;
      }
    };
  }, [canSync, firebaseUser, roomId]);

  // Debounced upload to Firestore whenever local room state updates
  useEffect(() => {
    if (!canSync || !firebaseUser || !snapshotBootstrappedRef.current) return;
    if (syncingDownRef.current) return;

    const currentTs = state.lastStatsUpdateTime || 0;
    if (currentTs <= Math.max(lastHandledTsRef.current, remoteMetaRef.current.remoteTs)) {
      return;
    }

    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      pushTimerRef.current = null;
      void pushRoomToFirestore(stateRef.current, firebaseUser);
    }, 450);
  }, [canSync, firebaseUser, state.lastStatsUpdateTime]);
}
