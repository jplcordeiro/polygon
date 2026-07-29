# Relatório em PDF — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exportar o relatório mensal como um PDF de verdade, completo — com o detalhe por saída expandido, a seção Rodadas, cabeçalho repetido e numeração de páginas — em vez do `window.print()` atual, que sai recortado na altura de uma tela.

**Architecture:** O relatório passa a ser gerado a partir dos dados, não do DOM. Uma função pura em `src/lib/relatorio.ts` transforma territórios + marcas + rodadas na estrutura da folha; um `Document` do `@react-pdf/renderer` em `src/pdf/` desenha essa estrutura; a tela só dispara `pdf(doc).toBlob()` atrás de um `import()` dinâmico. A tela em si não muda. Em paralelo, duas correções pequenas e independentes: destravar o recorte de `overflow` no `@media print` (que é o que quebrava a impressão, e ainda quebra a do Calendário) e paginar as consultas de `quadra_feita` / `ponto_parada`, hoje sujeitas ao teto de 1000 linhas do PostgREST.

**Tech Stack:** React 19 + TypeScript · `@react-pdf/renderer` (novo, carregado sob demanda) · Vitest + @testing-library/react (jsdom) · Tailwind CSS v4 (config em `src/index.css`).

## Diagnóstico que motivou o plano

O botão "Imprimir" (`Relatorio.tsx:45`) chama `window.print()`. O conteúdo vive dentro de `AppShell.tsx:105` (`flex h-dvh flex-col`) e `AppShell.tsx:147` (`<main class="min-h-0 flex-1 overflow-y-auto">`): um ancestral de altura travada em uma tela, com contêiner de rolagem. Na impressão isso **recorta** o conteúdo — o navegador emite a primeira tela e descarta o resto. O `@media print` de `src/index.css:182` esconde o cabeçalho mas nunca desfaz a trava.

Somam-se dois vazamentos menores: o detalhe por saída fica num `<details>` fechado (`Relatorio.tsx:134`), e o hack `content-visibility: visible` em `::details-content` (`index.css:203`) não abre um `<details>` fechado fora do Chrome; e a seção Rodadas é `nao-imprime` (`Relatorio.tsx:194`), nunca chegando ao papel.

## Global Constraints

- **Não escrever comentários no código.** O código se explica por nomes claros. (`CLAUDE.md`)
- **UI nunca chama `supabase` direto** — só `src/lib/` toca no Supabase.
- **Estado derivado, nunca armazenado.** O PDF não guarda nada; recalcula a partir das marcas.
- Nomes de domínio em português (`folhaDoMes`, `LinhaFolha`, `RelatorioPdf`).
- **O `@react-pdf/renderer` nunca entra no bundle inicial.** Só via `import()` dentro do handler do botão — é um PWA que precisa abrir rápido em campo.
- Cores do PDF saem dos tokens de `src/index.css`, em hex literal (o react-pdf não enxerga CSS): `ink #29323c`, `ink-soft #67707d`, `ink-faint #98a1ae`, `line #dde3ea`, `jwblue-deep #33507d`, `sage-ink #3f6b58`, `sage-wash #e7f0eb`.
- Texto de local nulo: `"Sem ponto de encontro"` (mesma string de `Relatorio.tsx:181` e `Calendario.tsx`).
- **A tela do Relatório não muda.** Os `<details>` continuam colapsados no navegador; só o documento exportado é novo.
- Rodar `npm run test` e `npm run build` antes de considerar qualquer tarefa pronta.

## Decisões fechadas (não reabrir durante a execução)

