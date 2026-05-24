import {
  generateSixDigitNumericCode,
  getNumericCodeExpiresAt,
  hashNumericCodeForEmail,
} from './numeric-code';

export function generatePasswordResetCode() {
  return generateSixDigitNumericCode();
}

export function hashPasswordResetCode(email: string, code: string) {
  return hashNumericCodeForEmail(email, code);
}

export function getPasswordResetCodeExpiresAt(expiresInMinutes?: number) {
  return getNumericCodeExpiresAt(expiresInMinutes);
}
