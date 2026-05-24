import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { randomBytes } from 'crypto';
import {
  ArticleCategory,
  ProductCategory,
  UserRole,
} from '../src/generated/prisma/enums';
import { PrismaClient } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run the Prisma seed.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString,
  }),
});

const seedContentAuthorEmail = 'conteudo.seed@hortivia.local';

const products = [
  {
    name: 'Abacate',
    slug: 'abacate',
    category: ProductCategory.FRUIT,
    shortDescription: 'Vai bem em torradas, vitaminas e cremes.',
    description: 'Quando amadurece, ganha textura cremosa e combina com preparos doces ou salgados.',
    imageUrl: null,
    benefits: ['Rende bem em lanches e acompanhamentos', 'Combina com receitas doces e salgadas'],
    howToChoose: ['Prefira casca íntegra e sem rachaduras', 'Aperte de leve: ele deve ceder sem afundar'],
    howToStore: ['Deixe fora da geladeira até amadurecer', 'Depois de aberto, conserve refrigerado'],
    usageTips: ['Use com limão para reduzir o escurecimento', 'Vai bem em vitaminas, pastas e saladas'],
    nutrients: [{ label: 'Destaque', value: 'Gorduras boas' }],
  },
  {
    name: 'Abacaxi',
    slug: 'abacaxi',
    category: ProductCategory.FRUIT,
    shortDescription: 'Refrescante para sucos, sobremesas e grelhados.',
    description: 'Tem aroma marcante e funciona bem tanto em preparos frescos quanto em receitas quentes.',
    imageUrl: null,
    benefits: ['Vai bem em receitas doces ou salgadas', 'Pode ser servido gelado, assado ou grelhado'],
    howToChoose: ['Observe se a casca está firme e sem partes moles', 'Um aroma adocicado na base costuma ser bom sinal'],
    howToStore: ['Conserve inteiro em local arejado até o consumo', 'Depois de cortar, mantenha refrigerado em pote fechado'],
    usageTips: ['Use em cubos para sucos e saladas', 'Também funciona bem assado ou grelhado'],
    nutrients: [{ label: 'Destaque', value: 'Vitamina C' }],
  },
  {
    name: 'Alface',
    slug: 'alface',
    category: ProductCategory.VEGETABLE,
    shortDescription: 'Base leve para saladas.',
    description: 'Folha leve e crocante para saladas, sanduíches e acompanhamentos frios.',
    imageUrl: null,
    benefits: ['Ajuda a montar saladas rápidas', 'Combina com recheios e acompanhamentos'],
    howToChoose: ['Prefira folhas firmes, sem manchas escuras', 'Evite unidades amassadas ou muito murchas'],
    howToStore: ['Guarde seca em pote ou saco bem fechado', 'Lave apenas perto do consumo'],
    usageTips: ['Use as folhas mais firmes em sanduíches', 'Rasgue com as mãos para servir na hora'],
    nutrients: [{ label: 'Destaque', value: 'Fibras' }],
  },
  {
    name: 'Agrião',
    slug: 'agriao',
    category: ProductCategory.VEGETABLE,
    shortDescription: 'Folha de sabor marcante para saladas e caldos.',
    description: 'Tem leve ardor e funciona bem cru, refogado ou em preparos quentes.',
    imageUrl: null,
    benefits: ['Acrescenta sabor com pouco preparo', 'Vai bem em pratos quentes e frios'],
    howToChoose: ['Escolha folhas pequenas e firmes'],
    howToStore: ['Mantenha refrigerado e seco'],
    usageTips: ['Use cru em saladas para destacar o sabor', 'Também pode entrar em sopas e refogados rápidos'],
    nutrients: [{ label: 'Destaque', value: 'Ferro' }],
  },
  {
    name: 'Banana',
    slug: 'banana',
    category: ProductCategory.FRUIT,
    shortDescription: 'Prática para lanches, bolos e vitaminas.',
    description: 'É fácil de levar, amadurece rápido e rende bem em receitas simples.',
    imageUrl: null,
    benefits: ['Boa para lanches rápidos', 'Vai bem do consumo puro até receitas caseiras'],
    howToChoose: ['Veja se a casca está uniforme e sem rachaduras', 'Escolha o ponto de maturação conforme o uso desejado'],
    howToStore: ['Conserve em fruteira ventilada'],
    usageTips: ['Use madura em bolos e vitaminas', 'Se passar do ponto, congele para receitas'],
    nutrients: [{ label: 'Destaque', value: 'Potássio' }],
  },
  {
    name: 'Cenoura',
    slug: 'cenoura',
    category: ProductCategory.VEGETABLE,
    shortDescription: 'Raiz versátil para pratos crus ou cozidos.',
    description: 'Vai bem ralada, cozida, assada ou em sopas do dia a dia.',
    imageUrl: null,
    benefits: ['Entra bem em saladas, assados e sopas', 'Pode ser usada crua ou cozida'],
    howToChoose: ['Prefira unidades firmes e lisas'],
    howToStore: ['Guarde refrigerada'],
    usageTips: ['Rale para saladas e recheios', 'Também vai bem em assados, sopas e sucos'],
    nutrients: [{ label: 'Destaque', value: 'Vitamina A' }],
  },
  {
    name: 'Tomate',
    slug: 'tomate',
    category: ProductCategory.FRUIT,
    shortDescription: 'Vai bem em saladas, molhos e sanduíches.',
    description: 'É um ingrediente coringa para preparos crus ou cozidos no dia a dia.',
    imageUrl: null,
    benefits: ['Fácil de incluir em várias receitas', 'Serve tanto cru quanto cozido'],
    howToChoose: ['Escolha os firmes e com casca lisa', 'Evite os que estiverem rachados ou muito moles'],
    howToStore: ['Mantenha fora da geladeira se estiver verde'],
    usageTips: ['Use cru em saladas e sanduíches', 'Quando amadurecer bem, aproveite em molhos e refogados'],
    nutrients: [{ label: 'Destaque', value: 'Licopeno' }],
  },
  {
    name: 'Batata',
    slug: 'batata',
    category: ProductCategory.LEGUME,
    shortDescription: 'Base prática para purês, assados e sopas.',
    description: 'É um ingrediente coringa para acompanhamentos, assados, sopas e recheios.',
    imageUrl: null,
    benefits: ['Combina com muitos tipos de preparo', 'Ajuda a compor refeições simples e completas'],
    howToChoose: ['Evite batatas com brotos'],
    howToStore: ['Guarde em local seco e escuro'],
    usageTips: ['Use em purês, assados e sopas', 'Se estiver cozida sobrando, aproveite em saladas e recheios'],
    nutrients: [{ label: 'Destaque', value: 'Carboidratos' }],
  },
  {
    name: 'Couve',
    slug: 'couve',
    category: ProductCategory.VEGETABLE,
    shortDescription: 'Folha versátil para refogados e sucos.',
    description: 'Funciona bem em refogados rápidos, sucos e acompanhamentos.',
    imageUrl: null,
    benefits: ['Vai bem em preparos rápidos', 'Também pode entrar em sucos e recheios'],
    howToChoose: ['Escolha folhas firmes e sem amarelado'],
    howToStore: ['Conserve refrigerada'],
    usageTips: ['Corte fino para refogar rápido', 'Use crua em tiras finas quando quiser textura mais leve'],
    nutrients: [{ label: 'Destaque', value: 'Cálcio' }],
  },
  {
    name: 'Manga',
    slug: 'manga',
    category: ProductCategory.FRUIT,
    shortDescription: 'Doce e aromática para sucos e sobremesas.',
    description: 'Tem polpa macia e funciona bem sozinha ou em receitas frescas do dia a dia.',
    imageUrl: null,
    benefits: ['Boa para servir pura ou em receitas', 'Combina com preparos doces e saladas frescas'],
    howToChoose: ['Verifique aroma e leve maciez'],
    howToStore: ['Deixe amadurecer fora da geladeira'],
    usageTips: ['Use em cubos para saladas e sobremesas', 'Se estiver bem madura, aproveite em sucos e cremes'],
    nutrients: [{ label: 'Destaque', value: 'Vitamina A' }],
  },
];

