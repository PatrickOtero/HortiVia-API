import { ArticleCommentsService } from './article-comments.service';
import { ArticleEngagementService } from './article-engagement.service';
import { ArticleBlocksService } from './article-blocks.service';
import { ArticleBlockKind, ArticleCategory, ArticleReactionType } from '../../generated/prisma/enums';
import type { ArticlesRepository } from './articles.repository';
import type { StorageService } from '../storage/storage.service';
import { ArticleAccessService } from './article-access.service';
import { ArticleQueriesService } from './article-queries.service';
import { ArticleManagementService } from './article-management.service';
import { ArticleSlugService } from './article-slug.service';
import { ArticleImagesService } from './article-images.service';
import { ArticleBlockImagesService } from './article-block-images.service';
import { StorageUploadCompensationService } from '../storage/storage-upload-compensation.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { publicationForCreate, publicationForUpdate } from './utils/article-publication.util';

describe('article domain services', () => {
  it('keeps comment pagination within the comments service', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({}),
      listVisibleCommentsByArticle: jest.fn().mockResolvedValue([]),
      countVisibleCommentsByArticle: jest.fn().mockResolvedValue(0),
    } as unknown as ArticlesRepository;
    const service = new ArticleCommentsService(repository, new ArticleAccessService(repository));

    const result = await service.listComments('article-1', { page: 2, limit: 5 });

    expect(repository.listVisibleCommentsByArticle).toHaveBeenCalledWith({
      articleId: 'article-1',
      skip: 5,
      take: 5,
    });
    expect(result).toMatchObject({ items: [], page: 2, limit: 5, total: 0 });
  });

  it('rejects editing another user’s comment in the comments service', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({}),
      findCommentById: jest.fn().mockResolvedValue({
        articleId: 'article-1', userId: 'owner-1', status: 'VISIBLE',
      }),
      updateComment: jest.fn(),
    } as unknown as ArticlesRepository;
    const service = new ArticleCommentsService(repository, new ArticleAccessService(repository));

    await expect(service.updateComment('article-1', 'comment-1', { body: 'Editado' }, {
      userId: 'user-2', email: 'user@example.invalid', role: 'USER',
    })).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.updateComment).not.toHaveBeenCalled();
  });

  it('keeps helpful reactions idempotent when concurrent inserts conflict', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({}),
      findReaction: jest.fn().mockResolvedValue(null),
      createReaction: jest.fn().mockRejectedValue({ code: 'P2002' }),
      countReactions: jest.fn().mockResolvedValue(3),
    } as unknown as ArticlesRepository;
    const service = new ArticleEngagementService(repository, new ArticleAccessService(repository));

    const result = await service.reactToArticle('article-1', {
      userId: 'user-1',
      email: 'user@example.invalid',
      role: 'USER',
    });

    expect(repository.createReaction).toHaveBeenCalledWith(
      'user-1',
      'article-1',
      ArticleReactionType.HELPFUL,
    );
    expect(result).toMatchObject({ isReacted: true, reactionsCount: 3 });
  });

  it('normalizes block fields before persistence', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({}),
      createBlock: jest.fn().mockResolvedValue({
        id: 'block-1',
        articleId: 'article-1',
        kind: ArticleBlockKind.PARAGRAPH,
        title: 'Seção',
        body: 'Texto',
        imageUrl: null,
        imageAlt: null,
        imageCaption: null,
        items: [],
        sortOrder: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    } as unknown as ArticlesRepository;
    const service = new ArticleBlocksService(repository, new ArticleAccessService(repository), {} as ArticleBlockImagesService);

    await service.createBlock('article-1', {
      kind: ArticleBlockKind.PARAGRAPH,
      title: '  Seção  ',
      body: '  Texto  ',
      items: [],
    });

    expect(repository.createBlock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Seção', body: 'Texto', sortOrder: 0 }),
    );
  });

  it('routes a changed block image URL through the image association checks', async () => {
    const imageUrl = 'https://cdn.example.test/articles/article-1/blocks/block-1/image.webp';
    const repository = {
      findById: jest.fn().mockResolvedValue({ id: 'article-1' }),
      findBlockById: jest.fn().mockResolvedValue({
        id: 'block-1', articleId: 'article-1', imageUrl: null, imageAlt: 'Alt antigo', imageCaption: 'Legenda antiga',
      }),
    } as unknown as ArticlesRepository;
    const blockImages = { updateImage: jest.fn().mockResolvedValue({ id: 'block-1', imageUrl }) } as unknown as ArticleBlockImagesService;
    const service = new ArticleBlocksService(repository, new ArticleAccessService(repository), blockImages);

    await service.updateBlock('article-1', 'block-1', { imageUrl, title: 'Imagem atualizada' });

    expect(blockImages.updateImage).toHaveBeenCalledWith(
      'article-1',
      'block-1',
      { imageUrl, imageAlt: 'Alt antigo', imageCaption: 'Legenda antiga' },
      { title: 'Imagem atualizada' },
    );
  });

  it('builds public article filters and pagination in the query service', async () => {
    const repository = {
      findManyWithPagination: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      getReactionArticleIdsForUser: jest.fn(),
    } as unknown as ArticlesRepository;
    const access = new ArticleAccessService(repository);
    const service = new ArticleQueriesService(repository, access);

    const result = await service.list({ search: '  Banana  ', category: ArticleCategory.TIPS, page: 2, limit: 5 });

    expect(repository.findManyWithPagination).toHaveBeenCalledWith({
      where: {
        isPublished: true,
        OR: [
          { title: { contains: 'Banana', mode: 'insensitive' } },
          { summary: { contains: 'Banana', mode: 'insensitive' } },
        ],
        category: 'TIPS',
      },
      skip: 5,
      take: 5,
    });
    expect(result.meta).toMatchObject({ page: 2, limit: 5, total: 0 });
  });

  it('maps missing articles to the established not-found response', async () => {
    const repository = { findById: jest.fn().mockResolvedValue(null) } as unknown as ArticlesRepository;
    const service = new ArticleQueriesService(repository, new ArticleAccessService(repository));

    await expect(service.getById('missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.findById).toHaveBeenCalledWith('missing', false);
  });

  it('maps slug uniqueness races to the existing conflict response', async () => {
    const repository = {
      findBySlug: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockRejectedValue({ code: 'P2002' }),
    } as unknown as ArticlesRepository;
    const service = new ArticleManagementService(
      repository,
      new ArticleAccessService(repository),
      new ArticleSlugService(repository),
    );

    await expect(service.create({
      title: 'Título', summary: 'Resumo', content: 'Conteúdo', category: ArticleCategory.TIPS,
    }, { userId: 'admin', email: 'admin@example.invalid', role: 'ADMIN' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps a missing article during management update to the established not-found response', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({
        id: 'article-1', title: 'Old title', isPublished: false, publishedAt: null,
      }),
      findBySlug: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockRejectedValue({ code: 'P2025' }),
    } as unknown as ArticlesRepository;
    const service = new ArticleManagementService(
      repository,
      new ArticleAccessService(repository),
      new ArticleSlugService(repository),
    );

    await expect(service.update('article-1', { title: 'New title' }))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('generates the first free slug candidate without repeating collision checks', async () => {
    const repository = {
      findBySlug: jest.fn()
        .mockResolvedValueOnce({ id: 'existing-1' })
        .mockResolvedValueOnce({ id: 'existing-2' })
        .mockResolvedValueOnce(null),
    } as unknown as ArticlesRepository;
    const service = new ArticleSlugService(repository);

    await expect(service.generateUniqueSlug('Banana fresca')).resolves.toBe('banana-fresca-3');
    expect(repository.findBySlug).toHaveBeenNthCalledWith(1, 'banana-fresca');
    expect(repository.findBySlug).toHaveBeenNthCalledWith(2, 'banana-fresca-2');
    expect(repository.findBySlug).toHaveBeenNthCalledWith(3, 'banana-fresca-3');
  });

  it('preserves publication timestamps when updating without an explicit date', () => {
    const publishedAt = new Date('2026-01-01T00:00:00.000Z');
    expect(publicationForCreate({
      title: 'Título', summary: 'Resumo', content: 'Conteúdo', category: ArticleCategory.TIPS,
    })).toEqual({ isPublished: false, publishedAt: null });
    expect(publicationForUpdate({ isPublished: true, publishedAt }, { isPublished: true }))
      .toEqual({ isPublished: true, publishedAt });
    expect(publicationForUpdate({ isPublished: true, publishedAt }, { isPublished: false }))
      .toEqual({ isPublished: false, publishedAt: null });
  });

  it('validates the main image before calling storage', async () => {
    const repository = { findById: jest.fn().mockResolvedValue({}) } as unknown as ArticlesRepository;
    const storage = { uploadArticleImage: jest.fn() } as unknown as StorageService;
    const service = new ArticleImagesService(repository, new ArticleAccessService(repository), storage, { removeIfUnreferenced: jest.fn() } as unknown as StorageUploadCompensationService);

    await expect(service.uploadMainImage('article-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.uploadArticleImage).not.toHaveBeenCalled();
  });

  it('converts main-image storage failures to the existing internal error', async () => {
    const repository = { findById: jest.fn().mockResolvedValue({}) } as unknown as ArticlesRepository;
    const storage = {
      uploadArticleImage: jest.fn().mockRejectedValue(new Error('storage unavailable')),
    } as unknown as StorageService;
    const service = new ArticleImagesService(repository, new ArticleAccessService(repository), storage, { removeIfUnreferenced: jest.fn() } as unknown as StorageUploadCompensationService);

    await expect(service.uploadMainImage('article-1', {
      buffer: Buffer.from('image'), mimeType: 'image/png', size: 5,
    })).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('compensates a confirmed article-image persistence failure and preserves its cause', async () => {
    const persistenceError = new Error('article update failed');
    const repository = {
      findById: jest.fn().mockResolvedValue({ id: 'article-1' }),
      updateImageUrl: jest.fn().mockRejectedValue(persistenceError),
    } as unknown as ArticlesRepository;
    const uploaded = {
      url: 'https://cdn.example.test/articles/article-1/1716163200000-cover.webp',
      key: 'articles/article-1/1716163200000-cover.webp',
    };
    const storage = { uploadArticleImage: jest.fn().mockResolvedValue(uploaded) } as unknown as StorageService;
    const compensation = { removeIfUnreferenced: jest.fn().mockResolvedValue(true) } as unknown as StorageUploadCompensationService;
    const service = new ArticleImagesService(repository, new ArticleAccessService(repository), storage, compensation);
    await expect(service.uploadMainImage('article-1', {
      buffer: Buffer.from('image'), mimeType: 'image/webp', size: 10,
    })).rejects.toMatchObject({ status: 500, cause: persistenceError });
    expect(compensation.removeIfUnreferenced).toHaveBeenCalledWith(uploaded, {
      kind: 'article-main', articleId: 'article-1',
    });
  });

  it('rejects a block upload request with an unsafe file name before storage', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({}),
      findBlockById: jest.fn().mockResolvedValue({ id: 'block-1', articleId: 'article-1' }),
    } as unknown as ArticlesRepository;
    const storage = { createArticleBlockImageUploadUrl: jest.fn() } as unknown as StorageService;
    const uploadTracking = { createIntent: jest.fn() };
    const service = new ArticleBlockImagesService(repository, new ArticleAccessService(repository), storage, { removeIfUnreferenced: jest.fn() } as unknown as StorageUploadCompensationService, uploadTracking as never);

    await expect(service.createUploadUrl('article-1', 'block-1', {
      fileName: '../image.png', contentType: 'image/png', fileSize: 10,
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(uploadTracking.createIntent).not.toHaveBeenCalled();
  });

  it('maps pre-signed block-image storage failures to the established internal error', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({}),
      findBlockById: jest.fn().mockResolvedValue({ id: 'block-1', articleId: 'article-1' }),
    } as unknown as ArticlesRepository;
    const storage = {
      createArticleBlockImageUploadUrl: jest.fn().mockRejectedValue(new Error('storage unavailable')),
    } as unknown as StorageService;
    const uploadTracking = { createIntent: jest.fn().mockRejectedValue(new Error('storage unavailable')) };
    const service = new ArticleBlockImagesService(repository, new ArticleAccessService(repository), storage, { removeIfUnreferenced: jest.fn() } as unknown as StorageUploadCompensationService, uploadTracking as never);

    await expect(service.createUploadUrl('article-1', 'block-1', {
      fileName: 'image.png', contentType: 'image/png', fileSize: 10,
    })).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('compensates a block image only after a successful upload and failed persistence', async () => {
    const persistenceError = new Error('block update failed');
    const repository = {
      findById: jest.fn().mockResolvedValue({ id: 'article-1' }),
      findBlockById: jest.fn().mockResolvedValue({
        id: 'block-1', articleId: 'article-1', imageAlt: 'Anterior', imageCaption: 'Legenda',
      }),
      updateBlock: jest.fn().mockRejectedValue(persistenceError),
    } as unknown as ArticlesRepository;
    const uploaded = {
      url: 'https://cdn.example.test/articles/article-1/blocks/block-1/1716163200000-photo.webp',
      key: 'articles/article-1/blocks/block-1/1716163200000-photo.webp',
    };
    const storage = { uploadArticleBlockImage: jest.fn().mockResolvedValue(uploaded) } as unknown as StorageService;
    const compensation = { removeIfUnreferenced: jest.fn().mockResolvedValue(true) } as unknown as StorageUploadCompensationService;
    const service = new ArticleBlockImagesService(repository, new ArticleAccessService(repository), storage, compensation, { createIntent: jest.fn() } as never);
    await expect(service.uploadImage('article-1', 'block-1', {}, {
      buffer: Buffer.from('image'), mimeType: 'image/webp', size: 10,
    })).rejects.toMatchObject({ status: 500, cause: persistenceError });
    expect(compensation.removeIfUnreferenced).toHaveBeenCalledWith(uploaded, {
      kind: 'article-block', articleId: 'article-1', blockId: 'block-1',
    });
  });

  it('does not compensate when a block upload fails before returning an object key', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({ id: 'article-1' }),
      findBlockById: jest.fn().mockResolvedValue({ id: 'block-1', articleId: 'article-1' }),
    } as unknown as ArticlesRepository;
    const storage = { uploadArticleBlockImage: jest.fn().mockRejectedValue(new Error('R2 outcome unknown')) } as unknown as StorageService;
    const compensation = { removeIfUnreferenced: jest.fn() } as unknown as StorageUploadCompensationService;
    const service = new ArticleBlockImagesService(repository, new ArticleAccessService(repository), storage, compensation, { createIntent: jest.fn() } as never);
    await expect(service.uploadImage('article-1', 'block-1', {}, {
      buffer: Buffer.from('image'), mimeType: 'image/webp', size: 10,
    })).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(compensation.removeIfUnreferenced).not.toHaveBeenCalled();
  });

  it('keeps saved-article pagination in the engagement service', async () => {
    const repository = {
      listSavedArticlesByUser: jest.fn().mockResolvedValue([]),
      countSavedArticlesByUser: jest.fn().mockResolvedValue(7),
      getReactionArticleIdsForUser: jest.fn(),
    } as unknown as ArticlesRepository;
    const service = new ArticleEngagementService(repository, new ArticleAccessService(repository));

    const result = await service.listSavedArticles('user-1', { page: 2, limit: 3 });

    expect(repository.listSavedArticlesByUser).toHaveBeenCalledWith({ userId: 'user-1', skip: 3, take: 3 });
    expect(result).toMatchObject({ items: [], page: 2, limit: 3, total: 7, totalPages: 3 });
    expect(repository.getReactionArticleIdsForUser).not.toHaveBeenCalled();
  });
});
