import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ManagedImageReferencesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async isReferenced(url: string) {
    const [
      avatars,
      productCovers,
      productGallery,
      productGuides,
      articleImages,
      articleCovers,
      articleBlocks,
    ] = await Promise.all([
      this.prisma.user.count({ where: { avatarUrl: url } }),
      this.prisma.product.count({ where: { imageUrl: url } }),
      this.prisma.productImage.count({ where: { url } }),
      this.prisma.productGuideSection.count({ where: { imageUrl: url } }),
      this.prisma.article.count({ where: { imageUrl: url } }),
      this.prisma.article.count({ where: { coverImageUrl: url } }),
      this.prisma.articleBlock.count({ where: { imageUrl: url } }),
    ]);

    return [
      avatars,
      productCovers,
      productGallery,
      productGuides,
      articleImages,
      articleCovers,
      articleBlocks,
    ].some(count => count > 0);
  }
}