| | |
|---|---|
| Escopo | Continua mensal. Território sem trabalho no mês fica de fora, por definição |
| Conteúdo | Indicadores + tabela + detalhe por saída expandido + Rodadas. **Sem glyph** |
| Layout | A4 retrato, tabela com saídas indentadas, blocos com `wrap={false}` |
| Acabamento | Cabeçalho repetido, "Página X de Y", data de geração, Rodadas em página nova |
| Fontes | Atkinson Hyperlegible Next + Mono, em **WOFF estático** via `@fontsource/*` (ver Task 3) |
| Entrega | "Baixar PDF" substitui "Imprimir" → `relatorio-2026-07.pdf` |
| Calendário | Não vira PDF; só ganha o destravamento do `@media print` |

O glyph está **fora** de escopo: nada de portar a matemática de `TerritorioGlyph.tsx` nem de usar `<Svg>/<Path>`.

---

## File Structure

```
src/
  lib/
    supabase.ts                       # + helper de paginação
    quadras.ts                        # listMarcas/listParadas passam a paginar
    relatorio.ts                      # NOVO — folhaDoMes(), pura
    relatorio.test.ts                 # + describe("folhaDoMes")
  pdf/                                # NOVO
    fontes.ts                         # Font.register dos TTF
    RelatorioPdf.tsx                  # o Document
    RelatorioPdf.test.tsx             # smoke test
  screens/
    Relatorio.tsx                     # botão vira "Baixar PDF"
  index.css                           # @media print: destrava a casca
```

---

### Task 1: Paginar as consultas que podem estourar o teto de 1000 linhas

Independente do PDF; pode ser feita em paralelo com as Tasks 2 e 3.

**Files:**
- Modify: `src/lib/supabase.ts` (helper novo)
- Modify: `src/lib/quadras.ts` (`listMarcas` na linha 234, `listParadas` na linha 251)
- Test: `src/lib/supabase.test.ts`

**Contexto:** `quadra_feita` é a tabela de maior cardinalidade do schema — uma linha por quadra por saída. O PostgREST corta a resposta no `max-rows` do projeto (padrão 1000) e, sem `ORDER BY`, o corte cai em ordem indefinida. Quando estourar, o relatório passa a afirmar que territórios não foram trabalhados, **em silêncio, sem erro**.

**Interfaces:**
- Produces, em `src/lib/supabase.ts`:
  ```ts
  export async function todasAsLinhas<T>(
    pagina: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  ): Promise<T[]>
  ```
  Busca em páginas de 1000 via `.range(de, ate)` até vir uma página curta. Lança em `error`, como o resto da camada.

- [ ] **Step 1: Escrever os testes que falham**

Em `src/lib/supabase.test.ts`, cobrir: uma página curta encerra em uma chamada; exatamente 1000 linhas dispara uma segunda chamada; três páginas concatenam na ordem; `error` numa página propaga a exceção.

- [ ] **Step 2: Implementar `todasAsLinhas`**

- [ ] **Step 3: Aplicar em `listMarcas` e `listParadas`**

Envolver os `select` de `quadra_feita` e `ponto_parada` com `todasAsLinhas`, acrescentando `.order("saida_id")` para o corte ser determinístico caso o teto ainda apareça. O `select` de `saida` fica como está — a tabela é pequena e o `Map` construído a partir dela só precisa cobrir as marcas retornadas.

- [ ] **Step 4: `npm run test && npm run build`**

---

### Task 2: Destravar o recorte de `overflow` na impressão

Independente; corrige o Calendário, que continua usando `window.print()`.

**Files:**
- Modify: `src/index.css` (bloco `@media print`, linhas 182–206)

- [ ] **Step 1: Adicionar as regras de destravamento**

Dentro de `@media print`, fazer a casca e o `<main>` crescerem: `height: auto`, `max-height: none`, `overflow: visible`. Alcançar os dois nós de `AppShell.tsx` — o wrapper `h-dvh` e o `<main>` com `overflow-y-auto`. Como não têm classe própria, dar a eles um gancho estável (ex.: `data-folha` no wrapper e no `main` em `AppShell.tsx`) em vez de mirar em classes utilitárias do Tailwind, que mudam sozinhas.

- [ ] **Step 2: Remover o hack de `<details>`**