const articles = [
  {
    title: 'Abacate: como saber se está no ponto',
    slug: 'como-escolher-um-abacate-no-ponto-certo',
    summary: 'Sinais simples para acertar na escolha.',
    content:
      'Observe se a casca está íntegra e aperte de leve: o abacate deve ceder um pouco, sem afundar.\n\nSe ainda estiver muito firme, deixe amadurecer em temperatura ambiente por alguns dias antes de consumir.',
    category: ArticleCategory.TIPS,
    imageUrl: null,
    tags: ['abacate', 'compra'],
    isPublished: true,
    publishedAt: new Date('2026-05-20T10:00:00.000Z'),
  },
  {
    title: 'Folhas frescas por mais tempo na geladeira',
    slug: 'como-conservar-folhas-por-mais-tempo',
    summary: 'Cuidados simples para manter as folhas em bom estado por mais tempo.',
    content:
      'Seque bem as folhas antes de guardar e use pote fechado ou saco bem vedado.\n\nPara ajudar na conservação, coloque papel toalha no recipiente e troque quando perceber excesso de umidade.',
    category: ArticleCategory.STORAGE,
    imageUrl: null,
    tags: ['folhas', 'conservação'],
    isPublished: true,
    publishedAt: new Date('2026-05-21T10:00:00.000Z'),
  },
  {
    title: 'Por que vale a pena observar a safra das frutas',
    slug: 'frutas-da-estacao-por-que-vale-a-pena-observar',
    summary: 'A época certa costuma trazer frutas mais saborosas e fáceis de encontrar.',
    content:
      'Quando uma fruta está na época, ela costuma chegar mais fresca e com melhor sabor.\n\nObservar a safra também ajuda a variar a rotina e, muitas vezes, torna a compra mais vantajosa.',
    category: ArticleCategory.SEASONALITY,
    imageUrl: null,
    tags: ['safra', 'economia'],
    isPublished: true,
    publishedAt: new Date('2026-05-22T10:00:00.000Z'),
  },
  {
    title: 'Talos e cascas: ideias simples para aproveitar melhor',
    slug: 'como-aproveitar-talos-e-cascas-no-dia-a-dia',
    summary: 'Ideias simples para reduzir desperdício na cozinha.',
    content:
      'Talos podem entrar em refogados, caldos e recheios sem complicar o preparo.\n\nCascas bem higienizadas também podem ser aproveitadas em chips, farofas e sucos, dependendo do alimento.',
    category: ArticleCategory.WASTE_REDUCTION,
    imageUrl: null,
    tags: ['aproveitamento', 'desperdício'],
    isPublished: true,
    publishedAt: new Date('2026-05-23T10:00:00.000Z'),
  },
  {
    title: 'Tomate: sinais para escolher melhor na compra',
    slug: 'o-que-observar-antes-de-comprar-tomate',
    summary: 'Cor, firmeza e casca ajudam a escolher melhor.',
    content:
      'Tomates com casca lisa, cor uniforme e sem rachaduras tendem a render melhor no uso do dia a dia.\n\nSe a ideia for consumir logo, escolha os mais maduros. Para guardar por mais tempo, prefira os ainda firmes.',
    category: ArticleCategory.TIPS,
    imageUrl: null,
    tags: ['tomate', 'compra'],
    isPublished: true,
    publishedAt: new Date('2026-05-24T10:00:00.000Z'),
  },
  {
    title: 'Como organizar a geladeira para perder menos alimentos',
    slug: 'como-reduzir-perdas-na-geladeira',
    summary: 'Uma organização simples já ajuda a evitar desperdício em casa.',
    content:
      'Deixe os itens mais maduros em locais visíveis para lembrar de usá-los primeiro.\n\nSeparar os alimentos por tipo e revisar a geladeira antes de comprar de novo já ajuda a reduzir perdas.',
    category: ArticleCategory.STORAGE,
    imageUrl: null,
    tags: ['geladeira', 'organização'],
    isPublished: true,
    publishedAt: new Date('2026-05-25T10:00:00.000Z'),
  },
];

