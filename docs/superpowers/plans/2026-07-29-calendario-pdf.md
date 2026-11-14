# Calendário em PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exportar a escala mensal do Calendário como um PDF de uma página em A4 paisagem, e parar de imprimir pelo navegador.

**Architecture:** Mesma forma do Relatório. `src/lib/escala.ts` transforma saídas + territórios + publicadores + aviso na estrutura `Escala`, pura e testável; `src/pdf/EscalaPdf.tsx` desenha essa estrutura com `@react-pdf/renderer`, reaproveitando o `src/pdf/fontes.ts` que já existe; `Calendario.tsx` só dispara `pdf(doc).toBlob()` atrás de um `import()` dinâmico. Como a grade tem altura fixa e o domingo pode ter duas saídas, o corpo da fonte é escolhido por uma tabela de patamares indexada pela densidade do mês. No caminho, um defeito atual é corrigido: saída de mês vizinho não aparece mais na grade.

**Tech Stack:** React 19 + TypeScript · `@react-pdf/renderer` 4.5.1 (já instalado) · Vitest + @testing-library/react (jsdom) · Tailwind CSS v4 (config em `src/index.css`).

Design aprovado: `docs/superpowers/specs/2026-07-29-calendario-pdf-design.md`.

## Global Constraints

- **Não escrever comentários no código.** O código se explica por nomes claros. (`CLAUDE.md`)
- **UI nunca chama `supabase` direto** — só `src/lib/` toca no Supabase.
- Nomes de domínio em português (`escalaDoMes`, `patamarDe`, `DiaEscala`).
- **O `@react-pdf/renderer` nunca entra no bundle inicial.** Só via `import()` dentro do handler do botão.
- **Nenhuma fonte nova.** `src/pdf/fontes.ts` já registra `SANS` e `MONO`; `EscalaPdf` chama `registrarFontes()` e usa as duas famílias.
- Cores em hex literal, dos tokens de `src/index.css`: `ink #29323c`, `ink-soft #67707d`, `ink-faint #98a1ae`, `line #dde3ea`, `jwblue-deep #33507d`, `ocre #8a6636`, `mist #eceff3`, e os matizes de dia `dia-0 #f6eee1`, `dia-1 #e6f1e9`, `dia-2 #e5f0ef`, `dia-3 #e4eef3`, `dia-4 #e4ecf6`, `dia-5 #e6e9f5`, `dia-6 #f2eee4`.
- Strings de domínio, idênticas às da tela: dirigente ausente é `"a definir"`; o período da tarde mostra `"tarde"` e o da manhã não mostra nada.
- **O ponto de encontro vem acima do dirigente.** É a informação principal do dia.
- Rodar `npm run test` e `npm run build` antes de considerar qualquer tarefa pronta.

---

## File Structure

```
src/
  lib/
    escala.ts                   # NOVO — escalaDoMes() e patamarDe(), puras
    escala.test.ts              # NOVO
  pdf/
    EscalaPdf.tsx               # NOVO — o Document A4 paisagem
    EscalaPdf.test.tsx          # NOVO — árvore de elementos
    verificacao.test.tsx        # + describe da escala: 1 página no pior caso
    fontes.ts                   # inalterado, só consumido
  screens/
    Calendario.tsx              # célula vizinha vazia + listSaidas do mês + botão
    Calendario.test.tsx         # + testes do vazamento e do botão
  index.css                     # poda do @media print
vite.config.ts                  # globIgnores ganha EscalaPdf*
CLAUDE.md
```

`escala.ts` fica separado de `relatorio.ts` porque são dois documentos com formas diferentes e sem nada em comum além do mês — juntá-los criaria um arquivo que muda por dois motivos.

---

### Task 1: `escalaDoMes()` e `patamarDe()` — a modelagem pura

Independente. Não depende de nenhuma outra tarefa.

**Files:**
- Create: `src/lib/escala.ts`
- Test: `src/lib/escala.test.ts`

**Interfaces:**
- Consumes, todos já existentes: `gradeDoMes`, `mesmoMes`, `diaDe`, `diaDaSemana`, `saidasDoDia`, `MES_NOME`, `dataBR`, `type Mes` (de `./saidas`); `hojeISO` (de `./rodadas`); `Periodo`, `Publicador`, `Saida`, `Territorio` (de `./types`).
- Produces — a Task 3 e a Task 4 consomem exatamente estes nomes:

```ts
export interface SaidaEscala {
  periodo: Periodo;
  local: string | null;
  dirigente: string;
  territorios: string[];
  observacao: string | null;
}

export interface DiaEscala {
  data: string;
  dia: number;
  doMes: boolean;
  diaDaSemana: number;
  saidas: SaidaEscala[];
}

export type SemanaEscala = DiaEscala[];

export interface Patamar {
  local: number;
  dirigente: number;
  territorio: number | null;
  observacao: number | null;
}

export interface Escala {
  titulo: string;
  geradoEm: string;
  aviso: string;
  semanas: SemanaEscala[];
  patamar: Patamar;
}

export function patamarDe(semanas: number, densidade: number): Patamar;

export function escalaDoMes(
  m: Mes,
  saidas: Saida[],
  territorios: Territorio[],
  publicadores: Publicador[],
  aviso: string,
  hoje?: string,
): Escala;
```

`territorio: null` e `observacao: null` no `Patamar` significam **não desenhar o campo**. Os demais números são corpo de fonte em pontos.

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/lib/escala.test.ts` com este conteúdo:

```ts
import { describe, it, expect } from "vitest";
import { escalaDoMes, patamarDe } from "./escala";
import type { Publicador, Saida, Territorio } from "./types";

