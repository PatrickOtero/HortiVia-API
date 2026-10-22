import 'dotenv/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { TrainingService } from '../src/modules/training/training.service';
import { SaveQuestionDto } from '../src/modules/training/dto/save-question.dto';
import { PrismaService } from '../src/prisma/prisma.service';
import { buildTrainingDrafts, TRAINING_EDITORIAL_REVISIONS } from '../prisma/training-seed';
import { classifyEditorialRevision, decideLockedEditorialRevision } from '../prisma/training-editorial-apply';

const connectionString = process.env.TRAINING_HOMOLOGATION_DATABASE_URL;
const applyChanges = process.argv.includes('--apply');
const confirmation = process.argv.find(argument => argument.startsWith('--confirm-target='))?.slice('--confirm-target='.length);

function targetDetails(value: string) {
  const target = new URL(value);
  return { host: target.hostname, database: decodeURIComponent(target.pathname.slice(1).split('/')[0]) };
}

if (!connectionString) throw new Error('Defina TRAINING_HOMOLOGATION_DATABASE_URL explicitamente. DATABASE_URL não é usado por este comando.');
if (process.env.NODE_ENV === 'production') throw new Error('O comando editorial não pode executar com NODE_ENV=production.');
const target = targetDetails(connectionString);
if (applyChanges) {
  if (!/(homolog|staging)/i.test(target.database)) {
    throw new Error('Aplicação permitida somente em banco cujo nome identifique homologação ou staging.');
  }
  if (confirmation !== `${target.host}/${target.database}`) {
    throw new Error(`Confirme o alvo explicitamente com --confirm-target=${target.host}/${target.database}`);
  }
} else if (confirmation) {
  throw new Error('--confirm-target só é aceito junto com --apply.');
}

type ProductForEditorial = {
  id: string;
  slug: string;
  name: string;
  howToChoose: string[];
  howToStore: string[];
  usageTips: string[];
  guideSections: { kind: string; title: string; body: string; bullets: string[]; idealPoints: string[] }[];
};

function originalSeedContent(product: ProductForEditorial, kind: string) {
  const topics = [
    { kind: 'CHOOSE', title: 'Como escolher', fallback: product.howToChoose, action: 'escolher', wrong: ['Escolher apenas pelo preço, sem observar o alimento.', 'Ignorar as características descritas no guia.'] },
    { kind: 'STORE', title: 'Como conservar', fallback: product.howToStore, action: 'conservar', wrong: ['Guardar sem consultar as orientações do produto.', 'Aplicar sempre a mesma conservação a qualquer alimento.'] },
    { kind: 'USE', title: 'Como aproveitar', fallback: product.usageTips, action: 'aproveitar', wrong: ['Ignorar as sugestões de uso do produto.', 'O guia não apresenta nenhuma sugestão de aproveitamento.'] },
  ];
  const index = topics.findIndex(topic => topic.kind === kind);
  const topic = topics[index];
  if (!topic) return null;
  const section = product.guideSections.find(item => item.kind === kind);
  const candidates = section ? [...section.bullets, ...section.idealPoints, section.body]
    : product.guideSections.length === 0 ? topic.fallback : [];
  const excerpt = candidates.map(value => value.trim()).find(value => value.length >= 5 && value.length <= 300);
  if (!excerpt) return null;
  const options = [...topic.wrong];
  options.splice(index, 0, excerpt);
  return {
    prompt: `Ao ${topic.action} ${product.name.toLocaleLowerCase('pt-BR')}, qual orientação está no guia?`,
    options,
    correctOptionIndex: index,
    explanation: `O guia orienta: ${excerpt}`,
    sourceReference: `${product.name} — ${section?.title ?? topic.title}: “${excerpt}”`,
    sortOrder: index,
    isPublished: false,
    isDemo: true,
  };
}