async function ensureSeedContentAuthor() {
  const passwordHash = await hash(randomBytes(32).toString('hex'), 10);

  return prisma.user.upsert({
    where: {
      email: seedContentAuthorEmail,
    },
    create: {
      name: 'Equipe HortiVia',
      email: seedContentAuthorEmail,
      passwordHash,
      role: UserRole.USER,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
    update: {
      name: 'Equipe HortiVia',
      passwordHash,
      role: UserRole.USER,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      emailConfirmationCodeHash: null,
      emailConfirmationCodeExpiresAt: null,
      emailConfirmationCodeSentAt: null,
      emailConfirmationAttempts: 0,
      passwordResetCodeHash: null,
      passwordResetCodeExpiresAt: null,
      passwordResetCodeSentAt: null,
      passwordResetAttempts: 0,
    },
  });
}

async function main() {
  const author = await ensureSeedContentAuthor();

  for (const product of products) {
    await prisma.product.upsert({
      where: {
        slug: product.slug,
      },
      create: {
        ...product,
        howToChoose: product.howToChoose,
        howToStore: product.howToStore,
        usageTips: product.usageTips,
        isActive: true,
      },
      update: {
        ...product,
        howToChoose: product.howToChoose,
        howToStore: product.howToStore,
        usageTips: product.usageTips,
        isActive: true,
      },
    });
  }

  for (const article of articles) {
    await prisma.article.upsert({
      where: {
        slug: article.slug,
      },
      create: {
        ...article,
        author: {
          connect: {
            id: author.id,
          },
        },
      },
      update: {
        title: article.title,
        summary: article.summary,
        content: article.content,
        category: article.category,
        imageUrl: article.imageUrl,
        tags: article.tags,
        isPublished: article.isPublished,
        publishedAt: article.publishedAt,
        author: {
          connect: {
            id: author.id,
          },
        },
      },
    });
  }
}

void main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async error => {
    await prisma.$disconnect();
    throw error;
  });
