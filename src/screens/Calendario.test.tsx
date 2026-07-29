import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Calendario } from "./Calendario";

const { hojeISO } = vi.hoisted(() => {
  const hoje = new Date();
  return {
    hojeISO: `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`,
  };
});

vi.mock("../lib/saidas", async (orig) => {
  const actual = await (orig() as Promise<Record<string, unknown>>);
  return {
    ...actual,
    listSaidas: vi.fn().mockResolvedValue([
      {
        id: "s1",
        data: hojeISO,
        periodo: "manha",
        local: "Gruta da Ilha",
        publicador_id: "p1",
        observacao: null,
        created_at: "2026-06-01T00:00:00Z",
        territorio_ids: ["t1"],
      },
      {
        id: "s2",
        data: hojeISO,
        periodo: "tarde",
        local: "Campinho Rua A",
        publicador_id: null,
        observacao: "faltante",
        created_at: "2026-06-02T00:00:00Z",
        territorio_ids: [],
      },
    ]),
    notaDoMes: vi.fn().mockResolvedValue("Todos os domingos temos duas saídas."),
    salvarNota: vi.fn(),
    excluirSaida: vi.fn(),
  };
});
vi.mock("../lib/territorios", async (orig) => {
  const actual = await (orig() as Promise<Record<string, unknown>>);
  return {
    ...actual,
    listTerritorios: vi.fn().mockResolvedValue([
      { id: "t1", numero: "6", nome: "Centro", limites: null, ativo: true, created_at: "" },
    ]),
  };
});
vi.mock("../lib/publicadores", () => ({
  listPublicadores: vi
    .fn()
    .mockResolvedValue([{ id: "p1", nome: "Kleber", telefone: null, created_at: "" }]),
}));
vi.mock("../lib/quadras", async (orig) => {
  const actual = await (orig() as Promise<Record<string, unknown>>);
  return { ...actual, listMarcas: vi.fn().mockResolvedValue([]) };
});

const toBlob = vi.fn();
const pdfMock = vi.fn((_documento: { props: { escala: unknown } }) => ({ toBlob }));
vi.mock("@react-pdf/renderer", () => ({ pdf: pdfMock }));
vi.mock("../pdf/EscalaPdf", () => ({
  EscalaPdf: ({ escala }: { escala: unknown }) => ({ escala }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function montar() {
  return render(
    <MemoryRouter>
      <Calendario />
    </MemoryRouter>,
  );
}

vi.mock("../lib/rodadas", async (orig) => ({
  ...(await (orig() as Promise<Record<string, unknown>>)),
  listRodadas: vi.fn().mockResolvedValue([]),
  comecarRodada: vi.fn().mockResolvedValue(undefined),
  comecarRodadaEmTodos: vi.fn().mockResolvedValue(undefined),
}));

describe("Calendario", () => {
  it("mostra o ponto de encontro, o dirigente e o território da saída", async () => {
    montar();
    await waitFor(() =>
      expect(screen.getAllByText("Gruta da Ilha").length).toBeGreaterThan(0),
    );
    expect(screen.getAllByText("Kleber").length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: /mapa do território 6/i }).length,
    ).toBeGreaterThan(0);
  });

  it("marca a saída sem dirigente como a definir", async () => {
    montar();
    await waitFor(() =>
      expect(screen.getAllByText(/a definir/i).length).toBeGreaterThan(0),
    );
  });

  it("marca a saída da tarde", async () => {
    montar();
    await waitFor(() => expect(screen.getAllByText("tarde").length).toBeGreaterThan(0));
  });

  it("carrega o aviso do mês", async () => {
    montar();
    await waitFor(() =>
      expect(screen.getByDisplayValue("Todos os domingos temos duas saídas.")).toBeInTheDocument(),
    );
  });
});

describe("dias de outro mês", () => {
  it("não mostra saída que caiu num dia emprestado da grade", async () => {
    const { listSaidas, gradeDoMes, mesmoMes } = await import("../lib/saidas");
    const agora = new Date();
    const mes = { ano: agora.getFullYear(), mes: agora.getMonth() + 1 };
    const emprestado = gradeDoMes(mes).find((d) => !mesmoMes(d, mes));
    expect(emprestado).toBeDefined();

    vi.mocked(listSaidas).mockResolvedValueOnce([
      {
        id: "s9",
        data: emprestado!,
        periodo: "manha",
        local: "Ponto do mês vizinho",
        publicador_id: null,
        observacao: null,
        created_at: "2026-06-01T00:00:00Z",
        territorio_ids: [],
      },
    ]);

    montar();

    await waitFor(() =>
      expect(screen.queryByRole("status")).not.toBeInTheDocument(),
    );
    expect(screen.queryByText("Ponto do mês vizinho")).not.toBeInTheDocument();
  });

  it("pede ao Supabase só o intervalo do mês, não o da grade", async () => {
    const { listSaidas } = await import("../lib/saidas");
    vi.mocked(listSaidas).mockClear();

    montar();

    await waitFor(() => expect(listSaidas).toHaveBeenCalled());
    const [de, ate] = vi.mocked(listSaidas).mock.calls[0];
    expect(de.slice(-2)).toBe("01");
    expect(de.slice(0, 7)).toBe(ate.slice(0, 7));
  });
});

describe("exportar a escala em PDF", () => {
  beforeEach(() => {
    toBlob.mockResolvedValue(new Blob(["%PDF"], { type: "application/pdf" }));
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    URL.createObjectURL = vi.fn(() => "blob:escala");
    URL.revokeObjectURL = vi.fn();
  });

  it("baixa a escala do mês exibido", async () => {
    const baixados: string[] = [];
    const criar = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = criar(tag);
      if (tag === "a") {
        vi.spyOn(el as HTMLAnchorElement, "click").mockImplementation(() => {
          baixados.push((el as HTMLAnchorElement).download);
        });
      }
      return el;
    });

    montar();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Baixar PDF/ })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: /Baixar PDF/ }));

    await waitFor(() => expect(baixados).toHaveLength(1));
    expect(baixados[0]).toMatch(/^escala-\d{4}-\d{2}\.pdf$/);

    vi.mocked(document.createElement).mockRestore();
  });

  it("continua habilitado num mês sem saída nenhuma", async () => {
    const { listSaidas } = await import("../lib/saidas");
    vi.mocked(listSaidas).mockResolvedValueOnce([]);

    montar();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Baixar PDF/ })).toBeEnabled(),
    );
  });

  it("avisa por toast quando a geração falha", async () => {
    const { toast } = await import("sonner");
    toBlob.mockRejectedValue(new Error("fontkit"));

    montar();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Baixar PDF/ })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: /Baixar PDF/ }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Não foi possível gerar o PDF."),
    );
  });
});
