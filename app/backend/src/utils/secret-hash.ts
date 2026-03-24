import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const PREFIX = 'scrypt';
const KEYLEN = 64;

export function hashSecret(secret: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(secret, salt, KEYLEN).toString('hex');
  return `${PREFIX}$${salt}$${derivedKey}`;
}

export function verifySecret(secret: string, encodedHash: string): boolean {
  const [prefix, salt, storedKey] = encodedHash.split('$');
  if (prefix !== PREFIX || !salt || !storedKey) {
    return false;
  }

  const derivedKey = scryptSync(secret, salt, KEYLEN);
  const storedBuffer = Buffer.from(storedKey, 'hex');

  if (derivedKey.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, storedBuffer);
}
