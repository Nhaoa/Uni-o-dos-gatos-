import crypto from 'crypto';

const KEY_LEN = 64;

export function hashRoomPassword(plainPassword: string): string {
  const clean = plainPassword.trim();
  if (!clean) return '';
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(clean, salt, KEY_LEN).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyRoomPassword(plainPassword: string, storedHash: string): boolean {
  if (!storedHash) return false;
  const clean = plainPassword.trim();
  if (!clean) return false;
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, hexHash] = parts;
  if (!salt || !hexHash) return false;

  const expectedBuf = Buffer.from(hexHash, 'hex');
  const actualBuf = crypto.scryptSync(clean, salt, expectedBuf.length);
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}
