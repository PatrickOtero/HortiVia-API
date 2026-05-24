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
