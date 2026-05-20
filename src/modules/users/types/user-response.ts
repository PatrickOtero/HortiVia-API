import type { Gender, UserRole } from '../../../generated/prisma/enums';
import type { UserModel } from '../../../generated/prisma/models/User';

export type SafeUser = Omit<UserModel, 'passwordHash'>;

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string | null;
  gender?: Gender | null;
  role?: UserRole;
}
