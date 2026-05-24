# Auth QA Checklist

## Register

- Tentar cadastrar com e-mail inválido.
- Tentar cadastrar com senha fraca.
- Cadastrar com dados válidos.
- Repetir o cadastro com o mesmo e-mail normalizado.

## Confirm E-mail

- Tentar confirmar com código inválido.
- Solicitar reenvio do código.
- Confirmar com código válido.
- Tentar login antes da confirmação.
- Fazer login após a confirmação.

## Login

- Tentar login com senha incorreta.
- Tentar login com e-mail com espaços e letras maiúsculas.
- Validar mensagem de conta não confirmada.
- Validar acesso com conta confirmada.

## Session

- Fechar e reabrir o app com token válido.
- Fazer logout e confirmar retorno para Login.
- Simular token inválido ou expirado e confirmar limpeza da sessão.

## Password Recovery

- Solicitar redefinição com e-mail desconhecido.
- Solicitar redefinição com e-mail conhecido.
- Tentar redefinir com código inválido.
- Tentar redefinir com senha fraca.
- Solicitar reenvio do código e validar cooldown.
- Redefinir com código válido.
- Confirmar que a senha antiga deixa de funcionar.
- Confirmar que a nova senha permite login.
