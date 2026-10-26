import type { Prisma } from '../../../generated/prisma/client';

export const productDetailInclude = {
  images: {
    orderBy: [
      {
        sortOrder: 'asc',
      },
      {
        createdAt: 'asc',
      },
    ],
  },
  guideSections: {
    orderBy: [
      {
        sortOrder: 'asc',
      },
      {
        createdAt: 'asc',
      },
    ],
  },
  articleRelations: {
    where: {
      article: {
        isPublished: true,
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
      article: {
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          category: true,
          imageUrl: true,
          coverImageUrl: true,
          publishedAt: true,
          createdAt: true,
        },
      },
    },
  },
} satisfies Prisma.ProductInclude;

export type ProductDetailModel = Prisma.ProductGetPayload<{
  include: typeof productDetailInclude;
}>;
