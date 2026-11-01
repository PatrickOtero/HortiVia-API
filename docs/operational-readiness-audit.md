# HortiVia — Auditoria integrada de prontidão operacional

**Data:** 31/10/2026
**Frontend:** `audit/frontend-integration-readiness`, base `develop` em `4475ecc`
**API:** `audit/backend-integration-readiness`, base `develop` em `daee44d`
**Limites:** sem acesso a bancos remotos, dados reais, bucket R2 ou envio real de e-mail.

## Resultado executivo

Não foi encontrada incompatibilidade de contrato que impeça os fluxos integrados cobertos. A auditoria contou **55 chamadas HTTP nos services do aplicativo**, distribuídas pelos domínios abaixo, e comparou método, rota, query/body, resposta, autenticação e projeções dos DTOs/controllers da API.

Foi corrigido um defeito de sessão no frontend: a falha do armazenamento local ao remover um token não podia manter a sessão expirada ativa em memória. O aplicativo agora revoga primeiro o token em memória e o estado autenticado; a remoção persistente é best effort. Falha ao ler o token no bootstrap também termina em estado não autenticado sem rejeição não tratada.

Foram aplicadas atualizações transitivas compatíveis no lockfile para corrigir avisos de alta severidade com patches dentro das faixas já aceitas. Não foram alterados React Native, NestJS, contratos, schema ou migrations.

**Avaliação:** **apto com ressalvas** para uma rodada operacional controlada após aplicar a migration pendente no ambiente de desenvolvimento e executar o smoke test em aparelho. A validação automatizada não substitui essa homologação manual.

## Compatibilidade frontend ↔ API

| Domínio/fluxo | Contratos usados pelo app | Contrato da API | Resultado |
|---|---|---|---|
| Autenticação | `POST /auth/register`, `/login`, `/confirm-email`, `/resend-confirmation`, `/forgot-password`, `/reset-password`, `/resend-password-reset-code`; `GET /auth/me` | Mesmos métodos e rotas; login/me retornam usuário e token no formato esperado | Compatível |
| Catálogo | `GET /products` com `search`, `category`, `page`, `limit`; `GET /products/:id` | `{ data, meta }`; detalhe com `mainImages[].url`, seções, nutrientes e artigos relacionados | Compatível; mapper também aceita formato legado de URL |
| Administração de produtos | `POST/PATCH/DELETE /products`; imagem principal; galerias, substituição de arquivo, seções e imagens de guia | Rotas e multipart `image` coincidem; payloads usam DTOs e enums Prisma | Compatível |
| Favoritos | `POST/DELETE /products/:productId/favorite`; `GET /favorites/products` | Operações idempotentes; listagem `{ items, page, limit, total, totalPages }` | Compatível; mapper converte para `{ data, meta }` |
| Artigos | `GET /articles`, detalhe/admin; criar/editar/publicar; capa e blocos | Filtros `search/category/page/limit`, resposta paginada `{ data, meta }`, blocos ordenados e enum compartilhado | Compatível |
| Comentários/moderação | Listar, criar, editar, excluir e moderar; `GET` retorna itens/paginação | Rotas e status `VISIBLE/HIDDEN/DELETED` compatíveis; autoria expõe somente nome, avatar e selo | Compatível |
| Reações e salvos | Reagir/salvar e desfazer; `GET /saved/articles` | Respostas de reação e lista `{ items, page, limit, total, totalPages }` | Compatível; mapper adapta paginação |
| Uploads de artigos | Multipart de capa/bloco; solicitação pré-assinada, PUT pelo cliente e PATCH da URL | `image` multipart; resposta pré-assinada contém `key`, `uploadUrl`, `url`; associação validada no backend | Compatível; PUT direto usa XMLHttpRequest no app |
| Perfil | `GET/PATCH /profile`, `GET /profile/:userId`, `POST /profile/avatar` | Campos editáveis, `null` para limpar dados opcionais, multipart `avatar` | Compatível |
| Preferências | `GET/PATCH /preferences` | Resposta e payload usados pelo serviço correspondem | Compatível |
| Usuários/selo | `PATCH /users/:id` com `specialBadge` | Rota protegida por `JwtAuthGuard` e `RolesGuard(ADMIN)`; DTO valida enum | Compatível |
| Treinamento | `GET /training/products/:id`, `/progress`, `/ranking`; responder; CRUD administrativo de pergunta | Resposta pública omite gabarito; resposta exige índice, versão e chave idempotente; CRUD exige ADMIN | Compatível |

