import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { CloudflareR2StorageService } from './cloudflare-r2-storage.service';
import type { UploadFile } from './types/upload-file';
import type { UploadResult } from './types/upload-result';

const FILE_EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class StorageService {
  constructor(
    private readonly cloudflareR2StorageService: CloudflareR2StorageService,
  ) {}

  async uploadAvatar(userId: string, file: UploadFile): Promise<UploadResult> {
    const extension = FILE_EXTENSION_BY_MIME_TYPE[file.mimeType] ?? 'bin';
    const randomSuffix = randomBytes(4).toString('hex');
    const objectKey = `avatars/${userId}/${Date.now()}-${randomSuffix}.${extension}`;

    return this.cloudflareR2StorageService.uploadFile(objectKey, file);
  }
}
