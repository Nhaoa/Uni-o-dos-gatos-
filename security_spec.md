# Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Strict Couple Room Ownership (`/rooms/{roomId}`)**:
   - Every room snapshot document MUST have a valid `roomId` matching its document path (`^[a-zA-Z0-9_\-]+$`, max 64 chars) and a valid verified `ownerUid` matching `request.auth.uid` on creation.
   - A room has at most two member slots: `ownerUid` and `partnerUid`. Once `partnerUid` is claimed by the second verified member, no third account can read, join, or mutate the room (except a verified bootstrapped admin).
   - `roomId`, `ownerUid`, and `createdAt` are immutable after creation; `createdAt` and `updatedAt` MUST match `request.time`.
   - No `allow list` is permitted on `/rooms`; clients access only their explicit room document ID.
2. **Master Gate on Subcollection (`/rooms/{roomId}/gallery/{exhibitId}`)**:
   - An exhibit cannot exist without an existing parent `/rooms/{roomId}` document (`exists()` + `get()`), and only verified current members (`ownerUid` or `partnerUid`) or verified admins may read, create, edit, or delete exhibits.
   - `authorUid` MUST equal `request.auth.uid` on creation and remain immutable forever; `id` and `roomId` MUST match path segments and remain immutable.
   - Image payloads (`imageUrl`) are strictly bounded (`<= 500,000` chars) so no single document approaches Firestore's 1MB ceiling.
   - `allow list` is disabled (`false`) to avoid O(n) query-side `get()` amplification; clients fetch ordered exhibit IDs directly via `galleryOrder` on `/rooms/{roomId}`.
3. **Zero Unverified Email / Admin Spoofing**:
   - All reads/writes require `request.auth != null && request.auth.token.email_verified == true`.
   - `/admins/{userId}` cannot be written or listed from any client SDK (`allow list, create, update, delete: if false`).

## 2. The "Dirty Dozen" Attack Payloads
1. **Unauthenticated Room Read/Write**: Request with `auth = null` reading or creating `/rooms/ninho_de_amor_fixo` -> `PERMISSION_DENIED`.
2. **Unverified Email Admin Spoof**: Token with `email = "advbneto29@gmail.com"` and `email_verified = false` -> `PERMISSION_DENIED`.
3. **Ghost / Shadow Field Injection on Room Create**: Valid room payload plus `isAdmin: true` or `shadowRole: "super"` -> rejected by `keys().hasOnly(...)` -> `PERMISSION_DENIED`.
4. **Identity Spoofing on Room Create**: User `attacker_uid` sets `ownerUid: "victim_uid"` -> `PERMISSION_DENIED`.
5. **Client-Forged Timestamp (`createdAt` / `updatedAt`)**: Room create/update passes client `Date` instead of `request.time` (`serverTimestamp()`) -> `PERMISSION_DENIED`.
6. **Unauthorized Room Partner Hijack**: After `partnerUid` is already set to `partner_uid`, a third user `stranger_uid` tries to overwrite `partnerUid` or `wallets` -> `PERMISSION_DENIED`.
7. **Immortal Field Mutation (`ownerUid` / `createdAt`)**: Existing member attempts to change `ownerUid` or `createdAt` during update -> `PERMISSION_DENIED`.
8. **Out-of-Bounds String / Resource Poisoning**: Sending a 5KB `roomId` or 1MB `nicknames.cat1` or 200-char `speech` -> `PERMISSION_DENIED`.
9. **Orphan Gallery Exhibit Without Parent Room**: Creating `/rooms/fake_room_999/gallery/exh_1` when parent `/rooms/fake_room_999` does not exist -> `PERMISSION_DENIED`.
10. **Non-Member Subcollection Write**: Authenticated non-member attempts to create/update/delete an exhibit under an existing room -> `PERMISSION_DENIED`.
11. **Value Poisoning on Gallery Exhibit**: Valid member attempts to upload `imageUrl` > 500,000 chars or `title` with 1 char or invalid `frameStyle: "neon"` -> `PERMISSION_DENIED`.
12. **Privilege Escalation on `/admins/{uid}`**: Authenticated user attempts `setDoc(doc(db, 'admins', uid), { uid })` -> `PERMISSION_DENIED`.

## 3. Verification Runner
See `/firestore.rules.test.ts` for automated assertion coverage verifying all 12 Dirty Dozen cases and valid positive flows.
