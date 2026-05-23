import { createHash, randomInt } from 'crypto';
import { normalizeEmail } from '../../../common/utils/normalize-email';

const DEFAULT_EMAIL_CONFIRMATION_CODE_EXPIRES_IN_MINUTES = 10;

export function generateEmailConfirmationCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function hashEmailConfirmationCode(email: string, code: string) {
  const normalizedEmail = normalizeEmail(email);

  return createHash('sha256')
    .update(`${normalizedEmail}:${code}`)
    .digest('hex');
}

export function getEmailConfirmationCodeExpiresAt(expiresInMinutes?: number) {
  const minutes = expiresInMinutes ?? DEFAULT_EMAIL_CONFIRMATION_CODE_EXPIRES_IN_MINUTES;

  return new Date(Date.now() + minutes * 60_000);
}
