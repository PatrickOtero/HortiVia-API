import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AvatarUploadExceptionFilter } from './filters/avatar-upload-exception.filter';
import { PROFILE_AVATAR_MAX_FILE_SIZE, ProfileService } from './profile.service';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.profileService.getProfile(user.userId);
  }

  @Patch()
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(user.userId, updateProfileDto);
  }

  @Post('avatar')
  @UseFilters(AvatarUploadExceptionFilter)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: {
        fileSize: PROFILE_AVATAR_MAX_FILE_SIZE,
      },
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile()
    file?:
      | {
          buffer: Buffer;
          mimetype: string;
          size: number;
          originalname?: string;
        }
      | undefined,
  ) {
    return this.profileService.uploadAvatar(
      user.userId,
      file
        ? {
            buffer: file.buffer,
            mimeType: file.mimetype,
            size: file.size,
            originalName: file.originalname,
          }
        : undefined,
    );
  }
}
