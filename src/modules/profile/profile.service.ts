import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import type { UploadFile } from '../storage/types/upload-file';
import { toProfileResponse } from './mappers/profile-response.mapper';
import { ProfileRepository } from './profile.repository';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { ProfileResponse } from './types/profile-response';

export const PROFILE_AVATAR_MAX_FILE_SIZE = 2 * 1024 * 1024;

const ALLOWED_PROFILE_AVATAR_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

@Injectable()
export class ProfileService {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly storageService: StorageService,
  ) {}

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
      const updatedUser = await this.profileRepository.updateUserProfile(
        userId,
        data,
      );

      return toProfileResponse(updatedUser);
    } catch (error) {
      if (this.isDuplicateEmailError(error)) {
        throw this.buildDuplicateEmailException();
      }

      throw error;
    }
  }

  async uploadAvatar(
    userId: string,
    file?: UploadFile,
  ): Promise<ProfileResponse> {
    const existingUser = await this.profileRepository.findUserById(userId);

    if (!existingUser) {
      throw this.buildAuthenticatedUserNotFoundException();
    }

    const avatarFile = this.validateAvatarFile(file);

    try {
      const uploadResult = await this.storageService.uploadAvatar(
        userId,
        avatarFile,
      );
      const updatedUser = await this.profileRepository.updateAvatar(
        userId,
        uploadResult.url,
      );

      return toProfileResponse(updatedUser);
    } catch (error) {
      if (this.isDuplicateEmailError(error)) {
        throw this.buildDuplicateEmailException();
      }

      throw new InternalServerErrorException({
        message: 'Não foi possível enviar a imagem agora.',
        error: 'Internal Server Error',
      });
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
      message: 'Já existe um usuário com este e-mail.',
      error: 'Conflict',
    });
  }

  private buildAuthenticatedUserNotFoundException() {
    return new UnauthorizedException({
      message: 'Usuário autenticado não encontrado.',
      error: 'Unauthorized',
    });
  }

  private validateAvatarFile(file?: UploadFile): UploadFile {
    if (!file) {
      throw new BadRequestException({
        message: 'Envie uma imagem válida.',
        error: 'Bad Request',
      });
    }

    if (file.size > PROFILE_AVATAR_MAX_FILE_SIZE) {
      throw new BadRequestException({
        message: 'A imagem deve ter no máximo 2 MB.',
        error: 'Bad Request',
      });
    }

    if (!ALLOWED_PROFILE_AVATAR_MIME_TYPES.has(file.mimeType)) {
      throw new BadRequestException({
        message: 'Formato de imagem não permitido.',
        error: 'Bad Request',
      });
    }

    return file;
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
