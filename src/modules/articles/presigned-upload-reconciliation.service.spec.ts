import { PresignedUploadIntentStatus } from '../../generated/prisma/enums';
import { ManagedImageReferencesRepository } from '../storage/managed-image-references.repository';
import { StorageService } from '../storage/storage.service';
import { ArticleBlockUploadIntentsRepository } from './article-block-upload-intents.repository';
import { PresignedUploadReconciliationService } from './presigned-upload-reconciliation.service';

describe('PresignedUploadReconciliationService', () => {
  const now = new Date('2026-10-31T12:00:00.000Z');
  const mature = {
    id: 'intent-1', objectKey: 'articles/a/blocks/b/1-aabbccdd-image.webp',
    publicUrl: 'https://cdn.example.test/articles/a/blocks/b/1-aabbccdd-image.webp',
    articleId: 'a', blockId: 'b', status: PresignedUploadIntentStatus.PENDING,
    createdAt: new Date('2026-10-31T09:00:00.000Z'), expiresAt: new Date('2026-10-31T09:15:00.000Z'), objectEtag: null,
  };
  let intents: jest.Mocked<Pick<ArticleBlockUploadIntentsRepository,
    'countAssociated' | 'countNotMatured' | 'countByStatus' | 'findReconciliationPage' | 'findCurrentStatuses'>>;
  let references: jest.Mocked<Pick<ManagedImageReferencesRepository, 'getReferencedUrls'>>;
  let storage: jest.Mocked<Pick<StorageService, 'inspectManagedUpload' | 'deleteManagedUpload'>>;
  let service: PresignedUploadReconciliationService;

  beforeEach(() => {
    intents = {
      countAssociated: jest.fn().mockResolvedValue(2),
      countNotMatured: jest.fn().mockResolvedValue(1),
      countByStatus: jest.fn().mockResolvedValue(1),
      findReconciliationPage: jest.fn().mockResolvedValueOnce([mature]).mockResolvedValueOnce([]),
      findCurrentStatuses: jest.fn().mockResolvedValue([{ id: mature.id, status: mature.status, objectEtag: mature.objectEtag }]),
    } as never;
    references = { getReferencedUrls: jest.fn().mockResolvedValue(new Set<string>()) } as never;
    storage = {
      inspectManagedUpload: jest.fn().mockResolvedValue({ exists: true, size: 12, contentType: 'image/webp', etag: 'etag-1' }),
      deleteManagedUpload: jest.fn(),
    } as never;
    service = new PresignedUploadReconciliationService(intents as never, references as never, storage as never);
  });

  it('classifies a mature existing unreferenced object as potentially orphaned without deleting it', async () => {
    const report = await service.diagnose({ now, graceMinutes: 60 });
    expect(report).toMatchObject({
      attemptsAnalyzed: 1, associatedAttempts: 2, expiredUnassociatedAttempts: 1,
      notMaturedAttempts: 1, signingFailedAttempts: 1, objectsPresent: 1,
      potentiallyOrphanedObjects: 1, objectsWithReferences: 0, queryFailures: 0,
    });
    expect(intents.findReconciliationPage).toHaveBeenNthCalledWith(1, {
      safeThrough: new Date('2026-10-31T11:00:00.000Z'), take: 50, afterId: undefined,
    });
    expect(storage.deleteManagedUpload).not.toHaveBeenCalled();
  });

  it('distinguishes associated objects that are still referenced', async () => {
    const associated = { ...mature, status: PresignedUploadIntentStatus.ASSOCIATED, objectEtag: 'etag-1' };
    intents.findReconciliationPage.mockReset().mockResolvedValueOnce([associated] as never).mockResolvedValueOnce([]);
    intents.findCurrentStatuses.mockResolvedValueOnce([{ id: associated.id, status: associated.status, objectEtag: associated.objectEtag }] as never);
    references.getReferencedUrls.mockResolvedValueOnce(new Set([mature.publicUrl]));
    const report = await service.diagnose({ now, graceMinutes: 0 });
    expect(report).toMatchObject({ associatedAttempts: 2, objectsPresent: 1, objectsWithReferences: 1, potentiallyOrphanedObjects: 0 });
    expect(storage.deleteManagedUpload).not.toHaveBeenCalled();
  });

  it('does not classify an associated but currently unreferenced object as abandoned', async () => {
    const associated = { ...mature, status: PresignedUploadIntentStatus.ASSOCIATED, objectEtag: 'etag-1' };
    intents.findReconciliationPage.mockReset().mockResolvedValueOnce([associated] as never).mockResolvedValueOnce([]);
    intents.findCurrentStatuses.mockResolvedValueOnce([{ id: associated.id, status: associated.status, objectEtag: associated.objectEtag }] as never);
    const report = await service.diagnose({ now, graceMinutes: 0 });
    expect(report).toMatchObject({ objectsPresent: 1, objectsWithReferences: 0, potentiallyOrphanedObjects: 0, indeterminateObjects: 1 });
    expect(storage.deleteManagedUpload).not.toHaveBeenCalled();
  });

  it('rechecks lifecycle status after R2 inspection before labeling a candidate', async () => {
    intents.findCurrentStatuses.mockResolvedValueOnce([{
      id: mature.id,
      status: PresignedUploadIntentStatus.ASSOCIATED,
      objectEtag: 'etag-1',
    }] as never);
    const report = await service.diagnose({ now, graceMinutes: 0 });
    expect(report).toMatchObject({ potentiallyOrphanedObjects: 0, indeterminateObjects: 1 });
    expect(intents.findCurrentStatuses).toHaveBeenCalledWith([mature.id]);
  });

  it('reports confirmed missing objects separately from errors and preserves ETag changes as indeterminate', async () => {
    const missing = { ...mature, id: 'missing', publicUrl: 'https://cdn.example.test/missing', objectKey: 'articles/a/blocks/b/2-aabbccdd.webp' };
    const failed = { ...mature, id: 'failed', publicUrl: 'https://cdn.example.test/failed', objectKey: 'articles/a/blocks/b/3-aabbccdd.webp' };
    const changed = { ...mature, id: 'changed', status: PresignedUploadIntentStatus.ASSOCIATED, objectEtag: 'old-etag', publicUrl: 'https://cdn.example.test/changed', objectKey: 'articles/a/blocks/b/4-aabbccdd.webp' };
    intents.findReconciliationPage.mockReset().mockResolvedValueOnce([missing, failed, changed] as never).mockResolvedValueOnce([]);
    intents.findCurrentStatuses.mockResolvedValueOnce([
      { id: missing.id, status: missing.status, objectEtag: null },
      { id: failed.id, status: failed.status, objectEtag: null },
      { id: changed.id, status: changed.status, objectEtag: changed.objectEtag },
    ] as never);
    storage.inspectManagedUpload.mockResolvedValueOnce({ exists: false } as never)
      .mockRejectedValueOnce(new Error('network failure'))
      .mockResolvedValueOnce({ exists: true, size: 12, contentType: 'image/webp', etag: 'new-etag' } as never);
    const report = await service.diagnose({ now, graceMinutes: 0 });
    expect(report).toMatchObject({ attemptsAnalyzed: 3, objectsMissing: 1, indeterminateObjects: 2, queryFailures: 1, changedSinceAssociation: 1 });
    expect(storage.deleteManagedUpload).not.toHaveBeenCalled();
  });

  it('treats a failed reference query as unknown rather than as an orphan', async () => {
    references.getReferencedUrls.mockRejectedValueOnce(new Error('database unavailable'));
    const report = await service.diagnose({ now, graceMinutes: 0 });
    expect(report).toMatchObject({ objectsPresent: 1, potentiallyOrphanedObjects: 0, indeterminateObjects: 1, queryFailures: 1 });
    expect(storage.deleteManagedUpload).not.toHaveBeenCalled();
  });

  it('rejects invalid grace settings', async () => {
    await expect(service.diagnose({ graceMinutes: -1 })).rejects.toThrow('non-negative');
    await expect(service.diagnose({ graceMinutes: Number.NaN })).rejects.toThrow('non-negative');
  });
});
