import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

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

  async findById(id: string, includeInactive = false) {
    return this.prisma.product.findFirst({
      where: {
        id,
        ...(includeInactive ? {} : { isActive: true }),
      },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.product.findUnique({
      where: { slug },
    });
  }

  async create(data: Prisma.ProductCreateInput) {
    return this.prisma.product.create({ data });
  }

  async update(id: string, data: Prisma.ProductUpdateInput) {
    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  async updateImageUrl(id: string, imageUrl: string) {
    return this.prisma.product.update({
      where: { id },
      data: {
        imageUrl,
      },
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
}
