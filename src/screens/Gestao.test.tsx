import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Gestao } from "./Gestao";
import type { Marca, Parada } from "../lib/quadras";
import type { Rodada, Territorio } from "../lib/types";

const { quadra } = vi.hoisted(() => ({
  quadra: (id: string, lng: number): GeoJSON.Feature<GeoJSON.Polygon> => ({
    type: "Feature",
    properties: { id },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [lng, -23],
          [lng + 1, -23],
          [lng + 1, -22],
          [lng, -23],
        ],
      ],
    },
  }),
}));

const territorio: Territorio = {
  id: "t1",
  numero: "12",
  nome: "Centro",
  limites: {
    type: "FeatureCollection",
    features: [quadra("qa", -46), quadra("qb", -44)],
  },
  ativo: true,
  created_at: "",
};

vi.mock("../lib/territorios", async (orig) => {
  const actual = await (orig() as Promise<Record<string, unknown>>);
  return {
    ...actual,
    listTerritorios: vi.fn(),
    setAtivo: vi.fn(),
  };
});
vi.mock("../lib/publicadores", () => ({
  listPublicadores: vi.fn().mockResolvedValue([]),
  criarPublicador: vi.fn(),
  excluirPublicador: vi.fn(),
}));
vi.mock("../lib/designacoes", () => ({
  designacoesAbertas: vi.fn().mockResolvedValue([]),
  designar: vi.fn(),
  devolver: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../lib/quadras", async (orig) => {
  const actual = await (orig() as Promise<Record<string, unknown>>);
  return {
    ...actual,
    listMarcas: vi.fn().mockResolvedValue([]),
    listParadas: vi.fn().mockResolvedValue([]),
  };
});
vi.mock("../lib/rodadas", async (orig) => {
  const actual = await (orig() as Promise<Record<string, unknown>>);
  return {
    ...actual,
    listRodadas: vi.fn().mockResolvedValue([]),
    comecarRodada: vi.fn().mockResolvedValue(undefined),
    comecarRodadaEmTodos: vi.fn().mockResolvedValue(undefined),
    hojeISO: () => "2026-07-19",
  };
});

const marca = (quadra_id: string): Marca => ({
  saida_id: "s1",
  territorio_id: "t1",
  quadra_id,
  data: "2026-07-12",
  local: null,
  publicador_id: null,
});

const parada = (quadra_id: string): Parada => ({
  territorio_id: "t1",
  quadra_id,
  saida_id: "s1",
  lng: -46,
  lat: -23,
  data: "2026-07-12",
  local: null,
  publicador_id: null,
});

async function montar(
  marcas: Marca[] = [],
  t: Territorio = territorio,
  paradas: Parada[] = [],
  rodadas: Rodada[] = [],
) {
  const { listTerritorios } = await import("../lib/territorios");
  const { listMarcas, listParadas } = await import("../lib/quadras");
  const { listRodadas } = await import("../lib/rodadas");
  vi.mocked(listTerritorios).mockResolvedValue([t]);
  vi.mocked(listMarcas).mockResolvedValue(marcas);
  vi.mocked(listParadas).mockResolvedValue(paradas);
  vi.mocked(listRodadas).mockResolvedValue(rodadas);
  render(
    <MemoryRouter>
      <Gestao />
    </MemoryRouter>,
  );
  await waitFor(() => expect(screen.getByText("Centro")).toBeInTheDocument());
}

describe("Gestao", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lista o território cadastrado", async () => {
    await montar();
    expect(
      screen.getByRole("link", { name: "Abrir mapa do território Nº 12" }),
    ).toBeInTheDocument();
  });

  it("mostra quantas quadras já foram feitas na rodada", async () => {
    await montar([marca("qa")]);
    expect(screen.getByText("1/2 quadras")).toBeInTheDocument();
  });

  it("mostra o território como concluído quando todas as quadras foram feitas", async () => {
    await montar([marca("qa"), marca("qb")]);
    expect(screen.getByText(/concluído/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /começar nova rodada/i }),
    ).toBeInTheDocument();
  });

  it("oferece nova rodada mesmo com quadras faltando", async () => {
    await montar([marca("qa")]);
    expect(
      screen.getByRole("button", { name: /começar nova rodada/i }),
    ).toBeInTheDocument();
  });

  it("começar nova rodada registra uma rodada do território", async () => {
    const { comecarRodada } = await import("../lib/rodadas");
    await montar([marca("qa"), marca("qb")]);

    fireEvent.click(screen.getByRole("button", { name: /começar nova rodada/i }));

    await waitFor(() => expect(comecarRodada).toHaveBeenCalledWith("t1"));
  });

  it("a campanha registra a rodada em todos com data e nome", async () => {
    const { comecarRodadaEmTodos } = await import("../lib/rodadas");
    await montar([marca("qa")]);

    fireEvent.click(screen.getByRole("button", { name: /nova rodada em todos/i }));
    fireEvent.change(await screen.findByLabelText(/a rodada começa em/i), {
      target: { value: "2026-07-18" },
    });
    fireEvent.change(screen.getByLabelText(/nome da campanha/i), {
      target: { value: "Convites do congresso" },
    });
    fireEvent.click(screen.getByRole("button", { name: /começar em todos/i }));

    await waitFor(() =>
      expect(comecarRodadaEmTodos).toHaveBeenCalledWith(
        ["t1"],
        "2026-07-18",
        "Convites do congresso",
      ),
    );
  });

  it("devolver um território concluído oferece começar a nova rodada", async () => {
    const { designacoesAbertas } = await import("../lib/designacoes");
    const { comecarRodada } = await import("../lib/rodadas");
    vi.mocked(designacoesAbertas).mockResolvedValue([
      {
        id: "d1",
        territorio_id: "t1",
        publicador_id: "p1",
        data_saida: "2026-07-01",
        data_devolucao: null,
        created_at: "",
      },
    ]);
    await montar([marca("qa"), marca("qb")]);

    fireEvent.click(screen.getByRole("button", { name: /devolver/i }));

    expect(await screen.findByText(/concluído\. começar nova rodada\?/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /agora não/i }));
    await waitFor(() =>
      expect(screen.queryByText(/começar nova rodada\?/i)).not.toBeInTheDocument(),
    );
    expect(comecarRodada).not.toHaveBeenCalled();
  });

  it("mostra quantas quadras estão em andamento além das feitas", async () => {
    await montar([marca("qa")], territorio, [parada("qb")]);
    expect(await screen.findByText(/1 em andamento/i)).toBeInTheDocument();
  });

  it("depois de zerada, a rodada volta a zero sem perder as marcas antigas", async () => {
    const rodada: Rodada = {
      id: "r1",
      territorio_id: "t1",
      inicio: "2026-07-13",
      nome: null,
      created_at: "",
    };
    await montar([marca("qa"), marca("qb")], territorio, [], [rodada]);

    expect(screen.getByText("0/2 quadras")).toBeInTheDocument();
    expect(screen.queryByText(/concluído/i)).not.toBeInTheDocument();
  });
});
