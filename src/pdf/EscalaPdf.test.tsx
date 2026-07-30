import { describe, it, expect } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { EscalaPdf } from "./EscalaPdf";
import { patamarDe, type Escala } from "../lib/escala";

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
        { data: "2026-06-28", dia: 28, doMes: false, diaDaSemana: 0, saidas: [] },
        { data: "2026-06-29", dia: 29, doMes: false, diaDaSemana: 1, saidas: [] },
        { data: "2026-06-30", dia: 30, doMes: false, diaDaSemana: 2, saidas: [] },
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

    expect(saiu.filter((t) => t.startsWith("tarde"))).toHaveLength(1);
  });

  it("leva a faixa dos dias da semana e o mês", () => {
    const saiu = textos(EscalaPdf({ escala: escalaDe() })).join(" ");

    expect(saiu).toContain("dom");
    expect(saiu).toContain("sáb");
    expect(saiu).toContain("Julho 2026");
    expect(saiu).toContain("Gerado em");
    expect(saiu).toContain("29/07/2026");
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

  it("rotula os territórios, no plural quando há mais de um", () => {
    const saiu = textos(EscalaPdf({ escala: escalaDe() }));

    expect(saiu).toContain("Territórios 6 · 12");
  });

  it("rotula no singular quando a saída tem um só território", () => {
    const uma = escalaDe();
    uma.semanas[0][3].saidas[0].territorios = ["23"];
    const saiu = textos(EscalaPdf({ escala: uma })).join(" ");

    expect(saiu).toContain("Território 23");
    expect(saiu).not.toContain("Territórios 23");
  });

  it("mantém os territórios até no patamar mais apertado", () => {
    const apertado = escalaDe({ patamar: patamarDe(6, 3) });

    expect(textos(EscalaPdf({ escala: apertado })).join(" ")).toContain("6 · 12");
  });

  it("some com os territórios quando o patamar os dispensa", () => {
    const semTerritorios = escalaDe({
      patamar: { ...patamarDe(6, 3), territorio: null },
    });

    expect(textos(EscalaPdf({ escala: semTerritorios })).join(" ")).not.toContain(
      "6 · 12",
    );
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