const julho = { ano: 2026, mes: 7 };

const territorios: Territorio[] = [
  { id: "t1", numero: "6", nome: "Centro", limites: null, ativo: true, created_at: "" },
  { id: "t2", numero: "12", nome: "Vila Nova", limites: null, ativo: true, created_at: "" },
];

const publicadores: Publicador[] = [
  { id: "p1", nome: "Kleber", telefone: null, created_at: "" },
];

function saida(over: Partial<Saida> & { data: string }): Saida {
  return {
    id: `s-${over.data}-${over.periodo ?? "manha"}`,
    periodo: "manha",
    local: "Salão do Reino",
    publicador_id: "p1",
    observacao: null,
    created_at: "2026-06-01T00:00:00Z",
    territorio_ids: [],
    ...over,
  };
}

describe("patamarDe", () => {
  it("usa o patamar folgado num mês curto e tranquilo", () => {
    expect(patamarDe(5, 1)).toEqual({
      local: 9.5,
      dirigente: 8,
      territorio: 7.5,
      observacao: 7,
    });
  });

  it("aperta quando o mês tem 6 semanas", () => {
    expect(patamarDe(6, 1)).toEqual({
      local: 9,
      dirigente: 7.5,
      territorio: 7,
      observacao: 6.5,
    });
  });

  it("solta a observação antes dos territórios", () => {
    expect(patamarDe(6, 2)).toMatchObject({ territorio: 6.5, observacao: null });
    expect(patamarDe(6, 3)).toMatchObject({ territorio: null, observacao: null });
  });

  it("trata densidade acima de 3 como 3", () => {
    expect(patamarDe(6, 9)).toEqual(patamarDe(6, 3));
  });

  it("trata mês sem saída nenhuma como densidade 1", () => {
    expect(patamarDe(5, 0)).toEqual(patamarDe(5, 1));
  });
});

describe("escalaDoMes", () => {
  it("monta semanas de sete dias", () => {
    const e = escalaDoMes(julho, [], territorios, publicadores, "", "2026-07-29");

    expect(e.semanas.length).toBeGreaterThanOrEqual(4);
    for (const semana of e.semanas) expect(semana).toHaveLength(7);
  });

  it("preenche título, aviso aparado e data de geração", () => {
    const e = escalaDoMes(julho, [], territorios, publicadores, "  Levar convites  ", "2026-07-29");

    expect(e.titulo).toBe("Julho 2026");
    expect(e.geradoEm).toBe("29/07/2026");
    expect(e.aviso).toBe("Levar convites");
  });

  it("resolve dirigente e números de território", () => {
    const e = escalaDoMes(
      julho,
      [saida({ data: "2026-07-05", territorio_ids: ["t2", "t1"] })],
      territorios,
      publicadores,
      "",
      "2026-07-29",
    );

    const dia = e.semanas.flat().find((d) => d.data === "2026-07-05");
    expect(dia?.saidas[0]).toEqual({
      periodo: "manha",
      local: "Salão do Reino",
      dirigente: "Kleber",
      territorios: ["12", "6"],
      observacao: null,
    });
  });

  it("chama de 'a definir' a saída sem dirigente", () => {
    const e = escalaDoMes(
      julho,
      [saida({ data: "2026-07-05", publicador_id: null })],
      territorios,
      publicadores,
      "",
      "2026-07-29",
    );

    expect(e.semanas.flat().find((d) => d.data === "2026-07-05")?.saidas[0].dirigente).toBe(
      "a definir",
    );
  });

  it("ignora território que não existe mais", () => {
    const e = escalaDoMes(
      julho,
      [saida({ data: "2026-07-05", territorio_ids: ["t1", "sumiu"] })],
      territorios,
      publicadores,
      "",
      "2026-07-29",
    );

    expect(e.semanas.flat().find((d) => d.data === "2026-07-05")?.saidas[0].territorios).toEqual(
      ["6"],
    );
  });

  it("deixa vazio o dia emprestado de outro mês, mesmo havendo saída nele", () => {
    const e = escalaDoMes(
      julho,
      [saida({ data: "2026-08-01" })],
      territorios,
      publicadores,
      "",
      "2026-07-29",
    );

    const agosto = e.semanas.flat().find((d) => d.data === "2026-08-01");
    expect(agosto?.doMes).toBe(false);
    expect(agosto?.saidas).toEqual([]);
  });

  it("ordena as saídas do dia com a manhã antes da tarde", () => {
    const e = escalaDoMes(
      julho,
      [
        saida({ data: "2026-07-05", periodo: "tarde", local: "Campinho" }),
        saida({ data: "2026-07-05", periodo: "manha", local: "Salão do Reino" }),
      ],
      territorios,
      publicadores,
      "",
      "2026-07-29",
    );

    expect(
      e.semanas.flat().find((d) => d.data === "2026-07-05")?.saidas.map((s) => s.periodo),
    ).toEqual(["manha", "tarde"]);
  });

  it("escolhe o patamar pelo dia mais cheio do mês", () => {
    const e = escalaDoMes(
      julho,
      [
        saida({ data: "2026-07-05", periodo: "manha" }),
        saida({ data: "2026-07-05", periodo: "tarde" }),
        saida({ data: "2026-07-12", periodo: "manha" }),
      ],
      territorios,
      publicadores,
      "",
      "2026-07-29",
    );

    expect(e.patamar).toEqual(patamarDe(e.semanas.length, 2));
  });
});
```

- [ ] **Step 2: Rodar os testes e ver falhar**

Run: `npx vitest run src/lib/escala.test.ts`
Expected: FAIL — `Failed to resolve import "./escala"`.

- [ ] **Step 3: Implementar `src/lib/escala.ts`**

```ts
import {
  dataBR,
  diaDaSemana,
  diaDe,
  gradeDoMes,
  MES_NOME,
  mesmoMes,
  saidasDoDia,
  type Mes,
} from "./saidas";
import { hojeISO } from "./rodadas";
import type { Periodo, Publicador, Saida, Territorio } from "./types";

