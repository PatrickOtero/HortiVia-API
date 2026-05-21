import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export const articleAuthorSelect = {
  id: true,
  name: true,
  avatarUrl: true,
} as const;

export const articleWithAuthorInclude = {
  author: {
    select: articleAuthorSelect,
  },
} as const;

export type ArticleWithAuthorRecord = Prisma.ArticleGetPayload<{
  include: typeof articleWithAuthorInclude;
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
      include: articleWithAuthorInclude,
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
      include: articleWithAuthorInclude,
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.article.findUnique({
      where: { slug },
      include: articleWithAuthorInclude,
    });
  }

  async create(data: Prisma.ArticleCreateInput) {
    return this.prisma.article.create({
      data,
      include: articleWithAuthorInclude,
    });
  }

  async update(id: string, data: Prisma.ArticleUpdateInput) {
    return this.prisma.article.update({
      where: { id },
      data,
      include: articleWithAuthorInclude,
    });
  }

  async updateImageUrl(id: string, imageUrl: string) {
    return this.prisma.article.update({
      where: { id },
      data: {
        imageUrl,
      },
      include: articleWithAuthorInclude,
    });
  }

  async unpublish(id: string) {
    return this.prisma.article.update({
      where: { id },
      data: {
        isPublished: false,
      },
      include: articleWithAuthorInclude,
    });
  }
}
