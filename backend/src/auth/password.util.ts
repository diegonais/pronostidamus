import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const normalizedPassword = password.trim();
  const salt = randomBytes(SALT_LENGTH).toString('hex');
  const derivedKey = scryptSync(normalizedPassword, salt, KEY_LENGTH).toString(
    'hex',
  );

  return `${salt}:${derivedKey}`;
}

export function verifyPassword(
  password: string,
  hashedPassword: string | null | undefined,
): boolean {
  if (!hashedPassword) {
    return false;
  }

  const [salt, storedKey] = hashedPassword.split(':');

  if (!salt || !storedKey) {
    return false;
  }

  const derivedKey = scryptSync(password.trim(), salt, KEY_LENGTH);
  const storedKeyBuffer = Buffer.from(storedKey, 'hex');

  if (derivedKey.length !== storedKeyBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, storedKeyBuffer);
}