export interface SaidaEscala {
  periodo: Periodo;
  local: string | null;
  dirigente: string;
  territorios: string[];
  observacao: string | null;
}

export interface DiaEscala {
  data: string;
  dia: number;
  doMes: boolean;
  diaDaSemana: number;
  saidas: SaidaEscala[];
}

export type SemanaEscala = DiaEscala[];

export interface Patamar {
  local: number;
  dirigente: number;
  territorio: number | null;
  observacao: number | null;
}

export interface Escala {
  titulo: string;
  geradoEm: string;
  aviso: string;
  semanas: SemanaEscala[];
  patamar: Patamar;
}

const PATAMARES: Record<number, [Patamar, Patamar]> = {
  1: [
    { local: 9.5, dirigente: 8, territorio: 7.5, observacao: 7 },
    { local: 9, dirigente: 7.5, territorio: 7, observacao: 6.5 },
  ],
  2: [
    { local: 8.5, dirigente: 7.5, territorio: 7, observacao: 6.5 },
    { local: 8, dirigente: 7, territorio: 6.5, observacao: null },
  ],
  3: [
    { local: 7.5, dirigente: 7, territorio: 6.5, observacao: null },
    { local: 7, dirigente: 6.5, territorio: null, observacao: null },
  ],
};

export function patamarDe(semanas: number, densidade: number): Patamar {
  const nivel = Math.min(Math.max(densidade, 1), 3);
  return PATAMARES[nivel][semanas >= 6 ? 1 : 0];
}

export function escalaDoMes(
  m: Mes,
  saidas: Saida[],
  territorios: Territorio[],
  publicadores: Publicador[],
  aviso: string,
  hoje: string = hojeISO(),
): Escala {
  const numeroDe = new Map(territorios.map((t) => [t.id, t.numero]));
  const nomeDe = new Map(publicadores.map((p) => [p.id, p.nome]));

  const dias = gradeDoMes(m).map((data): DiaEscala => {
    const doMes = mesmoMes(data, m);
    return {
      data,
      dia: diaDe(data),
      doMes,
      diaDaSemana: diaDaSemana(data),
      saidas: doMes
        ? saidasDoDia(saidas, data).map((s) => ({
            periodo: s.periodo,
            local: s.local,
            dirigente: s.publicador_id
              ? (nomeDe.get(s.publicador_id) ?? "a definir")
              : "a definir",
            territorios: s.territorio_ids.flatMap((id) => {
              const numero = numeroDe.get(id);
              return numero ? [numero] : [];
            }),
            observacao: s.observacao,
          }))
        : [],
    };
  });

  const semanas: SemanaEscala[] = [];
  for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7));

  const densidade = dias.reduce((maior, d) => Math.max(maior, d.saidas.length), 0);

  return {
    titulo: `${MES_NOME[m.mes - 1]} ${m.ano}`,
    geradoEm: dataBR(hoje),
    aviso: aviso.trim(),
    semanas,
    patamar: patamarDe(semanas.length, densidade),
  };
}
```

- [ ] **Step 4: Rodar os testes e ver passar**

Run: `npx vitest run src/lib/escala.test.ts`
Expected: PASS, 14 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/escala.ts src/lib/escala.test.ts
git commit -m "feat(escala): modela a escala do mês para o PDF"
```

---

### Task 2: A grade para de vazar saída de mês vizinho

Independente da Task 1. É a correção de um defeito que existe hoje na tela.

**Files:**
- Modify: `src/screens/Calendario.tsx` (a chamada `listSaidas` na linha 91; o `grade.map` que começa na linha 308)
- Test: `src/screens/Calendario.test.tsx`

**Contexto:** `gradeDoMes` devolve semanas completas, com dias emprestados dos meses vizinhos. `listSaidas(grade[0], grade[grade.length - 1])` carrega o intervalo inteiro da grade e `saidasDoDia` é chamado para toda célula, então em julho uma saída de 2 de agosto aparece na última linha. `diasComSaida` (linha 143) já filtra por `mesmoMes`, então a agenda mobile **já está correta** — só a grade vaza.

- [ ] **Step 1: Escrever o teste que falha**

Em `src/screens/Calendario.test.tsx`, o mock de `listSaidas` hoje devolve duas saídas de hoje. Acrescentar um `describe` no fim do arquivo:

