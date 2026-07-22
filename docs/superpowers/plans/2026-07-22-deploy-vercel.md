# Deploy na Vercel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** publicar o front estático numa URL HTTPS pública, para que o app abra no celular pelo 4G, de qualquer lugar.

**Architecture:** nada muda na arquitetura do app — ele continua sendo um SPA estático falando direto com o Supabase. A peça nova é a Vercel servindo o `dist/`, com build disparado a cada push na `main`. O repositório ganha só um `vercel.json` (fallback de SPA) e um trecho de README; o resto é configuração de painel, feita à mão uma vez.

**Tech Stack:** Vite 8 (build), Vercel (hospedagem estática + CI de build), Supabase (já em nuvem, inalterado), Mapbox GL (token restrito por URL).

**Spec:** `docs/superpowers/specs/2026-07-22-deploy-vercel-design.md`

## Global Constraints

- **Nunca** enviar `SUPABASE_ACCESS_TOKEN` para o painel da Vercel, nem para qualquer arquivo versionado. É credencial de administrador e não participa do build.
- Só as três variáveis `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_MAPBOX_TOKEN` vão para o painel — os nomes exatos, com o prefixo `VITE_`, senão o Vite não as injeta no bundle.
- `.env` e `dist/` continuam fora do git (já estão no `.gitignore`; não alterar).
- Fora de escopo neste plano: offline, ícones/instalação de PWA, domínio próprio, CI de testes. Não implementar nada disso "de brinde".

## Nota sobre as tarefas 2 e 3

Boa parte deste trabalho acontece em painéis web (Vercel e Mapbox), com login pessoal
do João Pedro. **Essas etapas são executadas por ele, não pelo agente.** O papel do
agente nas tarefas 2 e 3 é conduzir e conferir o resultado, não clicar. Nenhuma tarefa
depende de o agente ter acesso a essas contas.

---

### Task 1: Fallback de SPA (`vercel.json`)

O roteamento é do react-router, em memória. Para o CDN, `/campo/3` não é um arquivo —
sem uma regra de rewrite, acessar essa URL direto (ou dar F5 nela) devolve 404. Este
arquivo diz à Vercel: se nenhum arquivo estático corresponder, entregue o `index.html`
e deixe o app resolver a rota.

**Files:**
- Create: `vercel.json`

**Interfaces:**
- Consumes: nada.
- Produces: o comportamento de rewrite verificado na Task 3, passo 2.

- [ ] **Step 1: Criar o `vercel.json`**

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Rewrites da Vercel são avaliadas **depois** do sistema de arquivos: os assets de
`dist/assets/*` continuam sendo servidos normalmente, e só o que não existe cai no
`index.html`. Por isso o padrão pode ser abrangente.

- [ ] **Step 2: Confirmar que o build ainda passa**

Run: `npm run build`
Expected: termina sem erro e grava `dist/index.html`.

`vercel.json` não é lido pelo Vite — este passo só garante que o arquivo novo na raiz
não quebrou nada.

- [ ] **Step 3: Sanidade local do roteamento**

Run: `npm run preview` e abrir `http://localhost:4173/campo/qualquer-coisa`
Expected: a tela do app carrega (não um 404 do servidor).

**Atenção, isto NÃO prova que o `vercel.json` funciona:** o `vite preview` já faz
fallback de SPA por conta própria. O passo só confirma que o app aguenta ser carregado
direto numa rota profunda. A prova real do rewrite é a Task 3, passo 2, em produção.

Encerre o preview com Ctrl-C antes de seguir.

- [ ] **Step 4: Commit**

```bash
git add vercel.json
git commit -m "chore(deploy): fallback de SPA para as rotas do react-router"
```

---

### Task 2: Projeto na Vercel, variáveis e primeiro deploy

**Executada pelo João Pedro no painel.** O agente acompanha e confere.

**Files:** nenhum. Toda a mudança é de configuração externa.

**Interfaces:**
- Consumes: o `vercel.json` da Task 1, já commitado e no GitHub.
- Produces: a **URL de produção** (algo como `https://polygon-xxxx.vercel.app`), usada na
  Task 3 (allowlist do Mapbox e verificação) e na Task 4 (README).

- [ ] **Step 1: Publicar a Task 1 no GitHub**

```bash
git push origin main
```

A Vercel importa o repositório do GitHub; o `vercel.json` precisa estar lá antes do
primeiro build, senão o primeiro deploy sobe sem o rewrite.

- [ ] **Step 2: Importar o repositório**

Em vercel.com → **Add New… → Project** → importar `jplcordeiro/polygon`.

Conferir o que a Vercel detectou sozinha, sem alterar:
- Framework Preset: **Vite**
- Build Command: `npm run build`
- Output Directory: `dist`

Se algum desses vier diferente, corrigir para os valores acima.

**Não clicar em Deploy ainda** — sem as variáveis do passo 3, o build até passa, mas o
app sobe sem Supabase e sem Mapbox.

- [ ] **Step 3: Cadastrar as três variáveis de ambiente**

Ainda na tela de import (ou em Settings → Environment Variables), adicionar, nos
ambientes **Production** e **Preview**:

