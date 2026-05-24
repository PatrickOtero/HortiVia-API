# HortiVia Insomnia

Esta pasta contem uma collection completa do Insomnia para testar a API HortiVia sem precisar abrir o app nem consultar o banco manualmente.

Importante: a collection cobre todas as rotas HTTP que o backend expoe hoje.

## Arquivos

- `hortivia-insomnia-collection.json`: export importavel no Insomnia.
- `insomnia-README.md`: guia rapido de uso.

## Como importar

1. Abra o Insomnia.
2. Va em `Create` ou `Import`.
3. Escolha `File`.
4. Importe `backend/docs/hortivia-insomnia-collection.json`.
5. Selecione o environment `Local`.

## Variaveis importantes

Preencha no environment conforme o seu contexto:

- `base_url`: URL da API. Exemplo local: `http://localhost:3000`
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
- `article_id`
- `avatar_file_path`
- `product_image_file_path`
- `article_image_file_path`

## Fluxo sugerido de teste

### 1. Health

Use `GET Health` para validar se a API esta no ar.

### 2. Cadastro e confirmacao de e-mail

1. Rode `POST Register`.
2. Abra o e-mail recebido.
3. Copie o codigo de 6 digitos enviado por e-mail.
4. Cole esse valor em `confirmation_code`.
5. Rode `POST Confirm Email`.

Se quiser gerar um novo e-mail:

1. Garanta que `register_email` esta preenchido.
2. Rode `POST Resend Confirmation`.

### 3. Login

- Para conta comum, use `POST Login User`.
- Para conta admin, use `POST Login Admin`.

Depois do login:

1. Copie o `accessToken` retornado.
2. Cole em `access_token` para rotas autenticadas comuns.
3. Cole em `admin_access_token` para rotas admin.

## Fluxo de produtos

### Rotas publicas

- `GET Products`
- `GET Product By Id`

Use `product_search`, `product_category`, `page` e `limit` se quiser filtrar listagem.

Categorias aceitas:

- `FRUIT`
- `VEGETABLE`
- `LEGUME`

### Rotas admin

- `POST Create Product`
- `PATCH Update Product`
- `DELETE Product`
- `POST Upload Product Image`

Depois de criar um produto, copie o `id` retornado para `product_id`.

Para upload de imagem:

1. Ajuste `product_image_file_path`.
2. Rode `POST Upload Product Image`.

O campo multipart ja esta configurado como `image`.

## Fluxo de artigos

### Rotas publicas

- `GET Articles`
- `GET Article By Id`

Use `article_search`, `article_category`, `page` e `limit` se quiser filtrar listagem.

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

Para upload de imagem:

1. Ajuste `article_image_file_path`.
2. Rode `POST Upload Article Image`.

O campo multipart ja esta configurado como `image`.

## Perfil e preferencias

Rotas autenticadas com `access_token`:

- `GET Me`
- `GET Profile`
- `PATCH Profile`
- `POST Upload Avatar`
- `GET Preferences`
- `PATCH Preferences`

Para upload de avatar:

1. Ajuste `avatar_file_path`.
2. Rode `POST Upload Avatar`.

O campo multipart ja esta configurado como `avatar`.

## Usuarios admin

Rotas autenticadas com `admin_access_token`:

- `GET Users`
- `GET User By Id`
- `PATCH Update User`
- `DELETE User`

Fluxo util para substituir o DBeaver em testes:

1. Crie um usuario pelo `POST Register`.
2. Confirme o e-mail, se necessario.
3. Use `GET Users` com `users_search` preenchido com o e-mail ou nome.
4. Copie o `id` para `managed_user_id`.
5. Use `PATCH Update User` para promover a conta a `ADMIN` ou marcar `emailVerified`.
6. Use `DELETE User` para remover a conta de teste quando terminar.

Filtros aceitos em `GET Users`:

- `users_search`
- `users_role_filter`: `USER` ou `ADMIN`
- `users_email_verified`: `true` ou `false`

## Observacoes

- O cadastro nao autentica automaticamente. Confirme o e-mail antes de fazer login.
- As rotas admin exigem um usuario com role `ADMIN`.
- Os uploads exigem que a configuracao de armazenamento da API esteja valida.
- A exclusao de usuario falha de forma segura se a conta tiver dados vinculados, como artigos com autoria associada.
