import type { UserPreferenceModel } from '../../../generated/prisma/models/UserPreference';
import type { PreferencesResponse } from '../types/preferences-response';

export function toPreferencesResponse(
  preferences: UserPreferenceModel,
): PreferencesResponse {
  return {
    id: preferences.id,
    userId: preferences.userId,
    notificationsEnabled: preferences.notificationsEnabled,
    seasonalTipsEnabled: preferences.seasonalTipsEnabled,
    createdAt: preferences.createdAt.toISOString(),
    updatedAt: preferences.updatedAt.toISOString(),
  };
}
