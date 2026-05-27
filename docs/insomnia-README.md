# HortiVia Insomnia

Esta pasta contem uma collection completa do Insomnia para testar a API HortiVia sem depender do app.

## Arquivos

- `hortivia-insomnia-collection.json`: export para importar no Insomnia
- `insomnia-README.md`: guia rapido de uso

## Como importar

1. Abra o Insomnia.
2. Va em `Create` ou `Import`.
3. Escolha `File`.
4. Importe `backend/docs/hortivia-insomnia-collection.json`.
5. Selecione o environment `Local`.

## Variaveis importantes

Preencha no environment conforme o seu contexto:

- `base_url`
- `register_name`
- `register_email`
- `register_password`
- `user_email`
- `user_password`
- `admin_email`
- `admin_password`
- `access_token`
- `admin_access_token`
- `confirmation_code`
- `password_reset_code`
- `reset_password_new`
- `managed_user_id`
- `product_id`
- `product_image_id`
- `product_guide_section_id`
- `article_id`
- `article_block_id`
- `article_block_image_url`
- `article_block_image_file_path`
- `avatar_file_path`
- `product_image_file_path`
- `product_gallery_image_file_path`
- `product_section_image_file_path`
- `article_image_file_path`
- `users_search`
- `users_role_filter`
- `users_email_verified`
- `product_search`
- `product_category`
- `article_search`
- `article_category`
- `page`
- `limit`

## Fluxo sugerido

### 1. Health

Use `GET Health` para validar se a API esta no ar.

### 2. Cadastro e confirmacao de e-mail

1. Rode `POST Register`.
2. Abra o e-mail recebido.
3. Copie o codigo de 6 digitos.
4. Cole esse valor em `confirmation_code`.
5. Rode `POST Confirm Email`.

Se quiser reenviar:

1. Garanta que `register_email` esta preenchido.
2. Rode `POST Resend Confirmation`.

### 3. Login

- Conta comum: `POST Login User`
- Conta admin: `POST Login Admin`

Depois do login:

1. Copie o `accessToken`.
2. Cole em `access_token` para rotas autenticadas comuns.
3. Cole em `admin_access_token` para rotas administrativas.

### 4. Recuperacao de senha

1. Rode `POST Forgot Password`.
2. Copie o codigo recebido e salve em `password_reset_code`.
3. Ajuste `reset_password_new` com a nova senha desejada.
4. Rode `POST Reset Password`.

Se precisar reenviar o codigo:

1. Garanta que `user_email` esta preenchido.
2. Rode `POST Resend Password Reset Code`.

## Produtos

### Rotas publicas e autenticadas

- `GET Products`
- `GET Product By Id`
- `GET Favorite Products`
- `POST Favorite Product`
- `DELETE Favorite Product`

Use `product_search`, `product_category`, `page` e `limit` se quiser filtrar a listagem.

Categorias aceitas:

- `FRUIT`
- `VEGETABLE`
- `LEGUME`

### Rotas admin de produto

- `POST Create Product`
- `PATCH Update Product`
- `DELETE Product`
- `POST Upload Product Image`
- `POST Relate Product Article`
- `PATCH Update Product Article Relation`
- `DELETE Remove Product Article Relation`

Depois de criar um produto, copie o `id` retornado para `product_id`.

### Galeria visual do produto

Requests incluidos:

- `POST Create Product Gallery Image URL`
- `POST Create Product Gallery Image Upload`
- `PATCH Update Product Gallery Image`
- `POST Replace Product Gallery Image File`
- `DELETE Product Gallery Image`

Fluxo recomendado:

1. Ajuste `product_id`.
2. Escolha se vai usar URL ou upload de arquivo.
3. Se usar upload, ajuste `product_gallery_image_file_path`.
4. Rode um dos requests de criacao.
5. Copie o `id` da imagem retornada para `product_image_id`.
6. Use `PATCH Update Product Gallery Image` para trocar legenda, tipo, ordem ou imagem principal.
7. Use `POST Replace Product Gallery Image File` quando quiser trocar o arquivo da imagem.
8. Use `DELETE Product Gallery Image` para remover o item da galeria.

Tipos aceitos para `kind`:

