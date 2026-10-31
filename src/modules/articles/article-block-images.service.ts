import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ArticlesRepository } from './articles.repository';
import { ArticleAccessService } from './article-access.service';
import { StorageService } from '../storage/storage.service';
import {
  ALLOWED_CONTENT_IMAGE_MIME_TYPES,
  CONTENT_IMAGE_MAX_FILE_SIZE,
} from '../storage/image-upload.constants';
import type { PresignedUploadResult } from '../storage/types/presigned-upload-result';
import type { UploadFile } from '../storage/types/upload-file';
import type { ArticleBlockResponse } from './types/article-response';
import type { CreateArticleBlockImageUploadDto } from './dto/create-article-block-image-upload.dto';
import type { UpdateArticleBlockImageDto } from './dto/update-article-block-image.dto';
import type { UploadArticleBlockImageDto } from './dto/upload-article-block-image.dto';
import { toArticleBlockItemResponse } from './mappers/article-response.mapper';
import { articleBlockNotFoundException, isPrismaErrorCode } from './utils/article-errors.util';
import {
  normalizeArticleText,
  normalizeOptionalArticleText,
  resolveUploadedBlockImageText,
} from './utils/article-content.util';
import { validateContentImageFile } from '../storage/image-upload.validation';
import { StorageUploadCompensationService } from '../storage/storage-upload-compensation.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ArticleBlockUploadTrackingService } from './article-block-upload-tracking.service';

@Injectable()
export class ArticleBlockImagesService {
  constructor(
    private readonly articlesRepository: ArticlesRepository,
    private readonly articleAccessService: ArticleAccessService,
    private readonly storageService: StorageService,
    private readonly uploadCompensation: StorageUploadCompensationService,
    private readonly uploadTracking: ArticleBlockUploadTrackingService,
  ) {}

  async createUploadUrl(
    articleId: string,
    blockId: string,
    dto: CreateArticleBlockImageUploadDto,
    user?: AuthenticatedUser,
  ): Promise<PresignedUploadResult> {
    await this.requireBlock(articleId, blockId);
    this.validateUploadRequest(dto);
    try {
      return await this.uploadTracking.createIntent({
        articleId,
        blockId,
        fileName: dto.fileName,
        contentType: dto.contentType,
        fileSize: dto.fileSize,
        user,
      });
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Nao foi possivel preparar o upload da imagem.',
        error: 'Internal Server Error',
      }, { cause: error });
    }
  }

  async updateImage(
    articleId: string,
    blockId: string,
    dto: UpdateArticleBlockImageDto,
  ): Promise<ArticleBlockResponse> {
    await this.requireBlock(articleId, blockId);
    const expectedPrefix = `articles/${articleId}/blocks/${blockId}`;
    const imageUrl = normalizeArticleText(dto.imageUrl);
    if (!this.storageService.isManagedPublicUrl(imageUrl, expectedPrefix)) {
      throw new BadRequestException({
        message: 'Informe uma URL de imagem valida.',
        error: 'Bad Request',
      });
    }

    const intent = await this.uploadTracking.findIntent(imageUrl);
    if (intent) {
      const block = await this.uploadTracking.associate({
        articleId,
        blockId,
        intentId: intent.id,
        publicUrl: imageUrl,
        dto,
      });
      return toArticleBlockItemResponse(block);
    }

    try {
      const block = await this.articlesRepository.updateBlock(blockId, {
        imageUrl,
        imageAlt: normalizeOptionalArticleText(dto.imageAlt),
        imageCaption: normalizeOptionalArticleText(dto.imageCaption),
      });
      return toArticleBlockItemResponse(block);
    } catch (error) {
      if (isPrismaErrorCode(error, 'P2025')) throw articleBlockNotFoundException();
      throw error;
    }
  }

  async uploadImage(
    articleId: string,
    blockId: string,
    dto: UploadArticleBlockImageDto,
    file?: UploadFile,
  ): Promise<ArticleBlockResponse> {
    const existingBlock = await this.requireBlock(articleId, blockId);
    const imageFile = validateContentImageFile(file);
    let uploaded: Awaited<ReturnType<StorageService['uploadArticleBlockImage']>> | null = null;
    try {
      uploaded = await this.storageService.uploadArticleBlockImage(
        articleId,
        blockId,
        imageFile,
      );
      const block = await this.articlesRepository.updateBlock(blockId, {
        imageUrl: uploaded.url,
        imageAlt: resolveUploadedBlockImageText(dto.imageAlt, existingBlock.imageAlt),
        imageCaption: resolveUploadedBlockImageText(dto.imageCaption, existingBlock.imageCaption),
      });
      return toArticleBlockItemResponse(block);
    } catch (error) {
      if (uploaded) {
        await this.uploadCompensation.removeIfUnreferenced(uploaded, {
          kind: 'article-block',
          articleId,
          blockId,
        });
      }
      if (isPrismaErrorCode(error, 'P2025')) throw articleBlockNotFoundException(error);
      throw new InternalServerErrorException({
        message: 'Nao foi possivel enviar a imagem do bloco.',
        error: 'Internal Server Error',
      }, { cause: error });
    }
  }

  async removeImage(articleId: string, blockId: string): Promise<ArticleBlockResponse> {
    await this.requireBlock(articleId, blockId);
    try {
      const block = await this.articlesRepository.updateBlock(blockId, {
        imageUrl: null,
        imageAlt: null,
        imageCaption: null,
      });
      return toArticleBlockItemResponse(block);
    } catch (error) {
      if (isPrismaErrorCode(error, 'P2025')) throw articleBlockNotFoundException();
      throw error;
    }
  }

  private async requireBlock(articleId: string, blockId: string) {
    await this.articleAccessService.requireArticle(articleId, true);
    return this.articleAccessService.requireBlock(articleId, blockId);
  }

  private validateUploadRequest(dto: CreateArticleBlockImageUploadDto) {
    const fileName = normalizeArticleText(dto.fileName);
    if (!fileName || fileName.includes('..') || /[\\/]/.test(fileName)) {
      throw new BadRequestException({
        message: 'Informe um nome de arquivo valido.',
        error: 'Bad Request',
      });
    }
    if (dto.fileSize > CONTENT_IMAGE_MAX_FILE_SIZE) {
      throw new BadRequestException({
        message: 'A imagem deve ter no maximo 5 MB.',
        error: 'Bad Request',
      });
    }
    if (!ALLOWED_CONTENT_IMAGE_MIME_TYPES.has(dto.contentType)) {
      throw new BadRequestException({
        message: 'Formato de imagem nao permitido.',
        error: 'Bad Request',
      });
    }
  }
}
