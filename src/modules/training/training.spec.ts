import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  buildTrainingDrafts,
  seedTraining,
  TRAINING_EDITORIAL_REVISIONS,
} from '../../../prisma/training-seed';
import type { PrismaClient } from '../../generated/prisma/client';
import { SaveQuestionDto } from './dto/save-question.dto';
import { AnswerQuestionDto } from './dto/answer-question.dto';
import {
  classifyEditorialRevision,
  decideLockedEditorialRevision,
} from '../../../prisma/training-editorial-apply';
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
  const guideSections = [
    { kind: 'CHOOSE', title: 'Como escolher', body: 'Observe folhas.', bullets: ['Folhas firmes e com cor viva', 'Miolo mais fechado costuma conservar melhor', 'Evite folhas muito amassadas'], idealPoints: [] },
    { kind: 'STORE', title: 'Como conservar', body: 'Guarde com cuidado.', bullets: ['Lave perto do consumo quando possível', 'Use papel para absorver umidade', 'Seque antes de guardar'], idealPoints: [] },
    { kind: 'USE', title: 'Como aproveitar', body: 'Sirva em sanduíches.', bullets: ['Misture folhas maiores e menores', 'Use as mais firmes em sanduíches', 'Tempere perto de servir para manter a textura'], idealPoints: [] },
  ];
  const product = { id: 'p1', slug: 'alface', name: 'Alface', guideSections,
    howToChoose: [], howToStore: [], usageTips: [] };

  it('creates unpublished questions with source-backed answers and distinct editorial distractors', () => {
    const drafts = buildTrainingDrafts(product);
    const sourceFacts = guideSections.flatMap(section => [...section.bullets, ...section.idealPoints, section.body]);
    expect(drafts).toHaveLength(3);
    drafts.forEach(draft => {
      expect(draft).toMatchObject({ isPublished: false, isDemo: true });
      expect(draft.prompt).toContain('cliente');
      expect(draft.prompt.toLocaleLowerCase('pt-BR')).not.toContain('seção');
      expect(draft.options).toHaveLength(3);
      expect(new Set(draft.options).size).toBe(3);
      expect(sourceFacts).toContain(draft.options[draft.correctOptionIndex]);
      expect(draft.explanation).not.toBe(draft.options[draft.correctOptionIndex]);
      expect(draft.explanation.length).toBeGreaterThan(draft.options[draft.correctOptionIndex].length);
      expect(draft.sourceReference).toContain(draft.options[draft.correctOptionIndex]);
    });
  });
  it('rejects a question when its correct answer is absent from the current guide source', () => {
    const drafts = buildTrainingDrafts({ ...product, guideSections: [{
      kind: 'STORE', title: 'Como conservar', body: 'Texto novo não revisado.', bullets: [], idealPoints: [],
    }] });
    expect(drafts).toHaveLength(0);
    expect(buildTrainingDrafts({ ...product, slug: 'batata', guideSections: [] })).toHaveLength(0);
  });
  it('uses the existing legacy product guidance when no visual guide sections exist', () => {
    const revision = TRAINING_EDITORIAL_REVISIONS.find(item => item.slug === 'abacaxi' && item.kind === 'STORE');
    expect(revision).toBeDefined();
    const generated = buildTrainingDrafts({
      ...product, slug: 'abacaxi', name: 'Abacaxi', guideSections: [],
      howToChoose: [], howToStore: [revision!.sourceExcerpt], usageTips: [],
    });
    expect(generated).toHaveLength(1);
    expect(generated[0].options[generated[0].correctOptionIndex]).toBe(revision!.sourceExcerpt);
    expect(generated[0].sourceReference).toContain('Como conservar');
  });
  it('varies answer positions and gives each answer a specific customer situation', () => {
    const positions = TRAINING_EDITORIAL_REVISIONS.map(revision => revision.correctOptionIndex);
    const counts = [0, 1, 2].map(position => positions.filter(value => value === position).length);
    expect(new Set(positions)).toEqual(new Set([0, 1, 2]));
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    TRAINING_EDITORIAL_REVISIONS.forEach(revision => {
      expect(revision.prompt.toLocaleLowerCase('pt-BR')).not.toContain('seção');
      expect(revision.options).toHaveLength(3);
      expect(new Set(revision.options).size).toBe(3);
      expect(revision.options[revision.correctOptionIndex]).toBe(revision.sourceExcerpt);
      expect(revision.explanation.length).toBeGreaterThan(revision.options[revision.correctOptionIndex].length);
    });
  });
  it('builds every revision only when its correct answer is present in the approved product source', () => {
    expect(TRAINING_EDITORIAL_REVISIONS).toHaveLength(29);
    for (const revision of TRAINING_EDITORIAL_REVISIONS) {
      const sourceField = revision.kind === 'CHOOSE' ? 'howToChoose'
        : revision.kind === 'STORE' ? 'howToStore' : 'usageTips';
      const generated = buildTrainingDrafts({
        id: revision.slug, slug: revision.slug, name: revision.slug,
        howToChoose: sourceField === 'howToChoose' ? [revision.sourceExcerpt] : [],
        howToStore: sourceField === 'howToStore' ? [revision.sourceExcerpt] : [],
        usageTips: sourceField === 'usageTips' ? [revision.sourceExcerpt] : [],
        guideSections: [{ kind: revision.kind, title: 'Fonte', body: '', bullets: [revision.sourceExcerpt], idealPoints: [] }],
      });
      expect(generated).toHaveLength(1);
      expect(generated[0].options[generated[0].correctOptionIndex]).toBe(revision.sourceExcerpt);
      expect(generated[0].sourceReference).toContain(revision.sourceExcerpt);
      expect(generated[0].options).toHaveLength(3);
      expect(new Set(generated[0].options.map(option => option.toLocaleLowerCase('pt-BR'))).size).toBe(3);
    }
  });
  it('keeps the correct-answer positions balanced across all 29 questions', () => {
    const counts = [0, 1, 2].map(position =>
      TRAINING_EDITORIAL_REVISIONS.filter(revision => revision.correctOptionIndex === position).length);
    expect(counts).toEqual([9, 10, 10]);
  });
  it.each([
    ['abacaxi', 'STORE', 'cliente cortou um abacaxi', 'Depois de cortar, mantenha refrigerado em pote fechado'],
    ['agriao', 'USE', 'quer incluir agrião em uma sopa', 'Também pode entrar em sopas e refogados rápidos'],
    ['batata', 'USE', 'batata já cozida que sobrou', 'Se estiver cozida sobrando, aproveite em saladas e recheios'],
    ['cenoura', 'CHOOSE', 'cenouras para ralar', 'Prefira unidades firmes e lisas'],
    ['couve', 'USE', 'refogar couve rapidamente', 'Corte fino para refogar rápido'],
    ['manga', 'STORE', 'manga que ainda precisa amadurecer', 'Deixe amadurecer fora da geladeira'],
  ])('uses a source-backed applied scenario for %s %s', (slug, kind, situation, answer) => {
    const revision = TRAINING_EDITORIAL_REVISIONS.find(item => item.slug === slug && item.kind === kind);
    expect(revision?.prompt.toLocaleLowerCase('pt-BR')).toContain(situation);
    expect(revision?.options[revision.correctOptionIndex]).toBe(answer);
  });
  it.each([
    ['abacate', 'STORE', 'abacate inteiro e verde', 'Inteiro e verde: temperatura ambiente'],
    ['alface', 'STORE', 'quando deve lavar', 'Lave perto do consumo quando possível'],
    ['cebola', 'STORE', 'cortou uma cebola', 'Cortada: pote fechado na geladeira'],
    ['cebola', 'USE', 'assar cebola cortada em rodelas', 'Use em rodelas para assados'],
    ['tomate', 'STORE', 'cortou um tomate', 'Cortado: refrigere em pote fechado'],
    ['tomate', 'USE', 'tomates maduros e quer preparar um molho', 'Maduro em molhos e sopas'],
  ])('uses a scenario that distinguishes %s %s', (slug, kind, situation, answer) => {
    const revision = TRAINING_EDITORIAL_REVISIONS.find(item => item.slug === slug && item.kind === kind);
    expect(revision).toBeDefined();
    expect(revision?.prompt.toLocaleLowerCase('pt-BR')).toContain(situation);
    expect(revision?.options[revision.correctOptionIndex]).toBe(answer);
  });
  it('keeps mutually exclusive product states distinct in storage questions', () => {
    const avocado = TRAINING_EDITORIAL_REVISIONS.find(item => item.slug === 'abacate' && item.kind === 'STORE');
    expect(avocado?.prompt.toLocaleLowerCase('pt-BR')).toContain('inteiro e verde');
    expect(avocado?.options[avocado.correctOptionIndex]).toBe('Inteiro e verde: temperatura ambiente');
    expect(avocado?.options.filter(option => option.startsWith('Maduro:') || option.startsWith('Aberto:'))).toHaveLength(2);

    const cutTomato = TRAINING_EDITORIAL_REVISIONS.find(item => item.slug === 'tomate' && item.kind === 'STORE');
    expect(cutTomato?.prompt.toLocaleLowerCase('pt-BR')).toContain('cortou um tomate');
    expect(cutTomato?.options[cutTomato.correctOptionIndex]).toBe('Cortado: refrigere em pote fechado');
  });
  it('upserts with an empty update, preserving editorial changes on reruns', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const prisma = { product: { findMany: jest.fn().mockResolvedValue([product]) }, trainingQuestion: { upsert } };
    await seedTraining(prisma as unknown as PrismaClient);
    expect(upsert).toHaveBeenCalledTimes(3);
    expect(upsert.mock.calls.every(([args]) => Object.keys(args.update).length === 0)).toBe(true);
  });
});

