import type { UserModel } from '../../generated/prisma/models/User';
import type { SafeUser } from './types/user-response';

export function toSafeUser(user: UserModel): SafeUser {
  const { passwordHash, ...safeUser } = user;
  void passwordHash;

  return safeUser;
}
