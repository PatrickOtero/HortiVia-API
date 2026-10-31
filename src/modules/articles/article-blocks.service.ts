import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { ArticlesRepository } from './articles.repository';
import { StorageService } from '../storage/storage.service';
import {
  ALLOWED_CONTENT_IMAGE_MIME_TYPES,
  CONTENT_IMAGE_MAX_FILE_SIZE,
} from '../storage/image-upload.constants';
import type { PresignedUploadResult } from '../storage/types/presigned-upload-result';
import type { UploadFile } from '../storage/types/upload-file';
import type { ArticleBlockResponse } from './types/article-response';
import type { CreateArticleBlockDto } from './dto/create-article-block.dto';
import type { CreateArticleBlockImageUploadDto } from './dto/create-article-block-image-upload.dto';
import type { UpdateArticleBlockDto } from './dto/update-article-block.dto';
import type { UpdateArticleBlockImageDto } from './dto/update-article-block-image.dto';
import type { UploadArticleBlockImageDto } from './dto/upload-article-block-image.dto';
import { toArticleBlockItemResponse } from './mappers/article-response.mapper';

@Injectable()
export class ArticleBlocksService {
  constructor(
    private readonly articlesRepository: ArticlesRepository,
    private readonly storageService: StorageService,
  ) {}

  async createBlock(
    articleId: string,
    dto: CreateArticleBlockDto,
  ): Promise<ArticleBlockResponse> {
    await this.requireArticle(articleId);
    const block = await this.articlesRepository.createBlock({
      article: { connect: { id: articleId } },
      kind: dto.kind,
      title: this.normalizeOptionalText(dto.title),
      body: this.normalizeOptionalText(dto.body),
      imageUrl: this.normalizeOptionalText(dto.imageUrl),
      imageAlt: this.normalizeOptionalText(dto.imageAlt),
      imageCaption: this.normalizeOptionalText(dto.imageCaption),
      items: this.normalizeBlockItems(dto.items),
      sortOrder: dto.sortOrder ?? 0,
    });
    return toArticleBlockItemResponse(block);
  }

