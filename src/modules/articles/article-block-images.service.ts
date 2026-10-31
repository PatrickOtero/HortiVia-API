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

@Injectable()
export class ArticleBlockImagesService {
  constructor(
    private readonly articlesRepository: ArticlesRepository,
    private readonly articleAccessService: ArticleAccessService,
    private readonly storageService: StorageService,
  ) {}

  async createUploadUrl(
    articleId: string,
    blockId: string,
    dto: CreateArticleBlockImageUploadDto,
  ): Promise<PresignedUploadResult> {
    await this.requireBlock(articleId, blockId);
    this.validateUploadRequest(dto);
    try {
      return await this.storageService.createArticleBlockImageUploadUrl(
        articleId,
        blockId,
        dto.fileName,
        dto.contentType,
      );
    } catch {
      throw new InternalServerErrorException({
        message: 'Nao foi possivel preparar o upload da imagem.',
        error: 'Internal Server Error',
      });
    }
  }

  async updateImage(
    articleId: string,
    blockId: string,
    dto: UpdateArticleBlockImageDto,
  ): Promise<ArticleBlockResponse> {
    await this.requireBlock(articleId, blockId);
    const expectedPrefix = `articles/${articleId}/blocks/${blockId}`;
    if (!this.storageService.isManagedPublicUrl(dto.imageUrl, expectedPrefix)) {
      throw new BadRequestException({
        message: 'Informe uma URL de imagem valida.',
        error: 'Bad Request',
      });
    }

    try {
      const block = await this.articlesRepository.updateBlock(blockId, {
        imageUrl: normalizeArticleText(dto.imageUrl),
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
    try {
      const uploaded = await this.storageService.uploadArticleBlockImage(
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
      if (isPrismaErrorCode(error, 'P2025')) throw articleBlockNotFoundException();
      throw new InternalServerErrorException({
        message: 'Nao foi possivel enviar a imagem do bloco.',
        error: 'Internal Server Error',
      });
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
