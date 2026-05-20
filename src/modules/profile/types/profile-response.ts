import type { Gender, UserRole } from '../../../generated/prisma/enums';

export interface ProfileResponse {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  gender: Gender | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}
