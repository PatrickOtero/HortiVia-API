# Perfis, fotos, selos e ranking

## Contratos e privacidade

- `GET /profile` continua retornando o perfil da própria sessão.
- `PATCH /profile` aceita os campos existentes e `store`, `jobTitle`, `phone`, `city`, `state`. Os novos campos são opcionais; `null` ou texto vazio limpa o valor. `state` usa duas letras e é normalizado para maiúsculas.
- `GET /profile/:userId` exige autenticação. Retorna identificação, foto, loja, função, selo e aprendizado. E-mail, telefone, cidade e estado são incluídos **somente** para o titular ou um administrador. Nunca retorna senha, códigos de confirmação ou recuperação.
- `PATCH /users/:id` reutiliza a administração existente e aceita `specialBadge`: `FOUNDER`, `CO_FOUNDER`, `SPECIALIST` ou `null` para remover. O guard administrativo permanece obrigatório. O DTO comum de perfil rejeita `specialBadge` e `role`.
- Os autores de artigos e comentários retornam somente `id`, `name`, `avatarUrl` e `specialBadge`.

Loja/função são informações públicas entre usuários autenticados. Função profissional e selo são independentes de `User.role`. Nenhum selo é atribuído automaticamente.

## Aprendizado

`GET /training/ranking` exige autenticação e retorna `top` (até dez), `currentUser` (mesmo fora dos dez primeiros) e `participants`.

A última tentativa de cada usuário/pergunta é selecionada por ID decrescente. Uma resposta de versão anterior não conta. Só entram perguntas publicadas de produtos ativos; participantes precisam ter pelo menos uma tentativa da versão atual. A contagem reaproveita `summarizeProgress`, também utilizada por `TrainingService.progress()`.

O aproveitamento mantém o significado já existente: acertos divididos pelo total de perguntas publicadas elegíveis, arredondado para um percentual inteiro. Como o denominador é comum ao ranking, participantes com os mesmos acertos normalmente também terão o mesmo percentual. Ordenação: acertos, percentual; empates recebem a mesma posição (`1, 1, 3`). Nome/ID apenas estabilizam a apresentação dos empatados, sem alterar a colocação. Selos não entram no cálculo.

`GET /training/progress` ganhou `summary`, mantendo `products`. O perfil reutiliza esse resultado e acrescenta a posição. Nenhuma tabela ou coluna armazena pontuações ou posições.

## Migração e implantação posterior

`20261027000000_user_profiles_and_badges` cria o enum `UserBadge` e seis colunas anuláveis em `User`: `store`, `jobTitle`, `phone`, `city`, `state`, `specialBadge`. Contas e conteúdos existentes são preservados; não há seed ou preenchimento automático.

A migração foi preparada para revisão. Antes de disponibilizar o aplicativo atualizado, o responsável pelo ambiente deve aplicar a migração com o procedimento de implantação existente e implantar esta API. O cliente Prisma precisa ser gerado com o novo schema. Nenhuma migração remota ou implantação faz parte desta tarefa.

## Aplicativo

O perfil fica acessível em Ajustes > Meu perfil, nos nomes/fotos de autores e comentaristas, e no ranking. O titular abre a edição existente. O ranking também fica acessível em Meu aprendizado.

O aplicativo não possuía uma tela de administração de usuários. O seletor de selo foi integrado ao perfil e aparece somente para administradores, usando `PATCH /users/:id`; nenhum painel administrativo paralelo foi criado.

## Testes locais

As suítes de integração usam `TRAINING_TEST_DATABASE_URL`, restrita a `localhost`/`127.0.0.1` e um banco cujo nome começa com `hortivia_training_test`. Criam IDs próprios por execução e limpam exclusivamente esses registros. A variável é obrigatória em CI. Não apontar testes para homologação compartilhada ou produção.

### Validação desta implementação — 27/10/2026

