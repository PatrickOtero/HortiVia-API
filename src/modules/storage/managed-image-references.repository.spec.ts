import { ManagedImageReferencesRepository } from './managed-image-references.repository';
import { PrismaService } from '../../prisma/prisma.service';

describe('ManagedImageReferencesRepository', () => {
  const prisma = {
    user: { count: jest.fn() },
    product: { count: jest.fn() },
    productImage: { count: jest.fn() },
    productGuideSection: { count: jest.fn() },
    article: { count: jest.fn() },
    articleBlock: { count: jest.fn() },
  } as unknown as jest.Mocked<PrismaService>;
  const repository = new ManagedImageReferencesRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    for (const model of [
      prisma.user, prisma.product, prisma.productImage, prisma.productGuideSection,
      prisma.article, prisma.articleBlock,
    ]) (model.count as jest.Mock).mockResolvedValue(0);
  });

  it('checks all persisted image URL fields with exact URL equality', async () => {
    await expect(repository.isReferenced('https://cdn.example.test/image.webp')).resolves.toBe(false);
    expect(prisma.user.count).toHaveBeenCalledWith({ where: { avatarUrl: 'https://cdn.example.test/image.webp' } });
    expect(prisma.product.count).toHaveBeenCalledWith({ where: { imageUrl: 'https://cdn.example.test/image.webp' } });
    expect(prisma.productImage.count).toHaveBeenCalledWith({ where: { url: 'https://cdn.example.test/image.webp' } });
    expect(prisma.productGuideSection.count).toHaveBeenCalledWith({ where: { imageUrl: 'https://cdn.example.test/image.webp' } });
    expect(prisma.article.count).toHaveBeenCalledTimes(2);
    expect(prisma.articleBlock.count).toHaveBeenCalledWith({ where: { imageUrl: 'https://cdn.example.test/image.webp' } });
  });

  it('preserves an object referenced by any managed entity', async () => {
    (prisma.articleBlock.count as jest.Mock).mockResolvedValue(1);
    await expect(repository.isReferenced('https://cdn.example.test/image.webp')).resolves.toBe(true);
  });

  it('propagates database read failures so cleanup can preserve the object', async () => {
    (prisma.product.count as jest.Mock).mockRejectedValue(new Error('database unavailable'));
    await expect(repository.isReferenced('https://cdn.example.test/image.webp')).rejects.toThrow('database unavailable');
  });
});