async function main() {
  const seedKeys = TRAINING_EDITORIAL_REVISIONS.map(item => `quick-training-v1:${item.slug}:${item.kind}`);
  if (seedKeys.length !== 29 || new Set(seedKeys).size !== 29) {
    throw new Error('O manifesto editorial deve conter exatamente 29 chaves de pergunta únicas.');
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const products = await prisma.product.findMany({
      where: { slug: { in: [...new Set(TRAINING_EDITORIAL_REVISIONS.map(item => item.slug))] } },
      include: { guideSections: { orderBy: { sortOrder: 'asc' } } },
    });
    const productsBySlug = new Map(products.map(product => [product.slug, product as ProductForEditorial]));
    const desiredByKey = new Map(products.flatMap(product =>
      buildTrainingDrafts(product as ProductForEditorial).map(draft => [draft.seedKey, draft] as const)));
    const currentQuestions = await prisma.trainingQuestion.findMany({ where: { seedKey: { in: seedKeys } } });
    const currentByKey = new Map(currentQuestions.map(question => [question.seedKey, question]));

    const entries = TRAINING_EDITORIAL_REVISIONS.map(revision => {
      const key = `quick-training-v1:${revision.slug}:${revision.kind}`;
      const product = productsBySlug.get(revision.slug);
      const desired = desiredByKey.get(key);
      const current = currentByKey.get(key);
      const original = product && originalSeedContent(product, revision.kind);
      const currentContent = current ? { ...current, sourceReference: current.sourceReference ?? '' } : null;
      const status = product && desired && original
        ? classifyEditorialRevision(currentContent, original, desired)
        : 'MISSING';
      return { key, product, revision, current, desired, original, status };
    });

    console.log(`Modo: ${applyChanges ? 'APLICAÇÃO solicitada' : 'pré-visualização (somente leitura)'}`);
    console.log(`Alvo: ${target.host}/${target.database}`);
    for (const entry of entries) {
      const correctAnswer = entry.desired?.options[entry.desired.correctOptionIndex] ?? '—';
      console.log(`\n[${entry.status}] ${entry.key} | versão atual: ${entry.current?.version ?? 'ausente'}`);
      console.log(`  Atual: ${entry.current?.prompt ?? 'pergunta ausente'}`);
      console.log(`  Proposta: ${entry.desired?.prompt ?? 'fonte/produto ausente'}`);
      console.log(`  Gabarito: ${correctAnswer}`);
      console.log(`  Referência: ${entry.desired?.sourceReference ?? '—'}`);
    }

    const invalidStatuses = entries.filter(entry => !['READY', 'ALREADY_APPLIED', 'PUBLISHED_PRESERVED'].includes(entry.status));
    const toApply = entries.filter(entry => entry.status === 'READY');
    if (invalidStatuses.length) {
      throw new Error(`${invalidStatuses.length} item(ns) ausente(s) ou em conflito; nenhuma alteração foi aplicada.`);
    }
    if (!applyChanges) {
      console.log(`\nPrévia concluída: ${toApply.length} pronta(s), ${entries.filter(entry => entry.status === 'ALREADY_APPLIED').length} já aplicada(s), ${entries.filter(entry => entry.status === 'PUBLISHED_PRESERVED').length} publicada(s) preservada(s). Nenhuma alteração foi feita.`);
      return;
    }

    const validated: { productId: string; questionId: string; dto: SaveQuestionDto }[] = [];
    for (const entry of toApply) {
      const dto = plainToInstance(SaveQuestionDto, {
        prompt: entry.desired!.prompt,
        options: entry.desired!.options,
        correctOptionIndex: entry.desired!.correctOptionIndex,
        explanation: entry.desired!.explanation,
        sourceReference: entry.desired!.sourceReference,
        sortOrder: entry.desired!.sortOrder,
        isPublished: false,
        version: entry.current!.version,
      });
      const errors = await validate(dto);
      if (errors.length) throw new Error(`Validação recusou ${entry.key}: ${errors.map(error => Object.values(error.constraints ?? {}).join(', ')).join('; ')}`);
      validated.push({ productId: entry.product!.id, questionId: entry.current!.id, dto });
    }

    const reviewEntries = entries.filter(entry => ['READY', 'ALREADY_APPLIED', 'PUBLISHED_PRESERVED'].includes(entry.status));
    const validatedByKey = new Map(validated.map(item => [item.questionId, item]));
    const applied = await prisma.$transaction(async transaction => {
      // Lock in stable order, then classify fresh rows before any write. A concurrent
      // publisher/editor must finish first; its resulting state is then preserved or
      // treated as a batch conflict below.
      const lockEntries = [...reviewEntries].sort((left, right) => left.current!.id.localeCompare(right.current!.id));
      for (const entry of lockEntries) {
        await transaction.$queryRaw`SELECT "id" FROM "TrainingQuestion" WHERE "id" = ${entry.current!.id} FOR UPDATE`;
      }
      const lockedQuestions = await transaction.trainingQuestion.findMany({
        where: { id: { in: lockEntries.map(entry => entry.current!.id) } },
      });
      const lockedById = new Map(lockedQuestions.map(question => [question.id, question]));
      const decisions = lockEntries.map(entry => {
        const locked = lockedById.get(entry.current!.id);
        const lockedContent = locked ? { ...locked, sourceReference: locked.sourceReference ?? '' } : null;
        const lockedStatus = entry.original && entry.desired
          ? classifyEditorialRevision(lockedContent, entry.original, entry.desired)
          : 'MISSING';
        return { entry, lockedStatus, decision: decideLockedEditorialRevision(entry.status, lockedStatus) };
      });
      const conflicts = decisions.filter(item => item.decision === 'CONFLICT');
      if (conflicts.length) {
        throw new Error(`Conflito concorrente em ${conflicts.map(item => `${item.entry.key} (${item.lockedStatus})`).join(', ')}; transação cancelada sem alterações.`);
      }

      const transactionalPrisma = new Proxy(transaction, {
        get(targetClient, property, receiver) {
          if (property === '$transaction') return (callback: (client: typeof transaction) => unknown) => callback(transaction);
          return Reflect.get(targetClient, property, receiver) as unknown;
        },
      }) as unknown as PrismaService;
      const service = new TrainingService(transactionalPrisma);
      const updated = [];
      for (const item of decisions.filter(candidate => candidate.decision === 'APPLY')) {
        const validatedItem = validatedByKey.get(item.entry.current!.id);
        if (!validatedItem) throw new Error(`DTO validado não encontrado para ${item.entry.key}; transação cancelada.`);
        updated.push(await service.update(validatedItem.productId, validatedItem.questionId, validatedItem.dto));
      }
      return updated;
    });
    console.log(`\nAplicação concluída: ${applied.length} rascunho(s) revisado(s). Nenhuma pergunta foi publicada.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
