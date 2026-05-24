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
} satisfies Prisma.ProductInclude;

export type ProductDetailModel = Prisma.ProductGetPayload<{
  include: typeof productDetailInclude;
}>;
