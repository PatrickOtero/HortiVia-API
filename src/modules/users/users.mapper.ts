import type { UserModel } from '../../generated/prisma/models/User';
import type { SafeUser } from './types/user-response';

export function toSafeUser(user: UserModel): SafeUser {
  return {
    specialBadge: user.specialBadge,
    store: user.store,
    jobTitle: user.jobTitle,
    phone: user.phone,
    city: user.city,
    state: user.state,
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    gender: user.gender ?? null,
    role: user.role,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
