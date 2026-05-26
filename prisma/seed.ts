import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { randomBytes } from 'crypto';
import {
  ArticleCategory,
  ProductCategory,
  ProductGuideSectionKind,
  ProductImageKind,
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

function createGuideSection(
  kind: ProductGuideSectionKind,
  title: string,
  body: string,
  options?: {
    bullets?: string[];
    idealPoints?: string[];
    avoidPoints?: string[];
    sortOrder?: number;
  },
) {
  return {
    kind,
    title,
    body,
    imageUrl: null,
    imageAlt: null,
    imageCaption: null,
    bullets: options?.bullets ?? [],
    idealPoints: options?.idealPoints ?? [],
    avoidPoints: options?.avoidPoints ?? [],
    sortOrder: options?.sortOrder ?? 0,
  };
}

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
    mainImages: [] as Array<{
      url: string;
      alt?: string | null;
      caption?: string | null;
      kind: ProductImageKind;
      sortOrder?: number;
      isPrimary?: boolean;
    }>,
    guideSections: [
      createGuideSection(
        ProductGuideSectionKind.CHOOSE,
        'Como escolher',
        'Prefira frutos com casca íntegra e sem rachaduras. Ao apertar levemente, o abacate deve ceder um pouco sem afundar demais.',
        {
          bullets: [
            'Deve ceder levemente ao toque',
            'Evite frutos duros demais se quiser usar no mesmo dia',
            'Evite partes muito afundadas ou com rachaduras',
          ],
          sortOrder: 0,
        },
      ),
      createGuideSection(
        ProductGuideSectionKind.OBSERVE,
        'O que observar',
        'Manchas muito escuras, rachaduras e áreas moles demais podem indicar excesso de maturação ou dano no transporte.',
        {
          idealPoints: ['Casca íntegra', 'Textura firme com leve maciez'],
          avoidPoints: ['Rachaduras', 'Áreas afundadas', 'Cheiro fermentado'],
          sortOrder: 1,
        },
      ),
      createGuideSection(
        ProductGuideSectionKind.STORE,
        'Como conservar',
        'Deixe fora da geladeira até amadurecer. Depois de maduro ou aberto, conserve refrigerado.',
        {
          bullets: [
            'Inteiro e verde: temperatura ambiente',
            'Maduro: geladeira por pouco tempo',
            'Aberto: refrigerado e bem protegido',
          ],
          sortOrder: 2,
        },
      ),
      createGuideSection(
        ProductGuideSectionKind.USE,
        'Como aproveitar',
        'Pode ser usado em preparos doces ou salgados, como vitaminas, cremes, torradas, saladas e guacamole.',
        {
          bullets: ['Amasse com limão para pastas', 'Use em cubos para saladas', 'Aproveite o ponto maduro em vitaminas'],
          sortOrder: 3,
        },
      ),
    ],
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
    mainImages: [],
    guideSections: [
      createGuideSection(
        ProductGuideSectionKind.CHOOSE,
        'Como escolher',
        'Observe a cor e a firmeza das folhas. A alface deve parecer fresca, crocante e sem sinais de murcha.',
        {
          bullets: [
            'Folhas firmes e com cor viva',
            'Miolo mais fechado costuma conservar melhor',
            'Evite folhas muito amassadas',
          ],
          sortOrder: 0,
        },
      ),
      createGuideSection(
        ProductGuideSectionKind.OBSERVE,
        'O que observar',
        'Umidade excessiva, escurecimento e pontos transparentes costumam indicar perda de frescor.',
        {
          idealPoints: ['Folhas crocantes', 'Sem manchas escuras', 'Sem excesso de umidade'],
          avoidPoints: ['Folhas murchas', 'Pontos escuros', 'Cheiro forte'],
          sortOrder: 1,
        },
      ),
      createGuideSection(
        ProductGuideSectionKind.STORE,
        'Como conservar',
        'Guarde na geladeira, bem seca e protegida em recipiente ou saco fechado.',
        {
          bullets: [
            'Seque antes de guardar',
            'Use papel para absorver umidade',
            'Lave perto do consumo quando possível',
          ],
          sortOrder: 2,
        },
      ),
      createGuideSection(
        ProductGuideSectionKind.USE,
        'Como aproveitar',
        'Vai bem em saladas, sanduíches, wraps e acompanhamentos frios do dia a dia.',
        {
          bullets: [
            'Misture folhas maiores e menores',
            'Use as mais firmes em sanduíches',
            'Tempere perto de servir para manter a textura',
          ],
          sortOrder: 3,
        },
      ),
    ],
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
    mainImages: [],
    guideSections: [
      createGuideSection(
        ProductGuideSectionKind.CHOOSE,
        'Como escolher',
        'A cor da casca ajuda a decidir o melhor uso. Bananas mais verdes duram mais; as mais amarelas estão prontas para consumo.',
        {
          bullets: [
            'Amarela: boa para comer no dia',
            'Levemente verde: dura mais em casa',
            'Muito escura: melhor para receitas',
          ],
          sortOrder: 0,
        },
      ),
      createGuideSection(
        ProductGuideSectionKind.OBSERVE,
        'O que observar',
        'Machucados profundos e rachaduras aceleram o amadurecimento e podem reduzir a durabilidade.',
        {
          idealPoints: ['Casca sem rachaduras', 'Cacho firme', 'Cor compatível com o uso desejado'],
          avoidPoints: ['Partes rompidas', 'Áreas muito escuras e úmidas', 'Cheiro fermentado'],
          sortOrder: 1,
        },
      ),
      createGuideSection(
        ProductGuideSectionKind.STORE,
        'Como conservar',
        'Mantenha em fruteira ventilada e longe do sol direto. Quando amadurecer demais, vale refrigerar ou congelar.',
        {
          bullets: [
            'Temperatura ambiente para amadurecer',
            'Geladeira apenas quando estiver no ponto',
            'Congele em rodelas para vitaminas e bolos',
          ],
          sortOrder: 2,
        },
      ),
      createGuideSection(
        ProductGuideSectionKind.USE,
        'Como aproveitar',
        'Funciona bem pura, em vitaminas, bolos, mingaus e panquecas.',
        {
          bullets: [
            'Banana madura rende bem em massas',
            'Congele para smoothies',
            'Use amassada em panquecas e mingaus',
          ],
          sortOrder: 3,
        },
      ),
    ],
  },
  {
    name: 'Cebola',
    slug: 'cebola',
    category: ProductCategory.LEGUME,
    shortDescription: 'Base aromática para refogados, molhos e assados.',
    description: 'Ajuda a construir sabor em preparos simples do dia a dia e combina com receitas cruas ou cozidas.',
    imageUrl: null,
    benefits: ['Serve de base para muitos pratos', 'Vai bem crua, refogada, assada ou caramelizada'],
    howToChoose: ['Prefira unidades firmes e secas', 'Evite cebolas com brotos ou áreas moles'],
    howToStore: ['Guarde em local seco, fresco e ventilado'],
    usageTips: ['Use crua em saladas e vinagretes', 'Refogue para molhos, arroz, feijão e sopas'],
    nutrients: [{ label: 'Destaque', value: 'Versatilidade no preparo' }],
    mainImages: [],
    guideSections: [
      createGuideSection(
        ProductGuideSectionKind.CHOOSE,
        'Como escolher',
        'A cebola deve estar firme, com casca seca e sem partes amolecidas.',
        {
          bullets: [
            'Prefira unidades pesadas para o tamanho',
            'Casca seca ajuda na conservação',
            'Evite brotos se quiser guardar por mais tempo',
          ],
          sortOrder: 0,
        },
      ),
      createGuideSection(
        ProductGuideSectionKind.OBSERVE,
        'O que observar',
        'Umidade, mofo, áreas afundadas e cheiro muito forte podem indicar deterioração.',
        {
          idealPoints: ['Casca seca', 'Firmeza uniforme', 'Sem brotos'],
          avoidPoints: ['Mofo', 'Partes moles', 'Umidade excessiva'],
          sortOrder: 1,
        },
      ),
      createGuideSection(
        ProductGuideSectionKind.STORE,
        'Como conservar',
        'Conserve inteira em local seco e arejado. Depois de cortada, mantenha refrigerada e bem fechada.',
        {
          bullets: [
            'Inteira: fora da geladeira',
            'Cortada: pote fechado na geladeira',
            'Evite guardar perto de batatas',
          ],
          sortOrder: 2,
        },
      ),
      createGuideSection(
        ProductGuideSectionKind.USE,
        'Como aproveitar',
        'Entra em refogados, molhos, assados, saladas e recheios.',
        {
          bullets: [
            'Pique fino para bases de preparo',
            'Use em rodelas para assados',
            'Aproveite crua em vinagretes e saladas',
          ],
          sortOrder: 3,
        },
      ),
    ],
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
    mainImages: [],
    guideSections: [
      createGuideSection(
        ProductGuideSectionKind.CHOOSE,
        'Como escolher',
        'Escolha tomates firmes, com casca lisa e cor compatível com o uso que você quer fazer.',
        {
          bullets: [
            'Mais firmes para saladas e sanduíches',
            'Mais maduros para molhos e refogados',
            'Casca lisa costuma indicar melhor conservação',
          ],
          sortOrder: 0,
        },
      ),
      createGuideSection(
        ProductGuideSectionKind.OBSERVE,
        'O que observar',
        'Rachaduras, áreas muito moles e sinais de amassado reduzem a durabilidade e podem atrapalhar o preparo.',
        {
          idealPoints: ['Cor uniforme', 'Casca lisa', 'Firmeza ao toque'],
          avoidPoints: ['Rachaduras', 'Partes afundadas', 'Mofo próximo ao cabo'],
          sortOrder: 1,
        },
      ),
      createGuideSection(
        ProductGuideSectionKind.STORE,
        'Como conservar',
        'Tomates verdes ou firmes podem ficar fora da geladeira. Depois de maduros, o consumo deve ser mais rápido.',
        {
          bullets: [
            'Fora da geladeira enquanto amadurece',
            'Maduro: use em pouco tempo',
            'Cortado: refrigere em pote fechado',
          ],
          sortOrder: 2,
        },
      ),
      createGuideSection(
        ProductGuideSectionKind.USE,
        'Como aproveitar',
        'Pode ser usado cru, assado, refogado ou em molhos do dia a dia.',
        {
          bullets: [
            'Cru em saladas e sanduíches',
            'Maduro em molhos e sopas',
            'Assado para concentrar sabor',
          ],
          sortOrder: 3,
        },
      ),
    ],
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

const productArticleRelations = [
  {
    productSlug: 'abacate',
    articleSlug: 'como-escolher-um-abacate-no-ponto-certo',
    sortOrder: 0,
  },
  {
    productSlug: 'abacate',
    articleSlug: 'como-reduzir-perdas-na-geladeira',
    sortOrder: 1,
  },
  {
    productSlug: 'banana',
    articleSlug: 'como-reduzir-perdas-na-geladeira',
    sortOrder: 0,
  },
  {
    productSlug: 'tomate',
    articleSlug: 'o-que-observar-antes-de-comprar-tomate',
    sortOrder: 0,
  },
  {
    productSlug: 'tomate',
    articleSlug: 'como-reduzir-perdas-na-geladeira',
    sortOrder: 1,
  },
  {
    productSlug: 'alface',
    articleSlug: 'como-conservar-folhas-por-mais-tempo',
    sortOrder: 0,
  },
  {
    productSlug: 'agriao',
    articleSlug: 'como-conservar-folhas-por-mais-tempo',
    sortOrder: 0,
  },
  {
    productSlug: 'cenoura',
    articleSlug: 'como-reduzir-perdas-na-geladeira',
    sortOrder: 0,
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
    const savedProduct = await prisma.product.upsert({
      where: {
        slug: product.slug,
      },
      create: {
        name: product.name,
        slug: product.slug,
        category: product.category,
        shortDescription: product.shortDescription,
        description: product.description,
        imageUrl: product.imageUrl,
        benefits: product.benefits,
        howToChoose: product.howToChoose,
        howToStore: product.howToStore,
        usageTips: product.usageTips,
        nutrients: product.nutrients,
        isActive: true,
      },
      update: {
        name: product.name,
        category: product.category,
        shortDescription: product.shortDescription,
        description: product.description,
        imageUrl: product.imageUrl,
        benefits: product.benefits,
        howToChoose: product.howToChoose,
        howToStore: product.howToStore,
        usageTips: product.usageTips,
        nutrients: product.nutrients,
        isActive: true,
      },
    });

    await prisma.productImage.deleteMany({
      where: {
        productId: savedProduct.id,
      },
    });

    if ((product.mainImages ?? []).length > 0) {
      await prisma.productImage.createMany({
        data: product.mainImages.map((image, index) => ({
          productId: savedProduct.id,
          url: image.url,
          alt: image.alt ?? null,
          caption: image.caption ?? null,
          kind: image.kind,
          sortOrder: image.sortOrder ?? index,
          isPrimary: image.isPrimary ?? index === 0,
        })),
      });
    }

    await prisma.productGuideSection.deleteMany({
      where: {
        productId: savedProduct.id,
      },
    });

    if ((product.guideSections ?? []).length > 0) {
      await prisma.productGuideSection.createMany({
        data: product.guideSections.map((section, index) => ({
          productId: savedProduct.id,
          kind: section.kind,
          title: section.title,
          body: section.body,
          imageUrl: section.imageUrl,
          imageAlt: section.imageAlt,
          imageCaption: section.imageCaption,
          bullets: section.bullets,
          idealPoints: section.idealPoints,
          avoidPoints: section.avoidPoints,
          sortOrder: section.sortOrder ?? index,
        })),
      });
    }
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

  for (const relation of productArticleRelations) {
    const product = await prisma.product.findUnique({
      where: {
        slug: relation.productSlug,
      },
      select: {
        id: true,
      },
    });

    const article = await prisma.article.findUnique({
      where: {
        slug: relation.articleSlug,
      },
      select: {
        id: true,
      },
    });

    if (!product || !article) {
      continue;
    }

    await prisma.productArticle.upsert({
      where: {
        productId_articleId: {
          productId: product.id,
          articleId: article.id,
        },
      },
      create: {
        productId: product.id,
        articleId: article.id,
        sortOrder: relation.sortOrder,
      },
      update: {
        sortOrder: relation.sortOrder,
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
