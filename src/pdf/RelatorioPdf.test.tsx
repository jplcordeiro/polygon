import { describe, it, expect } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { RelatorioPdf } from "./RelatorioPdf";
import type { Folha } from "../lib/relatorio";

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

const vazia: Folha = {
  titulo: "Julho 2026",
  geradoEm: "29/07/2026",
  totalQuadrasNoMes: 0,
  totalTerritorios: 0,
  totalConcluidos: 0,
  linhas: [],
  periodos: [],
};

const cheia: Folha = {
  ...vazia,
  totalQuadrasNoMes: 8,
  totalTerritorios: 2,
  totalConcluidos: 1,
  linhas: [
    {
      numero: "6",
      nome: "Vila Nova",
      feitasNoMes: 5,
      total: 8,
      concluidoNoMes: false,
      passagens: [
        { saida_id: "s1", data: "2026-07-04", local: "Praça Central", quadras: 3 },
        { saida_id: "s2", data: "2026-07-18", local: null, quadras: 1 },
      ],
    },
    {
      numero: "12",
      nome: "Jardim Aurora",
      feitasNoMes: 8,
      total: 8,
      concluidoNoMes: true,
      passagens: [{ saida_id: "s3", data: "2026-07-11", local: "Salão", quadras: 8 }],
    },
  ],
  periodos: [{ nome: "Convites do congresso", inicio: "2026-06-01", territorios: 4 }],
};

describe("RelatorioPdf", () => {
  it("monta o documento de uma folha cheia sem lançar", () => {
    expect(() => RelatorioPdf({ folha: cheia })).not.toThrow();
  });

  it("leva número, nome e progresso de cada território", () => {
    const saiu = textos(RelatorioPdf({ folha: cheia })).join(" ");

    expect(saiu).toContain("6");
    expect(saiu).toContain("Vila Nova");
    expect(saiu).toContain("5 de 8");
    expect(saiu).toContain("Jardim Aurora");
    expect(saiu).toContain("Concluído");
  });

  it("expande o detalhe por saída, que na tela fica escondido no <details>", () => {
    const saiu = textos(RelatorioPdf({ folha: cheia })).join(" ");

    expect(saiu).toContain("04/07");
    expect(saiu).toContain("Praça Central");
    expect(saiu).toContain("3 quadras");
    expect(saiu).toContain("18/07");
    expect(saiu).toContain("1 quadra");
  });

  it("nomeia a saída sem ponto de encontro", () => {
    expect(textos(RelatorioPdf({ folha: cheia })).join(" ")).toContain(
      "Sem ponto de encontro",
    );
  });

  it("imprime a seção Rodadas, que o @media print escondia", () => {
    const saiu = textos(RelatorioPdf({ folha: cheia })).join(" ");

    expect(saiu).toContain("Rodadas");
    expect(saiu).toContain("Convites do congresso");
    expect(saiu).toContain("01/06/2026");
    expect(saiu).toContain("4 territórios");
  });

  it("leva os indicadores e o rodapé de geração", () => {
    const saiu = textos(RelatorioPdf({ folha: cheia })).join(" ");

    expect(saiu).toContain("Quadras feitas");
    expect(saiu).toContain("Julho 2026");
    expect(saiu).toContain("29/07/2026");
  });

  it("monta uma folha vazia sem lançar e sem seção de rodadas", () => {
    const saiu = textos(RelatorioPdf({ folha: vazia })).join(" ");

    expect(saiu).toContain("Nenhum trabalho registrado neste mês.");
    expect(saiu).not.toContain("Rodadas");
  });
});
