import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ArticlesRepository } from './articles.repository';
import { ArticleAccessService } from './article-access.service';
import { StorageService } from '../storage/storage.service';
import type { UploadFile } from '../storage/types/upload-file';
import type { ArticleDetailResponse } from './types/article-response';
import { toArticleDetailResponse } from './mappers/article-response.mapper';
import { articleNotFoundException, isPrismaErrorCode } from './utils/article-errors.util';
import { resolveArticleReadingTime } from './utils/article-content.util';
import { validateContentImageFile } from '../storage/image-upload.validation';
import { StorageUploadCompensationService } from '../storage/storage-upload-compensation.service';

@Injectable()
export class ArticleImagesService {
  constructor(
    private readonly articlesRepository: ArticlesRepository,
    private readonly articleAccessService: ArticleAccessService,
    private readonly storageService: StorageService,
    private readonly uploadCompensation: StorageUploadCompensationService,
  ) {}

  async uploadMainImage(id: string, file?: UploadFile): Promise<ArticleDetailResponse> {
    await this.articleAccessService.requireArticle(id, true);
    const imageFile = validateContentImageFile(file);
    let uploaded: Awaited<ReturnType<StorageService['uploadArticleImage']>> | null = null;
    try {
      uploaded = await this.storageService.uploadArticleImage(id, imageFile);
      const article = await this.articlesRepository.updateImageUrl(id, uploaded.url);
      return toArticleDetailResponse(article, resolveArticleReadingTime(article), {
        isSaved: false,
        isReacted: false,
        reactionsCount: article._count.reactions,
        commentsCount: article._count.comments,
      });
    } catch (error) {
      if (uploaded) {
        await this.uploadCompensation.removeIfUnreferenced(uploaded, {
          kind: 'article-main',
          articleId: id,
        });
      }
      if (isPrismaErrorCode(error, 'P2025')) throw articleNotFoundException(error);
      throw new InternalServerErrorException({
        message: 'Não foi possível enviar a imagem.',
        error: 'Internal Server Error',
      }, { cause: error });
    }
  }
}
