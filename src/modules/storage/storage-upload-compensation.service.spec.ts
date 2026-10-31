import { Logger } from '@nestjs/common';
import { ManagedImageReferencesRepository } from './managed-image-references.repository';
import { StorageService } from './storage.service';
import { StorageUploadCompensationService } from './storage-upload-compensation.service';
import type { UploadResult } from './types/upload-result';

describe('StorageUploadCompensationService', () => {
  const upload: UploadResult = {
    url: 'https://cdn.example.test/products/product-1/1716163200000-a1b2c3d4.webp',
    key: 'products/product-1/1716163200000-a1b2c3d4.webp',
  };
  const scope = { kind: 'product-main' as const, productId: 'product-1' };
  let references: jest.Mocked<ManagedImageReferencesRepository>;
  let storage: jest.Mocked<StorageService>;
  let service: StorageUploadCompensationService;

  beforeEach(() => {
    references = { isReferenced: jest.fn() } as unknown as jest.Mocked<ManagedImageReferencesRepository>;
    storage = { deleteManagedUpload: jest.fn() } as unknown as jest.Mocked<StorageService>;
    service = new StorageUploadCompensationService(references, storage);
    references.isReferenced.mockResolvedValue(false);
    storage.deleteManagedUpload.mockResolvedValue(undefined);
  });

  it('deletes an uploaded object only after confirming no record references its exact URL', async () => {
    await expect(service.removeIfUnreferenced(upload, scope)).resolves.toBe(true);
    expect(references.isReferenced).toHaveBeenCalledWith(upload.url);
    expect(storage.deleteManagedUpload).toHaveBeenCalledWith(upload, scope);
  });

  it('does not delete an object that remains referenced after an ambiguous database result', async () => {
    references.isReferenced.mockResolvedValue(true);
    await expect(service.removeIfUnreferenced(upload, scope)).resolves.toBe(false);
    expect(storage.deleteManagedUpload).not.toHaveBeenCalled();
  });

  it('preserves an object when reference checking fails and logs without exposing URL or key', async () => {
    const loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    references.isReferenced.mockRejectedValue(new Error('database connection string must not be logged'));
    await expect(service.removeIfUnreferenced(upload, scope)).resolves.toBe(false);
    expect(storage.deleteManagedUpload).not.toHaveBeenCalled();
    expect(loggerError).toHaveBeenCalledWith(
      expect.stringContaining('R2 compensation failed'),
      'Error',
    );
    expect(loggerError.mock.calls.flat().join(' ')).not.toContain(upload.url);
    expect(loggerError.mock.calls.flat().join(' ')).not.toContain(upload.key);
    loggerError.mockRestore();
  });

  it('preserves the primary failure if the R2 deletion itself fails', async () => {
    const loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    storage.deleteManagedUpload.mockRejectedValue(new Error('R2 credentials must not be logged'));
    await expect(service.removeIfUnreferenced(upload, scope)).resolves.toBe(false);
    expect(loggerError).toHaveBeenCalledWith(expect.stringContaining('R2 compensation failed'), 'Error');
    loggerError.mockRestore();
  });
});
