import type { Gender, UserRole, UserBadge } from '../../../generated/prisma/enums';

export interface ProfileResponse {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  store: string | null;
  jobTitle: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  specialBadge: UserBadge | null;
  gender: Gender | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}
