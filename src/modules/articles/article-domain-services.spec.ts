import { ArticleCommentsService } from './article-comments.service';
import { ArticleEngagementService } from './article-engagement.service';
import { ArticleBlocksService } from './article-blocks.service';
import { ArticleReactionType } from '../../generated/prisma/enums';
import type { ArticlesRepository } from './articles.repository';
import type { StorageService } from '../storage/storage.service';

describe('article domain services', () => {
  it('keeps comment pagination within the comments service', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({}),
      listVisibleCommentsByArticle: jest.fn().mockResolvedValue([]),
      countVisibleCommentsByArticle: jest.fn().mockResolvedValue(0),
    } as unknown as ArticlesRepository;
    const service = new ArticleCommentsService(repository);

    const result = await service.listComments('article-1', { page: 2, limit: 5 });

    expect(repository.listVisibleCommentsByArticle).toHaveBeenCalledWith({
      articleId: 'article-1',
      skip: 5,
      take: 5,
    });
    expect(result).toMatchObject({ items: [], page: 2, limit: 5, total: 0 });
  });

  it('keeps helpful reactions idempotent when concurrent inserts conflict', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({}),
      findReaction: jest.fn().mockResolvedValue(null),
      createReaction: jest.fn().mockRejectedValue({ code: 'P2002' }),
      countReactions: jest.fn().mockResolvedValue(3),
    } as unknown as ArticlesRepository;
    const service = new ArticleEngagementService(repository);

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
        kind: 'PARAGRAPH',
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
    const storage = {} as StorageService;
    const service = new ArticleBlocksService(repository, storage);

    await service.createBlock('article-1', {
      kind: 'PARAGRAPH' as never,
      title: '  Seção  ',
      body: '  Texto  ',
      items: [],
    });

    expect(repository.createBlock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Seção', body: 'Texto', sortOrder: 0 }),
    );
  });
});