```ts
describe("dias de outro mês", () => {
  it("não mostra saída que caiu num dia emprestado da grade", async () => {
    const { listSaidas } = await import("../lib/saidas");
    vi.mocked(listSaidas).mockResolvedValueOnce([
      {
        id: "s9",
        data: "2000-01-01",
        periodo: "manha",
        local: "Ponto do mês vizinho",
        publicador_id: null,
        observacao: null,
        created_at: "2000-01-01T00:00:00Z",
        territorio_ids: [],
      },
    ]);

    montar();

    await waitFor(() =>
      expect(screen.queryByRole("status")).not.toBeInTheDocument(),
    );
    expect(screen.queryByText("Ponto do mês vizinho")).not.toBeInTheDocument();
  });

  it("pede ao Supabase só o intervalo do mês, não o da grade", async () => {
    const { listSaidas } = await import("../lib/saidas");
    vi.mocked(listSaidas).mockClear();

    montar();

    await waitFor(() => expect(listSaidas).toHaveBeenCalled());
    const [de, ate] = vi.mocked(listSaidas).mock.calls[0];
    expect(de.slice(-2)).toBe("01");
    expect(de.slice(0, 7)).toBe(ate.slice(0, 7));
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/screens/Calendario.test.tsx`
Expected: FAIL — o texto "Ponto do mês vizinho" aparece, e `de`/`ate` são as pontas da grade, de meses diferentes.

- [ ] **Step 3: Estreitar a consulta ao mês**

Em `src/screens/Calendario.tsx`, acrescentar `iso` ao import de `../lib/saidas` (a lista que começa na linha 5) e trocar a primeira linha do `Promise.all` dentro de `carregar()`:

```ts
listSaidas(iso(mes, 1), iso({ ano: mes.ano, mes: mes.mes + 1 }, 0)),
```

`iso` normaliza mês 13 pelo próprio `Date`, então dezembro não precisa de caso especial: `iso({ ano: 2026, mes: 13 }, 0)` devolve `2026-12-31`.

- [ ] **Step 4: Esvaziar a célula do dia emprestado**

No `grade.map` (linha 308), logo depois de calcular `doMes`, sair cedo:

```tsx
{grade.map((data) => {
  const dow = diaDaSemana(data);
  const doMes = mesmoMes(data, mes);
  if (!doMes) return <div key={data} className="min-h-30 bg-mist" />;

  const doDia = saidasDoDia(saidas, data);
  const ehHoje = data === hoje;
  return (
```

E, no `<div>` que sobra, remover `!doMes && "opacity-45"` do `cn(...)`, e remover o `if (!doMes) setMes(...)` de dentro do `onClick` do botão — a célula emprestada não existe mais como alvo.

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/screens/Calendario.test.tsx`
Expected: PASS, 6 testes.

- [ ] **Step 6: Rodar a suíte e o build**

Run: `npm run test && npm run build`
Expected: tudo verde.

- [ ] **Step 7: Commit**

```bash
git add src/screens/Calendario.tsx src/screens/Calendario.test.tsx
git commit -m "fix(calendario): não mostra saída de mês vizinho na grade"
```

---

### Task 3: `EscalaPdf` — o Document

Depende da Task 1.

**Files:**
- Create: `src/pdf/EscalaPdf.tsx`
- Test: `src/pdf/EscalaPdf.test.tsx`
- Modify: `src/pdf/verificacao.test.tsx` (acrescentar um `describe` no fim)

**Interfaces:**
- Consumes: `Escala`, `DiaEscala`, `SaidaEscala`, `Patamar` (de `../lib/escala`); `SANS`, `MONO`, `registrarFontes` (de `./fontes`).
- Produces:

```tsx
export function EscalaPdf({ escala }: { escala: Escala }): React.ReactElement
```

**Geometria:** A4 paisagem são 841,89 × 595,28pt. Com `padding` de 24 sobram 794 × 547. Cabeçalho 34, faixa dos dias 16, avisos 30 quando há texto, rodapé 16 — restam ~435pt para a grade, repartidos igualmente entre as semanas via `flex: 1` em cada linha.

- [ ] **Step 1: Escrever o Document**

Criar `src/pdf/EscalaPdf.tsx`:

```tsx
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { DiaEscala, Escala, Patamar, SaidaEscala } from "../lib/escala";
import { MONO, SANS, registrarFontes } from "./fontes";

const ABREV_DIA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const MATIZ = [
  "#f6eee1",
  "#e6f1e9",
  "#e5f0ef",
  "#e4eef3",
  "#e4ecf6",
  "#e6e9f5",
  "#f2eee4",
];

const COR = {
  ink: "#29323c",
  inkSoft: "#67707d",
  inkFaint: "#98a1ae",
  line: "#dde3ea",
  jwblue: "#33507d",
  ocre: "#8a6636",
  mist: "#eceff3",
};

