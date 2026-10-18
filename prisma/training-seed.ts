import type { PrismaClient } from '../src/generated/prisma/client';

export const TRAINING_SEED_SLUGS = [
  'abacate', 'abacaxi', 'agriao', 'alface', 'banana', 'batata',
  'cebola', 'cenoura', 'tomate', 'couve', 'manga',
];

type SeedProduct = {
  id: string; slug: string; name: string;
  howToChoose: string[]; howToStore: string[]; usageTips: string[];
  guideSections: { kind: string; title: string; body: string; bullets: string[]; idealPoints: string[] }[];
};

// Correct answers are verbatim excerpts, not new food or nutrition claims.
export function buildTrainingDrafts(product: SeedProduct) {
  const topics = [
    { kind: 'CHOOSE', title: 'Como escolher', fallback: product.howToChoose, action: 'escolher', wrong: ['Escolher apenas pelo preço, sem observar o alimento.', 'Ignorar as características descritas no guia.'] },
    { kind: 'STORE', title: 'Como conservar', fallback: product.howToStore, action: 'conservar', wrong: ['Guardar sem consultar as orientações do produto.', 'Aplicar sempre a mesma conservação a qualquer alimento.'] },
    { kind: 'USE', title: 'Como aproveitar', fallback: product.usageTips, action: 'aproveitar', wrong: ['Ignorar as sugestões de uso do produto.', 'O guia não apresenta nenhuma sugestão de aproveitamento.'] },
  ];
  return topics.flatMap((topic, index) => {
    const section = product.guideSections.find(s => s.kind === topic.kind);
    const candidates = section ? [...section.bullets, ...section.idealPoints, section.body] :
      product.guideSections.length === 0 ? topic.fallback : [];
    const excerpt = candidates.map(s => s.trim()).find(s => s.length >= 5 && s.length <= 300);
    if (!excerpt) return [];
    const options = [...topic.wrong];
    options.splice(index, 0, excerpt);
    return [{
      productId: product.id, seedKey: `quick-training-v1:${product.slug}:${topic.kind}`,
      prompt: `Ao ${topic.action} ${product.name.toLocaleLowerCase('pt-BR')}, qual orientação está no guia?`,
      options, correctOptionIndex: index, explanation: `O guia orienta: ${excerpt}`,
      sourceReference: `${product.name} — ${section?.title ?? topic.title}: “${excerpt}”`,
      sortOrder: index, isPublished: false, isDemo: true,
    }];
  });
}

export async function seedTraining(prisma: PrismaClient) {
  const products = await prisma.product.findMany({
    where: { slug: { in: TRAINING_SEED_SLUGS }, isActive: true },
    include: { guideSections: { orderBy: { sortOrder: 'asc' } } },
  });
  let drafts = 0;
  for (const product of products) {
    for (const draft of buildTrainingDrafts(product)) {
      // Never overwrite editorial edits, publication or deactivation.
      await prisma.trainingQuestion.upsert({ where: { seedKey: draft.seedKey }, create: draft, update: {} });
      drafts += 1;
    }
  }
  return { products: products.length, drafts };
}
