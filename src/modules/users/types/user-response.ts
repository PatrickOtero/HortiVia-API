import type { Gender, UserRole } from '../../../generated/prisma/enums';
import type { UserModel } from '../../../generated/prisma/models/User';

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  gender: Gender | null;
  role: UserRole;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsersListResponse {
  data: SafeUser[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string | null;
  gender?: Gender | null;
  role?: UserRole;
  emailVerified?: boolean;
  emailVerifiedAt?: Date | null;
  emailConfirmationCodeHash?: string | null;
  emailConfirmationCodeExpiresAt?: Date | null;
  emailConfirmationCodeSentAt?: Date | null;
  emailConfirmationAttempts?: number;
}

export interface UpdateEmailConfirmationInput {
  emailConfirmationCodeHash: string | null;
  emailConfirmationCodeExpiresAt: Date | null;
  emailConfirmationCodeSentAt: Date | null;
  emailConfirmationAttempts: number;
}

export interface VerifyEmailInput {
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  emailConfirmationCodeHash: string | null;
  emailConfirmationCodeExpiresAt: Date | null;
  emailConfirmationCodeSentAt: Date | null;
  emailConfirmationAttempts: number;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  avatarUrl?: string | null;
  gender?: Gender | null;
  role?: UserRole;
  emailVerified?: boolean;
  emailVerifiedAt?: Date | null;
  emailConfirmationCodeHash?: string | null;
  emailConfirmationCodeExpiresAt?: Date | null;
  emailConfirmationCodeSentAt?: Date | null;
  emailConfirmationAttempts?: number;
}

export type UnsafeUser = UserModel;
