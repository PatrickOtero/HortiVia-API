import { StorageService } from './storage.service';
import { CloudflareR2StorageService } from './cloudflare-r2-storage.service';
import type { UploadResult } from './types/upload-result';

describe('StorageService managed image deletion', () => {
  const adapter = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
    getPublicBaseUrl: jest.fn().mockReturnValue('https://cdn.example.test'),
  } as unknown as jest.Mocked<CloudflareR2StorageService>;
  const service = new StorageService(adapter);
  const upload: UploadResult = {
    url: 'https://cdn.example.test/products/product-1/gallery/image-1/1716163200000-a1b2c3d4.webp',
    key: 'products/product-1/gallery/image-1/1716163200000-a1b2c3d4.webp',
  };

  beforeEach(() => jest.clearAllMocks());

  it.each([
    [
      'avatar',
      { kind: 'avatar' as const, userId: 'user-1' },
      'avatars/user-1/1716163200000-a1b2c3d4.webp',
    ],
    [
      'product main image',
      { kind: 'product-main' as const, productId: 'product-1' },
      'products/product-1/1716163200000-a1b2c3d4.webp',
    ],
    [
      'product gallery image',
      { kind: 'product-gallery' as const, productId: 'product-1', imageId: 'image-1' },
      'products/product-1/gallery/image-1/1716163200000-a1b2c3d4.webp',
    ],
    [
      'product guide image',
      { kind: 'product-guide' as const, productId: 'product-1', sectionId: 'section-1' },
      'products/product-1/guide-sections/section-1/1716163200000-a1b2c3d4.webp',
    ],
    [
      'article main image',
      { kind: 'article-main' as const, articleId: 'article-1' },
      'articles/article-1/1716163200000-a1b2c3d4.webp',
    ],
    [
      'article block image',
      { kind: 'article-block' as const, articleId: 'article-1', blockId: 'block-1' },
      'articles/article-1/blocks/block-1/1716163200000-a1b2c3d4.webp',
    ],
  ])('deletes one specific object within the authorized %s path', async (_case, scope, key) => {
    await service.deleteManagedUpload({ url: `https://cdn.example.test/${key}`, key }, scope);
    expect(adapter.deleteFile).toHaveBeenCalledTimes(1);
    expect(adapter.deleteFile).toHaveBeenCalledWith(key);
  });

  it.each([
    ['foreign entity', { ...upload, key: 'products/product-2/gallery/image-1/1716163200000-a1b2c3d4.webp' }],
    ['traversal', { ...upload, key: 'products/product-1/gallery/image-1/../private.webp' }],
    ['multiple objects', { ...upload, key: 'products/product-1/gallery/image-1/a.webp/other.webp' }],
    ['client URL', { ...upload, url: 'https://attacker.test/products/product-1/gallery/image-1/1716163200000-a1b2c3d4.webp' }],
    ['unsupported key extension', { ...upload, key: 'products/product-1/gallery/image-1/1716163200000-a1b2c3d4.exe' }],
  ])('rejects %s without calling the R2 adapter', async (_case, invalidUpload) => {
    await expect(service.deleteManagedUpload(invalidUpload, {
      kind: 'product-gallery', productId: 'product-1', imageId: 'image-1',
    })).rejects.toThrow();
    expect(adapter.deleteFile).not.toHaveBeenCalled();
  });

  it('rejects unsafe entity identifiers before deriving a deletion scope', async () => {
    await expect(service.deleteManagedUpload(upload, {
      kind: 'product-gallery', productId: '../other', imageId: 'image-1',
    })).rejects.toThrow();
    expect(adapter.deleteFile).not.toHaveBeenCalled();
  });

  it('uses a unique object key for concurrent multipart uploads to the same article block', async () => {
    adapter.uploadFile.mockImplementation(async key => ({
      key,
      url: `https://cdn.example.test/${key}`,
    }));
    const file = { buffer: Buffer.from('image'), mimeType: 'image/webp', size: 5 };

    const first = await service.uploadArticleBlockImage('article-1', 'block-1', file);
    const second = await service.uploadArticleBlockImage('article-1', 'block-1', file);

    expect(first.key).not.toBe(second.key);
    expect(first.key).toMatch(/^articles\/article-1\/blocks\/block-1\/\d+-[a-f0-9]{8}-image\.webp$/);
  });
});