  async createBlockImageUploadUrl(
    articleId: string,
    blockId: string,
    dto: CreateArticleBlockImageUploadDto,
  ): Promise<PresignedUploadResult> {
    await this.requireArticle(articleId);
    await this.requireArticleBlock(articleId, blockId);
    this.validateImageUploadRequest(dto);
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

  async updateBlock(
    articleId: string,
    blockId: string,
    dto: UpdateArticleBlockDto,
  ): Promise<ArticleBlockResponse> {
    await this.requireArticle(articleId);
    const existingBlock = await this.requireArticleBlock(articleId, blockId);
    const data: Prisma.ArticleBlockUpdateInput = {};

    if (dto.kind !== undefined) data.kind = dto.kind;
    if (dto.title !== undefined) data.title = this.normalizeOptionalText(dto.title);
    if (dto.body !== undefined) data.body = this.normalizeOptionalText(dto.body);
    if (dto.imageUrl !== undefined) data.imageUrl = this.normalizeOptionalText(dto.imageUrl);
    if (dto.imageAlt !== undefined) data.imageAlt = this.normalizeOptionalText(dto.imageAlt);
    if (dto.imageCaption !== undefined) data.imageCaption = this.normalizeOptionalText(dto.imageCaption);
    if (dto.items !== undefined) data.items = this.normalizeBlockItems(dto.items);
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    if (Object.keys(data).length === 0) {
      return toArticleBlockItemResponse(existingBlock);
    }

    try {
      return toArticleBlockItemResponse(
        await this.articlesRepository.updateBlock(blockId, data),
      );
    } catch (error) {
      if (this.isRecordNotFoundError(error)) throw this.buildArticleBlockNotFoundException();
      throw error;
    }
  }

  async updateBlockImage(
    articleId: string,
    blockId: string,
    dto: UpdateArticleBlockImageDto,
  ): Promise<ArticleBlockResponse> {
    await this.requireArticle(articleId);
    await this.requireArticleBlock(articleId, blockId);
    this.validateManagedBlockImageUrl(articleId, blockId, dto.imageUrl);
    try {
      const block = await this.articlesRepository.updateBlock(blockId, {
        imageUrl: this.normalizeText(dto.imageUrl),
        imageAlt: this.normalizeOptionalText(dto.imageAlt),
        imageCaption: this.normalizeOptionalText(dto.imageCaption),
      });
      return toArticleBlockItemResponse(block);
    } catch (error) {
      if (this.isRecordNotFoundError(error)) throw this.buildArticleBlockNotFoundException();
      throw error;
    }
  }

  async uploadBlockImage(
    articleId: string,
    blockId: string,
    dto: UploadArticleBlockImageDto,
    file?: UploadFile,
  ): Promise<ArticleBlockResponse> {
    await this.requireArticle(articleId);
    const existingBlock = await this.requireArticleBlock(articleId, blockId);
    const imageFile = this.validateImageFile(file);
    try {
      const uploaded = await this.storageService.uploadArticleBlockImage(
        articleId,
        blockId,
        imageFile,
      );
      const updatedBlock = await this.articlesRepository.updateBlock(blockId, {
        imageUrl: uploaded.url,
        imageAlt: this.resolveUploadedBlockImageText(dto.imageAlt, existingBlock.imageAlt),
        imageCaption: this.resolveUploadedBlockImageText(dto.imageCaption, existingBlock.imageCaption),
      });
      return toArticleBlockItemResponse(updatedBlock);
    } catch (error) {
      if (this.isRecordNotFoundError(error)) throw this.buildArticleBlockNotFoundException();
      throw new InternalServerErrorException({
        message: 'Nao foi possivel enviar a imagem do bloco.',
        error: 'Internal Server Error',
      });
    }
  }

  async deleteBlock(articleId: string, blockId: string) {
    await this.requireArticle(articleId);
    await this.requireArticleBlock(articleId, blockId);
    try {
      await this.articlesRepository.deleteBlock(blockId);
    } catch (error) {
      if (this.isRecordNotFoundError(error)) throw this.buildArticleBlockNotFoundException();
      throw error;
    }
    return { message: 'Bloco do artigo removido.' };
  }

  async removeBlockImage(articleId: string, blockId: string): Promise<ArticleBlockResponse> {
    await this.requireArticle(articleId);
    await this.requireArticleBlock(articleId, blockId);
    try {
      const block = await this.articlesRepository.updateBlock(blockId, {
        imageUrl: null,
        imageAlt: null,
        imageCaption: null,
      });
      return toArticleBlockItemResponse(block);
    } catch (error) {
      if (this.isRecordNotFoundError(error)) throw this.buildArticleBlockNotFoundException();
      throw error;
    }
  }

  private async requireArticle(articleId: string) {
    const article = await this.articlesRepository.findById(articleId, true);
    if (!article) {
      throw new NotFoundException({ message: 'Artigo não encontrado.', error: 'Not Found' });
    }
    return article;
  }

  private async requireArticleBlock(articleId: string, blockId: string) {
    const block = await this.articlesRepository.findBlockById(blockId);
    if (!block || block.articleId !== articleId) throw this.buildArticleBlockNotFoundException();
    return block;
  }

  private normalizeText(value: string) {
    return value.trim();
  }

  private normalizeOptionalText(value?: string | null) {
    if (value === undefined || value === null) return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private normalizeBlockItems(items?: unknown[]): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    return items === undefined ? Prisma.JsonNull : [...items] as Prisma.InputJsonValue;
  }

  private resolveUploadedBlockImageText(submitted?: string, current?: string | null) {
    return this.normalizeOptionalText(submitted) ?? current;
  }

  private validateImageFile(file?: UploadFile): UploadFile {
    if (!file) {
      throw new BadRequestException({ message: 'Envie uma imagem válida.', error: 'Bad Request' });
    }
    if (file.size > CONTENT_IMAGE_MAX_FILE_SIZE) {
      throw new BadRequestException({ message: 'A imagem deve ter no máximo 5 MB.', error: 'Bad Request' });
    }
    if (!ALLOWED_CONTENT_IMAGE_MIME_TYPES.has(file.mimeType)) {
      throw new BadRequestException({ message: 'Formato de imagem não permitido.', error: 'Bad Request' });
    }
    return file;
  }

  private validateImageUploadRequest(request: CreateArticleBlockImageUploadDto) {
    const fileName = request.fileName.trim();
    if (!fileName || fileName.includes('..') || /[\\/]/.test(fileName)) {
      throw new BadRequestException({ message: 'Informe um nome de arquivo valido.', error: 'Bad Request' });
    }
    if (request.fileSize > CONTENT_IMAGE_MAX_FILE_SIZE) {
      throw new BadRequestException({ message: 'A imagem deve ter no maximo 5 MB.', error: 'Bad Request' });
    }
    if (!ALLOWED_CONTENT_IMAGE_MIME_TYPES.has(request.contentType)) {
      throw new BadRequestException({ message: 'Formato de imagem nao permitido.', error: 'Bad Request' });
    }
  }

  private validateManagedBlockImageUrl(articleId: string, blockId: string, imageUrl: string) {
    const expectedPrefix = `articles/${articleId}/blocks/${blockId}`;
    if (!this.storageService.isManagedPublicUrl(imageUrl, expectedPrefix)) {
      throw new BadRequestException({ message: 'Informe uma URL de imagem valida.', error: 'Bad Request' });
    }
  }

  private buildArticleBlockNotFoundException() {
    return new NotFoundException({ message: 'Bloco do artigo não encontrado.', error: 'Not Found' });
  }

  private isRecordNotFoundError(error: unknown) {
    return !!error && typeof error === 'object' && 'code' in error &&
      (error as { code?: string }).code === 'P2025';
  }
}
