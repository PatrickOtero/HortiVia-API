# HortiVia API

Backend da HortiVia construído com NestJS, Prisma e PostgreSQL.

## Stack

- NestJS
- Prisma
- PostgreSQL / Supabase
- JWT auth
- Docker

## Módulos atuais

- Auth
- Users
- Products
- Articles
- Health

## Rodando localmente

1. Instale as dependências:

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

## Comandos úteis

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
