// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { escalaDoMes, type Escala } from "../lib/escala";

const RAIZ = new URL("../../", import.meta.url).pathname.replace(/\/$/, "");

beforeAll(async () => {
  const { Font } = await import("@react-pdf/renderer");
  const registrar = Font.register.bind(Font);
  const noDisco = (opcoes: { fonts?: { src: string }[] }) =>
    registrar({
      ...opcoes,
      fonts: opcoes.fonts?.map((f) => ({ ...f, src: `${RAIZ}${f.src}` })),
    } as Parameters<typeof Font.register>[0]);
  Font.register = noDisco as typeof Font.register;
});

const AGOSTO = { ano: 2026, mes: 8 };
const SETEMBRO = { ano: 2026, mes: 9 };

function saidasDoMes(m: { ano: number; mes: number }, porDia: (diaDaSemana: number) => number) {
  const saidas = [];
  for (let dia = 1; dia <= 31; dia++) {
    const d = new Date(m.ano, m.mes - 1, dia);
    if (d.getMonth() !== m.mes - 1) break;
    const data = `${m.ano}-${String(m.mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    const quantas = porDia(d.getDay());
    for (let k = 0; k < quantas; k++) {
      saidas.push({
        id: `s-${data}-${k}`,
        data,
        periodo: (k === 0 ? "manha" : "tarde") as "manha" | "tarde",
        local: "Salão do Reino da Congregação Central",
        publicador_id: k === 1 ? null : "p1",
        observacao: "Levar convites do congresso e revisitas da semana passada",
        created_at: `2026-07-01T0${k}:00:00Z`,
        territorio_ids: ["t1", "t2", "t3"],
      });
    }
  }
  return saidas;
}

const TERRITORIOS = ["6", "12", "23"].map((numero, i) => ({
  id: `t${i + 1}`,
  numero,
  nome: null,
  limites: null,
  ativo: true,
  created_at: "",
}));

function escalaPesada(
  porDia: (diaDaSemana: number) => number,
  m: { ano: number; mes: number } = AGOSTO,
): Escala {
  return escalaDoMes(
    m,
    saidasDoMes(m, porDia),
    TERRITORIOS,
    [{ id: "p1", nome: "Kleber Aparecido de Oliveira", telefone: null, created_at: "" }],
    "Todos os domingos temos duas saídas, em locais diferentes.",
    "2026-07-29",
  );
}

async function gerarEscala(escala: Escala) {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const { EscalaPdf } = await import("./EscalaPdf");
  const buf = await renderToBuffer(<EscalaPdf escala={escala} />);
  const bruto = buf.toString("latin1");
  return {
    bytes: buf.length,
    paginas: (bruto.match(/\/Type\s*\/Page[^s]/g) ?? []).length,
    fontes: [
      ...new Set(
        [...bruto.matchAll(/\/BaseFont\s*\/[A-Z]{6}\+([\w-]+)/g)].map((m) => m[1]),
      ),
    ],
  };
}

describe("geração real do PDF", () => {
  it("embute as fontes Atkinson — falha se algum src apontar para .woff2", async () => {
    const { fontes } = await gerarEscala(escalaPesada(() => 1));

    expect(fontes.length).toBeGreaterThan(0);
    expect(fontes.every((f) => f.startsWith("AtkinsonHyperlegible"))).toBe(true);
  }, 20000);
});

describe("a escala cabe numa página", () => {
  it("cabe no pior mês realista: 6 semanas, domingo com 3 saídas, resto com 1", async () => {
    expect((await gerarEscala(escalaPesada((d) => (d === 0 ? 3 : 1)))).paginas).toBe(1);
  }, 20000);

  it("cabe num mês de domingos dobrados, que é o caso do domínio", async () => {
    expect((await gerarEscala(escalaPesada((d) => (d === 0 ? 2 : 1)))).paginas).toBe(1);
  }, 20000);

  it("cabe num mês tranquilo, com uma saída por dia", async () => {
    expect((await gerarEscala(escalaPesada(() => 1))).paginas).toBe(1);
  }, 20000);

  it("cabe até no mês impossível, de 3 saídas todo dia", async () => {
    expect((await gerarEscala(escalaPesada(() => 3))).paginas).toBe(1);
  }, 20000);

  it.each([
    ["uma saída por dia", () => 1],
    ["domingos dobrados", (d: number) => (d === 0 ? 2 : 1)],
    ["2 saídas todo dia", () => 2],
    ["domingos triplicados", (d: number) => (d === 0 ? 3 : 1)],
    ["3 saídas todo dia", () => 3],
  ] as const)(
    "cabe no mês de 5 semanas, que tem a coluna larga da tabela: %s",
    async (_nome, porDia) => {
      expect((await gerarEscala(escalaPesada(porDia, SETEMBRO))).paginas).toBe(1);
    },
    20000,
  );

  it("cabe com 2 saídas todo dia num mês de 6 semanas", async () => {
    expect((await gerarEscala(escalaPesada(() => 2))).paginas).toBe(1);
  }, 20000);
});
