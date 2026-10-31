import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { slugifyProductName } from '../products/utils/slug.util';
import { CloudflareR2StorageService } from './cloudflare-r2-storage.service';
import type { UploadFile } from './types/upload-file';
import type { PresignedUploadResult } from './types/presigned-upload-result';
import type { UploadResult } from './types/upload-result';
import type { ManagedImageScope } from './types/managed-image-scope';

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

  async deleteManagedUpload(upload: UploadResult, scope: ManagedImageScope) {
    const objectKey = this.validateManagedUpload(upload, scope);
    await this.cloudflareR2StorageService.deleteFile(objectKey);
  }

  inspectManagedUpload(upload: UploadResult, scope: ManagedImageScope) {
    const objectKey = this.validateManagedUpload(upload, scope);
    return this.cloudflareR2StorageService.inspectObject(objectKey);
  }

  private validateManagedUpload(upload: UploadResult, scope: ManagedImageScope) {
    const expectedPrefix = this.getManagedImagePrefix(scope);
    const publicBaseUrl = this.cloudflareR2StorageService.getPublicBaseUrl();
    const fileName = upload.key.startsWith(`${expectedPrefix}/`)
      ? upload.key.slice(expectedPrefix.length + 1)
      : '';

    if (
      upload.url !== `${publicBaseUrl}/${upload.key}` ||
      !/^\d+-[a-f0-9]{8}(?:-[a-z0-9-]+)?\.(?:jpg|png|webp)$/i.test(fileName) ||
      fileName.includes('/') ||
      fileName.includes('\\') ||
      fileName.includes('..')
    ) {
      throw new Error('Object key does not match the expected managed image scope.');
    }

    return upload.key;
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

  async uploadArticleBlockImage(
    articleId: string,
    blockId: string,
    file: UploadFile,
  ): Promise<UploadResult> {
    const objectKey = this.buildArticleBlockImageObjectKey(
      articleId,
      blockId,
      file.originalName ?? 'image',
      file.mimeType,
    );

    return this.cloudflareR2StorageService.uploadFile(objectKey, file);
  }

  async createArticleBlockImageUploadUrl(
    articleId: string,
    blockId: string,
    fileName: string,
    contentType: string,
  ): Promise<PresignedUploadResult> {
    const prepared = this.prepareArticleBlockImageUpload(articleId, blockId, fileName, contentType);
    return this.createPresignedUrlForKey(prepared.key, contentType);
  }

  prepareArticleBlockImageUpload(
    articleId: string,
    blockId: string,
    fileName: string,
    contentType: string,
  ) {
    const key = this.buildArticleBlockImageObjectKey(articleId, blockId, fileName, contentType);
    return { key, url: `${this.cloudflareR2StorageService.getPublicBaseUrl()}/${key}` };
  }

  createPresignedUrlForKey(objectKey: string, contentType: string): Promise<PresignedUploadResult> {
    return this.cloudflareR2StorageService.createPresignedUploadUrl(objectKey, contentType);
  }

  isManagedPublicUrl(url: string, expectedPrefix?: string) {
    try {
      const base = new URL(this.cloudflareR2StorageService.getPublicBaseUrl());
      const candidate = new URL(url);
      if (
        candidate.origin !== base.origin ||
        candidate.search ||
        candidate.hash ||
        candidate.username ||
        candidate.password
      ) return false;

      const basePath = base.pathname.replace(/\/+$/, '');
      const candidatePath = decodeURIComponent(candidate.pathname);
      if (candidatePath.split('/').some(segment => segment === '.' || segment === '..' || segment.includes('\\'))) {
        return false;
      }
      if (!candidatePath.startsWith(`${basePath}/`)) return false;
      if (!expectedPrefix) return true;

      const prefix = expectedPrefix.replace(/^\/+|\/+$/g, '');
      return candidatePath.startsWith(`${basePath}/${prefix}/`);
    } catch {
      return false;
    }
  }

  private buildObjectKey(prefix: string, entityId: string, mimeType: string) {
    const extension = FILE_EXTENSION_BY_MIME_TYPE[mimeType] ?? 'bin';
    const randomSuffix = randomBytes(4).toString('hex');

    return `${prefix}/${entityId}/${Date.now()}-${randomSuffix}.${extension}`;
  }

  private getManagedImagePrefix(scope: ManagedImageScope) {
    const entityIds = 'userId' in scope
      ? [scope.userId]
      : 'productId' in scope
        ? [scope.productId, ...('imageId' in scope ? [scope.imageId] : []), ...('sectionId' in scope ? [scope.sectionId] : [])]
        : [scope.articleId, ...('blockId' in scope ? [scope.blockId] : [])];

    if (entityIds.some(id => !/^[a-z0-9_-]+$/i.test(id))) {
      throw new Error('Refusing to delete an object for an invalid entity identifier.');
    }

    switch (scope.kind) {
      case 'avatar': return `avatars/${scope.userId}`;
      case 'product-main': return `products/${scope.productId}`;
      case 'product-gallery': return `products/${scope.productId}/gallery/${scope.imageId}`;
      case 'product-guide': return `products/${scope.productId}/guide-sections/${scope.sectionId}`;
      case 'article-main': return `articles/${scope.articleId}`;
      case 'article-block': return `articles/${scope.articleId}/blocks/${scope.blockId}`;
    }
  }

  private buildArticleBlockImageObjectKey(
    articleId: string,
    blockId: string,
    fileName: string,
    contentType: string,
  ) {
    const extension = FILE_EXTENSION_BY_MIME_TYPE[contentType] ?? 'bin';
    const safeFileName = this.buildSafeFileName(fileName);

    const randomSuffix = randomBytes(4).toString('hex');

    return `articles/${articleId}/blocks/${blockId}/${Date.now()}-${randomSuffix}-${safeFileName}.${extension}`;
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
