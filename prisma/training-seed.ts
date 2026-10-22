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

type TrainingEditorialRevision = {
  slug: string;
  kind: 'CHOOSE' | 'STORE' | 'USE';
  prompt: string;
  options: [string, string, string];
  correctOptionIndex: number;
  explanation: string;
  sourceExcerpt: string;
};

// Correct answers must match an approved guide fact. Distractors are authored
// for the scenario and are not presented as facts from the guide.
export const TRAINING_EDITORIAL_REVISIONS: readonly TrainingEditorialRevision[] = [
  {
    slug: 'abacate', kind: 'STORE',
    prompt: 'Um cliente tem um abacate inteiro e verde e quer saber onde deixá-lo enquanto amadurece. Qual orientação do guia se aplica?',
    options: ['Maduro: geladeira por pouco tempo', 'Aberto: refrigerado e bem protegido', 'Inteiro e verde: temperatura ambiente'],
    correctOptionIndex: 2,
    explanation: 'Como o fruto ainda está inteiro e verde, aplique a recomendação indicada para esse estado: deixá-lo em temperatura ambiente. As outras opções se referem ao fruto maduro ou aberto.',
    sourceExcerpt: 'Inteiro e verde: temperatura ambiente',
  },
  {
    slug: 'abacate', kind: 'USE',
    prompt: 'Uma cliente quer preparar uma pasta de abacate. Qual sugestão do guia combina com esse preparo?',
    options: ['Use em cubos para saladas', 'Amasse com limão para pastas', 'Aproveite o ponto maduro em vitaminas'],
    correctOptionIndex: 1,
    explanation: 'Para uma pasta, a sugestão correspondente é amassar o abacate com limão. As outras alternativas descrevem usos em cubos ou em vitaminas.',
    sourceExcerpt: 'Amasse com limão para pastas',
  },
  {
    slug: 'alface', kind: 'CHOOSE',
    prompt: 'Uma cliente aponta folhas amassadas ao escolher alface para um sanduíche. Qual recomendação do guia trata diretamente desse sinal?',
    options: ['Folhas firmes e com cor viva', 'Miolo mais fechado costuma conservar melhor', 'Evite folhas muito amassadas'],
    correctOptionIndex: 2,
    explanation: 'A situação é sobre folhas amassadas; o guia recomenda evitá-las. Firmeza, cor e miolo são outros aspectos de escolha, mas não respondem diretamente ao sinal observado.',
    sourceExcerpt: 'Evite folhas muito amassadas',
  },
  {
    slug: 'alface', kind: 'STORE',
    prompt: 'Uma cliente pergunta quando deve lavar a alface que pretende guardar para consumir depois. O que o guia indica?',
    options: ['Lave perto do consumo quando possível', 'Use papel para absorver umidade', 'Seque antes de guardar'],
    correctOptionIndex: 0,
    explanation: 'A dúvida é sobre o momento da lavagem; o guia recomenda lavar perto do consumo quando possível. Secar e usar papel são orientações distintas sobre como guardar as folhas.',
    sourceExcerpt: 'Lave perto do consumo quando possível',
  },
  {
    slug: 'alface', kind: 'USE',
    prompt: 'Uma cliente vai montar um sanduíche com alface. Que folhas o guia sugere usar nesse preparo?',
    options: ['Misture folhas maiores e menores', 'Use as mais firmes em sanduíches', 'Tempere perto de servir para manter a textura'],
    correctOptionIndex: 1,
    explanation: 'Para o sanduíche, o guia direciona às folhas mais firmes. Misturar tamanhos e temperar perto de servir são outras sugestões de preparo.',
    sourceExcerpt: 'Use as mais firmes em sanduíches',
  },
  {
    slug: 'cebola', kind: 'CHOOSE',
    prompt: 'Um cliente quer escolher cebolas para guardar por mais tempo e pergunta o que deve evitar. O que diz o guia?',
    options: ['Prefira unidades pesadas para o tamanho', 'Evite brotos se quiser guardar por mais tempo', 'Casca seca ajuda na conservação'],
    correctOptionIndex: 1,
    explanation: 'A pergunta é sobre o que evitar para guardar por mais tempo; o guia cita os brotos. Peso para o tamanho e casca seca são outras características de escolha.',
    sourceExcerpt: 'Evite brotos se quiser guardar por mais tempo',
  },
  {
    slug: 'cebola', kind: 'STORE',
    prompt: 'Uma cliente cortou uma cebola e quer guardar a sobra. Como deve conservá-la segundo o guia?',
    options: ['Cortada: pote fechado na geladeira', 'Inteira: fora da geladeira', 'Evite guardar perto de batatas'],
    correctOptionIndex: 0,
    explanation: 'Como a cebola já foi cortada, use a orientação para essa condição: pote fechado na geladeira. A recomendação para fora da geladeira se refere à cebola inteira.',
    sourceExcerpt: 'Cortada: pote fechado na geladeira',
  },
  {
    slug: 'cebola', kind: 'USE',
    prompt: 'Uma cliente vai assar cebola cortada em rodelas. Qual sugestão do guia corresponde a esse preparo?',
    options: ['Pique fino para bases de preparo', 'Aproveite crua em vinagretes e saladas', 'Use em rodelas para assados'],
    correctOptionIndex: 2,
    explanation: 'Como o preparo é assar a cebola em rodelas, a sugestão correspondente é usá-la dessa forma. Picar fino para bases e servir crua em vinagretes são outros usos do guia.',
    sourceExcerpt: 'Use em rodelas para assados',
  },
  {
    slug: 'tomate', kind: 'CHOOSE',
    prompt: 'Um cliente vai preparar sanduíches com tomate e pergunta qual firmeza escolher. O que recomenda o guia?',
    options: ['Mais maduros para molhos e refogados', 'Casca lisa costuma indicar melhor conservação', 'Mais firmes para saladas e sanduíches'],
    correctOptionIndex: 2,
    explanation: 'Para sanduíches, o guia relaciona os tomates mais firmes a esse uso. Os mais maduros são indicados para molhos e refogados; casca lisa é uma observação geral de conservação.',
    sourceExcerpt: 'Mais firmes para saladas e sanduíches',
  },
  {
    slug: 'tomate', kind: 'STORE',
    prompt: 'Uma cliente cortou um tomate e quer guardar o restante. Qual orientação do guia se aplica?',
    options: ['Fora da geladeira enquanto amadurece', 'Cortado: refrigere em pote fechado', 'Maduro: use em pouco tempo'],
    correctOptionIndex: 1,
    explanation: 'Como o tomate foi cortado, a orientação específica é refrigerá-lo em pote fechado. A opção de deixá-lo fora da geladeira se refere ao amadurecimento; a outra trata do tomate maduro.',
    sourceExcerpt: 'Cortado: refrigere em pote fechado',
  },
  {
    slug: 'tomate', kind: 'USE',
    prompt: 'Uma cliente tem tomates maduros e quer preparar um molho. Qual sugestão do guia atende a esse caso?',
    options: ['Maduro em molhos e sopas', 'Cru em saladas e sanduíches', 'Assado para concentrar sabor'],
    correctOptionIndex: 0,
    explanation: 'O guia associa o tomate maduro a molhos e sopas, que corresponde ao preparo pedido. As outras opções indicam consumo cru ou preparo assado.',
    sourceExcerpt: 'Maduro em molhos e sopas',
  },
  {
    slug: 'abacaxi', kind: 'CHOOSE',
    prompt: 'Um cliente compara dois abacaxis: um tem uma parte mole na casca e o outro está firme. Que orientação ajuda a escolher?',
    options: ['Observe se a casca está firme e sem partes moles', 'Escolha o que tem a parte mole, mesmo sem firmeza', 'A firmeza da casca não importa para esta escolha'],
    correctOptionIndex: 0,
    explanation: 'O guia orienta observar a firmeza da casca e evitar partes moles, então o primeiro abacaxi não atende ao critério descrito. O aroma adocicado na base aparece como outro sinal, mas não substitui essa verificação nesta comparação.',
    sourceExcerpt: 'Observe se a casca está firme e sem partes moles',
  },
  {
    slug: 'abacaxi', kind: 'STORE',
    prompt: 'Uma cliente cortou um abacaxi e quer guardar o que sobrou. Qual orientação do guia se aplica a essa condição?',
    options: ['Deixe o abacaxi cortado em local arejado', 'Guarde o abacaxi cortado fora de um pote fechado', 'Depois de cortar, mantenha refrigerado em pote fechado'],
    correctOptionIndex: 2,
    explanation: 'A recomendação para a fruta cortada combina refrigeração e pote fechado. A orientação de local arejado é para o abacaxi inteiro, por isso não responde à situação da sobra já cortada.',
    sourceExcerpt: 'Depois de cortar, mantenha refrigerado em pote fechado',
  },
  {
    slug: 'abacaxi', kind: 'USE',
    prompt: 'Um cliente quer servir abacaxi em um preparo quente. Que sugestão do guia atende ao pedido?',
    options: ['Use em cubos para sucos e saladas', 'Sirva somente cru, sem assar ou grelhar', 'Também funciona bem assado ou grelhado'],
    correctOptionIndex: 2,
    explanation: 'Para um preparo quente, o guia sugere assar ou grelhar o abacaxi. Os cubos para sucos e saladas são outra forma de aproveitamento, mas não correspondem ao preparo pedido.',
    sourceExcerpt: 'Também funciona bem assado ou grelhado',
  },
  {
    slug: 'agriao', kind: 'CHOOSE',
    prompt: 'Uma cliente está comparando maços de agrião para levar para casa. Qual característica o guia recomenda procurar nas folhas?',
    options: ['Escolha folhas pequenas e firmes', 'Folhas grandes, mesmo que estejam sem firmeza', 'Escolher sem observar tamanho nem firmeza'],
    correctOptionIndex: 0,
    explanation: 'A orientação reúne dois critérios para as folhas: tamanho pequeno e firmeza. As outras alternativas retiram ou contradizem esses critérios, então não seguem a indicação do guia.',
    sourceExcerpt: 'Escolha folhas pequenas e firmes',
  },
  {
    slug: 'agriao', kind: 'STORE',
    prompt: 'Um cliente pergunta como guardar o agrião depois das compras. Qual resposta reúne as duas orientações do guia?',
    options: ['Deixe em temperatura ambiente e úmido', 'Refrigere, mas guarde ainda molhado', 'Mantenha refrigerado e seco'],
    correctOptionIndex: 2,
    explanation: 'O guia reúne refrigeração e condição seca na mesma recomendação. As outras respostas trocam uma das duas condições indicadas, por isso não reproduzem a orientação completa.',
    sourceExcerpt: 'Mantenha refrigerado e seco',
  },
  {
    slug: 'agriao', kind: 'USE',
    prompt: 'Uma cliente quer incluir agrião em uma sopa ou em um refogado rápido. O que você pode sugerir com base no guia?',
    options: ['Use cru em saladas para destacar o sabor', 'Também pode entrar em sopas e refogados rápidos', 'Não inclua agrião em preparos quentes'],
    correctOptionIndex: 1,
    explanation: 'O guia cita sopas e refogados rápidos como formas de uso do agrião, que correspondem ao preparo escolhido. A salada crua também é sugerida, mas responde a outro tipo de prato.',
    sourceExcerpt: 'Também pode entrar em sopas e refogados rápidos',
  },
  {
    slug: 'batata', kind: 'CHOOSE',
    prompt: 'Um cliente encontra batatas com brotos e pergunta se esse é o lote indicado pelo guia para escolher. Como orientar?',
    options: ['Prefira as batatas com brotos', 'Ignore os brotos ao escolher as batatas', 'Evite batatas com brotos'],
    correctOptionIndex: 2,
    explanation: 'O critério de escolha do guia é evitar batatas com brotos. As duas primeiras alternativas recomendam ignorar ou preferir justamente a condição que a orientação manda evitar; isso não implica uma recomendação sobre descarte ou segurança.',
    sourceExcerpt: 'Evite batatas com brotos',
  },
  {
    slug: 'batata', kind: 'STORE',
    prompt: 'Uma cliente pergunta onde guardar batatas inteiras em casa. Qual local atende à orientação do guia?',
    options: ['Guarde em local seco e escuro', 'Em local claro e úmido', 'Em local úmido, mesmo que fique escuro'],
    correctOptionIndex: 0,
    explanation: 'A recomendação combina um local seco com um local escuro. As outras opções deixam de atender ao menos uma dessas condições descritas pelo guia.',
    sourceExcerpt: 'Guarde em local seco e escuro',
  },
  {
    slug: 'batata', kind: 'USE',
    prompt: 'Uma cliente tem batata já cozida que sobrou e quer aproveitá-la em outro prato. Qual possibilidade o guia apresenta?',
    options: ['O guia indica a sobra cozida apenas para purês', 'Se estiver cozida sobrando, aproveite em saladas e recheios', 'O guia não dá orientação para aproveitar batata cozida que sobrou'],
    correctOptionIndex: 1,
    explanation: 'Para a batata cozida que sobrou, o guia sugere saladas e recheios. Purês, assados e sopas aparecem como usos da batata em geral, mas não são a orientação específica para a sobra cozida.',
    sourceExcerpt: 'Se estiver cozida sobrando, aproveite em saladas e recheios',
  },
  {
    slug: 'cenoura', kind: 'CHOOSE',
    prompt: 'Uma cliente escolhe cenouras para ralar. Qual delas atende aos dois critérios de escolha indicados no guia?',
    options: ['A que está firme, mesmo sem superfície lisa', 'A que está lisa, mesmo sem firmeza', 'Prefira unidades firmes e lisas'],
    correctOptionIndex: 2,
    explanation: 'O guia recomenda preferir unidades que sejam firmes e lisas. Cada uma das outras alternativas considera apenas um dos dois critérios, deixando de cumprir a recomendação completa.',
    sourceExcerpt: 'Prefira unidades firmes e lisas',
  },
  {
    slug: 'cenoura', kind: 'STORE',
    prompt: 'Um cliente pergunta onde guardar as cenouras depois de levá-las para casa. Que orientação consta no guia?',
    options: ['Guarde em local seco e escuro', 'Guarde refrigerada', 'Deixe fora da geladeira'],
    correctOptionIndex: 1,
    explanation: 'A orientação disponível para conservar cenouras é guardá-las refrigeradas. As outras alternativas sugerem locais diferentes da recomendação indicada pelo guia.',
    sourceExcerpt: 'Guarde refrigerada',
  },
  {
    slug: 'cenoura', kind: 'USE',
    prompt: 'Uma cliente vai preparar um recheio e pergunta como pode incluir cenoura conforme o guia. Qual sugestão se encaixa?',
    options: ['Rale para saladas e recheios', 'Use a cenoura inteira, sem ralá-la', 'Reserve a cenoura ralada apenas para sucos'],
    correctOptionIndex: 0,
    explanation: 'O guia sugere ralar a cenoura para saladas e recheios, então essa forma atende ao prato mencionado. A alternativa que limita a cenoura ralada a sucos contradiz os usos listados.',
    sourceExcerpt: 'Rale para saladas e recheios',
  },
  {
    slug: 'couve', kind: 'CHOOSE',
    prompt: 'Uma cliente compara folhas de couve firmes, algumas com amarelado e outras sem. Quais deve priorizar segundo o guia?',
    options: ['Folhas sem firmeza e sem amarelado', 'Folhas firmes, mesmo com amarelado', 'Escolha folhas firmes e sem amarelado'],
    correctOptionIndex: 2,
    explanation: 'A recomendação reúne firmeza e ausência de amarelado. As duas primeiras alternativas atendem apenas a uma parte do critério, enquanto a terceira reúne as duas características pedidas.',
    sourceExcerpt: 'Escolha folhas firmes e sem amarelado',
  },
  {
    slug: 'couve', kind: 'STORE',
    prompt: 'Um cliente pergunta onde colocar a couve para conservá-la. Qual é a orientação disponível no guia?',
    options: ['Conserve refrigerada', 'Deixe em local seco e escuro', 'Mantenha fora da geladeira'],
    correctOptionIndex: 0,
    explanation: 'Para a couve, o guia indica conservação refrigerada. As demais opções sugerem outras condições que não correspondem à orientação registrada.',
    sourceExcerpt: 'Conserve refrigerada',
  },
  {
    slug: 'couve', kind: 'USE',
    prompt: 'Uma cliente quer refogar couve rapidamente. Como o guia recomenda cortá-la para esse preparo?',
    options: ['Mantenha as folhas inteiras para refogar rápido', 'Corte fino para refogar rápido', 'Corte em tiras finas e sirva crua'],
    correctOptionIndex: 1,
    explanation: 'Para o refogado rápido, a indicação é cortar a couve finamente. As tiras finas cruas correspondem a outra forma de uso descrita no guia, e manter as folhas inteiras não segue a instrução de corte para esse preparo.',
    sourceExcerpt: 'Corte fino para refogar rápido',
  },
  {
    slug: 'manga', kind: 'CHOOSE',
    prompt: 'Uma cliente avalia uma manga para levar e pergunta quais sinais deve observar conforme o guia. O que responder?',
    options: ['Verifique somente a cor, sem tocar nem sentir o aroma', 'Verifique aroma e leve maciez', 'Escolha apenas a manga muito macia, sem considerar o aroma'],
    correctOptionIndex: 1,
    explanation: 'A orientação de escolha cita conjuntamente aroma e leve maciez. As outras alternativas substituem esses sinais por um critério isolado ou por uma condição diferente da maciez leve mencionada.',
    sourceExcerpt: 'Verifique aroma e leve maciez',
  },
  {
    slug: 'manga', kind: 'STORE',
    prompt: 'Um cliente tem uma manga que ainda precisa amadurecer e pergunta onde deixá-la nesse período. Qual orientação do guia se aplica?',
    options: ['Coloque na geladeira enquanto amadurece', 'Deixe amadurecer fora da geladeira', 'O guia recomenda amadurecer apenas refrigerada'],
    correctOptionIndex: 1,
    explanation: 'Para a etapa em que a manga ainda vai amadurecer, o guia orienta deixá-la fora da geladeira. As outras alternativas indicam refrigeração para esse mesmo período, contrariando a recomendação disponível.',
    sourceExcerpt: 'Deixe amadurecer fora da geladeira',
  },
  {
    slug: 'manga', kind: 'USE',
    prompt: 'Uma cliente tem mangas bem maduras e quer preparar uma bebida ou um creme. Que sugestão do guia se encaixa?',
    options: ['Se estiver bem madura, aproveite em sucos e cremes', 'Use somente em cubos para saladas e sobremesas', 'Evite usar manga madura em sucos ou cremes'],
    correctOptionIndex: 0,
    explanation: 'O guia relaciona mangas bem maduras a sucos e cremes, que correspondem ao preparo pedido. O uso em cubos para saladas e sobremesas é outra sugestão, mas não é a orientação específica para a fruta bem madura.',
    sourceExcerpt: 'Se estiver bem madura, aproveite em sucos e cremes',
  },
];