const estilos = StyleSheet.create({
  pagina: {
    fontFamily: SANS,
    color: COR.ink,
    padding: 24,
  },
  cabecalho: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  rotulo: {
    fontSize: 7.5,
    fontWeight: 600,
    letterSpacing: 1.2,
    color: COR.inkSoft,
    textTransform: "uppercase",
  },
  mes: { fontSize: 16, fontWeight: 700, color: COR.jwblue },
  faixa: { flexDirection: "row" },
  faixaDia: {
    flex: 1,
    textAlign: "center",
    fontSize: 6.5,
    fontWeight: 700,
    letterSpacing: 1,
    color: COR.inkSoft,
    textTransform: "uppercase",
    paddingBottom: 2,
  },
  faixaDomingo: { color: COR.ocre },
  grade: { flex: 1, borderTopWidth: 0.6, borderLeftWidth: 0.6, borderColor: COR.line },
  semana: { flexDirection: "row", flex: 1 },
  celula: {
    flex: 1,
    borderRightWidth: 0.6,
    borderBottomWidth: 0.6,
    borderColor: COR.line,
    padding: 2.5,
  },
  celulaVazia: { backgroundColor: COR.mist },
  dia: {
    fontFamily: MONO,
    fontSize: 7.5,
    fontWeight: 600,
    color: COR.inkSoft,
    textAlign: "right",
  },
  diaDomingo: { color: COR.ocre },
  saida: { marginTop: 2, borderTopWidth: 0.6, borderColor: "#ffffff" },
  periodo: {
    fontFamily: MONO,
    fontSize: 5.5,
    letterSpacing: 0.5,
    color: COR.inkFaint,
    textTransform: "uppercase",
  },
  local: { fontWeight: 700, color: COR.jwblue },
  dirigente: { color: COR.ink },
  aDefinir: { color: COR.ocre, fontStyle: "italic" },
  territorios: { fontFamily: MONO, color: COR.inkSoft },
  observacao: { fontStyle: "italic", color: COR.inkSoft },
  avisos: { marginTop: 6, flexDirection: "row", alignItems: "baseline" },
  avisosRotulo: {
    fontSize: 6.5,
    fontWeight: 700,
    letterSpacing: 1,
    color: COR.inkSoft,
    textTransform: "uppercase",
    marginRight: 6,
  },
  avisosTexto: { fontSize: 8, color: COR.ink, flex: 1 },
  rodape: {
    marginTop: 5,
    borderTopWidth: 0.6,
    borderColor: COR.line,
    paddingTop: 3,
    fontSize: 6.5,
    color: COR.inkFaint,
  },
});

function Saida({ s, patamar }: { s: SaidaEscala; patamar: Patamar }) {
  return (
    <View style={estilos.saida}>
      {s.periodo === "tarde" && <Text style={estilos.periodo}>tarde</Text>}

      {s.local && (
        <Text style={[estilos.local, { fontSize: patamar.local }]}>{s.local}</Text>
      )}

      <Text
        style={[
          s.dirigente === "a definir" ? estilos.aDefinir : estilos.dirigente,
          { fontSize: patamar.dirigente },
        ]}
      >
        {s.dirigente}
      </Text>

      {patamar.territorio !== null && s.territorios.length > 0 && (
        <Text style={[estilos.territorios, { fontSize: patamar.territorio }]}>
          {s.territorios.join(" · ")}
        </Text>
      )}

      {patamar.observacao !== null && s.observacao && (
        <Text
          style={[estilos.observacao, { fontSize: patamar.observacao }]}
          maxLines={1}
        >
          {s.observacao}
        </Text>
      )}
    </View>
  );
}

function Celula({ d, patamar }: { d: DiaEscala; patamar: Patamar }) {
  if (!d.doMes) return <View style={[estilos.celula, estilos.celulaVazia]} />;

  return (
    <View style={[estilos.celula, { backgroundColor: MATIZ[d.diaDaSemana] }]}>
      <Text style={[estilos.dia, d.diaDaSemana === 0 && estilos.diaDomingo]}>
        {d.dia}
      </Text>
      {d.saidas.map((s, i) => (
        <Saida key={`${s.periodo}-${i}`} s={s} patamar={patamar} />
      ))}
    </View>
  );
}

