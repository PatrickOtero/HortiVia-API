# Etapa 12 — revisão pedagógica do Treinamento Rápido

## Atualização controlada em homologação

O seed de treinamento permanece não destrutivo (`update: {}`). Para revisar as 29 propostas em um banco de homologação existente, use o comando explícito abaixo. Sem `--apply`, ele apenas lista versões, conflitos, conteúdo atual e proposta; não grava dados.

```powershell
$env:TRAINING_HOMOLOGATION_DATABASE_URL = '<conexão exclusiva do banco de homologação>'
npm run training:editorial
```

Após revisar a prévia e confirmar o alvo, a aplicação exige o nome do banco conter `homolog` ou `staging` e a confirmação exata de host/banco:

```powershell
$target = 'homolog-db.internal/hortivia_training_homolog'
npx ts-node scripts/apply-training-editorial.ts --apply "--confirm-target=$target"
```

O comando não usa `DATABASE_URL`, recusa `NODE_ENV=production`, não cria perguntas ausentes, preserva perguntas já publicadas, e bloqueia todo o lote se encontrar versão inesperada ou conteúdo divergente. Somente rascunhos intactos na versão inicial são elegíveis. Os dados passam pela validação `SaveQuestionDto` e pelo `TrainingService.update`; qualquer revisão continua explicitamente não publicada. Esta etapa adicionou o mecanismo, mas não o executou contra homologação.

Fonte: conteúdo aprovado dos produtos e perguntas `seedKey` no banco local `hortivia_training_test`. As atualizações das Etapas 12.1 e 12.2 foram validadas pelo `SaveQuestionDto` e aplicadas por `TrainingService.update`; o banco de produção não foi acessado.

## Resultado

- **29 perguntas de semente revisadas** no banco local: 11 na Etapa 12.1 e 18 na Etapa 12.2, todas mantidas como rascunho (`isPublished=false`).
- **Nenhuma das 18 propostas permanece pendente por falta de conteúdo**; os distratores são editoriais, enquanto gabaritos e explicações são sustentados pelo guia.
- **Quatro perguntas publicadas entre as 33 sementes foram preservadas**, junto com quatro registros auxiliares publicados existentes no banco local.
- O snapshot continha 37 linhas no total (33 sementes e quatro registros auxiliares); o seed mantém `update: {}` e não sobrescreve alterações futuras.
- Os índices corretos das 29 perguntas estão balanceados (9, 10 e 10). Não foram acrescentados prazos, características nutricionais nem regras de segurança alimentar.

## Perguntas atualizadas na Etapa 12.1

