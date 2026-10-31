import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { StorageService } from '../storage/storage.service';
import { ArticlesRepository } from './articles.repository';
import { ArticleAccessService } from './article-access.service';
import type { ArticleBlockResponse } from './types/article-response';
import type { CreateArticleBlockDto } from './dto/create-article-block.dto';
import type { UpdateArticleBlockDto } from './dto/update-article-block.dto';
import { toArticleBlockItemResponse } from './mappers/article-response.mapper';
import { articleBlockNotFoundException, isPrismaErrorCode } from './utils/article-errors.util';
import {
  normalizeArticleBlockItems,
  normalizeOptionalArticleText,
} from './utils/article-content.util';
import { ArticleBlockImagesService } from './article-block-images.service';

@Injectable()
export class ArticleBlocksService {
  constructor(
    private readonly articlesRepository: ArticlesRepository,
    private readonly articleAccessService: ArticleAccessService,
    private readonly articleBlockImagesService: ArticleBlockImagesService,
    private readonly storageService: StorageService,
  ) {}

  async createBlock(
    articleId: string,
    dto: CreateArticleBlockDto,
  ): Promise<ArticleBlockResponse> {
    await this.articleAccessService.requireArticle(articleId, true);
    const imageUrl = normalizeOptionalArticleText(dto.imageUrl);
    if (imageUrl && this.storageService.isManagedPublicUrl(imageUrl)) {
      throw new BadRequestException({
        message: 'Crie o bloco antes de associar uma imagem gerenciada.',
        error: 'Bad Request',
      });
    }
    const block = await this.articlesRepository.createBlock({
      article: { connect: { id: articleId } },
      kind: dto.kind,
      title: normalizeOptionalArticleText(dto.title),
      body: normalizeOptionalArticleText(dto.body),
      imageUrl,
      imageAlt: normalizeOptionalArticleText(dto.imageAlt),
      imageCaption: normalizeOptionalArticleText(dto.imageCaption),
      items: normalizeArticleBlockItems(dto.items),
      sortOrder: dto.sortOrder ?? 0,
    });
    return toArticleBlockItemResponse(block);
  }

  async updateBlock(
    articleId: string,
    blockId: string,
    dto: UpdateArticleBlockDto,
  ): Promise<ArticleBlockResponse> {
    await this.articleAccessService.requireArticle(articleId, true);
    const existingBlock = await this.articleAccessService.requireBlock(articleId, blockId);
    const data: Prisma.ArticleBlockUpdateInput = {};

    if (dto.kind !== undefined) data.kind = dto.kind;
    if (dto.title !== undefined) data.title = normalizeOptionalArticleText(dto.title);
    if (dto.body !== undefined) data.body = normalizeOptionalArticleText(dto.body);
    if (dto.imageUrl !== undefined) data.imageUrl = normalizeOptionalArticleText(dto.imageUrl);
    if (dto.imageAlt !== undefined) data.imageAlt = normalizeOptionalArticleText(dto.imageAlt);
    if (dto.imageCaption !== undefined) data.imageCaption = normalizeOptionalArticleText(dto.imageCaption);
    if (dto.items !== undefined) data.items = normalizeArticleBlockItems(dto.items);
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    const imageUrl = normalizeOptionalArticleText(dto.imageUrl);
    if (imageUrl) {
      const otherData = { ...data };
      delete otherData.imageUrl;
      delete otherData.imageAlt;
      delete otherData.imageCaption;
      return this.articleBlockImagesService.updateImage(
        articleId,
        blockId,
        {
          imageUrl,
          imageAlt: dto.imageAlt ?? existingBlock.imageAlt ?? undefined,
          imageCaption: dto.imageCaption ?? existingBlock.imageCaption ?? undefined,
        },
        otherData,
      );
    }

    if (Object.keys(data).length === 0) {
      return toArticleBlockItemResponse(existingBlock);
    }

    try {
      return toArticleBlockItemResponse(
        await this.articlesRepository.updateBlock(blockId, data),
      );
    } catch (error) {
      if (isPrismaErrorCode(error, 'P2025')) throw articleBlockNotFoundException();
      throw error;
    }
  }

  async deleteBlock(articleId: string, blockId: string) {
    await this.articleAccessService.requireArticle(articleId, true);
    await this.articleAccessService.requireBlock(articleId, blockId);
    try {
      await this.articlesRepository.deleteBlock(blockId);
    } catch (error) {
      if (isPrismaErrorCode(error, 'P2025')) throw articleBlockNotFoundException();
      throw error;
    }
    return { message: 'Bloco do artigo removido.' };
  }
}
