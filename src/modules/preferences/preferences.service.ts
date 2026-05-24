import { Injectable, UnauthorizedException } from '@nestjs/common';
import { toPreferencesResponse } from './mappers/preferences-response.mapper';
import { PreferencesRepository } from './preferences.repository';
import type { UpdatePreferencesDto } from './dto/update-preferences.dto';
import type { PreferencesResponse } from './types/preferences-response';

@Injectable()
export class PreferencesService {
  constructor(private readonly preferencesRepository: PreferencesRepository) {}

  async getPreferences(userId: string): Promise<PreferencesResponse> {
    const preferences = await this.ensurePreferencesForUser(userId);

    return toPreferencesResponse(preferences);
  }

  async updatePreferences(
    userId: string,
    updatePreferencesDto: UpdatePreferencesDto,
  ): Promise<PreferencesResponse> {
    await this.ensureUserExists(userId);

    const preferences = await this.preferencesRepository.upsertByUserId(userId, {
      ...(updatePreferencesDto.notificationsEnabled !== undefined
        ? { notificationsEnabled: updatePreferencesDto.notificationsEnabled }
        : {}),
      ...(updatePreferencesDto.seasonalTipsEnabled !== undefined
        ? { seasonalTipsEnabled: updatePreferencesDto.seasonalTipsEnabled }
        : {}),
    });

    return toPreferencesResponse(preferences);
  }

  private async ensurePreferencesForUser(userId: string) {
    await this.ensureUserExists(userId);

    const existingPreferences = await this.preferencesRepository.findByUserId(userId);

    if (existingPreferences) {
      return existingPreferences;
    }

    return this.preferencesRepository.createDefaultForUser(userId);
  }

  private async ensureUserExists(userId: string) {
    const user = await this.preferencesRepository.findUserById(userId);

    if (!user) {
      throw new UnauthorizedException({
        message: 'Usuário autenticado não encontrado.',
        error: 'Unauthorized',
      });
    }

    return user;
  }
}
