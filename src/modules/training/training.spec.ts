import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { buildTrainingDrafts, seedTraining } from '../../../prisma/training-seed';
import type { PrismaClient } from '../../generated/prisma/client';
import { SaveQuestionDto } from './dto/save-question.dto';
import { AnswerQuestionDto } from './dto/answer-question.dto';
import { summarizeProgress, TrainingService } from './training.service';
import type { PrismaService } from '../../prisma/prisma.service';

const valid = {
  prompt: 'Como escolher este produto?', options: ['Firme', 'Amassado', 'Sem observar'],
  correctOptionIndex: 0, explanation: 'O guia recomenda observar a firmeza.', sortOrder: 0, isPublished: false,
};

describe('Training validation and progress', () => {
  it('accepts three or four trimmed, distinct alternatives', async () => {
    const dto = plainToInstance(SaveQuestionDto, { ...valid, options: [' Firme ', 'Amassado', 'Sem observar', 'Outro'] });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.options[0]).toBe('Firme');
  });
  it.each([
    { options: ['A', 'B'] }, { options: ['A', 'B', 'C', 'D', 'E'] },
    { options: ['Firme', ' firme ', 'Outro'] }, { options: ['A', '', 'C'] },
    { options: [1, 'B', 'C'] }, { prompt: ' ' }, { explanation: ' ' },
    { sortOrder: -1 }, { correctOptionIndex: 4 },
  ])('rejects an invalid question: %j', async patch => {
    expect(await validate(plainToInstance(SaveQuestionDto, { ...valid, ...patch }))).not.toHaveLength(0);
  });
  it('does not turn the string false into publication when implicit conversion is enabled', async () => {
    const dto = plainToInstance(SaveQuestionDto, { ...valid, isPublished: 'false' }, { enableImplicitConversion: true });
    expect(await validate(dto)).not.toHaveLength(0);
  });
  it('rejects an invalid answer or idempotency key', async () => {
    expect(await validate(plainToInstance(AnswerQuestionDto, {
      selectedOptionIndex: -1, version: 0, submissionKey: '../answer',
    }))).not.toHaveLength(0);
  });
  it.each([undefined, null, '', ' \n\t ', 123, {}, ['guia'], 'x'.repeat(2001)])(
    'rejects publication with an invalid source reference: %j', async sourceReference => {
      const dto = plainToInstance(SaveQuestionDto, { ...valid, isPublished: true, sourceReference }, { enableImplicitConversion: true });
      expect((await validate(dto)).some(error => error.property === 'sourceReference')).toBe(true);
    },
  );
  it.each([undefined, null, '', ' \n\t '])('allows a draft without a source: %j', async sourceReference => {
    expect(await validate(plainToInstance(SaveQuestionDto, { ...valid, sourceReference }))).toHaveLength(0);
  });
  it('validates and trims a source before publication', async () => {
    const dto = plainToInstance(SaveQuestionDto, { ...valid, isPublished: true, sourceReference: '  Banana — Como escolher  ' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.sourceReference).toBe('Banana — Como escolher');
  });
  it.each(['create', 'update'] as const)('protects the publication invariant in service %s even without the HTTP pipe', async action => {
    const prisma = { product: { findFirst: jest.fn().mockResolvedValue({ id: 'p1', name: 'Banana' }) },
      trainingQuestion: { create: jest.fn() }, $transaction: jest.fn() };
    const service = new TrainingService(prisma as unknown as PrismaService);
    const dto = { ...valid, isPublished: true, sourceReference: ' \n\t ', version: 1 };
    const save = action === 'create' ? service.create('p1', dto) : service.update('p1', 'q1', dto);
    await expect(save).rejects.toThrow('Informe uma referência no guia para publicar a pergunta.');
    expect(prisma.trainingQuestion.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('counts the latest answer and ignores an answer to an obsolete question revision', () => {
    expect(summarizeProgress([
      { version: 2, attempts: [{ questionVersion: 1, isCorrect: true }] },
      { version: 1, attempts: [{ questionVersion: 1, isCorrect: false }] },
      { version: 1, attempts: [{ questionVersion: 1, isCorrect: true }] },
    ])).toEqual({ total: 3, answered: 2, correct: 1, percent: 33 });
    expect(summarizeProgress([])).toEqual({ total: 0, answered: 0, correct: 0, percent: 0 });
  });
});

describe('Training seed', () => {
  const product = { id: 'p1', slug: 'abacate', name: 'Abacate', guideSections: [],
    howToChoose: ['Prefira casca íntegra.'], howToStore: ['Conserve refrigerado depois de aberto.'], usageTips: ['Use em vitaminas.'] };
  it('creates three unpublished demonstration drafts with verbatim sources', () => {
    const drafts = buildTrainingDrafts(product);
    expect(drafts).toHaveLength(3);
    drafts.forEach((draft, i) => {
      expect(draft).toMatchObject({ isPublished: false, isDemo: true, correctOptionIndex: i });
      expect(draft.explanation).toContain(draft.options[i]);
      expect(draft.sourceReference).toContain(draft.options[i]);
    });
  });
  it('skips topics with no factual source and prefers the current visual guide', () => {
    const drafts = buildTrainingDrafts({ ...product, guideSections: [{
      kind: 'STORE', title: 'Como conservar', body: 'Orientação atual do guia.', bullets: [], idealPoints: [],
    }] });
    expect(drafts).toHaveLength(1);
    expect(drafts[0].options).toContain('Orientação atual do guia.');
    expect(buildTrainingDrafts({ ...product, howToChoose: [], howToStore: [], usageTips: [] })).toHaveLength(0);
  });
  it('upserts with an empty update, preserving editorial changes on reruns', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const prisma = { product: { findMany: jest.fn().mockResolvedValue([product]) }, trainingQuestion: { upsert } };
    await seedTraining(prisma as unknown as PrismaClient);
    expect(upsert).toHaveBeenCalledTimes(3);
    expect(upsert.mock.calls.every(([args]) => Object.keys(args.update).length === 0)).toBe(true);
  });
});
