import { Injectable } from '@nestjs/common';
import { ArticleReactionType } from '../../generated/prisma/enums';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export const articleAuthorSelect = {
  id: true,
  name: true,
  avatarUrl: true,
} as const;

export const articleListInclude = {
  author: {
    select: articleAuthorSelect,
  },
  _count: {
    select: {
      reactions: true,
    },
  },
} satisfies Prisma.ArticleInclude;

export const articleDetailInclude = {
  ...articleListInclude,
  blocks: {
    orderBy: [
      {
        sortOrder: 'asc',
      },
      {
        createdAt: 'asc',
      },
    ],
  },
  productRelations: {
    where: {
      product: {
        isActive: true,
      },
    },
    orderBy: [
      {
        sortOrder: 'asc',
      },
      {
        createdAt: 'asc',
      },
    ],
    include: {
      product: true,
    },
  },
} satisfies Prisma.ArticleInclude;

export type ArticleListRecord = Prisma.ArticleGetPayload<{
  include: typeof articleListInclude;
}>;

export type ArticleDetailRecord = Prisma.ArticleGetPayload<{
  include: typeof articleDetailInclude;
}>;

export const savedArticleInclude = articleListInclude;

export type SavedArticleRecord = Prisma.SavedArticleGetPayload<{
  include: {
    article: {
      include: typeof savedArticleInclude;
    };
  };
}>;

export type ArticleBlockRecord =
  Prisma.ArticleBlockGetPayload<Prisma.ArticleBlockDefaultArgs>;

@Injectable()
export class ArticlesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyWithPagination(params: {
    where: Prisma.ArticleWhereInput;
    skip: number;
    take: number;
  }) {
    return this.prisma.article.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      include: articleListInclude,
      orderBy: [
        {
          publishedAt: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });
  }

  async count(where: Prisma.ArticleWhereInput) {
    return this.prisma.article.count({ where });
  }

  async findById(id: string, includeUnpublished = false) {
    return this.prisma.article.findFirst({
      where: {
        id,
        ...(includeUnpublished ? {} : { isPublished: true }),
      },
      include: articleDetailInclude,
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.article.findUnique({
      where: { slug },
    });
  }

  async create(data: Prisma.ArticleCreateInput) {
    return this.prisma.article.create({
      data,
      include: articleDetailInclude,
    });
  }

  async update(id: string, data: Prisma.ArticleUpdateInput) {
    return this.prisma.article.update({
      where: { id },
      data,
      include: articleDetailInclude,
    });
  }

  async updateImageUrl(id: string, imageUrl: string) {
    return this.prisma.article.update({
      where: { id },
      data: {
        imageUrl,
      },
      include: articleDetailInclude,
    });
  }

  async unpublish(id: string) {
    return this.prisma.article.update({
      where: { id },
      data: {
        isPublished: false,
      },
      include: articleDetailInclude,
    });
  }

  async findSavedArticleByUserAndArticle(userId: string, articleId: string) {
    return this.prisma.savedArticle.findUnique({
      where: {
        userId_articleId: {
          userId,
          articleId,
        },
      },
    });
  }

  async createSavedArticle(userId: string, articleId: string) {
    return this.prisma.savedArticle.create({
      data: {
        user: {
          connect: {
            id: userId,
          },
        },
        article: {
          connect: {
            id: articleId,
          },
        },
      },
    });
  }

  async deleteSavedArticle(userId: string, articleId: string) {
    return this.prisma.savedArticle.delete({
      where: {
        userId_articleId: {
          userId,
          articleId,
        },
      },
    });
  }

  async listSavedArticlesByUser(params: {
    userId: string;
    skip: number;
    take: number;
  }) {
    return this.prisma.savedArticle.findMany({
      where: {
        userId: params.userId,
        article: {
          isPublished: true,
        },
      },
      skip: params.skip,
      take: params.take,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        article: {
          include: savedArticleInclude,
        },
      },
    });
  }

  async countSavedArticlesByUser(userId: string) {
    return this.prisma.savedArticle.count({
      where: {
        userId,
        article: {
          isPublished: true,
        },
      },
    });
  }

  async getSavedArticleIdsForUser(userId: string, articleIds?: string[]) {
    const savedArticles = await this.prisma.savedArticle.findMany({
      where: {
        userId,
        ...(articleIds && articleIds.length > 0
          ? {
              articleId: {
                in: articleIds,
              },
            }
          : {}),
      },
      select: {
        articleId: true,
      },
    });

    return savedArticles.map(savedArticle => savedArticle.articleId);
  }

  async findReaction(
    userId: string,
    articleId: string,
    type: ArticleReactionType,
  ) {
    return this.prisma.articleReaction.findUnique({
      where: {
        userId_articleId_type: {
          userId,
          articleId,
          type,
        },
      },
    });
  }

  async createReaction(
    userId: string,
    articleId: string,
    type: ArticleReactionType,
  ) {
    return this.prisma.articleReaction.create({
      data: {
        user: {
          connect: {
            id: userId,
          },
        },
        article: {
          connect: {
            id: articleId,
          },
        },
        type,
      },
    });
  }

  async deleteReaction(
    userId: string,
    articleId: string,
    type: ArticleReactionType,
  ) {
    return this.prisma.articleReaction.delete({
      where: {
        userId_articleId_type: {
          userId,
          articleId,
          type,
        },
      },
    });
  }

  async countReactions(articleId: string, type: ArticleReactionType) {
    return this.prisma.articleReaction.count({
      where: {
        articleId,
        type,
      },
    });
  }

  async getReactionArticleIdsForUser(
    userId: string,
    articleIds: string[],
    type: ArticleReactionType,
  ) {
    if (articleIds.length === 0) {
      return [];
    }

    const reactions = await this.prisma.articleReaction.findMany({
      where: {
        userId,
        articleId: {
          in: articleIds,
        },
        type,
      },
      select: {
        articleId: true,
      },
    });

    return reactions.map(reaction => reaction.articleId);
  }

  async createBlock(data: Prisma.ArticleBlockCreateInput) {
    return this.prisma.articleBlock.create({
      data,
    });
  }

  async findBlockById(id: string) {
    return this.prisma.articleBlock.findUnique({
      where: { id },
    });
  }

  async updateBlock(id: string, data: Prisma.ArticleBlockUpdateInput) {
    return this.prisma.articleBlock.update({
      where: { id },
      data,
    });
  }

  async deleteBlock(id: string) {
    return this.prisma.articleBlock.delete({
      where: { id },
    });
  }
}
