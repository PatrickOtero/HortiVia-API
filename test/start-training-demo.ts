// Local fixture server for the mobile live integration test. Never loads .env.
import 'reflect-metadata';
import { writeFileSync } from 'fs';
import { randomBytes, randomUUID } from 'crypto';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { AdminTrainingController, TrainingController } from '../src/modules/training/training.controller';
import { TrainingService } from '../src/modules/training/training.service';

async function start() {
  const connectionString = process.env.TRAINING_TEST_DATABASE_URL;
  const fixtureFile = process.env.TRAINING_DEMO_FIXTURE_FILE;
  if (!connectionString || !fixtureFile) throw new Error('Set TRAINING_TEST_DATABASE_URL and TRAINING_DEMO_FIXTURE_FILE.');
  const target = new URL(connectionString);
  if (!['127.0.0.1', 'localhost'].includes(target.hostname) || !target.pathname.startsWith('/hortivia_training_test')) {
    throw new Error('Only a local hortivia_training_test database is permitted.');
  }
  const secret = randomBytes(32).toString('hex');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const module = await Test.createTestingModule({
    imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({ secret })],
    controllers: [TrainingController, AdminTrainingController],
    providers: [TrainingService, JwtStrategy, JwtAuthGuard, RolesGuard,
      { provide: PrismaService, useValue: prisma },
      { provide: ConfigService, useValue: { getOrThrow: () => secret } }],
  }).compile();
  const app = module.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true,
    transform: true, transformOptions: { enableImplicitConversion: true } }));
  await app.listen(3109, '127.0.0.1');
  const users = await Promise.all((['USER', 'ADMIN'] as const).map(role => prisma.user.create({ data: {
    name: 'Demonstração local de treinamento', email: `${randomUUID()}@example.invalid`,
    role, passwordHash: 'local-fixture-no-login', emailVerified: true,
  } })));
  const jwt = module.get(JwtService);
  const tokens = users.map(user => jwt.sign({ sub: user.id, email: user.email, role: user.role }, { expiresIn: '1h' }));
  const source = await prisma.product.findUniqueOrThrow({
    where: { slug: 'banana' }, include: { trainingQuestions: true },
  });
  // Exercise publication on test-only copies; leave all 33 editorial seed drafts untouched.
  const product = await prisma.product.create({ data: {
    name: source.name, slug: `training-demo-${randomUUID()}`, category: source.category,
    shortDescription: source.shortDescription, benefits: [], howToChoose: [], howToStore: [], usageTips: [],
    trainingQuestions: { create: source.trainingQuestions.map(question => ({
      prompt: question.prompt, options: question.options, correctOptionIndex: question.correctOptionIndex,
      explanation: question.explanation, sourceReference: question.sourceReference,
      sortOrder: question.sortOrder, isPublished: false, isDemo: true,
    })) },
  } });
  writeFileSync(fixtureFile, JSON.stringify({ baseURL: await app.getUrl(), productId: product.id,
    userToken: tokens[0], adminToken: tokens[1] }, null, 2));
  console.log(`Local training API ready on ${await app.getUrl()}; PID ${process.pid}. Test-only fixture written.`);
  const stop = async () => { await app.close(); await prisma.$disconnect(); process.exit(0); };
  process.once('SIGINT', () => { void stop(); });
  process.once('SIGTERM', () => { void stop(); });
}
void start().catch(error => { console.error(error); process.exitCode = 1; });