Apagar a regra `.folha details::details-content` (`index.css:203`): ela existia só para o Relatório, que deixa de imprimir pelo navegador. As regras `.folha-grade` / `.folha-agenda` e o `@page { size: A4 landscape }` **ficam** — passam a ser exclusivas do Calendário, que é quem quer paisagem.

- [ ] **Step 3: Verificar no navegador**

Abrir `/calendario`, `Ctrl+P`, confirmar que a grade sai inteira e não só a primeira tela.

---

### Task 3: Fontes estáticas via `@fontsource/*` — RESOLVIDA

**O plano original mandava vendorizar TTF. A premissa estava errada e foi corrigida por medição.**

O que se apurou:
- `google/fonts` publica Atkinson Hyperlegible **Next** e **Mono** apenas como TTF **variável** (`AtkinsonHyperlegibleNext[wght].ttf`). Não existem estáticos oficiais. Só a Atkinson Hyperlegible v1 (sem variante mono) tem estáticos.
- Instanciar as variáveis com `fonttools` esbarrou em `ensurepip` ausente (precisaria de `sudo apt install python3.14-venv`).
- **Teste empírico com o próprio `@react-pdf/renderer` 4.5.1:** os `.woff` estáticos de `@fontsource/*` renderizam sem erro; os `.woff2` lançam. Os quatro arquivos embutem como subsets distintos e corretos — `AtkinsonHyperlegibleNext-Regular`, `-SemiBold`, `-Bold`, `AtkinsonHyperlegibleMono-Regular` — com acentuação preservada.

Decisão: **usar os `.woff` dos pacotes estáticos**, sem binários no repositório. Melhor que vendorizar em todos os eixos — dependência versionada, sem `OFL.txt` para manter, e o subsetting do react-pdf mantém cada PDF leve.

**Files:**
- Modify: `package.json`

- [x] **Step 1: Instalar os pacotes estáticos**

```
npm i @fontsource/atkinson-hyperlegible-next @fontsource/atkinson-hyperlegible-mono
```

Convivem com os `@fontsource-variable/*` já instalados, que continuam servindo a tela. Os estáticos existem só para o PDF.

**Atenção para a Task 5:** apontar sempre para `.woff`, **nunca** `.woff2`. Os dois estão lado a lado no mesmo diretório `files/`, e trocar um pelo outro só falha em tempo de geração, com erro obscuro do fontkit.

---

### Task 4: `folhaDoMes()` — a modelagem pura

Depende da Task 1 apenas conceitualmente; pode começar antes.

**Files:**
- Create: `src/lib/relatorio.ts`
- Test: `src/lib/relatorio.test.ts` (novo `describe` no fim; o arquivo já existe e já testa o relatório, mesmo importando de `./quadras`)

**Interfaces:**
- Consumes: `relatorioDoMes`, `passagensDoMes`, `PassagemMes`, `Marca` (de `./quadras`), `campanhas` (de `./rodadas`), `MES_NOME`, `dataBR`, `Mes` (de `./saidas`), `Territorio` e `Rodada` (de `./types`).
- Produces:
  ```ts
  export interface LinhaFolha {
    numero: string;
    nome: string;
    feitasNoMes: number;
    total: number;
    concluidoNoMes: boolean;
    passagens: PassagemMes[];
  }

  export interface PeriodoFolha {
    nome: string;
    inicio: string;
    territorios: number;
  }

  export interface Folha {
    titulo: string;
    geradoEm: string;
    totalQuadrasNoMes: number;
    totalTerritorios: number;
    totalConcluidos: number;
    linhas: LinhaFolha[];
    periodos: PeriodoFolha[];
  }

  export function folhaDoMes(
    m: Mes,
    territorios: Territorio[],
    marcas: Marca[],
    rodadas: Rodada[],
    hoje?: Date,
  ): Folha
  ```
  A Task 5 consome exatamente esses nomes. `hoje` é injetável para o teste de `geradoEm` não depender do relógio.