Os filtros de listagem aceitam valores vazios omitidos pelo frontend. As listas de produtos e artigos usam `data/meta`; comentários, salvos e favoritos usam o formato de itens e metadados que os mappers convertem. Os uploads multipart usam o `FormData` nativo, nomes de campo aceitos pelos controllers e os limites do servidor. A URL assinada e a URL pública não são confundidas: o PUT vai ao R2 e a associação posterior vai à API.

Não foram reproduzidas divergências de método, caminho, enum, payload ou resposta. Não foi necessário mudar contratos HTTP.

## Problemas encontrados e correções

| Prioridade | Evidência | Causa | Correção/estado |
|---|---|---|---|
| P1 corrigido | Com usuário autenticado, simular HTTP 401 e rejeição de `AsyncStorage.removeItem` mantinha potencialmente o token em memória e o stack protegido; falha em `getItem` escapava do bootstrap | `clearSession` esperava a persistência antes de revogar o estado React/API; bootstrap usava `try/finally`, sem tratar erro de leitura | Revogação imediata do token em memória e usuário; falhas da remoção persistente não reabrem a sessão. Falha na leitura encerra o bootstrap como desautenticado. Teste integrado verifica que a próxima requisição já não leva Bearer |
| P2 de supply chain, reduzido | `body-parser` vulnerável a limites inválidos e bytes residuais de conteúdo comprimido | Lockfiles mantinham versões afetadas | Atualizado para `2.4.0` em ambos os projetos, dentro das faixas já permitidas pelos consumidores |
| P2 de supply chain, corrigido | `follow-redirects` afetado em `1.16.0`; Joi e Zod transitivos também estavam abaixo de correções publicadas | Lockfile antigo | Frontend: `follow-redirects 1.16.2`, `joi 17.13.9`, `zod 4.6.7`; sem mudança de manifesto ou atualização major |
| P2 residual condicionado | Multer `2.4.0` tem advisory alto para encerramento do processo quando um `fileFilter` assíncrono continua após teardown | `@nestjs/platform-express@11.2.7` fixa Multer exatamente em `2.4.0`; patch oficial é `2.5.0`, mas a versão de Nest 11 disponível ainda fixa a afetada | Não foi introduzido override nem NestJS 12 major. Inspecionados os `FileInterceptor` do HortiVia: usam `memoryStorage` e limites, sem `fileFilter` customizado/assíncrono. A precondição descrita pelo advisory não está presente no código atual, mas o pacote continua sinalizado e requer atualização coordenada quando Nest publicar uma faixa compatível. Não classificar como resolvido |

