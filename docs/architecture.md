# Arquitetura da API

O backend usa NestJS por domínio, Prisma para persistência PostgreSQL e serviços de infraestrutura compartilhados para autenticação, e-mail e arquivos. Este guia documenta a divisão atual e o caminho recomendado para mudanças.

## Fluxo de uma requisição

```mermaid
flowchart LR
  HTTP[Controller] --> G[Guards]
  HTTP --> D[DTO e ValidationPipe]
  HTTP --> S[Service]
  S --> R[Repository]
  R --> P[Prisma]
  S --> M[Mapper de resposta]
  M --> HTTP
```

O controller define rotas, parâmetros e autorização declarativa. DTOs descrevem e validam a entrada. Services aplicam regras de negócio e coordenam operações. Repositories concentram consultas e gravações Prisma. Mappers controlam o formato público das respostas.

## Organização

- `src/main.ts`: bootstrap, `ValidationPipe`, filtros globais e servidor HTTP.
- `src/app.module.ts`: composição dos módulos da aplicação.
- `src/modules/<domínio>`: controllers, services, repositories, DTOs, tipos, mappers e testes próximos da funcionalidade:
  - `auth`: cadastro, login, confirmação e recuperação de conta; guards e estratégia JWT ficam dentro do domínio.
  - `users`: operações administrativas e representação segura do usuário.
  - `profile`: leitura e atualização do perfil, avatar e visibilidade dos dados.
  - `products`: catálogo, guias, imagens, artigos relacionados e favoritos.
  - `articles`: conteúdo em blocos, leitura, comentários, reações e salvamentos.
  - `training`: perguntas, respostas idempotentes, progresso e ranking.
  - `preferences`: preferências do usuário.
  - `storage` e `mail`: integrações externas compartilhadas, não regras de tela.
  - `settings`: configuração tipada da aplicação.
- `src/common`: conceitos usados por mais de um domínio, como filtros, validações, normalização e paginação.
- `src/prisma`: ciclo de vida do cliente Prisma e conexão com PostgreSQL.
- `src/generated/prisma`: cliente gerado; não editar manualmente. Atualize o schema e execute `npm run prisma:generate`.
- `prisma/schema.prisma` e `prisma/migrations`: modelo persistido e mudanças de schema versionadas.
- `test`: testes HTTP e de integração que usam PostgreSQL descartável. Os testes de integração exigem `TRAINING_TEST_DATABASE_URL`; em CI, ausência dessa URL deve falhar em vez de ignorar a suíte.

## Como implementar uma mudança

1. Coloque contratos de entrada em DTOs e valide-os com os decorators existentes.
2. Mantenha autorização no guard/decorators da rota e restrições de propriedade no service/repository, conforme a regra específica.
3. Deixe controllers enxutos: adaptar HTTP para a chamada do service e retornar o resultado.
4. Mantenha regra de negócio em services; mova consultas Prisma para o repository do domínio quando forem usadas por mais de uma operação ou quando a consulta exigir composição significativa.
5. Use mappers para evitar exposição acidental de campos internos do Prisma.
6. Coloque utilitários em `common` somente quando houver mais de um consumidor real e uma semântica compartilhada clara.
7. Para mudança de banco, crie uma migration aditiva quando possível, valide em PostgreSQL descartável e nunca use seed para sobrescrever dados existentes.
8. Cubra regra de service com teste unitário e fronteiras HTTP/persistência com integração PostgreSQL quando aplicável.

## Regras de segurança e manutenção

- Não retorne modelos Prisma diretamente quando contiverem campos privados, credenciais, respostas corretas ou dados internos.
- Não registre tokens, connection strings, códigos de confirmação ou dados pessoais em logs.
- Mantenha transações e condições de idempotência junto à operação de negócio que precisa delas.
- Evite dependências entre domínios que formem ciclos; compartilhe contratos ou operações pequenas por módulos explícitos.
- Não crie abstrações genéricas para uma única regra. Centralize apenas comportamento repetido cuja semântica seja igual.
- Toda alteração de runtime deve preservar os testes e a validação PostgreSQL definidos em `.github/workflows/ci.yml`.

## Validação local

`npm run lint`, `npx tsc --noEmit`, `npm run build`, `npx prisma validate` e `npm test -- --runInBand` são os comandos principais. Execute a suíte de integração contra banco descartável e nunca contra homologação ou produção. Preparação de deploy está em [deployment-readiness.md](deployment-readiness.md).