**Regras de formatação, resolvidas aqui e não no Document:**
- `titulo`: `"Julho 2026"` (`MES_NOME[m.mes - 1]` + ano).
- `geradoEm`: `dataBR` da data de `hoje ?? new Date()`.
- `nome`: `t.nome ?? "Sem nome"` (mesma string de `Relatorio.tsx:147`).
- `passagens[].local` nulo permanece nulo; o Document aplica `"Sem ponto de encontro"`.
- `periodos[].nome`: `p.nome ?? "Rodada"` (mesma string de `Relatorio.tsx:205`).
- Ordem das linhas: a de `relatorioDoMes`, que já vem de `listTerritorios()` ordenado por `numero`.

- [ ] **Step 1: Escrever os testes que falham**

Cobrir: mês vazio devolve `linhas: []` e totais zerados; um território com duas saídas agrega as duas passagens em ordem de data; `concluidoNoMes` é repassado; `titulo` e `geradoEm` formatados; `periodos` derivados de `campanhas()`; território sem nome vira `"Sem nome"`. Reusar os helpers `quadrado()` e `colecao()` já existentes no topo do arquivo.

- [ ] **Step 2: Implementar `folhaDoMes`**

Composição fina sobre as funções que já existem. **Não** reimplementar contagem de quadras nem `fechamentosDe` — chamar `relatorioDoMes` e `passagensDoMes`.

- [ ] **Step 3: `npm run test`**

---

### Task 5: O Document do PDF

Depende das Tasks 3 e 4.

**Files:**
- Create: `src/pdf/fontes.ts`, `src/pdf/RelatorioPdf.tsx`
- Test: `src/pdf/RelatorioPdf.test.tsx`
- Modify: `package.json` (`npm i @react-pdf/renderer`)

**Interfaces:**
- Consumes: `Folha` (de `../lib/relatorio`).
- Produces:
  ```ts
  export function RelatorioPdf({ folha }: { folha: Folha }): React.ReactElement
  ```

- [ ] **Step 1: Instalar e registrar as fontes**

`src/pdf/fontes.ts` importa os TTF com `?url` (o Vite emite como asset e devolve a URL; o `vite-plugin-pwa` faz precache do `dist/`, então o PDF continua gerável offline) e chama `Font.register` para `"Atkinson"` (400/600/700) e `"Atkinson Mono"` (400). Exportar uma função `registrarFontes()` idempotente, chamada uma vez pelo Document — não registrar no topo do módulo, para o efeito colateral não disparar só por importar.

- [ ] **Step 2: Montar o Document**

Estrutura, seguindo o layout aprovado:

```
Page size="A4" (retrato), padding ~36pt

  View fixed  ← repete em toda página
    "Relatório de campo"  ·  {folha.titulo}
    faixa: TERR. | NOME | QUADRAS | STATUS

  View  ← só na primeira página
    três indicadores: Quadras feitas | Territórios | Concluídos

  folha.linhas.map → View wrap={false}
    linha do território: numero (Mono) · nome · "5 de 8" (Mono) · "CONCLUÍDO"
    passagens.map → Text recuado: "04/07 · Praça Central · 3 quadras"

  View break  ← Rodadas em página nova
    folha.periodos.map → nome · "desde 12/07 · 4 territórios"

  View fixed bottom  ← repete em toda página
    "Gerado em {folha.geradoEm}"          "Página X de Y"
```

Detalhes que importam:
- `wrap={false}` no bloco de cada território impede que ele rache na virada de página.
- `break` na `View` das Rodadas força a página nova.
- "Página X de Y" via `render={({ pageNumber, totalPages }) => ...}` numa `View fixed`.
- Mono (`"Atkinson Mono"`) só em número de território, coluna QUADRAS e datas — o mesmo papel que ela tem na tela (`--font-escala-mono`, `index.css:47`). O resto em `"Atkinson"`.
- `folha.linhas.length === 0` não deve acontecer (a Task 6 desabilita o botão), mas o Document renderiza uma página com "Nenhum trabalho registrado neste mês" em vez de quebrar.
- Sem seção Rodadas se `periodos` for vazio — não gerar uma página em branco.

