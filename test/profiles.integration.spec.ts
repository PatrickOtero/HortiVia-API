import { randomUUID } from 'crypto';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { ProfileController } from '../src/modules/profile/profile.controller';
import { ProfileService } from '../src/modules/profile/profile.service';
import { ProfileRepository } from '../src/modules/profile/profile.repository';
import { StorageService } from '../src/modules/storage/storage.service';
import { UsersController } from '../src/modules/users/users.controller';
import { UsersService } from '../src/modules/users/users.service';
import { UsersRepository } from '../src/modules/users/users.repository';
import { TrainingService } from '../src/modules/training/training.service';
import { TrainingController } from '../src/modules/training/training.controller';
import { ArticlesRepository } from '../src/modules/articles/articles.repository';
import { toArticleCommentListItemResponse, toArticleListItemResponse } from '../src/modules/articles/mappers/article-response.mapper';

const databaseUrl = process.env.TRAINING_TEST_DATABASE_URL;
if (process.env.CI === 'true' && !databaseUrl) throw new Error('TRAINING_TEST_DATABASE_URL is required in CI.');
const integration = databaseUrl ? describe : describe.skip;

integration('Profiles, badges and ranking with isolated PostgreSQL', () => {
  const execution = randomUUID();
  const userIds: string[] = [], productIds: string[] = [], articleIds: string[] = [];
  let prisma: PrismaClient, app: INestApplication, base: string;
  let owner: string, other: string;
  let ownerToken: string, otherToken: string, adminToken: string;
  const secret = 'local-profile-integration-only';

  async function call(path: string, token?: string, method = 'GET', body?: unknown) {
    const response = await fetch(base + path, { method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  }

  beforeAll(async () => {
    const target = new URL(databaseUrl!);
    if (!['127.0.0.1', 'localhost'].includes(target.hostname) || !target.pathname.startsWith('/hortivia_training_test')) {
      throw new Error('Use a local, explicitly named hortivia_training_test database.');
    }
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
    const module = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({ secret })],
      controllers: [ProfileController, UsersController, TrainingController],
      providers: [ProfileService, ProfileRepository, UsersService, UsersRepository, TrainingService,
        JwtStrategy, JwtAuthGuard, RolesGuard,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { getOrThrow: () => secret } },
        { provide: StorageService, useValue: { uploadAvatar: jest.fn() } }],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
    const users = [];
    for (const [index, role] of ['USER', 'USER', 'ADMIN'].entries()) {
      const user = await prisma.user.create({ data: {
        name: `Perfil QA ${index}`, email: `${execution}-${index}@example.invalid`, passwordHash: 'local-test-only',
        role: role as 'USER' | 'ADMIN', emailVerified: true,
        store: 'Loja QA', jobTitle: 'Repositor', phone: '11999999999', city: 'Recife', state: 'PE',
      } });
      userIds.push(user.id); users.push(user);
    }
    [owner, other] = users.map(user => user.id);
    [ownerToken, otherToken, adminToken] = users.map(user => module.get(JwtService).sign({ sub: user.id, email: user.email, role: user.role }));
    for (const active of [true, false]) {
      const product = await prisma.product.create({ data: { name: 'Produto QA perfil', slug: `profile-${execution}-${active}`,
        isActive: active, category: 'FRUIT', shortDescription: 'Fixture local', benefits: [], howToChoose: [], howToStore: [], usageTips: [] } });
      productIds.push(product.id);
    }
  }, 30000);

  afterAll(async () => {
    await app?.close();
    try {
      await prisma?.article.deleteMany({ where: { id: { in: articleIds } } });
      await prisma?.product.deleteMany({ where: { id: { in: productIds } } });
      await prisma?.user.deleteMany({ where: { id: { in: userIds } } });
      expect(await prisma?.user.count({ where: { id: { in: userIds } } })).toBe(0);
      expect(await prisma?.product.count({ where: { id: { in: productIds } } })).toBe(0);
    } finally { await prisma?.$disconnect(); }
  });

  it('enforces privacy for authenticated visitors, owners and administrators', async () => {
    expect((await call(`/profile/${owner}`)).status).toBe(401);
    const visitor = await call(`/profile/${owner}`, otherToken);
    expect(visitor.status).toBe(200);
    expect(visitor.body).toMatchObject({ store: 'Loja QA', jobTitle: 'Repositor', specialBadge: null });
    for (const field of ['email', 'phone', 'city', 'state', 'passwordHash', 'emailConfirmationCodeHash', 'role']) {
      expect(visitor.body).not.toHaveProperty(field);
    }
    for (const token of [ownerToken, adminToken]) {
      const profile = await call(`/profile/${owner}`, token);
      expect(profile.body).toMatchObject({ phone: '11999999999', city: 'Recife', state: 'PE' });
      expect(profile.body.email).toContain('@example.invalid');
      expect(profile.body).not.toHaveProperty('passwordHash');
    }
    expect((await call(`/profile/${randomUUID()}`, ownerToken)).status).toBe(404);
  });

  it('updates and clears allowed optional fields; rejects invalid contacts and privilege fields', async () => {
    const updated = await call('/profile', ownerToken, 'PATCH', { store: ' Loja B ', jobTitle: ' Especialista em frutas ', phone: '', city: 'Olinda', state: ' pe ' });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ store: 'Loja B', jobTitle: 'Especialista em frutas', phone: null, city: 'Olinda', state: 'PE', role: 'USER', specialBadge: null });
    expect((await call('/profile', ownerToken, 'PATCH', { phone: 'not a phone' })).status).toBe(400);
    expect((await call('/profile', ownerToken, 'PATCH', { state: 'Pernambuco' })).status).toBe(400);
    expect((await call('/profile', ownerToken, 'PATCH', { specialBadge: 'FOUNDER' })).status).toBe(400);
    expect((await call('/profile', adminToken, 'PATCH', { specialBadge: 'FOUNDER' })).status).toBe(400);
    expect((await call('/profile', ownerToken, 'PATCH', { role: 'ADMIN' })).status).toBe(400);
    expect((await call('/profile', ownerToken, 'PATCH', { store: null, jobTitle: null, city: null, state: null })).status).toBe(200);
  });

  it('allows only admins to assign all three badges or remove one, without changing roles', async () => {
    expect((await call(`/users/${owner}`, ownerToken, 'PATCH', { specialBadge: 'FOUNDER' })).status).toBe(403);
    expect((await call(`/users/${owner}`, otherToken, 'PATCH', { specialBadge: null })).status).toBe(403);
    expect((await call(`/users/${owner}`, adminToken, 'PATCH', { specialBadge: 'INVALID' })).status).toBe(400);
    for (const specialBadge of ['FOUNDER', 'CO_FOUNDER', 'SPECIALIST', null]) {
      const changed = await call(`/users/${owner}`, adminToken, 'PATCH', { specialBadge });
      expect(changed.status).toBe(200);
      expect(changed.body).toMatchObject({ specialBadge, role: 'USER' });
      expect((await call(`/profile/${owner}`, otherToken)).body.specialBadge).toBe(specialBadge);
    }
  });

  it('uses current versions and latest attempts; filters drafts/inactive products and gives badges no ranking advantage', async () => {
    const questions: { id: string; version: number }[] = [];
    for (let i = 0; i < 5; i++) {
      questions.push(await prisma.trainingQuestion.create({ data: { productId: productIds[i === 4 ? 1 : 0],
        prompt: `Pergunta QA ${i}`, options: ['A', 'B', 'C'], correctOptionIndex: 0, explanation: 'Fixture',
        sourceReference: 'Guia de teste local', isPublished: i !== 3, version: i === 1 ? 2 : 1 } }));
    }
    const answer = async (userId: string, index: number, isCorrect: boolean, version = questions[index].version) => {
      await prisma.trainingAttempt.create({ data: { userId, questionId: questions[index].id,
        questionVersion: version, selectedOptionIndex: isCorrect ? 0 : 1, isCorrect,
        correctOptionIndex: 0, explanation: 'Fixture', submissionKey: randomUUID() } });
    };
    await answer(owner, 0, true); await answer(owner, 0, false);
    await answer(owner, 1, true, 1);
    await answer(owner, 2, true); await answer(owner, 2, true);
    await answer(owner, 3, true); await answer(owner, 4, true);
    await answer(other, 0, true);
    const progress = (await call('/training/progress', ownerToken)).body;
    expect(progress.products.find((entry: { product: { id: string } }) => entry.product.id === productIds[0]).progress)
      .toEqual({ total: 3, answered: 2, correct: 1, percent: 33 });
    expect(progress.products.some((entry: { product: { id: string } }) => entry.product.id === productIds[1])).toBe(false);
    const initial = (await call('/training/ranking', ownerToken)).body;
    expect(initial.currentUser.progress.correct).toBe(1);
    const tied = (await call('/training/ranking', otherToken)).body.currentUser;
    expect(initial.currentUser.position).toBe(tied.position);
    expect(initial.top.length).toBeLessThanOrEqual(10);
    expect(initial.currentUser.user).not.toHaveProperty('email');
    expect(initial.currentUser.user).not.toHaveProperty('phone');
    await call(`/users/${owner}`, adminToken, 'PATCH', { specialBadge: 'FOUNDER' });
    const after = (await call('/training/ranking', ownerToken)).body;
    expect(after.currentUser).toMatchObject({ position: initial.currentUser.position, progress: initial.currentUser.progress, user: { specialBadge: 'FOUNDER' } });
    const profile = (await call(`/profile/${owner}`, otherToken)).body;
    expect(profile.learning.summary).toEqual(progress.summary);
    expect(profile.learning.position).toBe(after.currentUser.position);
  });

  it('projects photos and badges into articles/comments without exposing private user data', async () => {
    await prisma.user.update({ where: { id: owner }, data: { avatarUrl: 'https://example.invalid/avatar.jpg', specialBadge: 'SPECIALIST' } });
    const article = await prisma.article.create({ data: { title: 'QA article', slug: `profile-${execution}`, summary: 'QA', content: 'QA',
      category: 'TIPS', authorId: owner, isPublished: true, tags: [] } });
    articleIds.push(article.id);
    await prisma.articleComment.create({ data: { articleId: article.id, userId: owner, body: 'Comentário QA' } });
    const repository = new ArticlesRepository(prisma as unknown as PrismaService);
    const comments = await repository.listVisibleCommentsByArticle({ articleId: article.id, skip: 0, take: 10 });
    const comment = toArticleCommentListItemResponse(comments[0]);
    const record = await repository.findById(article.id);
    const author = toArticleListItemResponse(record!, 1).author;
    for (const identity of [comment.author, author]) {
      expect(identity).toEqual({ id: owner, name: 'Perfil QA 0', avatarUrl: 'https://example.invalid/avatar.jpg', specialBadge: 'SPECIALIST' });
      expect(identity).not.toHaveProperty('email');
    }
  });
});
