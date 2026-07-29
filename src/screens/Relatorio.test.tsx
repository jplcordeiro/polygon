import { render, screen, waitFor, fireEvent } from "@testing-library/react";

import { describe, it, expect, vi, beforeEach } from "vitest";
import { toast } from "sonner";
import { Relatorio } from "./Relatorio";
import type { Marca } from "../lib/quadras";
import type { Folha } from "../lib/relatorio";
import type { Territorio } from "../lib/types";

const quadra = (id: string, lng: number): GeoJSON.Feature<GeoJSON.Polygon> => ({
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
});

const territorio: Territorio = {
  id: "t1",
  numero: "12",
  nome: "Vila Nova",
  limites: {
    type: "FeatureCollection",
    features: [quadra("qa", -46), quadra("qb", -44)],
  },
  ativo: true,
  created_at: "",
};

vi.mock("../lib/territorios", async (orig) => {
  const actual = await (orig() as Promise<Record<string, unknown>>);
  return { ...actual, listTerritorios: vi.fn() };
});
vi.mock("../lib/quadras", async (orig) => {
  const actual = await (orig() as Promise<Record<string, unknown>>);
  return { ...actual, listMarcas: vi.fn() };
});
vi.mock("../lib/rodadas", async (orig) => {
  const actual = await (orig() as Promise<Record<string, unknown>>);
  return { ...actual, listRodadas: vi.fn() };
});

const toBlob = vi.fn();
const pdfMock = vi.fn((_documento: { props: { folha: Folha } }) => ({ toBlob }));
vi.mock("@react-pdf/renderer", () => ({ pdf: pdfMock }));
vi.mock("../pdf/RelatorioPdf", () => ({
  RelatorioPdf: ({ folha }: { folha: unknown }) => ({ folha }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

async function montar(marcas: Marca[], t: Territorio = territorio) {
  const { listTerritorios } = await import("../lib/territorios");
  const { listMarcas } = await import("../lib/quadras");
  const { listRodadas } = await import("../lib/rodadas");
  vi.mocked(listTerritorios).mockResolvedValue([t]);
  vi.mocked(listMarcas).mockResolvedValue(marcas);
  vi.mocked(listRodadas).mockResolvedValue([]);
  render(<Relatorio />);
  await waitFor(() =>
    expect(screen.queryByRole("status")).not.toBeInTheDocument(),
  );
}

describe("Relatorio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date(2026, 6, 20));
  });

  it("lista as passagens do mês dentro do card do território", async () => {
    await montar([
      {
        saida_id: "s1",
        territorio_id: "t1",
        quadra_id: "qa",
        data: "2026-07-05",
        local: "Salão",
        publicador_id: null,
      },
      {
        saida_id: "s2",
        territorio_id: "t1",
        quadra_id: "qb",
        data: "2026-07-12",
        local: null,
        publicador_id: null,
      },
    ]);

    expect(screen.getByText("2 saídas neste mês")).toBeInTheDocument();
    expect(screen.getByText("05/07/2026").closest("li")).toHaveTextContent(
      "05/07/2026 · Salão · 1 quadra",
    );
    expect(screen.getByText("12/07/2026").closest("li")).toHaveTextContent(
      "12/07/2026 · Sem ponto de encontro · 1 quadra",
    );
  });

  it("diz 1 saída no singular", async () => {
    await montar([
      {
        saida_id: "s1",
        territorio_id: "t1",
        quadra_id: "qa",
        data: "2026-07-05",
        local: "Salão",
        publicador_id: null,
      },
    ]);

    expect(screen.getByText("1 saída neste mês")).toBeInTheDocument();
  });

  it("soma as quadras da mesma saída numa linha só", async () => {
    await montar([
      {
        saida_id: "s1",
        territorio_id: "t1",
        quadra_id: "qa",
        data: "2026-07-05",
        local: "Salão",
        publicador_id: null,
      },
      {
        saida_id: "s1",
        territorio_id: "t1",
        quadra_id: "qb",
        data: "2026-07-05",
        local: "Salão",
        publicador_id: null,
      },
    ]);

    expect(screen.getByText("05/07/2026").closest("li")).toHaveTextContent(
      "2 quadras",
    );
  });
});

describe("exportar em PDF", () => {
  const marca = {
    saida_id: "s1",
    territorio_id: "t1",
    quadra_id: "qa",
    data: "2026-07-05",
    local: "Salão",
    publicador_id: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date(2026, 6, 20));
    toBlob.mockResolvedValue(new Blob(["%PDF"], { type: "application/pdf" }));
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    URL.createObjectURL = vi.fn(() => "blob:relatorio");
    URL.revokeObjectURL = vi.fn();
  });

  it("desabilita o botão quando o mês não tem trabalho registrado", async () => {
    await montar([]);

    expect(screen.getByRole("button", { name: /Baixar PDF/ })).toBeDisabled();
  });

  it("gera o PDF do mês exibido e dispara o download com o nome do mês", async () => {
    const cliques: { download: string; href: string }[] = [];
    const criar = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = criar(tag);
      if (tag === "a") {
        vi.spyOn(el as HTMLAnchorElement, "click").mockImplementation(() => {
          const a = el as HTMLAnchorElement;
          cliques.push({ download: a.download, href: a.href });
        });
      }
      return el;
    });

    await montar([marca]);
    fireEvent.click(screen.getByRole("button", { name: /Baixar PDF/ }));

    await waitFor(() => expect(cliques).toHaveLength(1));
    expect(cliques[0].download).toBe("relatorio-2026-07.pdf");
    expect(pdfMock).toHaveBeenCalledTimes(1);

    vi.mocked(document.createElement).mockRestore();
  });

  it("passa para o documento a folha do mês exibido", async () => {
    await montar([marca]);
    fireEvent.click(screen.getByRole("button", { name: /Baixar PDF/ }));

    await waitFor(() => expect(pdfMock).toHaveBeenCalled());
    const folha = pdfMock.mock.calls[0][0].props.folha;
    expect(folha).toMatchObject({
      titulo: "Julho 2026",
      totalQuadrasNoMes: 1,
      totalTerritorios: 1,
    });
    expect(folha.linhas[0].passagens[0]).toMatchObject({
      data: "2026-07-05",
      local: "Salão",
    });
  });

  it("avisa por toast quando a geração falha", async () => {
    toBlob.mockRejectedValue(new Error("fontkit"));

    await montar([marca]);
    fireEvent.click(screen.getByRole("button", { name: /Baixar PDF/ }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Não foi possível gerar o PDF."),
    );
  });
});
