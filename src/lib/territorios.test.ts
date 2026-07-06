import { describe, it, expect } from "vitest";
import { statusTerritorio, boundsDeTerritorios } from "./territorios";
import type { Territorio, Designacao } from "./types";

function quadrado(lng: number, lat: number, lado = 1): GeoJSON.Polygon {
  return {
    type: "Polygon",
    coordinates: [
      [
        [lng, lat],
        [lng + lado, lat],
        [lng + lado, lat + lado],
        [lng, lat + lado],
        [lng, lat],
      ],
    ],
  };
}

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

describe("boundsDeTerritorios", () => {
  it("retorna null quando nenhum território tem limites", () => {
    expect(boundsDeTerritorios([base, { ...base, id: "t2" }])).toBeNull();
  });

  it("envolve todos os polígonos, ignorando os sem limites", () => {
    const ts: Territorio[] = [
      { ...base, id: "a", limites: quadrado(-46, -23) },
      { ...base, id: "b", limites: null },
      { ...base, id: "c", limites: quadrado(-44, -21) },
    ];
    expect(boundsDeTerritorios(ts)).toEqual([
      [-46, -23],
      [-43, -20],
    ]);
  });

  it("com um só território, envolve exatamente o polígono dele", () => {
    const p = quadrado(-46, -23, 2);
    expect(boundsDeTerritorios([{ ...base, limites: p }])).toEqual([
      [-46, -23],
      [-44, -21],
    ]);
  });
});
