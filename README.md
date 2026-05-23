# HortiVia API

Backend da HortiVia construido com NestJS, Prisma e PostgreSQL.

## Stack

- NestJS
- Prisma
- PostgreSQL / Supabase
- JWT auth
- Nodemailer
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

## Auth

- `POST /auth/register` valida nome, e-mail e senha forte.
- O e-mail e normalizado com `trim` + `lowercase` antes de verificar duplicidade e salvar.
- O cadastro cria usuarios com `emailVerified = false` e envia um codigo numerico de 6 digitos por e-mail.
- `POST /auth/confirm-email` confirma o e-mail com `email + code`.
- `POST /auth/resend-confirmation` reenvia um novo codigo sem revelar se a conta existe.
- `POST /auth/login` tambem normaliza o e-mail com `trim` + `lowercase` antes da busca.
- O login so e liberado depois da confirmacao do e-mail.
- Falhas de login continuam retornando a mensagem generica `E-mail ou senha invalidos.`.
- A senha de cadastro deve ter entre `10` e `72` caracteres e incluir letra maiuscula, letra minuscula, numero e caractere especial.
- O codigo de confirmacao expira, possui cooldown para reenvio e limite maximo de tentativas.

## Users admin

Rotas administrativas disponiveis:

- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `DELETE /users/:id`

Regras:

- exigem JWT
- exigem role `ADMIN`
- permitem localizar usuarios de teste por nome ou e-mail
- permitem promover usuario para `ADMIN`
- permitem marcar `emailVerified`
- nao permitem excluir a propria conta autenticada
- a exclusao pode ser bloqueada se o usuario tiver dados vinculados, como artigos com autoria associada

Variaveis de ambiente para confirmacao de e-mail:

- `NODEMAILER_HOST`
- `NODEMAILER_PORT`
- `NODEMAILER_SECURE`
- `NODEMAILER_REQUIRE_TLS`
- `NODEMAILER_USER`
- `NODEMAILER_PASS`
- `NODEMAILER_FROM`
- `EMAIL_CONFIRMATION_CODE_EXPIRES_IN_MINUTES`
- `EMAIL_CONFIRMATION_RESEND_COOLDOWN_SECONDS`
- `EMAIL_CONFIRMATION_MAX_ATTEMPTS`

No Northflank, configure essas variaveis de mail como runtime env vars do servico.

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
