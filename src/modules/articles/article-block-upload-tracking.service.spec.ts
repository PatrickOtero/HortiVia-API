import { BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PresignedUploadIntentStatus, PresignedUploadResourceType } from '../../generated/prisma/enums';
import { StorageService } from '../storage/storage.service';
import { ArticleBlockUploadIntentsRepository } from './article-block-upload-intents.repository';
import { ArticleBlockUploadTrackingService } from './article-block-upload-tracking.service';

describe('ArticleBlockUploadTrackingService', () => {
  const now = new Date('2026-10-31T12:00:00.000Z');
  const intent = {
    id: 'intent-1',
    objectKey: 'articles/article-1/blocks/block-1/1793448000000-aabbccdd-image.webp',
    publicUrl: 'https://cdn.example.test/articles/article-1/blocks/block-1/1793448000000-aabbccdd-image.webp',
    resourceType: PresignedUploadResourceType.ARTICLE_BLOCK_IMAGE,
    articleId: 'article-1',
    blockId: 'block-1',
    requestedByUserId: 'admin-1',
    contentType: 'image/webp',
    declaredSize: 12,
    createdAt: now,
    expiresAt: new Date(now.getTime() + 15 * 60_000),
    status: PresignedUploadIntentStatus.PENDING,
    associatedAt: null,
    objectEtag: null,
  };
  let repository: jest.Mocked<Pick<ArticleBlockUploadIntentsRepository,
    'create' | 'findByPublicUrl' | 'markSigningFailed' | 'associateBlockImage'>>;
  let storage: jest.Mocked<Pick<StorageService,
    'prepareArticleBlockImageUpload' | 'createPresignedUrlForKey' | 'inspectManagedUpload'>>;
  let service: ArticleBlockUploadTrackingService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    repository = {
      create: jest.fn().mockResolvedValue(intent),
      findByPublicUrl: jest.fn().mockResolvedValue(intent),
      markSigningFailed: jest.fn().mockResolvedValue({ count: 1 }),
      associateBlockImage: jest.fn(),
    } as never;
    storage = {
      prepareArticleBlockImageUpload: jest.fn().mockReturnValue({ key: intent.objectKey, url: intent.publicUrl }),
      createPresignedUrlForKey: jest.fn().mockResolvedValue({ key: intent.objectKey, url: intent.publicUrl, uploadUrl: 'https://signed.example.test/put?secret=private' }),
      inspectManagedUpload: jest.fn().mockResolvedValue({ exists: true, size: 12, contentType: 'image/webp', etag: 'etag-1' }),
    } as never;
    service = new ArticleBlockUploadTrackingService(repository as never, storage as never);
  });

  afterEach(() => jest.useRealTimers());

  it('persists a unique upload intent before returning the compatible signed result', async () => {
    const result = await service.createIntent({ articleId: 'article-1', blockId: 'block-1', fileName: 'foto.webp', contentType: 'image/webp', fileSize: 12, user: { userId: 'admin-1', email: 'admin@example.invalid', role: 'ADMIN' } });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      objectKey: intent.objectKey, publicUrl: intent.publicUrl,
      resourceType: PresignedUploadResourceType.ARTICLE_BLOCK_IMAGE,
      articleId: 'article-1', blockId: 'block-1', requestedByUserId: 'admin-1',
      contentType: 'image/webp', declaredSize: 12, expiresAt: intent.expiresAt,
    }));
    expect(repository.create.mock.invocationCallOrder[0]).toBeLessThan(storage.createPresignedUrlForKey.mock.invocationCallOrder[0]);
    expect(result).toEqual({ key: intent.objectKey, url: intent.publicUrl, uploadUrl: 'https://signed.example.test/put?secret=private' });
  });

  it('does not request a signed URL when intent persistence fails', async () => {
    repository.create.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(service.createIntent({ articleId: 'article-1', blockId: 'block-1', fileName: 'foto.webp', contentType: 'image/webp', fileSize: 12 }))
      .rejects.toThrow('database unavailable');
    expect(storage.createPresignedUrlForKey).not.toHaveBeenCalled();
  });

  it('marks signing failure without replacing the original error or exposing signed data', async () => {
    const signingError = new Error('signing failed');
    storage.createPresignedUrlForKey.mockRejectedValueOnce(signingError);
    await expect(service.createIntent({ articleId: 'article-1', blockId: 'block-1', fileName: 'foto.webp', contentType: 'image/webp', fileSize: 12 }))
      .rejects.toBe(signingError);
    expect(repository.markSigningFailed).toHaveBeenCalledWith(intent.id);
  });

  it('preserves the signing error if updating intent status also fails', async () => {
    const signingError = new Error('signing failed');
    storage.createPresignedUrlForKey.mockRejectedValueOnce(signingError);
    repository.markSigningFailed.mockRejectedValueOnce(new Error('database status update failed'));
    await expect(service.createIntent({ articleId: 'article-1', blockId: 'block-1', fileName: 'foto.webp', contentType: 'image/webp', fileSize: 12 }))
      .rejects.toBe(signingError);
  });

  it('rejects an intent belonging to another article or block before checking R2', async () => {
    repository.findByPublicUrl.mockResolvedValueOnce({ ...intent, blockId: 'block-other' } as never);
    await expect(service.associate({ articleId: 'article-1', blockId: 'block-1', intentId: intent.id, publicUrl: intent.publicUrl, dto: { imageUrl: intent.publicUrl } }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(storage.inspectManagedUpload).not.toHaveBeenCalled();
  });

  it('rejects legacy/signing-failed tracked intents without treating them as untracked legacy URLs', async () => {
    repository.findByPublicUrl.mockResolvedValueOnce({ ...intent, status: PresignedUploadIntentStatus.SIGNING_FAILED } as never);
    await expect(service.associate({ articleId: 'article-1', blockId: 'block-1', intentId: intent.id, publicUrl: intent.publicUrl, dto: { imageUrl: intent.publicUrl } }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(storage.inspectManagedUpload).not.toHaveBeenCalled();
  });

  it('rejects a missing object or metadata that does not match the declared upload', async () => {
    storage.inspectManagedUpload.mockResolvedValueOnce({ exists: false } as never);
    await expect(service.associate({ articleId: 'article-1', blockId: 'block-1', intentId: intent.id, publicUrl: intent.publicUrl, dto: { imageUrl: intent.publicUrl } }))
      .rejects.toBeInstanceOf(BadRequestException);
    storage.inspectManagedUpload.mockResolvedValueOnce({ exists: true, size: 13, contentType: 'image/webp', etag: 'etag-1' } as never);
    await expect(service.associate({ articleId: 'article-1', blockId: 'block-1', intentId: intent.id, publicUrl: intent.publicUrl, dto: { imageUrl: intent.publicUrl } }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(repository.associateBlockImage).not.toHaveBeenCalled();
  });

  it('does not associate when R2 inspection is indeterminate', async () => {
    storage.inspectManagedUpload.mockRejectedValueOnce(new Error('R2 unavailable'));
    await expect(service.associate({ articleId: 'article-1', blockId: 'block-1', intentId: intent.id, publicUrl: intent.publicUrl, dto: { imageUrl: intent.publicUrl } }))
      .rejects.toBeInstanceOf(InternalServerErrorException);
    expect(repository.associateBlockImage).not.toHaveBeenCalled();
  });

  it('atomically delegates successful association and metadata to the repository', async () => {
    const block = { id: 'block-1', articleId: 'article-1', kind: 'IMAGE', title: null, body: null, imageUrl: intent.publicUrl, imageAlt: 'Alt', imageCaption: 'Caption', items: null, sortOrder: 0, createdAt: now, updatedAt: now };
    repository.associateBlockImage.mockResolvedValueOnce({ kind: 'ASSOCIATED', block } as never);
    const result = await service.associate({ articleId: 'article-1', blockId: 'block-1', intentId: intent.id, publicUrl: intent.publicUrl, dto: { imageUrl: intent.publicUrl, imageAlt: ' Alt ', imageCaption: ' Caption ' } });
    expect(repository.associateBlockImage).toHaveBeenCalledWith(expect.objectContaining({
      intentId: intent.id, articleId: 'article-1', blockId: 'block-1', publicUrl: intent.publicUrl, objectEtag: 'etag-1',
      data: { imageUrl: intent.publicUrl, imageAlt: 'Alt', imageCaption: 'Caption' },
    }));
    expect(result).toBe(block);
  });

  it('maps concurrent association conflicts without retrying or reverting the block', async () => {
    repository.associateBlockImage.mockResolvedValueOnce({ kind: 'CONFLICT' } as never);
    await expect(service.associate({ articleId: 'article-1', blockId: 'block-1', intentId: intent.id, publicUrl: intent.publicUrl, dto: { imageUrl: intent.publicUrl } }))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('maps a deleted block to not found', async () => {
    repository.associateBlockImage.mockResolvedValueOnce({ kind: 'NOT_FOUND' } as never);
    await expect(service.associate({ articleId: 'article-1', blockId: 'block-1', intentId: intent.id, publicUrl: intent.publicUrl, dto: { imageUrl: intent.publicUrl } }))
      .rejects.toMatchObject({ status: 404 });
  });
});
