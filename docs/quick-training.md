# Treinamento rápido

Módulo aditivo: usa os mesmos JWT, JwtAuthGuard, RolesGuard e papéis USER/ADMIN da API. Não altera login, produtos, artigos ou favoritos.

## Contratos

Todos os endpoints exigem Bearer. Os índices de alternativas começam em zero.

| Método e caminho | Permissão | Resultado |
|---|---|---|
| GET `/training/products/:productId` | Autenticado | Produto, perguntas publicadas e progresso pessoal |
| GET `/training/progress` | Autenticado | Progresso por produto ativo com perguntas publicadas |
| POST `/training/questions/:questionId/answers` | Autenticado | Correção, alternativa correta, explicação e referência; registra tentativa |
| GET `/admin/training/products/:productId/questions` | ADMIN | Todas as perguntas do produto, incluindo gabarito e rascunhos |
| POST `/admin/training/products/:productId/questions` | ADMIN | Cria pergunta |
| PATCH `/admin/training/products/:productId/questions/:questionId` | ADMIN | Salva formulário completo; exige version atual |

O GET do funcionário projeta somente `id`, `prompt`, `options`, `sortOrder` e `version`. Não retorna explicação, referência, tentativas ou gabarito. O progresso não aceita userId fornecido pelo cliente: usa o usuário do token.

Resposta:

```json
{"selectedOptionIndex": 1, "version": 1, "submissionKey": "training-unique-retry-key"}
```

O cliente conserva a mesma chave ao repetir um envio cuja resposta se perdeu. A restrição única `(userId, submissionKey)` impede tentativas duplicadas inclusive em requisições simultâneas. Uma nova rodada usa novas chaves. Reutilizar a chave com outra pergunta, alternativa ou revisão retorna 409.

Formulário administrativo:

```json
{
  "prompt": "Qual orientação consta no guia?",
  "options": ["Primeira alternativa", "Segunda alternativa", "Terceira alternativa"],
  "correctOptionIndex": 0,
  "explanation": "Explicação educativa revisada.",
  "sourceReference": "Produto — seção do guia: trecho de referência.",
  "sortOrder": 0,
  "isPublished": false
}
```

PATCH envia também `version`. Há validação de 3–4 alternativas não vazias e distintas, índice existente, limites de texto e ordem. Campos desconhecidos são rejeitados pelo ValidationPipe existente. Publicação deve ser um booleano real, inclusive com conversão implícita global habilitada.

Para criar ou editar com `isPublished=true`, `sourceReference` é obrigatória: texto não vazio após trim, com até 2000 caracteres. Valores ausentes, nulos, só com espaços ou de outro tipo são rejeitados pela API; o serviço também impede publicação sem referência. Rascunhos continuam aceitando referência ausente ou vazia. Nenhum dado existente é publicado ou modificado automaticamente por essa regra.

Perguntas/produtos inativos retornam 404 e não aceitam novas tentativas. Revisão desatualizada retorna 409. Respostas são corrigidas e gravadas na mesma transação, com lock compartilhado da pergunta; edição usa lock exclusivo.

## Persistência e progresso

`TrainingQuestion` vincula produto, conteúdo, opções, gabarito, referência, ordem, publicação, origem de demonstração e versão. `TrainingAttempt` vincula usuário/pergunta e conserva o resultado, versão e feedback daquela tentativa.

Para cada pergunta publicada, considera-se a tentativa mais recente pelo identificador sequencial, apenas do usuário autenticado. `answered` conta respostas atuais; `correct` conta as corretas; `percent` é `correct / total`, arredondado. Tentativas de outros usuários não entram no cálculo.

Editar enunciado, opções, gabarito, explicação ou referência incrementa a revisão: respostas antigas continuam no histórico, mas deixam de contar no progresso do conteúdo revisado. Alterar somente ordem/publicação não incrementa a revisão. Perguntas desativadas saem do total. Não há exclusão definitiva pela interface desta versão.

Migração: `prisma/migrations/20261018000000_quick_training/migration.sql`. Cria somente as duas tabelas, índices, FKs e CHECKs. Não altera dados antigos. O cliente Prisma gerado é versionado neste repositório e foi regenerado.

## Conteúdo inicial e seed

