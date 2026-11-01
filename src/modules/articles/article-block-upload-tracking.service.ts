import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { PresignedUploadIntentStatus, PresignedUploadResourceType } from '../../generated/prisma/enums';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS } from '../storage/presigned-upload.constants';
import { StorageService } from '../storage/storage.service';
import type { UpdateArticleBlockImageDto } from './dto/update-article-block-image.dto';
import { ArticleBlockUploadIntentsRepository } from './article-block-upload-intents.repository';
import type { Prisma } from '../../generated/prisma/client';

@Injectable()
export class ArticleBlockUploadTrackingService {
  private readonly logger = new Logger(ArticleBlockUploadTrackingService.name);

  constructor(
    private readonly repository: ArticleBlockUploadIntentsRepository,
    private readonly storageService: StorageService,
  ) {}

  async createIntent(params: {
    articleId: string;
    blockId: string;
    fileName: string;
    contentType: string;
    fileSize: number;
    user?: AuthenticatedUser;
  }) {
    const prepared = this.storageService.prepareArticleBlockImageUpload(
      params.articleId,
      params.blockId,
      params.fileName,
      params.contentType,
    );
    const intent = await this.repository.create({
      objectKey: prepared.key,
      publicUrl: prepared.url,
      resourceType: PresignedUploadResourceType.ARTICLE_BLOCK_IMAGE,
      articleId: params.articleId,
      blockId: params.blockId,
      requestedByUserId: params.user?.userId,
      contentType: params.contentType,
      declaredSize: params.fileSize,
      expiresAt: new Date(Date.now() + PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS * 1000),
    });

    try {
      return await this.storageService.createPresignedUrlForKey(intent.objectKey, intent.contentType);
    } catch (error) {
      try {
        await this.repository.markSigningFailed(intent.id);
      } catch (stateError) {
        this.logger.error(
          'Could not mark a failed presigned URL signing attempt.',
          stateError instanceof Error ? stateError.name : 'UnknownError',
        );
      }
      throw error;
    }
  }

  async findIntent(publicUrl: string) {
    return this.repository.findByPublicUrl(publicUrl);
  }

  async associate(params: {
    articleId: string;
    blockId: string;
    intentId: string;
    publicUrl: string;
    dto: UpdateArticleBlockImageDto;
    etag?: string;
    additionalData?: Prisma.ArticleBlockUpdateInput;
  }) {
    const intent = await this.repository.findByPublicUrl(params.publicUrl);
    if (
      !intent ||
      intent.id !== params.intentId ||
      intent.resourceType !== PresignedUploadResourceType.ARTICLE_BLOCK_IMAGE ||
      intent.articleId !== params.articleId ||
      intent.blockId !== params.blockId
    ) {
      throw this.invalidIntent();
    }
    if (intent.status === PresignedUploadIntentStatus.SIGNING_FAILED) {
      throw this.invalidIntent();
    }

    let object: Awaited<ReturnType<StorageService['inspectManagedUpload']>>;
    try {
      object = await this.storageService.inspectManagedUpload(
        { key: intent.objectKey, url: intent.publicUrl },
        { kind: 'article-block', articleId: params.articleId, blockId: params.blockId },
      );
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Não foi possível confirmar a imagem no armazenamento.',
        error: 'Internal Server Error',
      }, { cause: error });
    }
    if (!object.exists) {
      throw new BadRequestException({
        message: 'A imagem ainda não está disponível no armazenamento.',
        error: 'Bad Request',
      });
    }
    if (object.size !== intent.declaredSize || object.contentType !== intent.contentType) {
      throw new BadRequestException({
        message: 'A imagem enviada não corresponde aos dados informados no upload.',
        error: 'Bad Request',
      });
    }

    const result = await this.repository.associateBlockImage({
      intentId: intent.id,
      articleId: params.articleId,
      blockId: params.blockId,
      publicUrl: intent.publicUrl,
      objectEtag: object.etag ?? null,
      data: {
        ...params.additionalData,
        imageUrl: intent.publicUrl,
        imageAlt: params.dto.imageAlt?.trim() || null,
        imageCaption: params.dto.imageCaption?.trim() || null,
      },
    });
    if (result.kind === 'NOT_FOUND') throw new NotFoundException('Bloco do artigo não encontrado.');
    if (result.kind === 'CONFLICT') {
      throw new ConflictException('Esta tentativa de upload não pode mais ser associada ao bloco.');
    }
    return result.block;
  }

  private invalidIntent() {
    return new BadRequestException({
      message: 'A tentativa de upload não corresponde a este bloco.',
      error: 'Bad Request',
    });
  }
}