- [ ] **Step 3: Smoke test**

`RelatorioPdf.test.tsx` afirma que o Document renderiza sem lançar, para uma `Folha` cheia e para uma vazia. **Não** gerar o PDF em buffer: exigiria ambiente node no Vitest e os TTF legíveis em disco, e o que quebra de verdade (a modelagem) já está coberto na Task 4.

- [ ] **Step 4: `npm run test && npm run build`**

Conferir no build que o `@react-pdf/renderer` saiu num chunk separado, e não no `index-*.js`.

---

### Task 6: O botão

Depende das Tasks 4 e 5.

**Files:**
- Modify: `src/screens/Relatorio.tsx`
- Test: `src/screens/Relatorio.test.tsx`

- [ ] **Step 1: Escrever os testes que falham**

Cobrir: o botão diz "Baixar PDF"; fica desabilitado quando o mês não tem linhas; ao clicar, o módulo de PDF é carregado e um download é disparado com o nome `relatorio-2026-07.pdf`. Mockar `../pdf/RelatorioPdf` e o `pdf()` do `@react-pdf/renderer` — o teste verifica a fiação, não os bytes.

- [ ] **Step 2: Trocar `window.print()` pelo download**

Substituir o handler de `Relatorio.tsx:45` por um async que faz `import("../pdf/RelatorioPdf")`, monta `folhaDoMes(...)` com o estado já carregado na tela, gera `await pdf(<RelatorioPdf folha={folha} />).toBlob()` e dispara um `<a download>` com `URL.createObjectURL`, revogando a URL depois. Trocar o ícone `Printer` por `Download` (lucide). Estado de "gerando" enquanto o `import()` e a geração correm — o botão desabilitado com rótulo próprio já basta.

Nome do arquivo: `relatorio-{ano}-{mes com 2 dígitos}.pdf`.

Falha na geração: `toast.error` via `sonner`, que já está montado em `main.tsx`.

- [ ] **Step 3: Manter a seção Rodadas na tela**

A classe `nao-imprime` em `Relatorio.tsx:194` pode ficar — é inofensiva agora que o Relatório não imprime pelo navegador. **Não** remover: se alguém der `Ctrl+P` na tela, ainda é melhor não emitir a seção pela metade.

- [ ] **Step 4: `npm run test && npm run build && npm run lint`**

---

### Task 7: Documentação

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Atualizar o CLAUDE.md**

- Em **Architecture**, acrescentar `src/pdf/` à lista de diretórios por papel: o Document do relatório e o registro de fontes, carregado sob demanda; e registrar que `Relatorio` exporta PDF em vez de imprimir.
- Registrar as fontes vendorizadas em `src/assets/fonts/` e o porquê (o pacote fontsource é variável/WOFF2, incompatível com o fontkit).
- Anotar que o `@media print` restante serve **só ao Calendário**, e que a trava de `overflow` da casca precisa continuar destravada lá.
- Em **Domain rules**, anotar que `listMarcas`/`listParadas` paginam por causa do teto do PostgREST.

---

## Verificação final

- [ ] `npm run test` — tudo verde
- [ ] `npm run build` — typecheck + bundle, com o react-pdf em chunk separado
- [ ] `npm run lint`
- [ ] Manual: gerar o PDF de um mês com pelo menos 3 territórios e 2+ saídas em algum deles. Conferir cabeçalho repetido na página 2, "Página X de Y", Rodadas em página própria, nenhum território rachado na virada, e as colunas numéricas alinhadas.
- [ ] Manual: `Ctrl+P` em `/calendario` — a grade sai inteira.