| Nome | Valor |
|---|---|
| `VITE_SUPABASE_URL` | o mesmo do `.env` local |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | o mesmo do `.env` local |
| `VITE_MAPBOX_TOKEN` | o mesmo do `.env` local |

Os valores estão no `.env` da máquina. Para lê-los sem despejar o arquivo inteiro
(que contém também o token de admin):

```bash
grep '^VITE_' .env
```

**Não cadastrar `SUPABASE_ACCESS_TOKEN`.**

No painel do **Supabase não há nada a fazer**: o login é e-mail e senha
(`signInWithPassword`), sem magic link, portanto não existe redirect URL a cadastrar. A
URL ser pública também não expõe dados — a role `anon` não lê nada, por RLS.

- [ ] **Step 4: Deploy**

Clicar em **Deploy** e aguardar o build terminar em verde.

Expected: log mostra `tsc -b` e `vite build` sem erro, e a Vercel exibe a URL de
produção.

Se o build falhar, é erro de tipo real — o mesmo `npm run build` da Task 1, passo 2 —
e deve ser corrigido no código, não contornado na configuração.

- [ ] **Step 5: Anotar a URL de produção**

Copiar a URL exibida (formato `https://<projeto>.vercel.app`). Ela é insumo das duas
tarefas seguintes.

Sem commit: esta tarefa não toca no repositório.

---

### Task 3: Liberar o Mapbox e verificar no celular

**Executada pelo João Pedro** (painel do Mapbox + celular no 4G). O agente conduz o
roteiro e registra o resultado.

**Files:** nenhum.

**Interfaces:**
- Consumes: a URL de produção da Task 2, passo 5.
- Produces: a confirmação de que o objetivo do spec foi atingido.

- [ ] **Step 1: Adicionar a URL à allowlist do token Mapbox**

Em account.mapbox.com → **Tokens** → abrir o token usado em `VITE_MAPBOX_TOKEN` →
**URL restrictions** → acrescentar a URL de produção, mantendo as entradas de
desenvolvimento que já existem.

Se este passo for pulado, o mapa abre **em branco, sem mensagem de erro** — é o modo de
falha mais confuso de todo o plano, e o mesmo já visto no teste por LAN.

- [ ] **Step 2: Rota profunda direto na barra de endereço**

No celular, **com o Wi-Fi desligado** (o Wi-Fi de casa mascara o teste: ele não prova
que funciona "de qualquer lugar"), abrir a URL de produção e fazer login.

Em seguida, colar direto na barra de endereço uma rota profunda, por exemplo
`https://<projeto>.vercel.app/campo/<id-de-um-território>`.

Expected: a tela do território carrega.
Se der 404: o rewrite da Task 1 não chegou à Vercel — conferir se o `vercel.json` está
no commit que foi publicado.

- [ ] **Step 3: Mapa e GPS**

Na mesma tela, confirmar:
- O mapa desenha os limites do território (prova a allowlist do passo 1).
- O "você está aqui" pega a posição, após o navegador pedir permissão de localização
  (prova o HTTPS de verdade — sem o certificado auto-assinado do `npm run all`, que
  obrigava a aceitar um aviso de segurança).

- [ ] **Step 4: Registrar o resultado**

Se os passos 2 e 3 passaram, o objetivo do spec está cumprido. Se algum falhou, **parar
aqui** e diagnosticar antes da Task 4 — documentar um deploy que não funciona é pior do
que não documentar.

Sem commit.

---

### Task 4: Documentar o deploy no README

Configuração que mora fora do repositório se perde. Este trecho existe para que, daqui a
seis meses, ninguém precise redescobrir onde ficam as variáveis nem por que o mapa está
em branco.

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: a URL de produção (Task 2, passo 5), já verificada na Task 3.
- Produces: nada — é a última tarefa.

- [ ] **Step 1: Acrescentar a seção ao final do `README.md`**

Substituir `<projeto>` pela URL real de produção:

```markdown
## Deploy

O app é publicado na Vercel a partir da branch `main`: cada push dispara
`npm run build` e publica o `dist/`. Produção: https://<projeto>.vercel.app

As variáveis de ambiente ficam no painel da Vercel (Settings → Environment
Variables), nos ambientes Production e Preview:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_MAPBOX_TOKEN`

O `SUPABASE_ACCESS_TOKEN` do `.env` **não** vai para lá — é credencial de
administrador e não participa do build.

Ao trocar o domínio, incluir o novo endereço na allowlist de URL do token Mapbox
(account.mapbox.com → Tokens → URL restrictions). Sem isso o mapa abre em branco,
sem mensagem de erro. Pelo mesmo motivo, deploys de preview (URLs geradas por push
em branch) mostram o mapa em branco: essas URLs nunca estão na allowlist. É
esperado.
```

- [ ] **Step 2: Conferir o texto**

Run: `grep -n "vercel.app" README.md`
Expected: a URL real aparece, sem o placeholder `<projeto>`.

- [ ] **Step 3: Commit e publicar**

```bash
git add README.md
git commit -m "docs(deploy): documenta a publicação na Vercel"
git push origin main
```
