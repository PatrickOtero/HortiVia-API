import { Injectable } from '@nestjs/common';
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
} satisfies Prisma.ArticleInclude;

export const articleDetailInclude = {
  ...articleListInclude,
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
}
