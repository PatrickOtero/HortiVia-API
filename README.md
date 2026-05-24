# HortiVia API

## Papel da API no produto

A API da HortiVia sustenta a experiência do aplicativo mobile, centralizando conteúdo, contas, perfil, preferências e imagens. Ela é a camada que mantém as informações organizadas para que o app entregue orientações práticas de forma consistente ao usuário final.

No produto, isso significa dar suporte ao conteúdo consultado no app, ao acesso das contas e à área interna que mantém produtos e artigos atualizados.

## Funcionalidades atendidas

- catálogo de produtos hortifruti
- detalhes práticos de escolha, conservação e aproveitamento
- artigos educativos
- perfil e preferências
- acesso de conta
- confirmação de e-mail por código
- recuperação de senha por código
- imagens de perfil, produtos e artigos
- área interna para manutenção de conteúdos

## Conta e acesso

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