- Backend: 17 suítes / 263 testes aprovados, sem skips, incluindo os testes HTTP de perfis/selos e a integração anterior de treinamento com PostgreSQL real. Lint, `tsc --noEmit`, build NestJS e `prisma validate` aprovados.
- Frontend: 119 testes cobertos pelas 19 suítes direcionadas a perfil, Avatar, selos, artigos, Home/Feed/salvos, ranking, progresso e navegação. As suítes afetadas foram reexecutadas após as correções. Lint e typecheck aprovados.
- A nova migração e as 13 anteriores foram aplicadas somente ao banco descartável `hortivia_training_test_profiles_1793103383507`, em `127.0.0.1:55440`. Ao terminar, o banco não continha usuários, produtos, artigos, perguntas ou tentativas deixados pelos testes.
- A edição de perfil também impede salvar campos desconhecidos quando a primeira consulta falha, evitando limpar informações existentes a partir do fallback da sessão.
- Não houve alteração de dados remotos, seed, atribuição real de selos, deploy, geração de APK ou operação Git. A conferência visual em Android continua pendente de um build posterior pelo responsável.

## Arquivos da implementação

### Backend (caminhos relativos a HortiVia-API)

- `prisma/schema.prisma`
- `prisma/migrations/20261027000000_user_profiles_and_badges/migration.sql`
- `src/generated/prisma/` — cliente regenerado pelo Prisma; sem edição manual.
- `src/modules/profile/profile.controller.ts`
- `src/modules/profile/profile.module.ts`
- `src/modules/profile/profile.service.ts`
- `src/modules/profile/dto/update-profile.dto.ts`
- `src/modules/profile/types/profile-response.ts`
- `src/modules/profile/mappers/profile-response.mapper.ts`
- `src/modules/users/dto/update-user.dto.ts`
- `src/modules/users/types/user-response.ts`
- `src/modules/users/users.mapper.ts`
- `src/modules/users/users.service.ts`
- `src/modules/articles/articles.repository.ts`
- `src/modules/articles/types/article-response.ts`
- `src/modules/articles/mappers/article-response.mapper.ts`
- `src/modules/training/training.controller.ts`
- `src/modules/training/training.module.ts`
- `src/modules/training/training.service.ts`
- `src/modules/training/ranking.spec.ts`
- `src/modules/profile/profile.service.spec.ts`
- `src/modules/articles/articles.service.spec.ts`
- `src/modules/users/users.service.spec.ts`
- `src/modules/auth/auth.service.spec.ts`
- `src/modules/preferences/preferences.service.spec.ts`
- `src/modules/products/products.service.spec.ts`
- `test/profiles.integration.spec.ts`
- `docs/user-profiles.md`

Os testes existentes de autenticação, preferências e produtos receberam somente a atualização dos fixtures para os campos anuláveis novos ou para o selo do autor; suas verificações foram preservadas.

### Frontend (caminhos relativos a FrutiNavigator)

- `src/config/apiConfig.ts` — somente rotas novas, sem mudar URLs de ambientes.
- `src/types/navigation.ts`, `src/types/userProfile.ts`, `src/types/userBadge.ts`
- `src/navigation/AppNavigator.tsx`
- `src/components/index.ts`
- `src/components/Avatar/index.tsx`, `Avatar.spec.tsx`
- `src/components/UserBadge/index.tsx`, `styles.ts`, `UserBadge.spec.tsx`
- `src/components/ArticleCard/index.tsx`, `styles.ts`
- `src/components/ProfileForm/index.tsx`
- `src/features/profile/types/profile.ts`
- `src/features/profile/mappers/profile.mapper.ts`, `profile.mapper.spec.ts`
- `src/features/profile/services/profile.service.ts`
- `src/features/profile/hooks/useProfile.ts`, `useProfile.spec.tsx`
- `src/features/profile/hooks/usePublicProfile.ts`, `usePublicProfile.spec.tsx`
- `src/features/admin/services/users.service.ts`
- `src/features/admin/components/UserBadgeSelector/index.tsx`, `styles.ts`, `UserBadgeSelector.spec.tsx`
- `src/features/articles/types/article.ts`, `src/features/articles/mappers/article.mapper.ts`
- `src/features/training/types/training.ts`, `src/features/training/services/training.service.ts`
- `src/features/training/screens/TrainingProgressScreen/index.tsx`
- `src/features/training/screens/TrainingRankingScreen/index.tsx`, `styles.ts`, `TrainingRankingScreen.spec.tsx`
- `src/screens/UserProfile/index.tsx`, `styles.ts`, `UserProfile.spec.tsx`
- `src/screens/ArticleDetail/index.tsx`, `styles.ts`, `ArticleDetail.spec.tsx`
- `src/screens/Settings/index.tsx`
- `src/screens/Home/index.tsx`, `src/screens/Feed/index.tsx`, `src/screens/SavedArticles/index.tsx`
- `docs/development.md`
