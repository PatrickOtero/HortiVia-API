# HortiVia API

## Papel da API no produto

A API da HortiVia sustenta a experiência do aplicativo mobile, centralizando autenticação, catálogo de produtos, artigos educativos, perfil, preferências e envio de imagens. Ela é a camada que mantém o conteúdo consistente e permite que o app entregue informações úteis de forma organizada para o usuário final.

No produto, isso significa dar suporte ao acesso seguro das contas, ao conteúdo consultado no app e à operação administrativa que mantém produtos e artigos atualizados.

## Funcionalidades atendidas

- autenticação de usuários
- confirmação de e-mail por código
- recuperação de senha por código
- catálogo de produtos hortifruti
- artigos educativos
- perfil e preferências
- uploads de avatar, produtos e artigos
- administração de conteúdos

## Segurança e conta

A API aplica regras de conta e acesso alinhadas ao uso real do produto:

- senha forte no cadastro e na redefinição
- confirmação de e-mail antes do primeiro acesso autenticado
- códigos temporários enviados por e-mail para confirmação e recuperação
- respostas genéricas em fluxos sensíveis para reduzir enumeração de contas
- controle de acesso administrativo para rotas de gestão

## Tecnologias

- NestJS
- Prisma
- PostgreSQL / Supabase
- JWT
- Cloudflare R2
- Nodemailer / Mailgun
- Docker / Northflank

## Documentação técnica

Os detalhes de setup, ambiente, banco, deploy e operação estão em [docs/backend-setup.md](docs/backend-setup.md).

Documentos auxiliares:

- [ROADMAP.md](ROADMAP.md)
- [docs/auth-qa-checklist.md](docs/auth-qa-checklist.md)
- [docs/insomnia-README.md](docs/insomnia-README.md)