export function EscalaPdf({ escala }: { escala: Escala }) {
  registrarFontes();

  return (
    <Document title={`Saídas de campo — ${escala.titulo}`}>
      <Page size="A4" orientation="landscape" style={estilos.pagina}>
        <View style={estilos.cabecalho}>
          <Text style={estilos.rotulo}>Saídas de campo</Text>
          <Text style={estilos.mes}>{escala.titulo}</Text>
        </View>

        <View style={estilos.faixa}>
          {ABREV_DIA.map((d, i) => (
            <Text key={d} style={[estilos.faixaDia, i === 0 && estilos.faixaDomingo]}>
              {d}
            </Text>
          ))}
        </View>

        <View style={estilos.grade}>
          {escala.semanas.map((semana) => (
            <View key={semana[0].data} style={estilos.semana}>
              {semana.map((d) => (
                <Celula key={d.data} d={d} patamar={escala.patamar} />
              ))}
            </View>
          ))}
        </View>

        {escala.aviso !== "" && (
          <View style={estilos.avisos}>
            <Text style={estilos.avisosRotulo}>Avisos do mês</Text>
            <Text style={estilos.avisosTexto}>{escala.aviso}</Text>
          </View>
        )}

        <Text style={estilos.rodape}>Gerado em {escala.geradoEm}</Text>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 2: Escrever o teste da árvore de elementos**

Criar `src/pdf/EscalaPdf.test.tsx`. O caminhador `textos` é o mesmo de `RelatorioPdf.test.tsx` — repetido aqui de propósito, para o arquivo se sustentar sozinho:

```tsx
import { describe, it, expect } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { EscalaPdf } from "./EscalaPdf";
import type { Escala } from "../lib/escala";
import { patamarDe } from "../lib/escala";

function textos(no: ReactNode): string[] {
  if (typeof no === "string" || typeof no === "number") return [String(no)];
  if (Array.isArray(no)) return no.flatMap(textos);
  if (isValidElement(no)) {
    const elemento = no as ReactElement<{ children?: ReactNode }>;
    if (typeof elemento.type === "function") {
      const Componente = elemento.type as (p: unknown) => ReactNode;
      return textos(Componente(elemento.props));
    }
    return textos(elemento.props.children);
  }
  return [];
}

function escalaDe(over: Partial<Escala> = {}): Escala {
  return {
    titulo: "Julho 2026",
    geradoEm: "29/07/2026",
    aviso: "",
    patamar: patamarDe(5, 1),
    semanas: [
      [
        {
          data: "2026-06-28",
          dia: 28,
          doMes: false,
          diaDaSemana: 0,
          saidas: [],
        },
        {
          data: "2026-06-29",
          dia: 29,
          doMes: false,
          diaDaSemana: 1,
          saidas: [],
        },
        {
          data: "2026-06-30",
          dia: 30,
          doMes: false,
          diaDaSemana: 2,
          saidas: [],
        },
        {
          data: "2026-07-01",
          dia: 1,
          doMes: true,
          diaDaSemana: 3,
          saidas: [
            {
              periodo: "manha",
              local: "Salão do Reino",
              dirigente: "Kleber",
              territorios: ["6", "12"],
              observacao: "levar convites",
            },
          ],
        },
        {
          data: "2026-07-02",
          dia: 2,
          doMes: true,
          diaDaSemana: 4,
          saidas: [
            {
              periodo: "tarde",
              local: "Campinho",
              dirigente: "a definir",
              territorios: [],
              observacao: null,
            },
          ],
        },
        { data: "2026-07-03", dia: 3, doMes: true, diaDaSemana: 5, saidas: [] },
        { data: "2026-07-04", dia: 4, doMes: true, diaDaSemana: 6, saidas: [] },
      ],
    ],
    ...over,
  };
}

describe("EscalaPdf", () => {
  it("monta o documento sem lançar", () => {
    expect(() => EscalaPdf({ escala: escalaDe() })).not.toThrow();
  });

  it("leva o ponto de encontro antes do dirigente", () => {
    const saiu = textos(EscalaPdf({ escala: escalaDe() }));

    expect(saiu.indexOf("Salão do Reino")).toBeLessThan(saiu.indexOf("Kleber"));
  });

  it("mostra 'tarde' só na saída da tarde", () => {
    const saiu = textos(EscalaPdf({ escala: escalaDe() }));

    expect(saiu.filter((t) => t === "tarde")).toHaveLength(1);
  });

  it("leva a faixa dos dias da semana e o mês", () => {
    const saiu = textos(EscalaPdf({ escala: escalaDe() })).join(" ");

    expect(saiu).toContain("dom");
    expect(saiu).toContain("sáb");
    expect(saiu).toContain("Julho 2026");
    expect(saiu).toContain("Gerado em 29/07/2026");
  });

  it("não desenha o dia emprestado de outro mês", () => {
    const saiu = textos(EscalaPdf({ escala: escalaDe() }));

    expect(saiu).not.toContain("28");
    expect(saiu).toContain("1");
  });

  it("some com a observação no patamar que a sacrifica", () => {
    const semObservacao = escalaDe({ patamar: patamarDe(6, 2) });

    expect(textos(EscalaPdf({ escala: semObservacao })).join(" ")).not.toContain(
      "levar convites",
    );
  });

  it("some com os territórios no patamar mais apertado", () => {
    const semTerritorios = escalaDe({ patamar: patamarDe(6, 3) });

    expect(textos(EscalaPdf({ escala: semTerritorios })).join(" ")).not.toContain("6 · 12");
  });

  it("só desenha os avisos quando há texto", () => {
    expect(textos(EscalaPdf({ escala: escalaDe() })).join(" ")).not.toContain(
      "Avisos do mês",
    );
    expect(
      textos(EscalaPdf({ escala: escalaDe({ aviso: "Levar convites" }) })).join(" "),
    ).toContain("Avisos do mês");
  });
});
```

- [ ] **Step 3: Rodar os dois arquivos**

Run: `npx vitest run src/pdf/EscalaPdf.test.tsx`
Expected: PASS, 8 testes.

Se o teste da observação falhar porque `maxLines` não existe no `Text` desta versão do react-pdf, remover a prop `maxLines` e trocar o clamp por corte no `escala.ts` — mas **confirmar primeiro** rodando, não presumir.

- [ ] **Step 4: Acrescentar a verificação de página única**

No topo de `src/pdf/verificacao.test.tsx`, ao lado do `import type { Folha } from "../lib/relatorio";` que já existe, acrescentar:

```tsx
import { patamarDe, type Escala } from "../lib/escala";
```

E, no fim do arquivo, o bloco abaixo. Note que o `beforeAll` que já existe reescreve o `src` das fontes para caminho de disco, e vale para este `describe` também:

```tsx
function escalaPesada(): Escala {
  const semanas = Array.from({ length: 6 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => ({
      data: `2026-07-${String(w * 7 + d + 1).padStart(2, "0")}`,
      dia: w * 7 + d + 1,
      doMes: true,
      diaDaSemana: d,
      saidas: Array.from({ length: 3 }, (_, k) => ({
        periodo: (k === 0 ? "manha" : "tarde") as "manha" | "tarde",
        local: "Salão do Reino da Congregação Central",
        dirigente: "Kleber Aparecido de Oliveira",
        territorios: ["6", "12", "23"],
        observacao: "Levar convites do congresso e revisitas da semana passada",
      })),
    })),
  );

  return {
    titulo: "Julho 2026",
    geradoEm: "29/07/2026",
    aviso: "Todos os domingos temos duas saídas, em locais diferentes.",
    semanas,
    patamar: patamarDe(6, 3),
  };
}

describe("a escala cabe numa página", () => {
  it("sai em uma página só no pior caso: 6 semanas, 3 saídas por dia", async () => {
    const { renderToBuffer } = await import("@react-pdf/renderer");
    const { EscalaPdf } = await import("./EscalaPdf");

    const buf = await renderToBuffer(<EscalaPdf escala={escalaPesada()} />);
    const paginas = (buf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;

    expect(paginas).toBe(1);
  }, 20000);
});
```

- [ ] **Step 5: Rodar a verificação**

Run: `npx vitest run src/pdf/verificacao.test.tsx`
Expected: PASS.

**Se falhar com 2 páginas, o plano previu isso:** a tabela de patamares é heurística. Baixar em 0,5pt os corpos da linha `6 / 3+` em `escala.ts`, rodar de novo, e atualizar a tabela no design doc. Não silenciar o teste.

- [ ] **Step 6: Olhar a folha com olho humano**

O teste conta páginas; ele não vê transbordo dentro de uma célula. Para ver, acrescentar temporariamente ao `it` do Step 4, antes do `expect`:

```tsx
if (process.env.SAIDA_PDF) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(process.env.SAIDA_PDF, buf);
}
```

Rodar e renderizar:

```bash
SAIDA_PDF=/tmp/escala.pdf npx vitest run src/pdf/verificacao.test.tsx
pdftoppm -png -r 110 /tmp/escala.pdf /tmp/escala
```

Abrir `/tmp/escala-1.png` e conferir três coisas: nenhum texto atravessa a borda da célula, o número do domingo está em ocre e legível, e os dias emprestados estão em cinza neutro e vazios.

**Remover o bloco `if (process.env.SAIDA_PDF)` antes de commitar** — ele existe só para esta inspeção, e `process` não está tipado no tsconfig do app, então o `npm run build` falharia.

- [ ] **Step 7: Commit**

```bash
git add src/pdf/EscalaPdf.tsx src/pdf/EscalaPdf.test.tsx src/pdf/verificacao.test.tsx
git commit -m "feat(escala): desenha a escala do mês em PDF A4 paisagem"
```

---

### Task 4: O botão "Baixar PDF"

Depende das Tasks 1 e 3.

**Files:**
- Modify: `src/screens/Calendario.tsx` (import da linha 3; botão da linha 241)
- Modify: `vite.config.ts` (o `globIgnores` do `VitePWA`)
- Test: `src/screens/Calendario.test.tsx`

- [ ] **Step 1: Escrever os testes que falham**

No topo de `src/screens/Calendario.test.tsx`, junto dos outros `vi.mock`, acrescentar:

```ts
const toBlob = vi.fn();
const pdfMock = vi.fn((_documento: { props: { escala: unknown } }) => ({ toBlob }));
vi.mock("@react-pdf/renderer", () => ({ pdf: pdfMock }));
vi.mock("../pdf/EscalaPdf", () => ({
  EscalaPdf: ({ escala }: { escala: unknown }) => ({ escala }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
```

E, no fim do arquivo, um `describe` novo:

```ts
describe("exportar a escala em PDF", () => {
  beforeEach(() => {
    toBlob.mockResolvedValue(new Blob(["%PDF"], { type: "application/pdf" }));
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    URL.createObjectURL = vi.fn(() => "blob:escala");
    URL.revokeObjectURL = vi.fn();
  });

  it("baixa a escala do mês exibido", async () => {
    const baixados: string[] = [];
    const criar = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = criar(tag);
      if (tag === "a") {
        vi.spyOn(el as HTMLAnchorElement, "click").mockImplementation(() =>
          baixados.push((el as HTMLAnchorElement).download),
        );
      }
      return el;
    });

    montar();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Baixar PDF/ })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: /Baixar PDF/ }));

    await waitFor(() => expect(baixados).toHaveLength(1));
    expect(baixados[0]).toMatch(/^escala-\d{4}-\d{2}\.pdf$/);

    vi.mocked(document.createElement).mockRestore();
  });

  it("continua habilitado num mês sem saída nenhuma", async () => {
    const { listSaidas } = await import("../lib/saidas");
    vi.mocked(listSaidas).mockResolvedValueOnce([]);

    montar();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Baixar PDF/ })).toBeEnabled(),
    );
  });

  it("avisa por toast quando a geração falha", async () => {
    const { toast } = await import("sonner");
    toBlob.mockRejectedValue(new Error("fontkit"));

    montar();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Baixar PDF/ })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: /Baixar PDF/ }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Não foi possível gerar o PDF."),
    );
  });
});
```

Acrescentar `fireEvent` e `beforeEach` aos imports do topo do arquivo:

```ts
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/screens/Calendario.test.tsx`
Expected: FAIL — não existe botão "Baixar PDF"; o botão atual diz "Imprimir".

- [ ] **Step 3: Trocar o botão**

Em `src/screens/Calendario.tsx`, no import da linha 3, trocar `Printer` por `Download`:

```ts
import { ChevronLeft, ChevronRight, Download, Plus, Trash2 } from "lucide-react";
```

Acrescentar o import da modelagem, junto dos outros de `../lib/`:

```ts
import { escalaDoMes } from "../lib/escala";
```

Acrescentar o estado, junto de `const [carregando, setCarregando] = useState(true);`:

```ts
const [gerando, setGerando] = useState(false);
```

Acrescentar o handler, logo depois de `gravarNota()`:

```ts
async function baixarPdf() {
  setGerando(true);
  try {
    const [{ pdf }, { EscalaPdf }] = await Promise.all([
      import("@react-pdf/renderer"),
      import("../pdf/EscalaPdf"),
    ]);

    const escala = escalaDoMes(mes, saidas, territorios, publicadores, nota);
    const blob = await pdf(<EscalaPdf escala={escala} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `escala-${mes.ano}-${String(mes.mes).padStart(2, "0")}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  } catch {
    toast.error("Não foi possível gerar o PDF.");
  } finally {
    setGerando(false);
  }
}
```

Trocar o botão da linha 241:

```tsx
<Button size="sm" onClick={baixarPdf} disabled={gerando}>
  <Download aria-hidden="true" />
  {gerando ? "Gerando…" : "Baixar PDF"}
