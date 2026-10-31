import { BadRequestException } from '@nestjs/common';
import { ArticlesRepository } from './articles.repository';
import { ArticleAccessService } from './article-access.service';
import { ArticleBlockImagesService } from './article-block-images.service';
import { ArticleBlockUploadTrackingService } from './article-block-upload-tracking.service';
import { StorageService } from '../storage/storage.service';
import { StorageUploadCompensationService } from '../storage/storage-upload-compensation.service';

describe('ArticleBlockImagesService pre-signed compatibility', () => {
  const articleId = 'article-1';
  const blockId = 'block-1';
  const imageUrl = `https://cdn.example.test/articles/${articleId}/blocks/${blockId}/1710000000000-aabbccdd-old.webp`;
  const block = {
    id: blockId, articleId, kind: 'IMAGE', title: null, body: null, imageUrl: null, imageAlt: null,
    imageCaption: null, items: null, sortOrder: 0, createdAt: new Date(), updatedAt: new Date(),
  };
  let repository: jest.Mocked<Pick<ArticlesRepository, 'findById' | 'findBlockById' | 'updateBlock'>>;
  let storage: jest.Mocked<Pick<StorageService, 'isManagedPublicUrl' | 'inspectManagedPublicUrl'>>;
  let tracking: jest.Mocked<Pick<ArticleBlockUploadTrackingService, 'createIntent' | 'findIntent' | 'associate'>>;
  let service: ArticleBlockImagesService;

  beforeEach(() => {
    repository = {
      findById: jest.fn().mockResolvedValue({ id: articleId }),
      findBlockById: jest.fn().mockResolvedValue(block),
      updateBlock: jest.fn().mockResolvedValue({ ...block, imageUrl }),
    } as never;
    storage = {
      isManagedPublicUrl: jest.fn().mockReturnValue(true),
      inspectManagedPublicUrl: jest.fn().mockResolvedValue({ exists: true, size: 10, contentType: 'image/webp', etag: 'legacy-etag' }),
    } as never;
    tracking = {
      createIntent: jest.fn(),
      findIntent: jest.fn().mockResolvedValue(null),
      associate: jest.fn().mockResolvedValue({ ...block, imageUrl }),
    } as never;
    service = new ArticleBlockImagesService(
      repository as unknown as ArticlesRepository,
      new ArticleAccessService(repository as unknown as ArticlesRepository),
      storage as unknown as StorageService,
      { removeIfUnreferenced: jest.fn() } as unknown as StorageUploadCompensationService,
      tracking as unknown as ArticleBlockUploadTrackingService,
    );
  });

  it('routes tracked URLs through object verification and atomic intent association', async () => {
    tracking.findIntent.mockResolvedValueOnce({ id: 'intent-1' } as never);
    await service.updateImage(articleId, blockId, { imageUrl, imageAlt: ' descrição ' });
    expect(tracking.findIntent).toHaveBeenCalledWith(imageUrl);
    expect(tracking.associate).toHaveBeenCalledWith({ articleId, blockId, intentId: 'intent-1', publicUrl: imageUrl, dto: { imageUrl, imageAlt: ' descrição ' }, additionalData: {} });
    expect(repository.updateBlock).not.toHaveBeenCalled();
  });

  it('preserves compatibility with existing managed URLs that have no tracking record', async () => {
    await service.updateImage(articleId, blockId, { imageUrl, imageAlt: '  Alt antigo  ', imageCaption: 'Legenda antiga' });
    expect(storage.inspectManagedPublicUrl).toHaveBeenCalledWith(imageUrl, `articles/${articleId}/blocks/${blockId}`);
    expect(repository.updateBlock).toHaveBeenCalledWith(blockId, {
      imageUrl, imageAlt: 'Alt antigo', imageCaption: 'Legenda antiga',
    });
    expect(tracking.associate).not.toHaveBeenCalled();
  });

  it('keeps editing metadata on the current legacy URL available without R2 checks', async () => {
    repository.findBlockById.mockResolvedValueOnce({ ...block, imageUrl } as never);
    await service.updateImage(articleId, blockId, { imageUrl, imageAlt: 'Alt ajustado' });
    expect(storage.inspectManagedPublicUrl).not.toHaveBeenCalled();
    expect(repository.updateBlock).toHaveBeenCalledWith(blockId, {
      imageUrl, imageAlt: 'Alt ajustado', imageCaption: null,
    });
  });

  it('does not persist a new untracked URL when its object is missing from R2', async () => {
    storage.inspectManagedPublicUrl.mockResolvedValueOnce({ exists: false } as never);
    await expect(service.updateImage(articleId, blockId, { imageUrl })).rejects.toMatchObject({ status: 400 });
    expect(repository.updateBlock).not.toHaveBeenCalled();
  });

  it('preserves the database when a legacy URL existence check is indeterminate', async () => {
    storage.inspectManagedPublicUrl.mockRejectedValueOnce(new Error('R2 unavailable'));
    await expect(service.updateImage(articleId, blockId, { imageUrl })).rejects.toMatchObject({ status: 500 });
    expect(repository.updateBlock).not.toHaveBeenCalled();
  });

  it('rejects a managed URL from another block before looking up a tracking record', async () => {
    storage.isManagedPublicUrl.mockReturnValueOnce(false);
    await expect(service.updateImage(articleId, blockId, { imageUrl: 'https://cdn.example.test/foreign.webp' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(tracking.findIntent).not.toHaveBeenCalled();
    expect(repository.updateBlock).not.toHaveBeenCalled();
  });
});