describe('Training editorial rollout', () => {
  const original = {
    prompt: 'Ao escolher este produto, qual orientação está no guia?',
    options: ['Resposta original', 'Distrator A', 'Distrator B'],
    correctOptionIndex: 0,
    explanation: 'O guia informa a resposta original para este caso.',
    sourceReference: 'Produto — Guia: “Resposta original”',
    sortOrder: 0,
    isPublished: false,
    isDemo: true,
  };
  const revised = {
    ...original,
    prompt: 'Uma cliente compara duas opções. Qual recomendação do guia se aplica?',
    options: ['Distrator B', 'Resposta revisada', 'Distrator A'],
    correctOptionIndex: 1,
    explanation: 'A situação corresponde à orientação revisada apresentada no guia.',
    sourceReference: 'Produto — Guia: “Resposta revisada”',
  };

  it('marks only an unchanged version-1 draft as ready', () => {
    expect(classifyEditorialRevision({ ...original, version: 1 }, original, revised)).toBe('READY');
  });

  it('recognizes applied revisions and preserves already published questions', () => {
    expect(classifyEditorialRevision({ ...revised, version: 2 }, original, revised)).toBe('ALREADY_APPLIED');
    expect(classifyEditorialRevision({ ...original, version: 2, isPublished: true }, original, revised)).toBe('PUBLISHED_PRESERVED');
  });

  it('blocks missing questions, human content edits, and unexpected versions', () => {
    expect(classifyEditorialRevision(null, original, revised)).toBe('MISSING');
    expect(classifyEditorialRevision({ ...original, prompt: 'Edição humana em revisão?', version: 1 }, original, revised)).toBe('CONTENT_CONFLICT');
    expect(classifyEditorialRevision({ ...original, version: 3 }, original, revised)).toBe('VERSION_CONFLICT');
  });

  it('cancels a preflight-ready revision when another admin edits before the lock', () => {
    const concurrentEdit = { ...original, explanation: 'Explicação alterada por outro administrador.', version: 2 };
    const lockedStatus = classifyEditorialRevision(concurrentEdit, original, revised);
    expect(lockedStatus).toBe('VERSION_CONFLICT');
    expect(decideLockedEditorialRevision('READY', lockedStatus)).toBe('CONFLICT');

    const concurrentUnversionedEdit = { ...original, explanation: 'Edição sem atualização de versão.', version: 1 };
    const unversionedStatus = classifyEditorialRevision(concurrentUnversionedEdit, original, revised);
    expect(unversionedStatus).toBe('CONTENT_CONFLICT');
    expect(decideLockedEditorialRevision('READY', unversionedStatus)).toBe('CONFLICT');
  });

  it('preserves a question published concurrently even when its version was not incremented', () => {
    const concurrentPublication = { ...original, isPublished: true, version: 1 };
    const lockedStatus = classifyEditorialRevision(concurrentPublication, original, revised);
    expect(lockedStatus).toBe('PUBLISHED_PRESERVED');
    expect(decideLockedEditorialRevision('READY', lockedStatus)).toBe('PRESERVE');
  });

  it('skips a revision applied concurrently and conflicts if a published row was unpublished', () => {
    expect(decideLockedEditorialRevision(
      'READY', classifyEditorialRevision({ ...revised, version: 2 }, original, revised),
    )).toBe('SKIP');
    expect(decideLockedEditorialRevision(
      'PUBLISHED_PRESERVED', classifyEditorialRevision({ ...original, version: 1 }, original, revised),
    )).toBe('CONFLICT');
  });
});
