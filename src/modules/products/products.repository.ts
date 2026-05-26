import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { productDetailInclude } from './types/product-model';

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyWithPagination(params: {
    where: Prisma.ProductWhereInput;
    skip: number;
    take: number;
  }) {
    return this.prisma.product.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: {
        name: 'asc',
      },
    });
  }

  async count(where: Prisma.ProductWhereInput) {
    return this.prisma.product.count({ where });
  }

  async findFavoriteByUserAndProduct(userId: string, productId: string) {
    return this.prisma.productFavorite.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });
  }

  async findById(id: string, includeInactive = false) {
    return this.prisma.product.findFirst({
      where: {
        id,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: productDetailInclude,
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.product.findUnique({
      where: { slug },
    });
  }

  async create(data: Prisma.ProductCreateInput) {
    return this.prisma.product.create({
      data,
      include: productDetailInclude,
    });
  }

  async update(id: string, data: Prisma.ProductUpdateInput) {
    return this.prisma.product.update({
      where: { id },
      data,
      include: productDetailInclude,
    });
  }

  async updateImageUrl(id: string, imageUrl: string) {
    return this.prisma.product.update({
      where: { id },
      data: {
        imageUrl,
      },
      include: productDetailInclude,
    });
  }

  async deactivate(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }

  async createFavorite(userId: string, productId: string) {
    return this.prisma.productFavorite.create({
      data: {
        userId,
        productId,
      },
    });
  }

  async deleteFavorite(userId: string, productId: string) {
    return this.prisma.productFavorite.delete({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });
  }

  async listFavoritesByUser(params: {
    userId: string;
    skip: number;
    take: number;
  }) {
    return this.prisma.productFavorite.findMany({
      where: {
        userId: params.userId,
        product: {
          isActive: true,
        },
      },
      skip: params.skip,
      take: params.take,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        product: true,
      },
    });
  }

  async countFavoritesByUser(userId: string) {
    return this.prisma.productFavorite.count({
      where: {
        userId,
        product: {
          isActive: true,
        },
      },
    });
  }

  async getFavoriteProductIdsForUser(userId: string, productIds: string[]) {
    if (productIds.length === 0) {
      return [];
    }

    const favorites = await this.prisma.productFavorite.findMany({
      where: {
        userId,
        productId: {
          in: productIds,
        },
      },
      select: {
        productId: true,
      },
    });

    return favorites.map(favorite => favorite.productId);
  }

  async findProductArticleRelation(productId: string, articleId: string) {
    return this.prisma.productArticle.findUnique({
      where: {
        productId_articleId: {
          productId,
          articleId,
        },
      },
    });
  }

  async upsertProductArticleRelation(
    productId: string,
    articleId: string,
    sortOrder = 0,
  ) {
    return this.prisma.productArticle.upsert({
      where: {
        productId_articleId: {
          productId,
          articleId,
        },
      },
      create: {
        productId,
        articleId,
        sortOrder,
      },
      update: {},
    });
  }

  async updateProductArticleRelation(
    productId: string,
    articleId: string,
    data: Prisma.ProductArticleUpdateInput,
  ) {
    return this.prisma.productArticle.update({
      where: {
        productId_articleId: {
          productId,
          articleId,
        },
      },
      data,
    });
  }

  async deleteProductArticleRelation(productId: string, articleId: string) {
    return this.prisma.productArticle.deleteMany({
      where: {
        productId,
        articleId,
      },
    });
  }

  async findProductImageById(imageId: string) {
    return this.prisma.productImage.findUnique({
      where: {
        id: imageId,
      },
    });
  }

  async createProductImage(productId: string, data: Prisma.ProductImageUncheckedCreateInput) {
    return this.prisma.productImage.create({
      data: {
        ...data,
        productId,
      },
    });
  }

  async updateProductImage(imageId: string, data: Prisma.ProductImageUpdateInput) {
    return this.prisma.productImage.update({
      where: {
        id: imageId,
      },
      data,
    });
  }

  async clearPrimaryProductImages(productId: string, excludeImageId?: string) {
    return this.prisma.productImage.updateMany({
      where: {
        productId,
        ...(excludeImageId
          ? {
              id: {
                not: excludeImageId,
              },
            }
          : {}),
      },
      data: {
        isPrimary: false,
      },
    });
  }

  async deleteProductImage(imageId: string) {
    return this.prisma.productImage.delete({
      where: {
        id: imageId,
      },
    });
  }

  async findProductGuideSectionById(sectionId: string) {
    return this.prisma.productGuideSection.findUnique({
      where: {
        id: sectionId,
      },
    });
  }

  async createProductGuideSection(
    productId: string,
    data: Prisma.ProductGuideSectionUncheckedCreateInput,
  ) {
    return this.prisma.productGuideSection.create({
      data: {
        ...data,
        productId,
      },
    });
  }

  async updateProductGuideSection(
    sectionId: string,
    data: Prisma.ProductGuideSectionUpdateInput,
  ) {
    return this.prisma.productGuideSection.update({
      where: {
        id: sectionId,
      },
      data,
    });
  }

  async updateProductGuideSectionImage(
    sectionId: string,
    imageUrl: string | null,
    imageAlt?: string | null,
  ) {
    return this.prisma.productGuideSection.update({
      where: {
        id: sectionId,
      },
      data: {
        imageUrl,
        imageAlt: imageAlt ?? null,
      },
    });
  }

  async deleteProductGuideSection(sectionId: string) {
    return this.prisma.productGuideSection.delete({
      where: {
        id: sectionId,
      },
    });
  }
}
