import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
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

const products = [
  {
    name: 'Abacate',
    slug: 'abacate',
    category: ProductCategory.FRUIT,
    shortDescription: 'Rico em gorduras boas.',
    description: 'Fruta cremosa para vitaminas, torradas e saladas.',
    imageUrl: null,
    benefits: ['Fonte de gorduras boas', 'Ajuda na saciedade'],
    howToChoose: ['Prefira o fruto firme com casca integra'],
    howToStore: ['Deixe amadurecer fora da geladeira'],
    usageTips: ['Use em vitaminas e cremes'],
    nutrients: [{ label: 'Vitamina principal', value: 'Vitamina E' }],
  },
  {
    name: 'Abacaxi',
    slug: 'abacaxi',
    category: ProductCategory.FRUIT,
    shortDescription: 'Refrescante e aromatico.',
    description: 'Fruta tropical para sucos, sobremesas e grelhados.',
    imageUrl: null,
    benefits: ['Refrescante', 'Versatil em receitas'],
    howToChoose: ['Observe aroma doce na base'],
    howToStore: ['Conserve refrigerado depois de cortar'],
    usageTips: ['Vai bem em sucos e grelhados'],
    nutrients: [{ label: 'Vitamina principal', value: 'Vitamina C' }],
  },
  {
    name: 'Alface',
    slug: 'alface',
    category: ProductCategory.VEGETABLE,
    shortDescription: 'Base leve para saladas.',
    description: 'Folha crocante para saladas e sanduiches.',
    imageUrl: null,
    benefits: ['Leve e hidratante', 'Facil de combinar'],
    howToChoose: ['Prefira folhas verdes e sem manchas'],
    howToStore: ['Guarde seca em pote fechado'],
    usageTips: ['Lave apenas antes de consumir'],
    nutrients: [{ label: 'Destaque', value: 'Fibras' }],
  },
  {
    name: 'Agriao',
    slug: 'agriao',
    category: ProductCategory.VEGETABLE,
    shortDescription: 'Folha de sabor marcante.',
    description: 'Excelente em saladas, refogados e caldos.',
    imageUrl: null,
    benefits: ['Sabor intenso', 'Bom para refogados'],
    howToChoose: ['Escolha folhas pequenas e firmes'],
    howToStore: ['Mantenha refrigerado e seco'],
    usageTips: ['Use em saladas e sopas'],
    nutrients: [{ label: 'Destaque', value: 'Ferro' }],
  },
  {
    name: 'Banana',
    slug: 'banana',
    category: ProductCategory.FRUIT,
    shortDescription: 'Pratica para o dia a dia.',
    description: 'Fruta energetica para lanches, bolos e vitaminas.',
    imageUrl: null,
    benefits: ['Energia rapida', 'Facil de transportar'],
    howToChoose: ['Veja se a casca esta uniforme'],
    howToStore: ['Conserve em fruteira ventilada'],
    usageTips: ['Boa para lanches e bolos'],
    nutrients: [{ label: 'Destaque', value: 'Potassio' }],
  },
  {
    name: 'Cenoura',
    slug: 'cenoura',
    category: ProductCategory.VEGETABLE,
    shortDescription: 'Raiz versatil e adocicada.',
    description: 'Pode ser consumida crua, cozida ou assada.',
    imageUrl: null,
    benefits: ['Versatil', 'Boa para saladas e assados'],
    howToChoose: ['Prefira unidades firmes e lisas'],
    howToStore: ['Guarde refrigerada'],
    usageTips: ['Fica otima em sucos e refogados'],
    nutrients: [{ label: 'Vitamina principal', value: 'Vitamina A' }],
  },
  {
    name: 'Tomate',
    slug: 'tomate',
    category: ProductCategory.FRUIT,
    shortDescription: 'Suculento e muito usado na cozinha.',
    description: 'Perfeito para saladas, molhos e sanduiches.',
    imageUrl: null,
    benefits: ['Muito versatil', 'Ideal para molhos'],
    howToChoose: ['Escolha os firmes e brilhantes'],
    howToStore: ['Mantenha fora da geladeira se estiver verde'],
    usageTips: ['Use cru ou em molhos caseiros'],
    nutrients: [{ label: 'Destaque', value: 'Licopeno' }],
  },
  {
    name: 'Batata',
    slug: 'batata',
    category: ProductCategory.LEGUME,
    shortDescription: 'Ingrediente basico e versatil.',
    description: 'Funciona em pure, assados, cozidos e sopas.',
    imageUrl: null,
    benefits: ['Alta versatilidade', 'Boa base para refeicoes'],
    howToChoose: ['Evite batatas com brotos'],
    howToStore: ['Guarde em local seco e escuro'],
    usageTips: ['Use em pure, assados e sopas'],
    nutrients: [{ label: 'Destaque', value: 'Carboidratos' }],
  },
  {
    name: 'Couve',
    slug: 'couve',
    category: ProductCategory.VEGETABLE,
    shortDescription: 'Folha classica da cozinha brasileira.',
    description: 'Boa para refogados, sucos e acompanhamentos.',
    imageUrl: null,
    benefits: ['Boa para refogados', 'Combina com sucos verdes'],
    howToChoose: ['Escolha folhas firmes e sem amarelado'],
    howToStore: ['Conserve refrigerada'],
    usageTips: ['Corte fino para refogar rapido'],
    nutrients: [{ label: 'Destaque', value: 'Calcio' }],
  },
  {
    name: 'Manga',
    slug: 'manga',
    category: ProductCategory.FRUIT,
    shortDescription: 'Doce e aromatica.',
    description: 'Vai bem em sucos, sobremesas e saladas.',
    imageUrl: null,
    benefits: ['Sabor adocicado', 'Boa para sobremesas'],
    howToChoose: ['Verifique aroma e leve maciez'],
    howToStore: ['Deixe amadurecer fora da geladeira'],
    usageTips: ['Use em cubos, sucos e sobremesas'],
    nutrients: [{ label: 'Vitamina principal', value: 'Vitamina A' }],
  },
];

