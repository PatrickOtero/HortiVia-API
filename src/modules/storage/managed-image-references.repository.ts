import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ManagedImageReferencesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async isReferenced(url: string) {
    return (await this.getReferencedUrls([url])).has(url);
  }

  async getReferencedUrls(urls: string[]) {
    const candidates = [...new Set(urls)];
    if (candidates.length === 0) return new Set<string>();

    const [avatars, productCovers, productGallery, productGuides, articleImages, articleCovers, articleBlocks] =
      await Promise.all([
        this.prisma.user.findMany({ where: { avatarUrl: { in: candidates } }, select: { avatarUrl: true } }),
        this.prisma.product.findMany({ where: { imageUrl: { in: candidates } }, select: { imageUrl: true } }),
        this.prisma.productImage.findMany({ where: { url: { in: candidates } }, select: { url: true } }),
        this.prisma.productGuideSection.findMany({ where: { imageUrl: { in: candidates } }, select: { imageUrl: true } }),
        this.prisma.article.findMany({ where: { imageUrl: { in: candidates } }, select: { imageUrl: true } }),
        this.prisma.article.findMany({ where: { coverImageUrl: { in: candidates } }, select: { coverImageUrl: true } }),
        this.prisma.articleBlock.findMany({ where: { imageUrl: { in: candidates } }, select: { imageUrl: true } }),
      ]);

    return new Set([
      ...avatars.map(row => row.avatarUrl),
      ...productCovers.map(row => row.imageUrl),
      ...productGallery.map(row => row.url),
      ...productGuides.map(row => row.imageUrl),
      ...articleImages.map(row => row.imageUrl),
      ...articleCovers.map(row => row.coverImageUrl),
      ...articleBlocks.map(row => row.imageUrl),
    ].filter((url): url is string => typeof url === 'string'));
  }
}