// Correct answers must be traceable to the guide. Distractors are editorial
// choices for the scenario and are not presented as facts from the guide.
export function buildTrainingDrafts(product: SeedProduct) {
  return TRAINING_EDITORIAL_REVISIONS.flatMap(revision => {
    if (revision.slug !== product.slug) return [];
    const section = product.guideSections.find(item => item.kind === revision.kind);
    const legacySource = revision.kind === 'CHOOSE' ? product.howToChoose
      : revision.kind === 'STORE' ? product.howToStore : product.usageTips;
    const sourceFacts = section
      ? [...section.bullets, ...section.idealPoints, section.body]
      : product.guideSections.length === 0 ? legacySource : [];
    const normalizedOptions = revision.options.map(option => option.trim().toLocaleLowerCase('pt-BR'));
    const distinctOptions = new Set(normalizedOptions);
    if (!sourceFacts.map(value => value.trim()).includes(revision.sourceExcerpt) ||
      revision.options[revision.correctOptionIndex] !== revision.sourceExcerpt ||
      distinctOptions.size !== 3 || revision.options.some(option => !option.trim()) ||
      revision.correctOptionIndex < 0 || revision.correctOptionIndex >= revision.options.length ||
      revision.prompt.trim().length < 5 || revision.prompt.length > 500 ||
      revision.options.some(option => option.length > 300) ||
      revision.explanation.trim().length < 5 || revision.explanation.length > 2000) return [];

    const sourceTitle = section?.title ?? (revision.kind === 'CHOOSE' ? 'Como escolher'
      : revision.kind === 'STORE' ? 'Como conservar' : 'Como aproveitar');

    return [{
      productId: product.id, seedKey: `quick-training-v1:${product.slug}:${revision.kind}`,
      prompt: revision.prompt, options: [...revision.options],
      correctOptionIndex: revision.correctOptionIndex, explanation: revision.explanation,
      sourceReference: `${product.name} — ${sourceTitle}: “${revision.sourceExcerpt}”`,
      sortOrder: revision.kind === 'CHOOSE' ? 0 : revision.kind === 'STORE' ? 1 : 2,
      isPublished: false, isDemo: true,
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
