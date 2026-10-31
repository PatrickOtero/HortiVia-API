import { Injectable } from '@nestjs/common';
import { PresignedUploadIntentStatus } from '../../generated/prisma/enums';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { ArticleBlockRecord } from './articles.repository';

const ASSOCIATION_CONFLICT = Symbol('PRESIGNED_UPLOAD_ASSOCIATION_CONFLICT');

export type ArticleBlockImageAssociationResult =
  | { kind: 'ASSOCIATED'; block: ArticleBlockRecord }
  | { kind: 'NOT_FOUND' }
  | { kind: 'CONFLICT' };

@Injectable()
export class ArticleBlockUploadIntentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.PresignedUploadIntentUncheckedCreateInput) {
    return this.prisma.presignedUploadIntent.create({ data });
  }

  findByPublicUrl(publicUrl: string) {
    return this.prisma.presignedUploadIntent.findUnique({ where: { publicUrl } });
  }

  findCurrentStatuses(ids: string[]) {
    if (ids.length === 0) return Promise.resolve([]);
    return this.prisma.presignedUploadIntent.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true, objectEtag: true },
    });
  }

  markSigningFailed(id: string) {
    return this.prisma.presignedUploadIntent.updateMany({
      where: { id, status: PresignedUploadIntentStatus.PENDING },
      data: { status: PresignedUploadIntentStatus.SIGNING_FAILED },
    });
  }

  countAssociated() {
    return this.prisma.presignedUploadIntent.count({
      where: { status: PresignedUploadIntentStatus.ASSOCIATED },
    });
  }

  countByStatus(status: PresignedUploadIntentStatus) {
    return this.prisma.presignedUploadIntent.count({ where: { status } });
  }

  countNotMatured(safeThrough: Date) {
    return this.prisma.presignedUploadIntent.count({
      where: {
        status: { in: [PresignedUploadIntentStatus.PENDING, PresignedUploadIntentStatus.ASSOCIATED] },
        expiresAt: { gt: safeThrough },
      },
    });
  }

  findReconciliationPage(params: { safeThrough: Date; afterId?: string; take: number }) {
    return this.prisma.presignedUploadIntent.findMany({
      where: {
        status: { in: [PresignedUploadIntentStatus.PENDING, PresignedUploadIntentStatus.ASSOCIATED] },
        expiresAt: { lte: params.safeThrough },
        ...(params.afterId ? { id: { gt: params.afterId } } : {}),
      },
      orderBy: { id: 'asc' },
      take: params.take,
    });
  }

  async associateBlockImage(params: {
    intentId: string;
    articleId: string;
    blockId: string;
    publicUrl: string;
    objectEtag: string | null;
    data: Prisma.ArticleBlockUpdateInput;
  }): Promise<ArticleBlockImageAssociationResult> {
    try {
      return await this.prisma.$transaction(async transaction => {
        const intent = await transaction.presignedUploadIntent.findUnique({
          where: { id: params.intentId },
        });
        if (
          !intent ||
          intent.articleId !== params.articleId ||
          intent.blockId !== params.blockId ||
          intent.publicUrl !== params.publicUrl
        ) return { kind: 'NOT_FOUND' } as const;

        const block = await transaction.articleBlock.findUnique({
          where: { id: params.blockId },
        });
        if (!block || block.articleId !== params.articleId) return { kind: 'NOT_FOUND' } as const;

        if (intent.status === PresignedUploadIntentStatus.ASSOCIATED) {
          if (block.imageUrl !== params.publicUrl) return { kind: 'CONFLICT' } as const;
          const updated = await transaction.articleBlock.update({
            where: { id: params.blockId },
            data: params.data,
          });
          return { kind: 'ASSOCIATED', block: updated } as const;
        }
        if (intent.status !== PresignedUploadIntentStatus.PENDING) {
          return { kind: 'CONFLICT' } as const;
        }

        const newerAssociation = await transaction.presignedUploadIntent.findFirst({
          where: {
            articleId: params.articleId,
            blockId: params.blockId,
            id: { not: intent.id },
            status: PresignedUploadIntentStatus.ASSOCIATED,
            createdAt: { gte: intent.createdAt },
          },
          select: { id: true },
        });
        if (newerAssociation) return { kind: 'CONFLICT' } as const;

        const blockUpdate = await transaction.articleBlock.updateMany({
          where: {
            id: params.blockId,
            articleId: params.articleId,
            imageUrl: block.imageUrl,
          },
          data: params.data,
        });
        if (blockUpdate.count !== 1) throw ASSOCIATION_CONFLICT;

        const intentUpdate = await transaction.presignedUploadIntent.updateMany({
          where: { id: intent.id, status: PresignedUploadIntentStatus.PENDING },
          data: {
            status: PresignedUploadIntentStatus.ASSOCIATED,
            associatedAt: new Date(),
            objectEtag: params.objectEtag,
          },
        });
        if (intentUpdate.count !== 1) throw ASSOCIATION_CONFLICT;

        const updated = await transaction.articleBlock.findUniqueOrThrow({
          where: { id: params.blockId },
        });
        return { kind: 'ASSOCIATED', block: updated } as const;
      });
    } catch (error) {
      if (error === ASSOCIATION_CONFLICT) return { kind: 'CONFLICT' };
      throw error;
    }
  }
}
