import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { slugifyProductName } from '../products/utils/slug.util';
import { CloudflareR2StorageService } from './cloudflare-r2-storage.service';
import type { UploadFile } from './types/upload-file';
import type { PresignedUploadResult } from './types/presigned-upload-result';
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

  async uploadProductGalleryImage(
    productId: string,
    imageId: string,
    file: UploadFile,
  ): Promise<UploadResult> {
    const objectKey = this.buildObjectKey(
      `products/${productId}/gallery`,
      imageId,
      file.mimeType,
    );

    return this.cloudflareR2StorageService.uploadFile(objectKey, file);
  }

  async uploadProductGuideSectionImage(
    productId: string,
    sectionId: string,
    file: UploadFile,
  ): Promise<UploadResult> {
    const objectKey = this.buildObjectKey(
      `products/${productId}/guide-sections`,
      sectionId,
      file.mimeType,
    );

    return this.cloudflareR2StorageService.uploadFile(objectKey, file);
  }

  async uploadArticleImage(
    articleId: string,
    file: UploadFile,
  ): Promise<UploadResult> {
    const objectKey = this.buildObjectKey('articles', articleId, file.mimeType);

    return this.cloudflareR2StorageService.uploadFile(objectKey, file);
  }

  async createArticleBlockImageUploadUrl(
    articleId: string,
    blockId: string,
    fileName: string,
    contentType: string,
  ): Promise<PresignedUploadResult> {
    const objectKey = this.buildArticleBlockImageObjectKey(
      articleId,
      blockId,
      fileName,
      contentType,
    );

    return this.cloudflareR2StorageService.createPresignedUploadUrl(
      objectKey,
      contentType,
    );
  }

  isManagedPublicUrl(url: string, expectedPrefix?: string) {
    const normalizedBaseUrl = `${this.cloudflareR2StorageService.getPublicBaseUrl()}/`;

    if (!url.startsWith(normalizedBaseUrl)) {
      return false;
    }

    if (!expectedPrefix) {
      return true;
    }

    return url.startsWith(`${normalizedBaseUrl}${expectedPrefix.replace(/^\/+/, '')}/`);
  }

  private buildObjectKey(prefix: string, entityId: string, mimeType: string) {
    const extension = FILE_EXTENSION_BY_MIME_TYPE[mimeType] ?? 'bin';
    const randomSuffix = randomBytes(4).toString('hex');

    return `${prefix}/${entityId}/${Date.now()}-${randomSuffix}.${extension}`;
  }

  private buildArticleBlockImageObjectKey(
    articleId: string,
    blockId: string,
    fileName: string,
    contentType: string,
  ) {
    const extension = FILE_EXTENSION_BY_MIME_TYPE[contentType] ?? 'bin';
    const safeFileName = this.buildSafeFileName(fileName);

    return `articles/${articleId}/blocks/${blockId}/${Date.now()}-${safeFileName}.${extension}`;
  }

  private buildSafeFileName(fileName: string) {
    const baseName = fileName
      .split(/[\\/]/)
      .pop()
      ?.replace(/\.[^.]+$/, '');

    const safeFileName = slugifyProductName(baseName ?? '');

    return safeFileName || 'image';
  }
}
