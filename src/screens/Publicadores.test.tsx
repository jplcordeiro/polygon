import { describe, it, expect } from "vitest";
import { saidasPorDirigente } from "./Publicadores";
import type { Saida } from "../lib/types";

function saida(over: Partial<Saida>): Saida {
  return {
    id: "s",
    data: "2026-07-05",
    periodo: "manha",
    local: null,
    publicador_id: null,
    observacao: null,
    created_at: "",
    territorio_ids: [],
    ...over,
  };
}

describe("saidasPorDirigente", () => {
  it("agrupa as saídas pelo dirigente", () => {
    const grupos = saidasPorDirigente([
      saida({ id: "a", publicador_id: "p1" }),
      saida({ id: "b", publicador_id: "p2" }),
      saida({ id: "c", publicador_id: "p1" }),
    ]);
    expect(grupos.get("p1")?.map((s) => s.id)).toEqual(["a", "c"]);
    expect(grupos.get("p2")?.map((s) => s.id)).toEqual(["b"]);
  });

  it("ordena por data e põe a manhã antes da tarde no mesmo dia", () => {
    const grupos = saidasPorDirigente([
      saida({ id: "tarde", data: "2026-07-05", periodo: "tarde", publicador_id: "p1" }),
      saida({ id: "depois", data: "2026-07-12", periodo: "manha", publicador_id: "p1" }),
      saida({ id: "manha", data: "2026-07-05", periodo: "manha", publicador_id: "p1" }),
    ]);
    expect(grupos.get("p1")?.map((s) => s.id)).toEqual(["manha", "tarde", "depois"]);
  });

  it("descarta saídas sem dirigente", () => {
    const grupos = saidasPorDirigente([saida({ id: "a", publicador_id: null })]);
    expect(grupos.size).toBe(0);
  });
});
