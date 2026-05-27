# Backend setup

## InstalaÃ§Ã£o

```bash
npm install
cp .env.example .env
```

Preencha o `.env` com valores reais antes de subir a aplicaÃ§Ã£o.

## VariÃ¡veis de ambiente

ObrigatÃ³rias:

- `DATABASE_URL`
- `JWT_SECRET`
- `NODEMAILER_HOST`
- `NODEMAILER_USER`
- `NODEMAILER_PASS`
- `NODEMAILER_PORT`
- `NODEMAILER_SECURE`
- `NODEMAILER_REQUIRE_TLS`
- `NODEMAILER_FROM`
- `EMAIL_CONFIRMATION_CODE_EXPIRES_IN_MINUTES`
- `EMAIL_CONFIRMATION_RESEND_COOLDOWN_SECONDS`
- `EMAIL_CONFIRMATION_MAX_ATTEMPTS`
- `PASSWORD_RESET_CODE_EXPIRES_IN_MINUTES`
- `PASSWORD_RESET_RESEND_COOLDOWN_SECONDS`
- `PASSWORD_RESET_MAX_ATTEMPTS`

Opcionais:

- `PORT`
- `NODE_ENV`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_ACCESS_KEY`
- `CLOUDFLARE_ACCESS_SECRET_KEY`
- `CLOUDFLARE_BUCKET_NAME`
- `CLOUDFLARE_PUBLIC_BASE_URL`

Notas:

- a configuraÃ§Ã£o atual usa `DATABASE_URL`
- `DIRECT_URL` nÃ£o Ã© necessÃ¡rio neste projeto
- no Northflank, os valores numÃ©ricos devem ser informados como inteiros simples
- uploads dependem da configuraÃ§Ã£o completa das variÃ¡veis de armazenamento

## Prisma

Gerar client:

```bash
npm run prisma:generate
```

Validar schema:

```bash
npx prisma validate
```

Aplicar migrations:

```bash
npm run prisma:migrate:deploy
```

Seed:

```bash
npm run prisma:seed
```

O seed Ã© idempotente, popula conteÃºdos iniciais e nÃ£o cria um ADMIN com credenciais fixas.

## ExecuÃ§Ã£o local

Desenvolvimento:

```bash
npm run start:dev
```

Build:

```bash
npm run build
npm run start:prod
```

Health check:

```bash
GET /health
```

## Admin bootstrap

Fluxo recomendado:

1. registrar um usuÃ¡rio normalmente
2. promover esse usuÃ¡rio para ADMIN

```bash
npm run admin:promote -- --email pessoa@exemplo.com
```

TambÃ©m Ã© possÃ­vel promover manualmente no banco, com cuidado no ambiente alvo.

## Uploads

Avatar:

- endpoint: `POST /profile/avatar`
- auth: JWT obrigatÃ³rio
- campo: `avatar`
- tipos: `image/jpeg`, `image/png`, `image/webp`
- limite: `2 MB`

Produto e artigo:

- endpoints: `POST /products/:id/image` e `POST /articles/:id/image`
- auth: JWT obrigatÃ³rio
- role: `ADMIN`
- campo: `image`
- tipos: `image/jpeg`, `image/png`, `image/webp`
- limite: `5 MB`

## Guias visuais de produto

O mÃ³dulo de produtos agora aceita dois blocos estruturados para enriquecer o detalhe:

- `ProductImage`
- `ProductGuideSection`

### ProductImage

Campos principais:

- `url`
- `alt`
- `caption`
- `kind`
- `sortOrder`
- `isPrimary`

Enums disponÃ­veis em `ProductImageKind`:

- `HERO`
- `WHOLE`
- `CUT`
- `IDEAL_STATE`
- `UNRIPE_STATE`
- `DEFECT`
- `STORAGE`
- `USAGE`
- `OTHER`

Regra:

- quando uma imagem Ã© salva com `isPrimary=true`, as outras imagens do mesmo produto passam a `false`

### ProductGuideSection

Campos principais:

- `kind`
- `title`
- `body`
- `imageUrl`
- `imageAlt`
- `imageCaption`
- `bullets`
- `idealPoints`
- `avoidPoints`
- `sortOrder`

Enums disponÃ­veis em `ProductGuideSectionKind`:

- `CHOOSE`
- `OBSERVE`
- `STORE`
- `USE`
- `QUICK_FACTS`
- `OTHER`

### Resposta do detalhe de produto

AlÃ©m dos campos jÃ¡ existentes, `GET /products/:id` agora retorna:

- `mainImages`
- `guideSections`

Compatibilidade:

- `imageUrl` permanece no payload
- quando nÃ£o houver registros em `ProductImage`, `mainImages` faz fallback para `imageUrl`
- a listagem `GET /products` continua leve e nÃ£o carrega seÃ§Ãµes completas

### Endpoints administrativos

JWT obrigatÃ³rio e role `ADMIN`:

- `POST /products/:productId/images`
- `PATCH /products/:productId/images/:imageId`
- `DELETE /products/:productId/images/:imageId`
- `POST /products/:productId/guide-sections`
- `PATCH /products/:productId/guide-sections/:sectionId`
- `DELETE /products/:productId/guide-sections/:sectionId`

## Favoritos de produto

JWT obrigatÃ³rio:

- `POST /products/:productId/favorite`
- `DELETE /products/:productId/favorite`
- `GET /favorites/products`

Regras:

- o favorito Ã© idempotente por usuÃ¡rio e produto
- a listagem retorna os itens paginados em ordem de favorito mais recente
- o catÃ¡logo pÃºblico continua pÃºblico e nÃ£o depende de autenticaÃ§Ã£o para listar produtos

## Leituras salvas

JWT obrigatÃ³rio:

- `POST /articles/:articleId/save`
- `DELETE /articles/:articleId/save`
- `GET /saved/articles`

Regras:

- salvar e remover sÃ£o operaÃ§Ãµes idempotentes por usuÃ¡rio e artigo
- a listagem retorna os itens paginados em ordem de salvamento mais recente
- apenas artigos publicados entram na listagem
- `GET /articles` e `GET /articles/:id` continuam pÃºblicos
- o campo `isSaved` pode vir como `false` fora do contexto autenticado e como `true` na listagem de leituras salvas

## Conteúdo editorial de artigos

O modelo de artigos agora suporta campos editoriais mais ricos sem quebrar a compatibilidade do feed atual.

Campos adicionais em `Article`:

- `subtitle`
- `coverImageUrl`
- `coverImageAlt`
- `readingTimeMinutes`
- `featured`

### ArticleBlock

O detalhe de artigo agora pode carregar blocos estruturados por meio de `ArticleBlock`.

Campos principais:

- `kind`
- `title`
- `body`
- `imageUrl`
- `imageAlt`
- `imageCaption`
- `items`
- `sortOrder`

Enums disponíveis em `ArticleBlockKind`:

- `PARAGRAPH`
- `HEADING`
- `IMAGE`
- `TIP`
- `WARNING`
- `CHECKLIST`
- `STEPS`
- `QUOTE`
- `PRODUCT_REFERENCE`
- `SECTION`
- `OTHER`

### Resposta pública

- `GET /articles` continua leve e não retorna `blocks`
- `GET /articles/:id` retorna `blocks` ordenados por `sortOrder`
- o campo `content` continua no payload para compatibilidade
- `relatedProducts` continua sendo retornado no detalhe do artigo

Cada bloco inclui:

- `id`
- `kind`
- `title`
- `body`
- `imageUrl`
- `imageAlt`
- `imageCaption`
- `items`
- `sortOrder`

### Endpoints administrativos de blocos

JWT obrigatório e role `ADMIN`:

- `POST /articles/:articleId/blocks`
- `PATCH /articles/:articleId/blocks/:blockId`
- `DELETE /articles/:articleId/blocks/:blockId`

## RelaÃƒÂ§ÃƒÂ£o entre produtos e artigos

O backend usa a relaÃƒÂ§ÃƒÂ£o explÃƒÂ­cita `ProductArticle` para conectar guias de produto e conteÃƒÂºdos educativos.

Campos principais:

- `productId`
- `articleId`
- `sortOrder`

Regras:

- `productId + articleId` ÃƒÂ© ÃƒÂºnico
- `GET /products/:id` retorna apenas artigos publicados em `relatedArticles`
- `GET /articles/:id` retorna apenas produtos ativos em `relatedProducts`
- as listagens continuam leves e nÃƒÂ£o incluem os relacionados

### Campos adicionados ao detalhe de produto

- `relatedArticles`

Cada item inclui:

- `id`
- `title`
- `slug`
- `summary`
- `category`
- `imageUrl`
- `publishedAt`

### Campos adicionados ao detalhe de artigo

- `relatedProducts`

Cada item inclui:

- `id`
- `name`
- `slug`
- `category`
- `shortDescription`
- `imageUrl`

### Endpoints administrativos da relaÃƒÂ§ÃƒÂ£o

JWT obrigatÃƒÂ³rio e role `ADMIN`:

- `POST /products/:productId/articles/:articleId`
- `PATCH /products/:productId/articles/:articleId`
- `DELETE /products/:productId/articles/:articleId`

## Docker

Build:

```bash
docker build -t hortivia-api .
```

Run:

```bash
docker run --env-file .env -p 3000:3000 hortivia-api
```

## Northflank

Checklist mÃ­nimo:

- configurar todas as variÃ¡veis obrigatÃ³rias do `.env.example`
- garantir `DATABASE_URL` apontando para o banco correto
- preencher `JWT_SECRET`
- revisar as variÃ¡veis numÃ©ricas de confirmaÃ§Ã£o e redefiniÃ§Ã£o
- configurar o bloco de upload quando avatar e imagens administrativas forem necessÃ¡rios

## Comandos Ãºteis

```bash
npm run lint
npm run build
npm test
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:seed
```