</Button>
```

Note que **não há** `relatorio.linhas.length === 0` aqui: a escala de um mês vazio é uma folha legítima para afixar.

- [ ] **Step 4: Tirar o chunk do precache**

Em `vite.config.ts`, no `globIgnores` que já existe:

```ts
globIgnores: ["**/react-pdf*.js", "**/RelatorioPdf*.js", "**/EscalaPdf*.js"],
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/screens/Calendario.test.tsx`
Expected: PASS.

- [ ] **Step 6: Conferir o precache e o code-splitting**

Run: `npm run build`
Expected: `EscalaPdf-*.js` sai como chunk próprio, e a linha `precache N entries` fica em torno de 2650 KiB — **não** deve subir para ~4000, o que significaria que o react-pdf voltou para o precache.

- [ ] **Step 7: Commit**

```bash
git add src/screens/Calendario.tsx src/screens/Calendario.test.tsx vite.config.ts
git commit -m "feat(calendario): baixa a escala do mês em PDF"
```

---

### Task 5: Podar o `@media print`

Depende da Task 4 — só depois que ninguém mais imprime pelo navegador.

**Files:**
- Modify: `src/index.css` (bloco `@media print`, hoje nas linhas 181-212)
- Modify: `src/screens/Calendario.tsx` (a classe `folha` na linha 238)
- Modify: `src/screens/Relatorio.tsx` (a classe `folha` na linha 42)

- [ ] **Step 1: Substituir o bloco inteiro**

Trocar o `@media print` de `src/index.css` por:

```css
/* ---- Ninguém imprime pelo navegador: as duas telas exportam PDF (src/pdf/).
   O que sobra existe só para um Ctrl+P acidental não sair grotesco. ---- */
