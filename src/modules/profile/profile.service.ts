import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { toProfileResponse } from './mappers/profile-response.mapper';
import { ProfileRepository } from './profile.repository';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { ProfileResponse } from './types/profile-response';

@Injectable()
export class ProfileService {
  constructor(private readonly profileRepository: ProfileRepository) {}

  async getProfile(userId: string): Promise<ProfileResponse> {
    const user = await this.profileRepository.findUserById(userId);

    if (!user) {
      throw this.buildAuthenticatedUserNotFoundException();
    }

    return toProfileResponse(user);
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<ProfileResponse> {
    const existingUser = await this.profileRepository.findUserById(userId);

    if (!existingUser) {
      throw this.buildAuthenticatedUserNotFoundException();
    }

    const data = {
      ...(updateProfileDto.name !== undefined
        ? { name: updateProfileDto.name.trim() }
        : {}),
      ...(updateProfileDto.avatarUrl !== undefined
        ? { avatarUrl: this.normalizeOptionalText(updateProfileDto.avatarUrl) }
        : {}),
      ...(updateProfileDto.gender !== undefined
        ? { gender: updateProfileDto.gender }
        : {}),
    };

    if (updateProfileDto.email !== undefined) {
      const normalizedEmail = this.normalizeEmail(updateProfileDto.email);
      const userWithSameEmail = await this.profileRepository.findUserByEmail(
        normalizedEmail,
      );

      if (userWithSameEmail && userWithSameEmail.id !== userId) {
        throw this.buildDuplicateEmailException();
      }

      Object.assign(data, {
        email: normalizedEmail,
      });
    }

    if (Object.keys(data).length === 0) {
      return toProfileResponse(existingUser);
    }

    try {
      const updatedUser = await this.profileRepository.updateUserProfile(userId, data);

      return toProfileResponse(updatedUser);
    } catch (error) {
      if (this.isDuplicateEmailError(error)) {
        throw this.buildDuplicateEmailException();
      }

      throw error;
    }
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private normalizeOptionalText(value: string) {
    const normalizedValue = value.trim();

    return normalizedValue.length > 0 ? normalizedValue : null;
  }

  private buildDuplicateEmailException() {
    return new ConflictException({
      message: 'Ja existe um usuario com este e-mail.',
      error: 'Conflict',
    });
  }

  private buildAuthenticatedUserNotFoundException() {
    return new UnauthorizedException({
      message: 'Usuario autenticado nao encontrado.',
      error: 'Unauthorized',
    });
  }

  private isDuplicateEmailError(error: unknown) {
    if (!error || typeof error !== 'object' || !('code' in error)) {
      return false;
    }

    const prismaError = error as {
      code?: string;
      meta?: {
        target?: unknown;
      };
    };

    if (prismaError.code !== 'P2002') {
      return false;
    }

    const targets = Array.isArray(prismaError.meta?.target)
      ? prismaError.meta.target
      : [];

    return targets.length === 0 || targets.includes('email');
  }
}
