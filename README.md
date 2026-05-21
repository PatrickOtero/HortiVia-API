# HortiVia API

Backend da HortiVia construido com NestJS, Prisma e PostgreSQL.

## Stack

- NestJS
- Prisma
- PostgreSQL / Supabase
- JWT auth
- Docker
- Cloudflare R2

## Modulos atuais

- Auth
- Users
- Products
- Articles
- Profile
- Preferences
- Health

## Rodando localmente

1. Instale as dependencias:

```bash
npm install
```

2. Configure o arquivo `.env`.

3. Gere o Prisma Client:

```bash
npm run prisma:generate
```

4. Rode as migrations:

```bash
npm run prisma:migrate:dev -- --name init
```

5. Inicie a API:

```bash
npm run start:dev
```

Health check:

```bash
GET /health
```

## Avatar upload

- Endpoint: `POST /profile/avatar`
- Auth: JWT obrigatorio
- Content-Type: `multipart/form-data`
- Campo do arquivo: `avatar`
- Formatos aceitos: `image/jpeg`, `image/png`, `image/webp`
- Tamanho maximo: `2 MB`
- Variaveis obrigatorias:
  - `CLOUDFLARE_ACCOUNT_ID`
  - `CLOUDFLARE_ACCESS_KEY`
  - `CLOUDFLARE_ACCESS_SECRET_KEY`
  - `CLOUDFLARE_BUCKET_NAME`
  - `CLOUDFLARE_PUBLIC_BASE_URL`

No Northflank, configure essas variaveis como runtime env vars do servico.

## Product and Article image upload

- Endpoints: `POST /products/:id/image` e `POST /articles/:id/image`
- Auth: JWT obrigatorio
- Role: `ADMIN`
- Content-Type: `multipart/form-data`
- Campo do arquivo: `image`
- Formatos aceitos: `image/jpeg`, `image/png`, `image/webp`
- Tamanho maximo: `5 MB`
- Variaveis obrigatorias:
  - `CLOUDFLARE_ACCOUNT_ID`
  - `CLOUDFLARE_ACCESS_KEY`
  - `CLOUDFLARE_ACCESS_SECRET_KEY`
  - `CLOUDFLARE_BUCKET_NAME`
  - `CLOUDFLARE_PUBLIC_BASE_URL`

## Docker

Build:

```bash
docker build -t hortivia-api .
```

Run:

```bash
docker run --env-file .env -p 3000:3000 hortivia-api
```

## Docker Compose

```bash
docker compose up --build
```

Para parar:

```bash
docker compose down
```

## Comandos uteis

```bash
npm run lint
npm run build
npm test
npm run start:prod
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:migrate:deploy
npm run prisma:seed
npm run prisma:studio
```