São preparados três rascunhos para cada um dos 11 produtos do seed, quando houver referência suficiente: escolha, conservação e aproveitamento. A resposta correta e a explicação citam literalmente o guia visual atual; nos produtos sem seções visuais, usam as listas existentes de escolha/conservação/uso que alimentam o guia legado. Não se acrescentam alegações sobre nutrição, prazos ou segurança alimentar.

Todos começam `isDemo=true`, `isPublished=false`. Os distratores são introdutórios e também precisam de revisão editorial. Publicar pela área administrativa marca o conteúdo como revisado (`isDemo=false`). Não se deve interpretar a presença no seed como aprovação técnica do conteúdo alimentar.

Chaves estáveis `quick-training-v1:<slug>:<tema>` e upserts com `update: {}` preservam edições, publicação e desativação posteriores. Temas sem fonte suficiente são omitidos. Não são criados produtos artificiais.

Em banco que já tem catálogo, execute **somente** o novo seed:

```powershell
npx ts-node scripts/seed-training.ts
```

Esse comando usa DATABASE_URL e deve ser apontado explicitamente para o ambiente pretendido. O seed geral anterior tem efeitos editoriais sobre artigos/autor; não o use para atualizar apenas treinamentos em um banco existente. Nesta etapa nenhum seed ou migração foi executado em produção.

## Validação local isolada

Exemplo PowerShell, na raiz do backend. A porta só é publicada em loopback; use nome próprio caso já exista um container de testes.

```powershell
docker run -d --name hortivia-training-test-local --publish 127.0.0.1:55439:5432 --env POSTGRES_USER=training --env POSTGRES_PASSWORD=local-training-only --env POSTGRES_DB=hortivia_training_test postgres:16-alpine
$env:DATABASE_URL='postgresql://training:local-training-only@127.0.0.1:55439/hortivia_training_test?schema=public'
$env:TRAINING_TEST_DATABASE_URL=$env:DATABASE_URL
npm ci
npx prisma validate
npm run prisma:generate
npx prisma migrate deploy
# Somente no banco descartável recém-criado, para criar os 11 produtos:
npx ts-node prisma/seed.ts
npm run build
npm run lint
npm test -- --runInBand
```

O teste HTTP de treinamento exige TRAINING_TEST_DATABASE_URL local com nome iniciado por `hortivia_training_test`; sem essa variável fica explicitamente pendente. Testa guards JWT reais, validação HTTP, criação/edição, sigilo do gabarito, correção, histórico, progresso isolado, repetição, concorrência/idempotência, desativação, revisões, CHECKs e seed. Nunca aponte esses testes para banco real da loja.

## Demonstração integrada com o frontend

Após preparar o banco acima, em outro terminal do backend:

```powershell
$env:TRAINING_TEST_DATABASE_URL='postgresql://training:local-training-only@127.0.0.1:55439/hortivia_training_test?schema=public'
$env:TRAINING_DEMO_FIXTURE_FILE=Join-Path $env:TEMP 'hortivia-training-demo.json'
npx ts-node test/start-training-demo.ts
```

O helper sobe somente o módulo real de treinamento em `http://127.0.0.1:3109`, com os guards reais e banco local. Cria usuários descartáveis e JWTs exclusivos de teste com validade de uma hora. Não carrega `.env`, não é parte do AppModule e não constitui outro sistema de login do aplicativo.

Na raiz do frontend, com o mesmo caminho de fixture:

```powershell
$env:TRAINING_DEMO_FIXTURE_FILE=Join-Path $env:TEMP 'hortivia-training-demo.json'
npm test -- --runInBand
```

O helper copia o conteúdo de Banana para um produto exclusivo do teste, sem alterar os 33 rascunhos editoriais. O teste live publica explicitamente essas cópias como administrador, renderiza a tela React Native, responde três perguntas via Axios/HTTP real, verifica 2/3 acertos (67%), repete a primeira com erro e verifica 1/3 (33%). Gera `live-flow.json` e a árvore da tela final junto à fixture. O adapter Node é usado apenas no processo Jest; o transporte React Native de produção não é modificado.

Encerre o helper com Ctrl+C. O container de testes pode ser parado com `docker stop hortivia-training-test-local`. A fixture contém apenas tokens locais, mas deve continuar fora do Git.

Para teste manual do aplicativo completo, suba a API normal com banco/SMTP locais e uma conta local autorizada, configure a URL central do frontend para esse ambiente de desenvolvimento e use a área Conteúdo → Treinamentos para revisar/publicar. O helper restrito acima não disponibiliza os demais endpoints do app.
