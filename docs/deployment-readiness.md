# Prontidão de implantação do backend

Este procedimento prepara uma publicação controlada no Northflank. É um runbook para a pessoa responsável pelo ambiente. Confirme nomes, permissões e ações no projeto Northflank antes de iniciar. Release flows com backup, migration e deploy em sequência são descritos na [documentação Northflank](https://northflank.com/docs/v1/application/production-workloads/release-for-production) e no [guia de migrações no Northflank](https://northflank.com/guides/running-migrations-on-northflank). O comando de produção é o [Prisma migrate deploy](https://www.prisma.io/docs/cli/v7/migrate/deploy). Este documento não autoriza alterações de produção.

## 1. Pré-requisitos e permissões

- PR backend integrado à `main`, CI verde no commit candidato e revisão de segurança concluída.
- Acesso de operador ao serviço API, PostgreSQL e release flow/job no workspace Northflank correto; acesso de leitura a versões, health, métricas e logs.
- Imagens de runtime e migração geradas do mesmo commit e arquitetura. Registre seus digests imutáveis. Mantenha o digest de runtime anterior para recuperação.
- Janela, equipe responsável e canal de incidentes definidos. Use uma conta técnica já autorizada apenas para smoke tests de leitura.
- Nenhum segredo novo é necessário. Use os valores já armazenados no serviço Northflank e não os imprima em shell, terminal compartilhado, logs, tickets ou artefatos.

## 2. Identificar o ambiente

No painel, confirme organização, projeto, ambiente, nome e ID do serviço HTTP e do add-on PostgreSQL, domínio HTTPS, health probe e URL pública comparando com o inventário aprovado da equipe. Registre o digest e a revisão atualmente ativos.

Sem revelar valores, confira as variáveis obrigatórias: `DATABASE_URL`, `JWT_SECRET`, `NODEMAILER_HOST`, `NODEMAILER_PORT`, `NODEMAILER_SECURE`, `NODEMAILER_REQUIRE_TLS`, `NODEMAILER_USER`, `NODEMAILER_PASS`, `NODEMAILER_FROM`, `EMAIL_CONFIRMATION_CODE_EXPIRES_IN_MINUTES`, `EMAIL_CONFIRMATION_RESEND_COOLDOWN_SECONDS`, `EMAIL_CONFIRMATION_MAX_ATTEMPTS`, `PASSWORD_RESET_CODE_EXPIRES_IN_MINUTES`, `PASSWORD_RESET_RESEND_COOLDOWN_SECONDS` e `PASSWORD_RESET_MAX_ATTEMPTS`. Uploads também exigem as variáveis Cloudflare R2. Inteiros e booleanos precisam passar pela validação da aplicação.

Não habilite Express `trust proxy` sem validar os CIDRs corretos e o número de saltos do balanceador. Não há configuração `trust proxy` no código atual. Os valores de domínio, serviço, retenção e limites atuais precisam ser conferidos no painel autorizado; não estão versionados no repositório.

## 3. Backup verificável

1. Registre hora UTC, revisão candidata, digest atual e estado de saúde do banco. Verifique espaço e janela de backup.
2. Inicie backup/snapshot do PostgreSQL pelo add-on ou release flow Northflank. Aguarde conclusão bem-sucedida e anote ID, hora, região e retenção sem exportar URL/credenciais.
3. Confirme que a restauração pode ser feita em ambiente isolado e há espaço disponível. Para ambientes importantes, ensaie a restauração em staging antes da janela.
4. Se o backup falhar ou não puder ser verificado, interrompa antes da migration.

O snapshot permite recuperação pontual. O rollback rotineiro deste release é da imagem da aplicação e não exige restaurar o banco.

## 4. Verificar e aplicar migrations

A imagem final `runtime` não inclui Prisma CLI. Use o target Docker `migration` para um job único Northflank: ele contém a CLI, schema e migrations, executa como usuário `node` e compartilha o mesmo commit/arquitetura. Conecte-o à variável `DATABASE_URL` aprovada pelo painel. Não inclua a URL em argumentos explícitos ou saída de logs.

1. Execute `prisma migrate status` com o job de migration. Confirme migrations pendentes e a revisão registrada mais recente. Não use `migrate dev`, `db push`, `migrate resolve` ou seed geral.
2. Após o backup confirmado, execute **um job** `prisma migrate deploy`; aguarde código de saída zero.
3. Execute `prisma migrate status` novamente. Exija zero migrations pendentes e confirme `20261018000000_quick_training` como aplicada.
4. A migration adiciona tabelas, constraints, índices e FKs de treinamento, sem apagar tabelas existentes. Registre o estado antes/depois. Seed é uma ação separada; este processo não publica nenhum dos 33 rascunhos.
5. Só continue se backup, migration, status e compatibilidade com a versão atualmente ativa estiverem aprovados. Se a migration falhar, interrompa, preserve logs e snapshot e investigue com DBA; nunca marque migration manualmente como aplicada.

## 5. Publicar a imagem API

Configure release flow com as etapas sequenciais: backup concluído → migration concluída → deploy de runtime. Se o workspace ainda não tiver esse encadeamento, execute cada fase separadamente e confira a anterior antes da próxima. Publique o digest `runtime` do commit aprovado; retenha o anterior imutável.

O processo Nest mantém usuário Linux não privilegiado, `NODE_ENV=production`, Prisma Client gerado, PrismaPg e dependências necessárias. A migration ocorre no job dedicado, não no startup das réplicas.

## 6. Health e smoke tests

A rota existente `GET /health` é liveness, sem consulta ao banco; HTTP 200 isolado não comprova conectividade PostgreSQL. Após todas as réplicas estarem prontas, confira versão/digest, eventos de inicialização, conexões do banco e ausência de erros de startup. Depois, use apenas HTTPS e uma conta técnica autorizada:

- `GET /health` retorna 200.
- Confirme login/token pelo procedimento existente, evitando tentativas repetidas que acionem proteções de conta. Nunca registre o token.
- Leia catálogo, detalhe de produto e artigos/imagens, sem alterar conteúdo.
- Leia `GET /training/progress` e `GET /training/products/:productId` para usuário autenticado; confirme isolamento de usuário e respostas válidas com ou sem perguntas publicadas.
- Confirme que administração recusa usuário comum e protege gabaritos. Não crie, publique ou edite perguntas como smoke test.
- Se nenhum conteúdo já revisado estiver publicado, não publique rascunho para concluir o teste; registre a limitação e aguarde revisão editorial.

## 7. Monitoramento e interrupção

Observe pelo menos 30 minutos após o último rollout. Compare com janela anterior equivalente: taxa de 5xx, p95, reinicializações, probes, erros/conexões PostgreSQL, erros de autenticação, entrega SMTP e logs Nest/Prisma. Remova tokens, endereços de e-mail e dados pessoais antes de compartilhar logs.

Interrompa o rollout e mantenha o frontend bloqueado se ocorrer qualquer item:

- migration pendente, violação de integridade ou erro de banco;
- réplicas não saudáveis ou reinício contínuo, ou `/health` falhando por mais de 2 minutos;
- smoke crítico de login, produto ou artigo falha duas vezes seguidas;
- 5xx acima de 2% ou duas vezes o baseline por 5 minutos;
- p95 acima de duas vezes o baseline por 10 minutos;
- acesso indevido, gabarito exposto, dados de usuário cruzados ou publicação não autorizada;
- perda de dados, locks persistentes ou esgotamento de conexões.

Guarde revisão, métricas e identificadores de evento para triagem; não relaxe o limite para encerrar o release.

## 8. Recuperação

### Rollback da aplicação

Se a nova API falhar após a migration aditiva, pare o rollout e redeploy o digest de runtime anterior pelo Northflank. Mantenha as tabelas novas: não há necessidade de revertê-las para voltar a versão antiga. Confirme réplicas, `/health`, banco, login, produtos e artigos; monitore por 30 minutos. Preserve imagem e logs com falha para correção posterior.

### Recuperação do banco

Não existe migration reversa automática neste lote. Não remova tabelas nem execute SQL destrutivo para seguir um rollback da aplicação. Se investigação identificar corrupção ou exigir recuperação point-in-time, escale para DBA e responsável pelo produto. Restaure primeiro em alvo isolado, confira RPO/RTO e planeje como reconciliar gravações após o snapshot. Restaurar no banco ativo pode descartar dados legítimos criados depois dele e exige decisão operacional específica.

## 9. Android posteriormente

Distribua o app só depois da API correta estar implantada e saudável. Exija HTTPS, URL aprovada, assinatura oficial Android, CI verde do frontend e smoke em staging com sessão, produto, progresso, treinamento revisado, retorno de navegação e erro de API. Faça rollout gradual, acompanhe crash/5xx e mantenha app anterior disponível. APK de validação com assinatura debug não é distribuível.

## Limites deste plano

Este arquivo registra um procedimento; não é uma execução. Não houve backup/migration/deploy em produção, seed, publicação de rascunhos ou alteração de segredos. O nome do serviço, ambiente, domínio, retenção, recursos e alertas Northflank precisam ser confirmados no painel autorizado, inacessível neste repositório.