Advisories consultados: [body-parser GHSA-27r3-jxmh-p828](https://github.com/expressjs/body-parser/security/advisories/GHSA-27r3-jxmh-p828), [follow-redirects GHSA-mrwp-f3q8-3g9p](https://github.com/advisories/GHSA-mrwp-f3q8-3g9p), [Joi GHSA-4528-x5fx-h6hg](https://github.com/advisories/GHSA-4528-x5fx-h6hg), [Zod GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) e [Multer GHSA-q7qp-rjg7-q26m](https://github.com/expressjs/multer/security/advisories/GHSA-q7qp-rjg7-q26m). `body-parser@2.4.0`, `follow-redirects@1.16.2`, `joi@17.13.9`, `zod@4.6.7` e `multer@2.5.0` são patches/minors publicados; somente os quatro primeiros foram selecionados por compatibilidade direta com as faixas atuais. O changelog upstream de Multer documenta a correção na `2.5.0`.

## Segurança e integridade

- **Autenticação:** JWT assinado, expiração de 1 dia, Bearer centralizado no cliente e handler global para HTTP 401. Rede/timeout não é confundido com 401. O logout local não depende de endpoint no servidor.
- **Limitação conhecida de revogação:** o papel é carregado no JWT. Após alteração do papel de um administrador, o token já emitido pode continuar autorizando rotas ADMIN até expirar (no máximo 1 dia). Alterar o payload do JWT como usuário comum não concede acesso, pois invalida a assinatura. Para revogação imediata seria necessária uma estratégia de sessão/role online ou revogação de tokens, não introduzida nesta auditoria.
- **Autorização:** as rotas administrativas de produtos, artigos, usuários, treinamento e upload aplicam `JwtAuthGuard` + `RolesGuard(ADMIN)`. A UI não é tratada como controle de segurança.
- **Privacidade:** projeções de artigos/comentários/ranking não devolvem senha, contatos privados nem gabarito antes da resposta. Perfil público autenticado omite e-mail, telefone, cidade e UF; titular/admin recebem campos privados conforme regra existente.
- **Treinamento:** resposta inclui `version` e `submissionKey`; a API trava a pergunta, verifica publicação/produto ativo, valida replay idempotente e guarda a versão respondida. Progresso ignora tentativas de versões antigas. Selos são campos visuais e não afetam pontos.
- **R2:** nenhum bucket real foi acessado. Upload multipart e compensação usam mocks nos testes; associação pré-assinada valida intenção/escopo, existência e atualiza intenção+bloco em transação; reconciliação é diagnóstico explícito e não exclui. Uploads pré-assinados ainda válidos podem sofrer PUT depois da associação; a reconciliação classifica divergências como indeterminadas.
- **Abuso de requisição:** os controllers de imagem definem limite de arquivo (5 MB; avatar 2 MB), storage em memória e validação MIME no domínio. A configuração atual de Multer não define `fileFilter` assíncrono.
- **Banco:** não houve conexão a banco remoto nem modificação de dados.

## Migration `20261031000000_presigned_upload_tracking`

A migration é aditiva: cria o registro de intenções com enum, chave/URL únicas, escopo relacional e status; não atualiza conteúdos preexistentes. No CI de PostgreSQL, a execução obrigatória aplica migrations em banco vazio e verifica histórico/reaplicação. A CI também exige as suítes de integração PostgreSQL de uploads e falha se forem ignoradas. A migration não foi aplicada a homologação ou produção nesta auditoria.

### Checklist remoto (ambiente de desenvolvimento apenas)

1. Confirmar no provedor o nome do serviço e do banco de desenvolvimento; conferir que a variável de conexão não aponta para produção sem registrar seu valor em logs.
2. Fazer backup/snapshot do banco de desenvolvimento e registrar a versão da API atualmente implantada.
3. Confirmar que a imagem/código contendo a migration já está disponível no ambiente de desenvolvimento; executar `npm run prisma:migrate:deploy` pelo job de migration aprovado, com a URL desse ambiente.
4. Verificar o resultado de `prisma migrate status` e a linha da migration `20261031000000_presigned_upload_tracking` em `_prisma_migrations`.
5. Testar `/health`, login QA, leitura de artigos/blocos e uma associação de imagem com arquivo de teste autorizado; não usar o bucket nem contas reais nesta auditoria.
6. Interromper se o alvo não estiver identificado, o backup falhar, a migration reportar drift/erro ou o health check/regressão de leitura falhar. Não executar rollback destrutivo do schema; restaurar snapshot somente mediante procedimento do ambiente e aprovação.

## Resultado operacional por cenário

| Cenário | Estado | Evidência/pendência |
|---|---|---|
| Funcionário entra e restaura sessão | Validado automaticamente | Testes AuthContext e navegação; o 401 expira a sessão mesmo com falha de remoção persistente |
| Encontrar produto, pesquisar, paginar e abrir detalhe | Validado automaticamente | Serviços/mappers e testes de hooks/telas; sem chamada a API remota |
| Estudar guias e imagens | Validado automaticamente | Mappers cobrem imagens principais, galeria, campos legados e seções; renderização visual real não executada |
| Consultar artigos, blocos, comentários, reações e salvos | Validado automaticamente | Controllers, DTOs, response mappers e testes dos serviços/telas |
| Responder treinamento, progresso e ranking | Validado automaticamente | Testes de payload, idempotência, versão, progressão e empates |
| Favoritos | Validado automaticamente | Serviço/mapper e testes; backend mantém operações idempotentes |
| Administração e selo especial | Validado automaticamente | Rotas protegidas, DTOs e testes de fluxo/seleção; autorização verificada no backend |
| Erro de sessão expirada/rede | Validado automaticamente | 401 limpa estado; erros de rede permanecem diferenciados e não limpam sessão |
| Uploads multipart e pré-assinados em R2 real | Pendente de validação manual | Testes de SDK/R2 são mockados; nenhum bucket real usado |
| Migration no banco remoto de desenvolvimento | Pendente de operação externa | CI descartável passou; alvo e banco remoto não foram acessados nem confirmados |
| Instalação/inicialização no Android e uso em loja | Pendente de validação manual | `assembleHomolog` foi executado; resultado final registrado abaixo. Sem aparelho conectado nesta execução. |

## Auditorias npm

Os totais são pacotes reportados pelo npm após `npm ci`, não quantidades de advisories únicos.

| Projeto/escopo | Antes das atualizações pontuais | Após atualização do lockfile |
|---|---:|---:|
| Frontend, árvore completa | 50: 7 low, 39 moderate, 4 high, 0 critical | 46: 7 low, 39 moderate, 0 high, 0 critical |
| Frontend, `--omit=dev` | 17: 4 low, 10 moderate, 3 high, 0 critical | 14: 4 low, 10 moderate, 0 high, 0 critical |
| Backend, árvore completa | 41: 5 low, 33 moderate, 3 high, 0 critical | 39: 5 low, 32 moderate, 2 high, 0 critical |
| Backend, `--omit=dev` | 5: 0 low, 2 moderate, 3 high, 0 critical | 3: 0 low, 1 moderate, 2 high, 0 critical |

No backend, os dois itens altos remanescentes são a mesma cadeia/advisory Multer apresentada para o pacote consumidor `@nestjs/platform-express` e para `multer`. Nenhum projeto está livre de vulnerabilidades moderadas/baixas.

## Validação e limitações

## Validação executada nesta auditoria

- Frontend: `npm ci`, lint e typecheck passaram; Jest: **412 passed, 1 skipped** (68 suites passaram, 1 suite foi ignorada pelo gate existente); `git diff --check` passou.
- Backend: `npm ci`, `npm run prisma:generate`, `prisma validate`, lint, `tsc --noEmit` e build NestJS passaram; Jest: **336 passed, 36 skipped** (3 suites de integração PostgreSQL ignoradas localmente); `git diff --check` passou.
- O skip de integração local é uma limitação do ambiente, não uma aprovação: Docker/PostgreSQL descartável não estava disponível e não havia URL de banco de testes. A CI do backend possui PostgreSQL 16 obrigatório, aplica migrations em banco descartável e falha se essas suítes forem ignoradas.
- Android: `:app:assembleHomolog` passou após repetir a compilação com instalação limpa concluída. APK: `C:\dev\Frutinavigator\FrutiNavigator\android\app\build\outputs\apk\homolog\app-homolog.apk` (27.547.973 bytes); bundle JavaScript embarcado em `android/app/build/generated/assets/react/homolog/index.android.bundle` (2.375.660 bytes). O primeiro intento foi interrompido por conflito de `npm ci` limpando `node_modules` durante o bundle, não por erro de código. Não havia aparelho conectado, então instalação e uso continuam pendentes.
- Auditoria npm final: frontend 46 (7 low, 39 moderate, 0 high, 0 critical), produção 14 (4 low, 10 moderate); backend 39 (5 low, 32 moderate, 2 high), produção 3 (1 moderate, 2 high). Os dois itens altos continuam sendo a cadeia do Multer documentada acima.
- CI de base em `develop` aprovada antes das alterações: [frontend](https://github.com/PatrickOtero/HortiVia/actions/runs/41159309553), [backend](https://github.com/PatrickOtero/HortiVia-API/actions/runs/41261916084). CI dos PRs aprovada: [frontend PR #19](https://github.com/PatrickOtero/HortiVia/actions/runs/41263644574) e [backend PR #12](https://github.com/PatrickOtero/HortiVia-API/actions/runs/41263724640). O job backend concluiu migration limpa/reaplicação e testes de integração PostgreSQL obrigatórios sem skips.

O daemon Docker/PostgreSQL local não estava disponível; portanto, integração PostgreSQL local não pode ser declarada aprovada. `adb` está instalado, mas não havia dispositivo conectado. Nenhuma sessão operacional, conta real, e-mail real, ambiente remoto, migration remota ou bucket foi acessado.
