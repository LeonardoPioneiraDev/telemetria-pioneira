## **Documentação da API para Frontend - Fluxos de Reset de Senha**

Este documento descreve os endpoints da API necessários para implementar as funcionalidades de redefinição de senha, tanto pelo administrador quanto pelo próprio usuário.

### **Fluxo 1: Reset de Senha Iniciado pelo Administrador**

Este fluxo permite que um usuário com permissões de administrador force o envio de um e-mail de redefinição de senha para qualquer outro usuário do sistema.

#### **`POST /api/auth/users/{userId}/reset-password-admin`**

Dispara o envio do e-mail de "boas-vindas" (que contém o link para definição de senha) para um usuário específico.

- **Método:** `POST`
- **URL:** `/api/auth/users/{userId}/reset-password-admin`
- **Autenticação:** **Obrigatória**. Requer token de um usuário **Administrador**.

---

**Headers**

| Chave           | Valor                     |
| :-------------- | :------------------------ |
| `Authorization` | `Bearer <TOKEN_DO_ADMIN>` |

---

**Parâmetros de URL**

| Parâmetro | Tipo   | Descrição                                  |
| :-------- | :----- | :----------------------------------------- |
| `userId`  | `UUID` | O ID do usuário que terá a senha resetada. |

---

**Corpo da Requisição**

- Nenhum.

---

**Exemplo de Chamada (cURL)**

```bash
curl --location --request POST 'http://localhost:3333/api/auth/users/c2f40800-d204-4db3-83ef-70c541af177c/reset-password-admin' \
--header 'Authorization: Bearer <TOKEN_DO_ADMIN>'
```

---

**Respostas Possíveis**

- **`200 OK` - Sucesso**

  ```json
  {
    "success": true,
    "message": "O e-mail para redefinição de senha foi enviado ao usuário."
  }
  ```

- **`400 Bad Request` - Tentativa de auto-reset**

  ```json
  {
    "success": false,
    "message": "Você não pode resetar sua própria senha através desta função. Use a opção \"Esqueci minha senha\".",
    "error": "CANNOT_RESET_SELF"
  }
  ```

- **`401 Unauthorized`** - Token de admin não enviado ou inválido.

- **`403 Forbidden`** - O usuário autenticado não tem permissão de administrador.

- **`404 Not Found`** - O `userId` enviado na URL não corresponde a nenhum usuário.

---

---

### **Fluxo 2: Reset de Senha Iniciado pelo Usuário ("Esqueci a Senha")**

Este é o fluxo padrão onde o próprio usuário, a partir da tela de login, solicita a redefinição de sua senha. É um processo de duas etapas.

#### **Passo 1: Solicitar o E-mail de Reset**

##### **`POST /api/auth/password/reset-request`**

- **Método:** `POST`
- **URL:** `/api/auth/password/reset-request`
- **Autenticação:** **Nenhuma**. Rota pública.

---

**Corpo da Requisição**

```json
{
  "email": "email.do.usuario@exemplo.com"
}
```

---

**Exemplo de Chamada (cURL)**

```bash
curl --location --request POST 'http://localhost:3333/api/auth/password/reset-request' \
--header 'Content-Type: application/json' \
--data-raw '{
    "email": "felipebatista@vpioneira.com.br"
}'
```

---

**Respostas Possíveis**

- **`200 OK` - Sucesso**

  > **Nota:** Por segurança (para evitar que descubram quais e-mails estão cadastrados), a API sempre retornará sucesso, mesmo que o e-mail não exista.

  ```json
  {
    "success": true,
    "message": "Se o email existir em nossa base, você receberá instruções para redefinir sua senha"
  }
  ```

- **`429 Too Many Requests`** - O usuário excedeu o limite de tentativas para esta ação.

#### **Passo 2: Definir a Nova Senha**

Após o usuário receber o e-mail e clicar no link, ele será direcionado para uma página no frontend. Nessa página, ele informará a nova senha, e o frontend fará a chamada abaixo, enviando o token extraído da URL.

##### **`POST /api/auth/password/reset`**

- **Método:** `POST`
- **URL:** `/api/auth/password/reset`
- **Autenticação:** **Nenhuma**. A segurança é garantida pelo token de uso único.

---

**Corpo da Requisição**

```json
{
  "token": "TOKEN_RECEBIDO_NO_LINK_DO_EMAIL",
  "newPassword": "umaNovaSenhaForte123",
  "confirmPassword": "umaNovaSenhaForte123"
}
```

---

**Exemplo de Chamada (cURL)**

```bash
curl --location --request POST 'http://localhost:3333/api/auth/password/reset' \
--header 'Content-Type: application/json' \
--data-raw '{
    "token": "65cfc165441b68876493ff2fc2bc51437c36c78c6f0fee3613c0998ff0e4b07b",
    "newPassword": "novaSenha@2025",
    "confirmPassword": "novaSenha@2025"
}'
```

---

**Respostas Possíveis**

- **`200 OK` - Sucesso**
  ```json
  {
    "success": true,
    "message": "Senha alterada com sucesso"
  }
  ```
- **`400 Bad Request` - Token Inválido**
  ```json
  {
    "success": false,
    "message": "Token de recuperação inválido ou expirado",
    "error": "INVALID_RESET_TOKEN"
  }
  ```
- **`400 Bad Request` - Validação da Senha** (Ex: senhas não conferem, senha muito fraca, etc.)
  ```json
  {
    "success": false,
    "message": "A confirmação de senha não confere com a nova senha.",
    "error": "VALIDATION_ERROR"
  }
  ```
