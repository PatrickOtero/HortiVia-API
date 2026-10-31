import { randomUUID } from 'crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { ArticleBlockKind, ArticleCategory, PresignedUploadIntentStatus, PresignedUploadResourceType, UserRole } from '../src/generated/prisma/enums';
import type { Prisma } from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { ArticleBlockUploadIntentsRepository } from '../src/modules/articles/article-block-upload-intents.repository';

const databaseUrl = process.env.TRAINING_TEST_DATABASE_URL;
if (process.env.CI === 'true' && !databaseUrl) {
  throw new Error('TRAINING_TEST_DATABASE_URL is required in CI; presigned-upload PostgreSQL integration tests cannot be skipped.');
}
const integration = databaseUrl ? describe : describe.skip;

integration('Pre-signed upload association with isolated PostgreSQL', () => {
  const executionId = randomUUID();
  const userIds: string[] = [];
  const articleIds: string[] = [];
  const blockIds: string[] = [];
  const intentIds: string[] = [];
  let prisma: PrismaClient;
  let repository: ArticleBlockUploadIntentsRepository;
  let articleId: string;
  let blockId: string;
  let authorId: string;

  async function createIntent(id: string, urlName: string, createdAt?: Date) {
    const key = `articles/${articleId}/blocks/${blockId}/${urlName}-aabbccdd-image.webp`;
    const intent = await prisma.presignedUploadIntent.create({ data: {
      objectKey: key,
      publicUrl: `https://cdn.example.invalid/${key}`,
      resourceType: PresignedUploadResourceType.ARTICLE_BLOCK_IMAGE,
      articleId,
      blockId,
      requestedByUserId: authorId,
      contentType: 'image/webp',
      declaredSize: 123,
      ...(createdAt ? { createdAt } : {}),
      expiresAt: new Date(Date.now() + 15 * 60_000),
      id,
    } });
    intentIds.push(intent.id);
    return intent;
  }

  const associationData = (imageUrl: string, imageAlt = 'Alt de teste', imageCaption = 'Legenda de teste'): Prisma.ArticleBlockUpdateInput => ({
    imageUrl, imageAlt, imageCaption,
  });

  const associate = (intent: Awaited<ReturnType<typeof createIntent>>, data = associationData(intent.publicUrl), objectEtag = 'etag') =>
    repository.associateBlockImage({
      intentId: intent.id, articleId, blockId, publicUrl: intent.publicUrl, objectEtag, data,
    });

  beforeAll(async () => {
    const target = new URL(databaseUrl!);
    if (!['localhost', '127.0.0.1'].includes(target.hostname) || !target.pathname.startsWith('/hortivia_training_test')) {
      throw new Error('Pre-signed upload integration tests require a local, explicitly named hortivia_training_test database.');
    }
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
    repository = new ArticleBlockUploadIntentsRepository(prisma as unknown as PrismaService);
    const user = await prisma.user.create({ data: {
      name: 'Upload QA', email: `presigned-${executionId}@example.invalid`, passwordHash: 'local-test-only',
      role: UserRole.ADMIN, emailVerified: true,
    } });
    authorId = user.id;
    userIds.push(user.id);
    const article = await prisma.article.create({ data: {
      title: 'Upload de integração', slug: `presigned-${executionId}`, summary: 'Teste local', content: 'Conteúdo QA',
      category: ArticleCategory.TIPS, tags: [], authorId,
    } });
    articleId = article.id;
    articleIds.push(article.id);
    const block = await prisma.articleBlock.create({ data: { articleId, kind: ArticleBlockKind.IMAGE, sortOrder: 0 } });
    blockId = block.id;
    blockIds.push(block.id);
  }, 30000);

  afterAll(async () => {
    if (!prisma) return;
    try {
      await prisma.presignedUploadIntent.deleteMany({ where: { id: { in: intentIds } } });
      await prisma.articleBlock.deleteMany({ where: { id: { in: blockIds } } });
      await prisma.article.deleteMany({ where: { id: { in: articleIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    } finally {
      await prisma.$disconnect();
    }
  });

  it('persists the block URL and ASSOCIATED status atomically, and allows only an idempotent retry', async () => {
    const intent = await createIntent('intent-' + executionId, 'first');
    const params = {
      intentId: intent.id, articleId, blockId, publicUrl: intent.publicUrl, objectEtag: 'etag-1',
      data: associationData(intent.publicUrl),
    };
    await expect(repository.associateBlockImage(params)).resolves.toMatchObject({ kind: 'ASSOCIATED', block: { imageUrl: intent.publicUrl } });
    await expect(prisma.presignedUploadIntent.findUniqueOrThrow({ where: { id: intent.id } }))
      .resolves.toMatchObject({ status: PresignedUploadIntentStatus.ASSOCIATED, associatedAt: expect.any(Date), objectEtag: 'etag-1' });
    await expect(repository.associateBlockImage(params)).resolves.toMatchObject({ kind: 'ASSOCIATED', block: { imageUrl: intent.publicUrl } });
    expect(await prisma.articleBlock.findUniqueOrThrow({ where: { id: blockId } })).toMatchObject({ imageUrl: intent.publicUrl });
  });

  it('replaces image A with B and rejects a late retry of A without changing B or its metadata', async () => {
    const imageA = await createIntent('intent-' + executionId + '-replace-a', 'replace-a');
    const firstAssociation = await associate(imageA, associationData(imageA.publicUrl, 'Alt A', 'Legenda A'), 'etag-a');
    expect(firstAssociation.kind).toBe('ASSOCIATED');

    const imageB = await createIntent(
      'intent-' + executionId + '-replace-b',
      'replace-b',
      new Date(imageA.createdAt.getTime() + 1000),
    );
    expect((await associate(imageB, associationData(imageB.publicUrl, 'Alt B', 'Legenda B'), 'etag-b')).kind).toBe('ASSOCIATED');

    const lateRetry = await associate(imageA, associationData(imageA.publicUrl, 'Alt A atrasado', 'Legenda A atrasada'));
    expect(lateRetry).toEqual({ kind: 'CONFLICT' });
    expect(await prisma.articleBlock.findUniqueOrThrow({ where: { id: blockId } }))
      .toMatchObject({ imageUrl: imageB.publicUrl, imageAlt: 'Alt B', imageCaption: 'Legenda B' });
    const statuses = await prisma.presignedUploadIntent.findMany({
      where: { id: { in: [imageA.id, imageB.id] } },
      orderBy: { id: 'asc' },
      select: { id: true, status: true, objectEtag: true },
    });
    expect(statuses).toHaveLength(2);
    expect(statuses.every(status => status.status === PresignedUploadIntentStatus.ASSOCIATED)).toBe(true);
    expect(statuses.find(status => status.id === imageA.id)?.objectEtag).toBe('etag-a');
    expect(statuses.find(status => status.id === imageB.id)?.objectEtag).toBe('etag-b');
  });

  it('atomically conflicts when an idempotent A retry races with a completed B replacement', async () => {
    const imageA = await createIntent('intent-' + executionId + '-race-old-a', 'race-old-a');
    expect((await associate(imageA, associationData(imageA.publicUrl, 'Alt A', 'Legenda A'), 'etag-a')).kind).toBe('ASSOCIATED');
    const imageB = await createIntent(
      'intent-' + executionId + '-race-new-b',
      'race-new-b',
      new Date(imageA.createdAt.getTime() + 1000),
    );

    let notifyRead!: () => void;
    let continueOldUpdate!: () => void;
    const oldReadCompleted = new Promise<void>(resolve => { notifyRead = resolve; });
    const resumeOldUpdate = new Promise<void>(resolve => { continueOldUpdate = resolve; });
    const gatedPrisma = {
      $transaction: (callback: (transaction: unknown) => Promise<unknown>) => prisma.$transaction(async transaction => {
        const articleBlock = new Proxy(transaction.articleBlock, {
          get(target, property) {
            const value = Reflect.get(target, property, target);
            if (property === 'findUnique') {
              return async (args: { where?: { id?: string } }) => {
                const result = await value.call(target, args);
                if (args.where?.id === blockId) {
                  notifyRead();
                  await resumeOldUpdate;
                }
                return result;
              };
            }
            return typeof value === 'function' ? value.bind(target) : value;
          },
        });
        const transactionProxy = new Proxy(transaction, {
          get(target, property) {
            if (property === 'articleBlock') return articleBlock;
            const value = Reflect.get(target, property, target);
            return typeof value === 'function' ? value.bind(target) : value;
          },
        });
        return callback(transactionProxy);
      }),
    };
    const gatedRepository = new ArticleBlockUploadIntentsRepository(gatedPrisma as unknown as PrismaService);
    const oldRetry = gatedRepository.associateBlockImage({
      intentId: imageA.id,
      articleId,
      blockId,
      publicUrl: imageA.publicUrl,
      objectEtag: 'etag-a-retry',
      data: associationData(imageA.publicUrl, 'Alt A tardio', 'Legenda A tardia'),
    });

    try {
      await oldReadCompleted;
      expect((await associate(imageB, associationData(imageB.publicUrl, 'Alt B', 'Legenda B'), 'etag-b')).kind).toBe('ASSOCIATED');
    } finally {
      continueOldUpdate();
    }

    await expect(oldRetry).resolves.toEqual({ kind: 'CONFLICT' });
    expect(await prisma.articleBlock.findUniqueOrThrow({ where: { id: blockId } }))
      .toMatchObject({ imageUrl: imageB.publicUrl, imageAlt: 'Alt B', imageCaption: 'Legenda B' });
    const statuses = await prisma.presignedUploadIntent.findMany({
      where: { id: { in: [imageA.id, imageB.id] } },
      select: { id: true, status: true, objectEtag: true },
    });
    expect(statuses).toHaveLength(2);
    expect(statuses.every(status => status.status === PresignedUploadIntentStatus.ASSOCIATED)).toBe(true);
    expect(statuses.find(status => status.id === imageA.id)?.objectEtag).toBe('etag-a');
    expect(statuses.find(status => status.id === imageB.id)?.objectEtag).toBe('etag-b');
  }, 30000);

  it('rejects attempts scoped to another block or article without changing persisted state', async () => {
    const intent = await createIntent('intent-' + executionId + '-wrong-scope', 'wrong-scope');
    const result = await repository.associateBlockImage({
      intentId: intent.id, articleId: 'another-article', blockId, publicUrl: intent.publicUrl,
      objectEtag: null, data: associationData(intent.publicUrl),
    });
    expect(result).toEqual({ kind: 'NOT_FOUND' });
    expect(await prisma.presignedUploadIntent.findUniqueOrThrow({ where: { id: intent.id } })).toMatchObject({ status: PresignedUploadIntentStatus.PENDING });
  });

  it('allows only one competing attempt to replace the same prior block image', async () => {
    await prisma.articleBlock.update({ where: { id: blockId }, data: { imageUrl: null } });
    const [first, second] = await Promise.all([
      createIntent('intent-' + executionId + '-race-a', 'race-a'),
      createIntent('intent-' + executionId + '-race-b', 'race-b'),
    ]);
    const [a, b] = await Promise.all([first, second].map(intent => repository.associateBlockImage({
      intentId: intent.id, articleId, blockId, publicUrl: intent.publicUrl, objectEtag: 'etag', data: associationData(intent.publicUrl),
    })));
    expect([a.kind, b.kind].filter(kind => kind === 'ASSOCIATED')).toHaveLength(1);
    expect([a.kind, b.kind].filter(kind => kind === 'CONFLICT')).toHaveLength(1);
    const associated = await prisma.presignedUploadIntent.findMany({ where: { id: { in: [first.id, second.id] }, status: PresignedUploadIntentStatus.ASSOCIATED } });
    expect(associated).toHaveLength(1);
    expect(await prisma.articleBlock.findUniqueOrThrow({ where: { id: blockId } })).toMatchObject({ imageUrl: associated[0].publicUrl });
  });
});
