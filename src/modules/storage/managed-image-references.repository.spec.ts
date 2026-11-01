import { ManagedImageReferencesRepository } from './managed-image-references.repository';
import { PrismaService } from '../../prisma/prisma.service';

describe('ManagedImageReferencesRepository', () => {
  const prisma = {
    user: { findMany: jest.fn() },
    product: { findMany: jest.fn() },
    productImage: { findMany: jest.fn() },
    productGuideSection: { findMany: jest.fn() },
    article: { findMany: jest.fn() },
    articleBlock: { findMany: jest.fn() },
  } as unknown as jest.Mocked<PrismaService>;
  const repository = new ManagedImageReferencesRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    for (const model of [prisma.user, prisma.product, prisma.productImage, prisma.productGuideSection, prisma.article, prisma.articleBlock]) {
      (model.findMany as jest.Mock).mockResolvedValue([]);
    }
  });

  it('checks every persisted image URL field using exact URL equality', async () => {
    const url = 'https://cdn.example.test/image.webp';
    await expect(repository.isReferenced(url)).resolves.toBe(false);
    expect(prisma.user.findMany).toHaveBeenCalledWith({ where: { avatarUrl: { in: [url] } }, select: { avatarUrl: true } });
    expect(prisma.product.findMany).toHaveBeenCalledWith({ where: { imageUrl: { in: [url] } }, select: { imageUrl: true } });
    expect(prisma.productImage.findMany).toHaveBeenCalledWith({ where: { url: { in: [url] } }, select: { url: true } });
    expect(prisma.productGuideSection.findMany).toHaveBeenCalledWith({ where: { imageUrl: { in: [url] } }, select: { imageUrl: true } });
    expect(prisma.article.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.articleBlock.findMany).toHaveBeenCalledWith({ where: { imageUrl: { in: [url] } }, select: { imageUrl: true } });
  });

  it('returns exact references found in any managed image field for a batch', async () => {
    const urls = ['https://cdn.example.test/one.webp', 'https://cdn.example.test/two.webp'];
    (prisma.article.findMany as jest.Mock).mockResolvedValueOnce([{ imageUrl: urls[0] }]);
    (prisma.articleBlock.findMany as jest.Mock).mockResolvedValueOnce([{ imageUrl: urls[1] }]);
    await expect(repository.getReferencedUrls(urls)).resolves.toEqual(new Set(urls));
  });

  it('deduplicates candidate URLs and avoids queries for an empty list', async () => {
    await expect(repository.getReferencedUrls([])).resolves.toEqual(new Set());
    expect(prisma.user.findMany).not.toHaveBeenCalled();
    await repository.getReferencedUrls(['https://cdn.example.test/a.webp', 'https://cdn.example.test/a.webp']);
    expect(prisma.user.findMany).toHaveBeenCalledWith({ where: { avatarUrl: { in: ['https://cdn.example.test/a.webp'] } }, select: { avatarUrl: true } });
  });

  it('propagates database failures so reconciliation can classify the result as indeterminate', async () => {
    (prisma.product.findMany as jest.Mock).mockRejectedValueOnce(new Error('database unavailable'));
    await expect(repository.getReferencedUrls(['https://cdn.example.test/image.webp'])).rejects.toThrow('database unavailable');
  });
});
