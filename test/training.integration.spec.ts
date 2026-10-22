import { randomUUID } from 'crypto';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { AdminTrainingController, TrainingController } from '../src/modules/training/training.controller';
import { TrainingService } from '../src/modules/training/training.service';

const databaseUrl = process.env.TRAINING_TEST_DATABASE_URL;
if (process.env.CI === 'true' && !databaseUrl) {
  throw new Error('TRAINING_TEST_DATABASE_URL is required in CI; PostgreSQL integration tests cannot be skipped.');
}
const integration = databaseUrl ? describe : describe.skip;
const form = { prompt: 'Como escolher este produto?', options: ['Firme', 'Amassado', 'Sem observar'],
  correctOptionIndex: 0, explanation: 'O guia recomenda observar a firmeza.', sourceReference: 'Guia local de teste', sortOrder: 0, isPublished: true };
type Question = typeof form & { id: string; version: number; isDemo: boolean };
type Training = { product: { id: string }; questions: { id: string; version: number }[];
  progress: { total: number; answered: number; correct: number } };

integration('Training HTTP + PostgreSQL (isolated database required)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let base: string;
  let productId: string;
  let userId: string;
  let otherUserId: string;
  let adminToken: string;
  let userToken: string;
  let otherToken: string;
  const executionId = randomUUID();
  const createdUserIds: string[] = [];

  async function call<T = Record<string, unknown>>(path: string, token?: string, method = 'GET', body?: unknown) {
    const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: await response.json() as T };
  }
  const adminPath = () => `/admin/training/products/${productId}/questions`;
  async function create(patch = {}) {
    const result = await call<Question>(adminPath(), adminToken, 'POST', { ...form, ...patch });
    expect(result.status).toBe(201);
    return result.body;
  }
  const answer = (question: { id: string; version: number }, selectedOptionIndex = 0, submissionKey = randomUUID(), token?: string) =>
    call(`/training/questions/${question.id}/answers`, token ?? userToken, 'POST', { selectedOptionIndex, version: question.version, submissionKey });

  beforeAll(async () => {
    const target = new URL(databaseUrl!);
    if (!['localhost', '127.0.0.1'].includes(target.hostname) || !target.pathname.startsWith('/hortivia_training_test')) {
      throw new Error('Integration tests require a local, explicitly named hortivia_training_test database.');
    }
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
    const module = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({ secret: 'local-training-integration-only' })],
      controllers: [TrainingController, AdminTrainingController],
      providers: [TrainingService, JwtAuthGuard, RolesGuard, JwtStrategy,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { getOrThrow: () => 'local-training-integration-only' } }],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true,
      transformOptions: { enableImplicitConversion: true } }));
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
    const jwt = module.get(JwtService);
    const users = [];
    for (const [i, role] of ['USER', 'USER', 'ADMIN'].entries()) {
      const user = await prisma.user.create({
        data: { name: `Treinamento ${i}`, email: `training-test-${executionId}-${i}@example.invalid`, passwordHash: 'not-a-real-credential',
          role: role as 'USER' | 'ADMIN', emailVerified: true },
      });
      createdUserIds.push(user.id);
      users.push(user);
    }
    [userId, otherUserId] = users.map(u => u.id);
    [userToken, otherToken, adminToken] = users.map(u => jwt.sign({ sub: u.id, email: u.email, role: u.role }));
    const product = await prisma.product.create({ data: { name: 'Produto de integração', slug: `training-test-${executionId}`,
      category: 'FRUIT', shortDescription: 'Somente banco local isolado', benefits: [], howToChoose: [], howToStore: [], usageTips: [] } });
    productId = product.id;
  }, 30000);

  beforeEach(async () => { await prisma.trainingQuestion.deleteMany({ where: { productId } }); });
  afterAll(async () => {
    const cleanupErrors: string[] = [];
    try {
      await app?.close();
    } catch (error) {
      cleanupErrors.push(`Could not close integration app: ${String(error)}`);
    }
    if (productId) {
      try {
        await prisma?.product.deleteMany({ where: { id: productId } });
        if (await prisma?.product.count({ where: { id: productId } })) {
          cleanupErrors.push('A fixture product created by this execution was not removed.');
        }
      } catch (error) {
        cleanupErrors.push(`Could not remove integration product: ${String(error)}`);
      }
    }
    if (createdUserIds.length) {
      try {
        await prisma?.user.deleteMany({ where: { id: { in: createdUserIds } } });
        if (await prisma?.user.count({ where: { id: { in: createdUserIds } } })) {
          cleanupErrors.push('A fixture user created by this execution was not removed.');
        }
      } catch (error) {
        cleanupErrors.push(`Could not remove integration users: ${String(error)}`);
      }
    }
    try {
      await prisma?.$disconnect();
    } catch (error) {
      cleanupErrors.push(`Could not disconnect the integration database: ${String(error)}`);
    }
    if (cleanupErrors.length) throw new Error(cleanupErrors.join('\n'));
  });

  it('requires authentication and rejects common users on every admin method', async () => {
    expect((await call(`/training/products/${productId}`)).status).toBe(401);
    expect((await call('/training/progress')).status).toBe(401);
    for (const method of ['GET', 'POST', 'PATCH']) {
      const path = adminPath() + (method === 'PATCH' ? '/unknown' : '');
      expect((await call(path, userToken, method, method === 'GET' ? undefined : form)).status).toBe(403);
    }
    const q = await create();
    expect((await call(`/training/questions/${q.id}/answers`, undefined, 'POST', {})).status).toBe(401);
  });
  it('creates and edits through the protected admin endpoints, with version conflict protection', async () => {
    const q = await create();
    const edit = await call<Question>(`${adminPath()}/${q.id}`, adminToken, 'PATCH', { ...form, prompt: 'Pergunta revisada no guia?', version: q.version });
    expect(edit.status).toBe(200);
    expect(edit.body.version).toBe(2);
    expect((await call(`${adminPath()}/${q.id}`, adminToken, 'PATCH', { ...form, version: q.version })).status).toBe(409);
  });
  it('rejects an out-of-range key, duplicates, blank options and implicit string publication', async () => {
    for (const patch of [{ correctOptionIndex: 3 }, { options: ['A', 'a', 'B'] }, { options: ['A', '', 'B'] }, { isPublished: 'false' }]) {
      expect((await call(adminPath(), adminToken, 'POST', { ...form, ...patch })).status).toBe(400);
    }
  });
  it.each([undefined, null, '', ' \n\t ', 123, ['Guia'], 'x'.repeat(2001)])(
    'rejects creating and publishing without a valid source: %j', async sourceReference => {
      const result = await call(adminPath(), adminToken, 'POST', { ...form, sourceReference });
      expect(result.status).toBe(400);
      expect(await prisma.trainingQuestion.count({ where: { productId } })).toBe(0);
    },
  );
  it.each([undefined, null, '', ' \n\t ', 123, 'x'.repeat(2001)])(
    'rejects editing and publishing without a valid source: %j', async sourceReference => {
      const q = await create({ isPublished: false, sourceReference: '' });
      const before = await prisma.trainingQuestion.findUniqueOrThrow({ where: { id: q.id } });
      expect((await call(`${adminPath()}/${q.id}`, adminToken, 'PATCH', { ...form, sourceReference, version: q.version })).status).toBe(400);
      expect(await prisma.trainingQuestion.findUnique({ where: { id: q.id } })).toEqual(before);
    },
  );
  it('creates and edits a published question with a validated, trimmed reference', async () => {
    const q = await create({ sourceReference: '  Guia: como escolher  ' });
    expect(q.sourceReference).toBe('Guia: como escolher');
    const edit = await call<Question>(`${adminPath()}/${q.id}`, adminToken, 'PATCH', { ...form, sourceReference: '  Guia: como conservar  ', version: q.version });
    expect(edit.status).toBe(200); expect(edit.body.isPublished).toBe(true);
    expect(edit.body.sourceReference).toBe('Guia: como conservar');
  });
  it('creates and edits drafts without requiring a source', async () => {
    const q = await create({ isPublished: false, sourceReference: undefined });
    expect(q.sourceReference).toBeNull();
    const edit = await call<Question>(`${adminPath()}/${q.id}`, adminToken, 'PATCH', { ...form, isPublished: false, sourceReference: ' \n\t ', version: q.version });
    expect(edit.status).toBe(200); expect(edit.body.sourceReference).toBeNull();
    expect(edit.body.isPublished).toBe(false);
  });
  it('does not expose answer keys, explanations, attempts or source citations before answering', async () => {
    await create();
    const result = await call<Training>(`/training/products/${productId}`, userToken);
    expect(result.body.questions).toHaveLength(1);
    const json = JSON.stringify(result.body);
    ['correctOptionIndex', 'explanation', 'sourceReference', 'attempts', 'isCorrect'].forEach(key => expect(json).not.toContain(key));
  });
  it('grades on the server, persists attempts and exposes feedback only after submission', async () => {
    const q = await create();
    const reply = await answer(q, 1);
    expect(reply.body).toMatchObject({ isCorrect: false, correctOptionIndex: 0, explanation: form.explanation });
    expect(await prisma.trainingAttempt.count({ where: { userId, questionId: q.id } })).toBe(1);
    expect((await call(`/training/questions/${q.id}/answers`, userToken, 'POST', {
      selectedOptionIndex: 0, version: 1, submissionKey: randomUUID(), isCorrect: true,
    })).status).toBe(400);
  });
  it('isolates progress by user and uses the most recent answer when repeating', async () => {
    const q = await create();
    await answer(q, 0);
    expect((await call<Training>(`/training/products/${productId}`, userToken)).body.progress.correct).toBe(1);
    expect((await call<Training>(`/training/products/${productId}`, otherToken)).body.progress.answered).toBe(0);
    await answer(q, 1);
    const own = (await call<Training>(`/training/products/${productId}`, userToken)).body.progress;
    expect(own).toMatchObject({ total: 1, answered: 1, correct: 0 });
    expect(await prisma.trainingAttempt.count({ where: { userId, questionId: q.id } })).toBe(2);
    expect(await prisma.trainingAttempt.count({ where: { userId: otherUserId, questionId: q.id } })).toBe(0);
    const summary = await call<{ products: { product: { id: string }; progress: { correct: number } }[] }>('/training/progress', userToken);
    expect(summary.body.products.find(p => p.product.id === productId)?.progress.correct).toBe(0);
  });
  it('deduplicates simultaneous retries and rejects reuse for a different answer', async () => {
    const q = await create(), key = randomUUID();
    const [a, b] = await Promise.all([answer(q, 0, key), answer(q, 0, key)]);
    expect(a.status).toBe(201); expect(b.status).toBe(201);
    expect(a.body.attemptId).toBe(b.body.attemptId);
    expect(await prisma.trainingAttempt.count({ where: { userId, questionId: q.id } })).toBe(1);
    expect((await answer(q, 1, key)).status).toBe(409);
  });
  it('rejects inactive questions and products without recording attempts', async () => {
    const q = await create({ isPublished: false });
    expect((await answer(q)).status).toBe(404);
    expect((await call<Training>(`/training/products/${productId}`, userToken)).body.questions).toHaveLength(0);
    expect(await prisma.trainingAttempt.count({ where: { questionId: q.id } })).toBe(0);
  });
  it('rejects an inactive product and invalid selection on a published question', async () => {
    const q = await create();
    expect((await answer(q, 3)).status).toBe(400);
    await prisma.product.update({ where: { id: productId }, data: { isActive: false } });
    try { expect((await answer(q)).status).toBe(404); }
    finally { await prisma.product.update({ where: { id: productId }, data: { isActive: true } }); }
  });
  it('invalidates old progress after an educational revision and refuses stale submissions', async () => {
    const q = await create(); await answer(q);
    const updated = await call<Question>(`${adminPath()}/${q.id}`, adminToken, 'PATCH', { ...form, explanation: 'Nova explicação revisada.', version: q.version });
    expect(updated.body.version).toBe(2);
    expect((await answer(q)).status).toBe(409);
    expect((await call<Training>(`/training/products/${productId}`, userToken)).body.progress.answered).toBe(0);
  });
  it('enforces migration CHECK constraints at database level', async () => {
    await expect(prisma.trainingQuestion.create({ data: { productId, ...form, options: ['Só uma'] } })).rejects.toThrow();
  });
});
