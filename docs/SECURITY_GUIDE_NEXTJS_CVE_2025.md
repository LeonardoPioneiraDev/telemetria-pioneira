# Guia de Seguranca: Vulnerabilidades Next.js (Dezembro 2025)

> **Objetivo:** Este documento serve como guia para analise e correcao de sistemas Next.js afetados pelas vulnerabilidades CVE-2025-55184 e CVE-2025-55183.
>
> **Fonte Oficial:** https://nextjs.org/blog/security-update-2025-12-11

---

## 1. Resumo das Vulnerabilidades

### CVE-2025-55184 - Denial of Service (DoS)

| Campo | Valor |
|-------|-------|
| **Severidade** | ALTA |
| **CVSS** | 7.5+ |
| **Tipo** | Denial of Service |
| **Vetor** | Requisicao HTTP maliciosa |

**Descricao Tecnica:**
Uma requisicao HTTP especialmente crafted causa um loop infinito no processo de deserializacao do servidor Next.js. Quando o servidor tenta processar essa requisicao, o processo Node.js trava completamente, parando de responder a qualquer requisicao subsequente.

**Impacto:**
- Indisponibilidade total do servico
- Necessidade de restart manual
- Facil exploracao (uma unica requisicao)

---

### CVE-2025-55183 - Exposicao de Codigo Fonte

| Campo | Valor |
|-------|-------|
| **Severidade** | MEDIA |
| **CVSS** | 5.3+ |
| **Tipo** | Information Disclosure |
| **Vetor** | Requisicao HTTP maliciosa |

**Descricao Tecnica:**
Uma requisicao maliciosa pode fazer Server Functions retornarem o codigo fonte compilado de outras Server Functions da aplicacao. Isso expoe:

- Logica de negocio (algoritmos, validacoes, regras)
- Secrets hardcoded no codigo (API keys, senhas)
- Valores inline dependendo da configuracao do bundler

**Importante:** Aplicacoes que usam apenas Pages Router NAO sao afetadas por esta vulnerabilidade.

---

## 2. Versoes Afetadas

| Range de Versao | Versoes Vulneraveis | Versao Corrigida |
|-----------------|---------------------|------------------|
| 13.x | >= 13.3.0 | **14.2.35** |
| 14.0.x | Todas | **14.2.35** |
| 14.1.x | Todas | **14.2.35** |
| 14.2.x | < 14.2.35 | **14.2.35** |
| 15.0.x | < 15.0.7 | **15.0.7** |
| 15.1.x | < 15.1.11 | **15.1.11** |
| 15.2.x | < 15.2.8 | **15.2.8** |
| 15.3.x | < 15.3.8 | **15.3.8** |
| 15.4.x | < 15.4.10 | **15.4.10** |
| 15.5.x | < 15.5.9 | **15.5.9** |
| 16.0.x | < 16.0.10 | **16.0.10** |

**Pre-requisito para vulnerabilidade:**
- Uso do App Router (pasta `app/`)
- Server Components ou Server Actions

---

## 3. Procedimento de Analise

### Passo 1: Identificar se o projeto usa Next.js

Verificar a existencia de Next.js no `package.json`:

```bash
# Buscar next no package.json
grep -E "\"next\":" package.json
```

**Output esperado (vulneravel):**
```json
"next": "15.5.7"
```

### Passo 2: Verificar a versao exata

```bash
# Via npm/pnpm/yarn
npm list next
# ou
pnpm list next
# ou
yarn list next
```

### Passo 3: Verificar se usa App Router

```bash
# Verificar se existe pasta app/ com page.tsx/page.js
find . -path "*/app/*" -name "page.tsx" -o -path "*/app/*" -name "page.js" | head -5
```

Se retornar arquivos, o projeto usa App Router e ESTA VULNERAVEL (se versao desatualizada).

### Passo 4: Verificar Server Actions

```bash
# Buscar por "use server" no codigo
grep -r "use server" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" .
```

---

## 4. Procedimento de Correcao

### Passo 1: Atualizar package.json

Editar o arquivo `package.json` e atualizar a versao do `next` para a versao corrigida correspondente:

**Antes (exemplo vulneravel):**
```json
{
  "dependencies": {
    "next": "15.5.7"
  }
}
```

**Depois (corrigido):**
```json
{
  "dependencies": {
    "next": "15.5.9"
  }
}
```

### Passo 2: Atualizar eslint-config-next (se presente)

Se o projeto usa `eslint-config-next`, atualizar para a mesma versao:

**Antes:**
```json
{
  "devDependencies": {
    "eslint-config-next": "15.5.7"
  }
}
```

**Depois:**
```json
{
  "devDependencies": {
    "eslint-config-next": "15.5.9"
  }
}
```

### Passo 3: Instalar dependencias

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install
```

### Passo 4: Verificar build

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build
```

### Passo 5: Validar correcao

```bash
# Verificar versao instalada
npm list next
```

**Output esperado:**
```
next@15.5.9
```

---

## 5. Tabela de Referencia Rapida

Para determinar a versao corrigida baseada na versao atual:

```
Se versao atual >= 13.3.0 e < 14.2.35  -> Atualizar para 14.2.35
Se versao atual >= 15.0.0 e < 15.0.7   -> Atualizar para 15.0.7
Se versao atual >= 15.1.0 e < 15.1.11  -> Atualizar para 15.1.11
Se versao atual >= 15.2.0 e < 15.2.8   -> Atualizar para 15.2.8
Se versao atual >= 15.3.0 e < 15.3.8   -> Atualizar para 15.3.8
Se versao atual >= 15.4.0 e < 15.4.10  -> Atualizar para 15.4.10
Se versao atual >= 15.5.0 e < 15.5.9   -> Atualizar para 15.5.9
Se versao atual >= 16.0.0 e < 16.0.10  -> Atualizar para 16.0.10
```

---

## 6. Ferramenta Automatizada

O Next.js disponibiliza uma ferramenta para correcao automatica:

```bash
npx fix-react2shell-next
```

Esta ferramenta analisa o projeto e aplica a correcao apropriada.

---

## 7. Informacoes Adicionais

### Origem da Vulnerabilidade

Estas vulnerabilidades originam no **React**, nao no Next.js diretamente. O Next.js herda o problema por usar o sistema de Server Functions do React.

CVEs relacionados no React:
- CVE-2025-55183 (React)
- CVE-2025-55184 (React)

### O que NAO e possivel com estas vulnerabilidades

- **NAO permite Remote Code Execution (RCE)** - o atacante nao consegue executar comandos arbitrarios no servidor
- **NAO afeta Pages Router** - apenas App Router e vulneravel

### Recomendacoes de Seguranca Adicionais

1. **Nunca hardcode secrets** - use variaveis de ambiente (`process.env.SECRET`)
2. **Mantenha Next.js atualizado** - especialmente patches de seguranca
3. **Use WAF/Rate limiting** - pode mitigar tentativas de DoS
4. **Monitore logs** - requisicoes malformadas podem indicar tentativas de ataque

---

## 8. Referencias

- **Anuncio Oficial:** https://nextjs.org/blog/security-update-2025-12-11
- **CVE-2025-55184:** https://nvd.nist.gov/vuln/detail/CVE-2025-55184
- **CVE-2025-55183:** https://nvd.nist.gov/vuln/detail/CVE-2025-55183

---

*Documento gerado em: 17 de Dezembro de 2025*
*Ultima atualizacao das versoes corrigidas: 11 de Dezembro de 2025*