- `HERO`
- `WHOLE`
- `CUT`
- `IDEAL_STATE`
- `UNRIPE_STATE`
- `DEFECT`
- `STORAGE`
- `USAGE`
- `OTHER`

### Secoes do guia do produto

Requests incluidos:

- `POST Create Product Guide Section`
- `PATCH Update Product Guide Section`
- `POST Upload Product Guide Section Image`
- `DELETE Product Guide Section Image`
- `DELETE Product Guide Section`

Fluxo recomendado:

1. Ajuste `product_id`.
2. Rode `POST Create Product Guide Section`.
3. Copie o `id` retornado para `product_guide_section_id`.
4. Se quiser imagem na secao, ajuste `product_section_image_file_path`.
5. Rode `POST Upload Product Guide Section Image`.
6. Use `PATCH Update Product Guide Section` para revisar titulo, texto, bullets, sinais ideais, sinais de atencao e ordem.
7. Use `DELETE Product Guide Section Image` para remover so a imagem da secao.
8. Use `DELETE Product Guide Section` para remover a secao inteira.

Tipos aceitos para `kind` da secao:

- `CHOOSE`
- `OBSERVE`
- `STORE`
- `USE`
- `QUICK_FACTS`
- `OTHER`

## Artigos

### Rotas publicas e autenticadas

- `GET Articles`
- `GET Article By Id`
- `POST Save Article`
- `DELETE Save Article`
- `GET Saved Articles`

Use `article_search`, `article_category`, `page` e `limit` se quiser filtrar a listagem.

Categorias aceitas:

- `TIPS`
- `STORAGE`
- `SEASONALITY`
- `RECIPES`
- `WASTE_REDUCTION`

### Rotas admin

- `POST Create Article`
- `PATCH Update Article`
- `DELETE Article`
- `GET Admin Article By Id`
- `POST Upload Article Image`
- `POST Create Article Block`
- `POST Upload Article Block Image`
- `PATCH Update Article Block`
- `PATCH Update Article Block Image`
- `DELETE Article Block`
- `DELETE Article Block Image`

Depois de criar um artigo, copie o `id` retornado para `article_id`.

Para blocos de artigo:

1. Rode `POST Create Article Block`.
2. Copie o `id` retornado para `article_block_id`.
3. Se o bloco precisar de imagem, ajuste `article_block_image_file_path`.
4. Rode `POST Upload Article Block Image` usando `multipart/form-data`.
5. Use `PATCH Update Article Block Image` apenas quando quiser revisar `imageAlt` e `imageCaption` de uma imagem ja enviada.
6. Use `PATCH Update Article Block` para revisar o restante do conteudo.
7. Use `DELETE Article Block Image` para limpar a imagem do bloco sem remover o bloco.
8. Use `DELETE Article Block` para remover o bloco inteiro.

Tipos aceitos para `kind` de bloco:

- `PARAGRAPH`
- `HEADING`
- `IMAGE`
- `TIP`
- `WARNING`
- `CHECKLIST`
- `STEPS`
- `QUOTE`
- `PRODUCT_REFERENCE`
- `SECTION`
- `OTHER`

Tipos aceitos para upload de imagem do bloco:

- `image/jpeg`
- `image/png`
- `image/webp`

## Perfil e preferencias

Rotas autenticadas com `access_token`:

- `GET Me`
- `GET Profile`
- `PATCH Profile`
- `POST Upload Avatar`
- `GET Preferences`
- `PATCH Preferences`

## Usuarios admin

Rotas autenticadas com `admin_access_token`:

- `GET Users`
- `GET User By Id`
- `PATCH Update User`
- `DELETE User`

Fluxo util:

1. Crie um usuario com `POST Register`.
2. Confirme o e-mail, se necessario.
3. Use `GET Users` com `users_search`.
4. Copie o `id` para `managed_user_id`.
5. Use `PATCH Update User` para promover a conta a `ADMIN` ou marcar `emailVerified`.
6. Use `DELETE User` para remover a conta de teste.

## Observacoes

- O cadastro nao autentica automaticamente.
- As rotas admin exigem um usuario com role `ADMIN`.
- As rotas autenticadas comuns exigem `access_token`.
- Os uploads exigem configuracao valida de armazenamento.
- A collection cobre os fluxos atuais de produto, galeria, secoes, artigos, blocos, favoritos e salvos.
