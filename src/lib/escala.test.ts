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
    expect(patamarDe(5, 1)).toMatchObject({
      local: 11,
      dirigente: 9.5,
      territorio: 9.5,
      observacao: 8,
    });
  });

  it("aperta quando o mês tem 6 semanas", () => {
    expect(patamarDe(6, 1)).toMatchObject({
      local: 10,
      dirigente: 9,
      territorio: 9,
      observacao: 7.5,
    });
  });

  it("solta a observação antes dos territórios", () => {
    expect(patamarDe(6, 2)).toMatchObject({ territorio: 7, observacao: null });
    expect(patamarDe(6, 3)).toMatchObject({ territorio: null, observacao: null });
  });

  it("trata densidade acima de 3 como 3", () => {
    expect(patamarDe(6, 9)).toEqual(patamarDe(6, 3));
  });

  it("trata mês sem saída nenhuma como densidade 1", () => {
    expect(patamarDe(5, 0)).toEqual(patamarDe(5, 1));
  });

  it("aperta o corte de texto junto com a fonte", () => {
    expect(patamarDe(6, 3).letrasDoLocal).toBeLessThan(patamarDe(5, 1).letrasDoLocal);
    expect(patamarDe(6, 3).letrasDoDirigente).toBeLessThan(
      patamarDe(5, 1).letrasDoDirigente,
    );
  });
});

describe("escalaDoMes", () => {
  it("monta semanas de sete dias", () => {
    const e = escalaDoMes(julho, [], territorios, publicadores, "", "2026-07-29");

    expect(e.semanas.length).toBeGreaterThanOrEqual(4);
    for (const semana of e.semanas) expect(semana).toHaveLength(7);
  });

  it("preenche título, aviso aparado e data de geração", () => {
    const e = escalaDoMes(
      julho,
      [],
      territorios,
      publicadores,
      "  Levar convites  ",
      "2026-07-29",
    );

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

    expect(
      e.semanas.flat().find((d) => d.data === "2026-07-05")?.saidas[0].dirigente,
    ).toBe("a definir");
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

    expect(
      e.semanas.flat().find((d) => d.data === "2026-07-05")?.saidas[0].territorios,
    ).toEqual(["6"]);
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

describe("corte de texto", () => {
  it("encurta ponto de encontro comprido, porque a célula é estreita", () => {
    const e = escalaDoMes(
      julho,
      [
        saida({
          data: "2026-07-05",
          local:
            "Salão do Reino da Congregação Central, ao lado da praça principal do bairro",
        }),
      ],
      territorios,
      publicadores,
      "",
      "2026-07-29",
    );

    const local = e.semanas.flat().find((d) => d.data === "2026-07-05")!.saidas[0].local!;
    expect(local.length).toBeLessThanOrEqual(e.patamar.letrasDoLocal);
    expect(local.endsWith("…")).toBe(true);
  });

  it("não mexe no que já cabe", () => {
    const e = escalaDoMes(
      julho,
      [saida({ data: "2026-07-05", local: "Salão" })],
      territorios,
      publicadores,
      "",
      "2026-07-29",
    );

    expect(e.semanas.flat().find((d) => d.data === "2026-07-05")!.saidas[0].local).toBe(
      "Salão",
    );
  });
});