@media print {
  @page {
    margin: 12mm;
  }
  html,
  body {
    height: auto;
    overflow: visible;
    background: #fff;
  }
  [data-casca] {
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
  }
  .nao-imprime {
    display: none !important;
  }
}
```

Saem `size: A4 landscape` (órfão, viraria de lado qualquer tela impressa por engano), `.folha-grade`, `.folha-agenda` e o `.folha` com `print-color-adjust`.

- [ ] **Step 2: Tirar as classes órfãs do JSX**

Em `src/screens/Calendario.tsx` linha 238, remover `folha ` do início do `className`. Em `src/screens/Relatorio.tsx` linha 42, o mesmo. Remover também `folha-grade` (linha 295) e `folha-agenda` (linha 377) de `Calendario.tsx` — as regras que as governavam sumiram, e o `hidden ... sm:grid` / `sm:hidden` do Tailwind continua fazendo o trabalho na tela.

- [ ] **Step 3: Confirmar que nada mais cita as classes removidas**

```bash
grep -rn "folha-grade\|folha-agenda\|print-color-adjust\|\"folha \|A4 landscape" src/
```
Expected: nenhuma saída.

- [ ] **Step 4: Rodar a suíte, o build e o lint**

Run: `npm run test && npm run build && npm run lint`
Expected: tudo verde, sem aviso novo.

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/screens/Calendario.tsx src/screens/Relatorio.tsx
git commit -m "refactor(print): poda o @media print, que ficou sem dono"
```

---

### Task 6: Documentação

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Atualizar o CLAUDE.md**

- Em **Architecture**, na linha de `src/lib/`, acrescentar `escala.ts` ao lado de `relatorio.ts`: modela a escala do mês para o PDF, e escolhe o corpo da fonte por uma tabela de patamares indexada pela densidade do mês, porque a grade tem altura fixa e o domingo pode ter duas saídas.
- Na linha de `src/pdf/`, acrescentar `EscalaPdf.tsx`: A4 paisagem, uma página por construção — `verificacao.test.tsx` renderiza o pior caso (6 semanas, 3 saídas por dia) e afirma `paginas === 1`.
- Em `src/screens/`, registrar que `Calendario` exporta PDF e não imprime mais.
- **Substituir** o bullet que hoje diz que o `@media print` serve ao Calendário: agora nenhuma tela imprime pelo navegador, e o que sobra do bloco existe só para um `Ctrl+P` acidental. `[data-casca]` continua sendo o gancho a mirar.
- Em **Domain rules**, registrar que a grade do Calendário mostra só saídas do mês exibido — `listSaidas` recebe o intervalo do mês, não o da grade, então dia emprestado de mês vizinho é célula vazia.

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: registra a escala em PDF e o fim da impressão pelo navegador"
```

---

## Verificação final

- [ ] `npm run test` — tudo verde
- [ ] `npm run build` — typecheck + bundle; `EscalaPdf-*.js` em chunk próprio; precache ~2650 KiB
- [ ] `npm run lint` — sem aviso novo
- [ ] Manual: gerar a escala de um mês com pelo menos um domingo de duas saídas. Conferir que sai **uma página**, que nenhuma célula transborda, que os dias de outro mês estão vazios, e que o aviso do mês aparece no rodapé da grade.
- [ ] Manual: abrir `/calendario` na tela e confirmar que a saída de mês vizinho sumiu da primeira e da última semana.
