import { describe, it, expect } from "vitest";
import { statusTerritorio } from "./territorios";
import type { Territorio, Designacao } from "./types";

const base: Territorio = {
  id: "t1",
  numero: "12",
  nome: null,
  limites: null,
  ativo: true,
  created_at: "",
};

describe("statusTerritorio", () => {
  it("é 'inativo' quando ativo=false, mesmo sem designação", () => {
    expect(statusTerritorio({ ...base, ativo: false }, undefined)).toBe("inativo");
  });
  it("é 'designado' quando há designação aberta", () => {
    const d: Designacao = {
      id: "d1",
      territorio_id: "t1",
      publicador_id: "p1",
      data_saida: "2026-07-01",
      data_devolucao: null,
      created_at: "",
    };
    expect(statusTerritorio(base, d)).toBe("designado");
  });
  it("é 'disponivel' quando ativo e sem designação aberta", () => {
    expect(statusTerritorio(base, undefined)).toBe("disponivel");
  });
});
