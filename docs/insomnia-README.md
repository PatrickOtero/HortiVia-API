# HortiVia Insomnia

Esta pasta contém uma collection completa do Insomnia para testar a API HortiVia sem depender do app.

## Arquivos

- `hortivia-insomnia-collection.json`: export para importar no Insomnia
- `insomnia-README.md`: guia rápido de uso

## Como importar

1. Abra o Insomnia.
2. Vá em `Create` ou `Import`.
3. Escolha `File`.
4. Importe `backend/docs/hortivia-insomnia-collection.json`.
5. Selecione o environment `Local`.

## Variáveis importantes

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
- `managed_user_id`
- `product_id`
- `product_image_id`
- `product_guide_section_id`
- `article_id`
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

Use `GET Health` para validar se a API está no ar.

### 2. Cadastro e confirmação de e-mail

1. Rode `POST Register`.
2. Abra o e-mail recebido.
3. Copie o código de 6 dígitos.
4. Cole esse valor em `confirmation_code`.
5. Rode `POST Confirm Email`.

Se quiser reenviar:

1. Garanta que `register_email` está preenchido.
2. Rode `POST Resend Confirmation`.

### 3. Login

- Conta comum: `POST Login User`
- Conta admin: `POST Login Admin`

Depois do login:

1. Copie o `accessToken`.
2. Cole em `access_token` para rotas autenticadas comuns.
3. Cole em `admin_access_token` para rotas administrativas.

## Fluxo de produtos

### Rotas públicas

- `GET Products`
- `GET Product By Id`

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

Depois de criar um produto, copie o `id` retornado para `product_id`.

### Galeria visual do produto

Requests incluídos:

- `POST Create Product Gallery Image Upload`
- `PATCH Update Product Gallery Image`
- `POST Replace Product Gallery Image File`
- `DELETE Product Gallery Image`

Fluxo recomendado:

1. Ajuste `product_id`.
2. Ajuste `product_gallery_image_file_path`.
3. Rode `POST Create Product Gallery Image Upload`.
4. Copie o `id` da imagem retornada para `product_image_id`.
5. Use `PATCH Update Product Gallery Image` para trocar legenda, tipo, ordem ou imagem principal.
6. Use `POST Replace Product Gallery Image File` quando quiser trocar o arquivo da imagem.
7. Use `DELETE Product Gallery Image` para remover o item da galeria.

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

### Seções do guia do produto

Requests incluídos:

- `POST Create Product Guide Section`
- `PATCH Update Product Guide Section`
- `POST Upload Product Guide Section Image`
- `DELETE Product Guide Section Image`
- `DELETE Product Guide Section`

Fluxo recomendado:

1. Ajuste `product_id`.
2. Rode `POST Create Product Guide Section`.
3. Copie o `id` retornado para `product_guide_section_id`.
4. Se quiser imagem na seção, ajuste `product_section_image_file_path`.
5. Rode `POST Upload Product Guide Section Image`.
6. Use `PATCH Update Product Guide Section` para revisar título, texto, bullets, sinais ideais, sinais de atenção e ordem.
7. Use `DELETE Product Guide Section Image` para remover só a imagem da seção.
8. Use `DELETE Product Guide Section` para remover a seção inteira.

Tipos aceitos para `kind` da seção:

- `CHOOSE`
- `OBSERVE`
- `STORE`
- `USE`
- `QUICK_FACTS`
- `OTHER`

## Fluxo de artigos

### Rotas públicas

- `GET Articles`
- `GET Article By Id`

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
- `POST Upload Article Image`

Depois de criar um artigo, copie o `id` retornado para `article_id`.

## Perfil e preferências

Rotas autenticadas com `access_token`:

- `GET Me`
- `GET Profile`
- `PATCH Profile`
- `POST Upload Avatar`
- `GET Preferences`
- `PATCH Preferences`

## Usuários admin

Rotas autenticadas com `admin_access_token`:

- `GET Users`
- `GET User By Id`
- `PATCH Update User`
- `DELETE User`

Fluxo útil:

1. Crie um usuário com `POST Register`.
2. Confirme o e-mail, se necessário.
3. Use `GET Users` com `users_search`.
4. Copie o `id` para `managed_user_id`.
5. Use `PATCH Update User` para promover a conta a `ADMIN` ou marcar `emailVerified`.
6. Use `DELETE User` para remover a conta de teste.

## Observações

- O cadastro não autentica automaticamente.
- As rotas admin exigem um usuário com role `ADMIN`.
- Os uploads exigem configuração válida de armazenamento.
- A collection já cobre o fluxo antigo de `imageUrl` do produto e o fluxo novo de galeria e seções visuais.