const articles = [
  {
    title: 'Como escolher um abacate no ponto certo',
    slug: 'como-escolher-um-abacate-no-ponto-certo',
    summary: 'Aprenda sinais simples para identificar maturacao.',
    content:
      'Observe a casca, aperte com leveza e prefira frutas sem machucados para acertar no ponto de consumo.',
    category: ArticleCategory.TIPS,
    imageUrl: null,
    tags: ['abacate', 'compra'],
    isPublished: true,
    publishedAt: new Date('2026-05-20T10:00:00.000Z'),
  },
  {
    title: 'Como conservar folhas por mais tempo',
    slug: 'como-conservar-folhas-por-mais-tempo',
    summary: 'Dicas simples para manter folhas firmes por mais dias.',
    content:
      'Seque bem as folhas, use pote fechado com papel toalha e evite lavar tudo antes do armazenamento.',
    category: ArticleCategory.STORAGE,
    imageUrl: null,
    tags: ['folhas', 'conservacao'],
    isPublished: true,
    publishedAt: new Date('2026-05-21T10:00:00.000Z'),
  },
  {
    title: 'Frutas da estacao: por que vale a pena observar',
    slug: 'frutas-da-estacao-por-que-vale-a-pena-observar',
    summary: 'Entenda como safra influencia sabor e preco.',
    content:
      'Produtos da estacao costumam chegar mais frescos, com melhor sabor e valores mais equilibrados no dia a dia.',
    category: ArticleCategory.SEASONALITY,
    imageUrl: null,
    tags: ['safra', 'economia'],
    isPublished: true,
    publishedAt: new Date('2026-05-22T10:00:00.000Z'),
  },
  {
    title: 'Como aproveitar talos e cascas no dia a dia',
    slug: 'como-aproveitar-talos-e-cascas-no-dia-a-dia',
    summary: 'Aproveitamento simples para reduzir desperdicio.',
    content:
      'Use talos em refogados, caldos e bolinhos, e experimente cascas higienizadas em chips, farofas e sucos.',
    category: ArticleCategory.WASTE_REDUCTION,
    imageUrl: null,
    tags: ['aproveitamento', 'desperdicio'],
    isPublished: true,
    publishedAt: new Date('2026-05-23T10:00:00.000Z'),
  },
  {
    title: 'O que observar antes de comprar tomate',
    slug: 'o-que-observar-antes-de-comprar-tomate',
    summary: 'Cor, firmeza e brilho ajudam na escolha.',
    content:
      'Tomates firmes, com cor uniforme e sem rachaduras, tendem a render melhor em saladas, molhos e refogados.',
    category: ArticleCategory.TIPS,
    imageUrl: null,
    tags: ['tomate', 'compra'],
    isPublished: true,
    publishedAt: new Date('2026-05-24T10:00:00.000Z'),
  },
  {
    title: 'Como reduzir perdas na geladeira',
    slug: 'como-reduzir-perdas-na-geladeira',
    summary: 'Organizacao simples para evitar desperdicio.',
    content:
      'Separe os alimentos por uso, mantenha recipientes visiveis e revise os itens mais maduros antes de novas compras.',
    category: ArticleCategory.STORAGE,
    imageUrl: null,
    tags: ['geladeira', 'organizacao'],
    isPublished: true,
    publishedAt: new Date('2026-05-25T10:00:00.000Z'),
  },
];

async function main() {
  const passwordHash = await hash('hortivia-admin-local', 10);
  const author = await prisma.user.upsert({
    where: {
      email: 'admin@hortivia.local',
    },
    create: {
      name: 'Equipe HortiVia',
      email: 'admin@hortivia.local',
      passwordHash,
      role: UserRole.ADMIN,
    },
    update: {
      name: 'Equipe HortiVia',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

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
