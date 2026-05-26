# Backend setup

## Instalação

```bash
npm install
cp .env.example .env
```

Preencha o `.env` com valores reais antes de subir a aplicação.

## Variáveis de ambiente

Obrigatórias:

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

- a configuração atual usa `DATABASE_URL`
- `DIRECT_URL` não é necessário neste projeto
- no Northflank, os valores numéricos devem ser informados como inteiros simples
- uploads dependem da configuração completa das variáveis de armazenamento

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

O seed é idempotente, popula conteúdos iniciais e não cria um ADMIN com credenciais fixas.

## Execução local

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

1. registrar um usuário normalmente
2. promover esse usuário para ADMIN

```bash
npm run admin:promote -- --email pessoa@exemplo.com
```

Também é possível promover manualmente no banco, com cuidado no ambiente alvo.

## Uploads

Avatar:

- endpoint: `POST /profile/avatar`
- auth: JWT obrigatório
- campo: `avatar`
- tipos: `image/jpeg`, `image/png`, `image/webp`
- limite: `2 MB`

Produto e artigo:

- endpoints: `POST /products/:id/image` e `POST /articles/:id/image`
- auth: JWT obrigatório
- role: `ADMIN`
- campo: `image`
- tipos: `image/jpeg`, `image/png`, `image/webp`
- limite: `5 MB`

## Guias visuais de produto

O módulo de produtos agora aceita dois blocos estruturados para enriquecer o detalhe:

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

Enums disponíveis em `ProductImageKind`:

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

- quando uma imagem é salva com `isPrimary=true`, as outras imagens do mesmo produto passam a `false`

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

Enums disponíveis em `ProductGuideSectionKind`:

- `CHOOSE`
- `OBSERVE`
- `STORE`
- `USE`
- `QUICK_FACTS`
- `OTHER`

### Resposta do detalhe de produto

Além dos campos já existentes, `GET /products/:id` agora retorna:

- `mainImages`
- `guideSections`

Compatibilidade:

- `imageUrl` permanece no payload
- quando não houver registros em `ProductImage`, `mainImages` faz fallback para `imageUrl`
- a listagem `GET /products` continua leve e não carrega seções completas

### Endpoints administrativos

JWT obrigatório e role `ADMIN`:

- `POST /products/:productId/images`
- `PATCH /products/:productId/images/:imageId`
- `DELETE /products/:productId/images/:imageId`
- `POST /products/:productId/guide-sections`
- `PATCH /products/:productId/guide-sections/:sectionId`
- `DELETE /products/:productId/guide-sections/:sectionId`

## Favoritos de produto

JWT obrigatório:

- `POST /products/:productId/favorite`
- `DELETE /products/:productId/favorite`
- `GET /favorites/products`

Regras:

- o favorito é idempotente por usuário e produto
- a listagem retorna os itens paginados em ordem de favorito mais recente
- o catálogo público continua público e não depende de autenticação para listar produtos

## Leituras salvas

JWT obrigatório:

- `POST /articles/:articleId/save`
- `DELETE /articles/:articleId/save`
- `GET /saved/articles`

Regras:

- salvar e remover são operações idempotentes por usuário e artigo
- a listagem retorna os itens paginados em ordem de salvamento mais recente
- apenas artigos publicados entram na listagem
- `GET /articles` e `GET /articles/:id` continuam públicos
- o campo `isSaved` pode vir como `false` fora do contexto autenticado e como `true` na listagem de leituras salvas

## RelaÃ§Ã£o entre produtos e artigos

O backend usa a relaÃ§Ã£o explÃ­cita `ProductArticle` para conectar guias de produto e conteÃºdos educativos.

Campos principais:

- `productId`
- `articleId`
- `sortOrder`

Regras:

- `productId + articleId` Ã© Ãºnico
- `GET /products/:id` retorna apenas artigos publicados em `relatedArticles`
- `GET /articles/:id` retorna apenas produtos ativos em `relatedProducts`
- as listagens continuam leves e nÃ£o incluem os relacionados

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

### Endpoints administrativos da relaÃ§Ã£o

JWT obrigatÃ³rio e role `ADMIN`:

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

Checklist mínimo:

- configurar todas as variáveis obrigatórias do `.env.example`
- garantir `DATABASE_URL` apontando para o banco correto
- preencher `JWT_SECRET`
- revisar as variáveis numéricas de confirmação e redefinição
- configurar o bloco de upload quando avatar e imagens administrativas forem necessários

## Comandos úteis

```bash
npm run lint
npm run build
npm test
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:seed
```
