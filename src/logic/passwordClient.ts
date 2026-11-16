function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function getWebCrypto(): Crypto {
  const c = globalThis.crypto;
  if (!c || !c.subtle) {
    throw new Error('Web Crypto API is not available in this environment.');
  }
  return c;
}

async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const digest = await getWebCrypto().subtle.digest('SHA-256', encoded);
  return toHex(new Uint8Array(digest));
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function hashRoomPasswordClient(plainPassword: string): Promise<string> {
  const clean = plainPassword.trim();
  if (!clean) return '';
  const saltBytes = new Uint8Array(16);
  getWebCrypto().getRandomValues(saltBytes);
  const salt = toHex(saltBytes);
  const digest = await sha256Hex(`${salt}:${clean}`);
  return `sha256:${salt}:${digest}`;
}

export async function verifyRoomPasswordClient(
  plainPassword: string,
  storedHash: string
): Promise<boolean> {
  const clean = plainPassword.trim();
  if (!clean || !storedHash) return false;
  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== 'sha256') return false;
  const [, salt, expectedDigest] = parts;
  if (!salt || !expectedDigest) return false;
  const actualDigest = await sha256Hex(`${salt}:${clean}`);
  return constantTimeEquals(actualDigest, expectedDigest);
}
