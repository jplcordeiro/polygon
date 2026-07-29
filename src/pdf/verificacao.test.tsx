// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import type { Folha } from "../lib/relatorio";

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

const LOCAIS = ["Salão do Reino", "Praça da Matriz", "Rua XV de Novembro", null];

function folhaGrande(quantos: number): Folha {
  return {
    titulo: "Julho 2026",
    geradoEm: "29/07/2026",
    totalQuadrasNoMes: quantos * 3,
    totalTerritorios: quantos,
    totalConcluidos: Math.floor(quantos / 4),
    linhas: Array.from({ length: quantos }, (_, i) => ({
      numero: String(i + 1),
      nome: `Território de teste número ${i + 1} com nome comprido`,
      feitasNoMes: 3,
      total: 8,
      concluidoNoMes: i % 4 === 0,
      passagens: Array.from({ length: (i % 3) + 1 }, (_, k) => ({
        saida_id: `s${i}-${k}`,
        data: `2026-07-${String(k * 7 + 3).padStart(2, "0")}`,
        local: LOCAIS[k % LOCAIS.length],
        quadras: k + 1,
      })),
    })),
    periodos: [
      { nome: "Convites do congresso", inicio: "2026-06-01", territorios: 12 },
    ],
  };
}

async function gerar(folha: Folha) {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const { RelatorioPdf } = await import("./RelatorioPdf");
  const buf = await renderToBuffer(<RelatorioPdf folha={folha} />);
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
  it("embute as quatro fontes — falha se algum src apontar para .woff2", async () => {
    const { fontes } = await gerar(folhaGrande(3));

    expect(fontes.sort()).toEqual([
      "AtkinsonHyperlegibleMono-Regular",
      "AtkinsonHyperlegibleNext-Bold",
      "AtkinsonHyperlegibleNext-Regular",
      "AtkinsonHyperlegibleNext-SemiBold",
    ]);
  }, 20000);

  it("quebra a tabela em mais páginas conforme a folha cresce", async () => {
    const curta = await gerar(folhaGrande(3));
    const longa = await gerar(folhaGrande(16));

    expect(curta.paginas).toBe(2);
    expect(longa.paginas).toBeGreaterThan(curta.paginas);
  }, 20000);

  it("não gera a página de rodadas quando não há nenhuma", async () => {
    const { paginas } = await gerar({ ...folhaGrande(3), periodos: [] });

    expect(paginas).toBe(1);
  }, 20000);
});