| Produto / tema | Situação proposta | Alternativas (✓ = gabarito) | Explicação | Referência |
|---|---|---|---|---|
| Abacate / Conservação | “Um cliente tem um abacate inteiro e verde e quer saber onde deixá-lo enquanto amadurece. Qual orientação do guia se aplica?” | 1. “Maduro: geladeira por pouco tempo”<br>2. “Aberto: refrigerado e bem protegido”<br>3 ✓. “Inteiro e verde: temperatura ambiente” | “Como o fruto ainda está inteiro e verde, aplique a recomendação indicada para esse estado: deixá-lo em temperatura ambiente. As outras opções se referem ao fruto maduro ou aberto.” | “Abacate — Como conservar: Inteiro e verde: temperatura ambiente” |
| Abacate / Aproveitamento | “Uma cliente quer preparar uma pasta de abacate. Qual sugestão do guia combina com esse preparo?” | 1. “Use em cubos para saladas”<br>2 ✓. “Amasse com limão para pastas”<br>3. “Aproveite o ponto maduro em vitaminas” | “Para uma pasta, a sugestão correspondente é amassar o abacate com limão. As outras alternativas descrevem usos em cubos ou em vitaminas.” | “Abacate — Como aproveitar: Amasse com limão para pastas” |
| Alface / Escolha | “Uma cliente aponta folhas amassadas ao escolher alface para um sanduíche. Qual recomendação do guia trata diretamente desse sinal?” | 1. “Folhas firmes e com cor viva”<br>2. “Miolo mais fechado costuma conservar melhor”<br>3 ✓. “Evite folhas muito amassadas” | “A situação é sobre folhas amassadas; o guia recomenda evitá-las. Firmeza, cor e miolo são outros aspectos de escolha, mas não respondem diretamente ao sinal observado.” | “Alface — Como escolher: Evite folhas muito amassadas” |
| Alface / Conservação | “Uma cliente pergunta quando deve lavar a alface que pretende guardar para consumir depois. O que o guia indica?” | 1 ✓. “Lave perto do consumo quando possível”<br>2. “Use papel para absorver umidade”<br>3. “Seque antes de guardar” | “A dúvida é sobre o momento da lavagem; o guia recomenda lavar perto do consumo quando possível. Secar e usar papel são orientações distintas sobre como guardar as folhas.” | “Alface — Como conservar: Lave perto do consumo quando possível” |
| Alface / Aproveitamento | “Uma cliente vai montar um sanduíche com alface. Que folhas o guia sugere usar nesse preparo?” | 1. “Misture folhas maiores e menores”<br>2 ✓. “Use as mais firmes em sanduíches”<br>3. “Tempere perto de servir para manter a textura” | “Para o sanduíche, o guia direciona às folhas mais firmes. Misturar tamanhos e temperar perto de servir são outras sugestões de preparo.” | “Alface — Como aproveitar: Use as mais firmes em sanduíches” |
| Cebola / Escolha | “Um cliente quer escolher cebolas para guardar por mais tempo e pergunta o que deve evitar. O que diz o guia?” | 1. “Prefira unidades pesadas para o tamanho”<br>2 ✓. “Evite brotos se quiser guardar por mais tempo”<br>3. “Casca seca ajuda na conservação” | “A pergunta é sobre o que evitar para guardar por mais tempo; o guia cita os brotos. Peso para o tamanho e casca seca são outras características de escolha.” | “Cebola — Como escolher: Evite brotos se quiser guardar por mais tempo” |
| Cebola / Conservação | “Uma cliente cortou uma cebola e quer guardar a sobra. Como deve conservá-la segundo o guia?” | 1 ✓. “Cortada: pote fechado na geladeira”<br>2. “Inteira: fora da geladeira”<br>3. “Evite guardar perto de batatas” | “Como a cebola já foi cortada, use a orientação para essa condição: pote fechado na geladeira. A recomendação para fora da geladeira se refere à cebola inteira.” | “Cebola — Como conservar: Cortada: pote fechado na geladeira” |
| Cebola / Aproveitamento | “Uma cliente vai assar cebola cortada em rodelas. Qual sugestão do guia corresponde a esse preparo?” | 1. “Pique fino para bases de preparo”<br>2. “Aproveite crua em vinagretes e saladas”<br>3 ✓. “Use em rodelas para assados” | “Como o preparo é assar a cebola em rodelas, a sugestão correspondente é usá-la dessa forma. Picar fino para bases e servir crua em vinagretes são outros usos do guia.” | “Cebola — Como aproveitar: Use em rodelas para assados” |
| Tomate / Escolha | “Um cliente vai preparar sanduíches com tomate e pergunta qual firmeza escolher. O que recomenda o guia?” | 1. “Mais maduros para molhos e refogados”<br>2. “Casca lisa costuma indicar melhor conservação”<br>3 ✓. “Mais firmes para saladas e sanduíches” | “Para sanduíches, o guia relaciona os tomates mais firmes a esse uso. Os mais maduros são indicados para molhos e refogados; casca lisa é uma observação geral de conservação.” | “Tomate — Como escolher: Mais firmes para saladas e sanduíches” |
| Tomate / Conservação | “Uma cliente cortou um tomate e quer guardar o restante. Qual orientação do guia se aplica?” | 1. “Fora da geladeira enquanto amadurece”<br>2 ✓. “Cortado: refrigere em pote fechado”<br>3. “Maduro: use em pouco tempo” | “Como o tomate foi cortado, a orientação específica é refrigerá-lo em pote fechado. A opção de deixá-lo fora da geladeira se refere ao amadurecimento; a outra trata do tomate maduro.” | “Tomate — Como conservar: Cortado: refrigere em pote fechado” |
| Tomate / Aproveitamento | “Uma cliente tem tomates maduros e quer preparar um molho. Qual sugestão do guia atende a esse caso?” | 1 ✓. “Maduro em molhos e sopas”<br>2. “Cru em saladas e sanduíches”<br>3. “Assado para concentrar sabor” | “O guia associa o tomate maduro a molhos e sopas, que corresponde ao preparo pedido. As outras opções indicam consumo cru ou preparo assado.” | “Tomate — Como aproveitar: Maduro em molhos e sopas” |

## Etapa 12.2 — revisão dos 18 itens restantes

As 18 perguntas de Abacaxi, Agrião, Batata, Cenoura, Couve e Manga foram reescritas em situações de atendimento. O gabarito, a explicação e a referência seguem o trecho aprovado do produto. Os distratores são alternativas editoriais feitas para a situação e não são apresentados como fatos do guia; quando não havia outro fato suficiente, foram construídos como orientações contraditórias ao trecho disponível.

As perguntas passaram pelo `SaveQuestionDto` e foram atualizadas no PostgreSQL local por `TrainingService.update`, com versionamento de 1 para 2. Após uma revisão adicional, Abacaxi / Escolha e Batata / Aproveitamento passaram à versão 3 pelo mesmo serviço. Todas permanecem rascunhos e não foram publicadas. As 11 revisões anteriores e todas as perguntas publicadas foram preservadas. Não restam itens pendentes entre essas 18 propostas.

O snapshot local anterior à atualização registrava 33 perguntas com `seedKey` do treinamento, mais quatro registros auxiliares de teste (37 linhas no total). Entre as 33 sementes, quatro estavam publicadas; havia também quatro perguntas publicadas auxiliares. Todas as oito linhas publicadas foram comparadas ao snapshot e permaneceram inalteradas. O seed continua com `update: {}`.
