import type { UserModel } from '../../../generated/prisma/models/User';
import type { ProfileResponse } from '../types/profile-response';

export function toProfileResponse(user: UserModel): ProfileResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    gender: user.gender,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
