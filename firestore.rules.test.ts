import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Security Rules Structural & Dirty-Dozen Invariant Verification Suite
 * Validates firestore.rules against security_spec.md and firebase-blueprint.json.
 */
const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');
const rulesText = fs.readFileSync(rulesPath, 'utf8');
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));

test('firestore.rules uses rules_version 2 and starts with default-deny catch-all', () => {
  assert.match(rulesText, /^rules_version\s*=\s*'2';/);
  assert.match(rulesText, /match\s+\/\{document=\*\*\}\s*\{\s*allow\s+read,\s*write:\s*if\s+false;\s*\}/);
});

test('Dirty Dozen 1 & 2: authentication requires verified email and admin checks email_verified', () => {
  assert.match(rulesText, /function\s+isSignedIn\(\)\s*\{\s*return\s+request\.auth\s*!=\s*null\s*&&\s*request\.auth\.token\.email_verified\s*==\s*true;/);
  assert.match(rulesText, /function\s+isAdmin\(\)\s*\{\s*return\s+isSignedIn\(\)/);
});

test('Dirty Dozen 3, 4, 5, 7, 8: RoomSnapshot validation enforces exact keys, ownerUid, timestamps, and string sizes', () => {
  const roomProps = Object.keys(blueprint.entities.RoomSnapshot.properties);
  for (const key of roomProps) {
    assert.ok(rulesText.includes(`'${key}'`), `RoomSnapshot key ${key} must be referenced in firestore.rules`);
  }
  assert.match(rulesText, /isValidRoomSnapshot\(incoming\(\)\)/);
  assert.match(rulesText, /incoming\(\)\.ownerUid\s*==\s*request\.auth\.uid/);
  assert.match(rulesText, /incoming\(\)\.createdAt\s*==\s*request\.time/);
  assert.match(rulesText, /incoming\(\)\.updatedAt\s*==\s*request\.time/);
  assert.match(rulesText, /incoming\(\)\.ownerUid\s*==\s*existing\(\)\.ownerUid/);
  assert.match(rulesText, /incoming\(\)\.createdAt\s*==\s*existing\(\)\.createdAt/);
  assert.match(rulesText, /data\.nicknames\.cat1\.size\(\)\s*<=\s*18/);
  assert.match(rulesText, /isValidCat\(data\.cat1\)/);
  assert.match(rulesText, /isValidCat\(data\.cat2\)/);
});

test('Dirty Dozen 6 & Action-Based Updates: partner slot claimable once and list disabled', () => {
  assert.match(rulesText, /existing\(\)\.partnerUid\s*==\s*''\s*&&\s*incoming\(\)\.partnerUid\s*==\s*request\.auth\.uid/);
  assert.match(rulesText, /affectedKeys\(\)\.hasOnly\(\['partnerUid'/);
  assert.match(rulesText, /allow\s+list:\s*if\s+false;/);
});

test('Dirty Dozen 9, 10, 11: GalleryExhibit subcollection enforces Master Gate and 500KB image cap', () => {
  assert.match(rulesText, /function\s+isParentRoomMember\(roomId\)/);
  assert.match(rulesText, /exists\(\/databases\/\$\(database\)\/documents\/rooms\/\$\(roomId\)\)/);
  assert.match(rulesText, /get\(\/databases\/\$\(database\)\/documents\/rooms\/\$\(roomId\)\)\.data\.ownerUid/);
  assert.match(rulesText, /isValidGalleryExhibit\(incoming\(\)\)/);
  assert.match(rulesText, /data\.imageUrl\.size\(\)\s*<=\s*500000/);
  assert.match(rulesText, /data\.title\.size\(\)\s*>=\s*2\s*&&\s*data\.title\.size\(\)\s*<=\s*80/);
});

test('Dirty Dozen 12: /admins cannot be listed or mutated from client SDK', () => {
  assert.match(rulesText, /match\s+\/admins\/\{userId\}[\s\S]*?allow\s+list:\s*if\s+false;[\s\S]*?allow\s+write:\s*if\s+false;/);
});

test('Context-aware helper check: no incoming() or request.resource in allow get/list/delete', () => {
  const readDeleteBlocks = rulesText.match(/allow\s+(get|list|read|delete)\s*:[\s\S]*?;/g) || [];
  for (const block of readDeleteBlocks) {
    assert.equal(block.includes('incoming('), false, `Read/Delete rule must not call incoming(): ${block}`);
    assert.equal(block.includes('request.resource'), false, `Read/Delete rule must not reference request.resource: ${block}`);
  }
});
