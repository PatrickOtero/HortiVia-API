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
    const objectKey = this.buildObjectKey('avatars', userId, file.mimeType);

    return this.cloudflareR2StorageService.uploadFile(objectKey, file);
  }

  async uploadProductImage(
    productId: string,
    file: UploadFile,
  ): Promise<UploadResult> {
    const objectKey = this.buildObjectKey('products', productId, file.mimeType);

    return this.cloudflareR2StorageService.uploadFile(objectKey, file);
  }

  async uploadArticleImage(
    articleId: string,
    file: UploadFile,
  ): Promise<UploadResult> {
    const objectKey = this.buildObjectKey('articles', articleId, file.mimeType);

    return this.cloudflareR2StorageService.uploadFile(objectKey, file);
  }

  private buildObjectKey(prefix: string, entityId: string, mimeType: string) {
    const extension = FILE_EXTENSION_BY_MIME_TYPE[mimeType] ?? 'bin';
    const randomSuffix = randomBytes(4).toString('hex');

    return `${prefix}/${entityId}/${Date.now()}-${randomSuffix}.${extension}`;
  }
}
