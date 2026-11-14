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
  listNomesPublicadores: vi
    .fn()
    .mockResolvedValue([
      { id: "p1", nome: "Kleber", telefone: null, created_at: "", user_id: "conta-kleber" },
    ]),
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
  comecarRodadaEmTodos: vi.fn().mockResolvedValue(undefined),
}));

const rolar = vi.fn();
Element.prototype.scrollIntoView = rolar;

describe("lista do celular", () => {
  it("rola até o card de hoje ao abrir", async () => {
    rolar.mockClear();
    montar();

    await waitFor(() => expect(rolar).toHaveBeenCalledTimes(1));
    expect(rolar.mock.contexts[0]).toHaveTextContent(/hoje/i);
    expect(rolar.mock.contexts[0]).toHaveTextContent("Gruta da Ilha");
  });

  it("abre o dia com o atalho para marcar quadras, não o formulário", async () => {
    montar();
    const abrir = await screen.findAllByRole("button", { name: /Abrir saída de/ });
    fireEvent.click(abrir[0]);

    expect(
      await screen.findByRole("link", { name: /Nº 6/ }),
    ).toHaveAttribute("href", "/saida/s1/territorio/t1");
    expect(screen.queryByText("Editando uma saída")).not.toBeInTheDocument();
  });
});

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

describe("usuário comum", () => {
  it("vê as saídas sem nenhum controle de edição", async () => {
    const { AdminContext } = await import("../auth/papel");
    render(
      <AdminContext.Provider value={false}>
        <MemoryRouter>
          <Calendario />
        </MemoryRouter>
      </AdminContext.Provider>,
    );
    await waitFor(() =>
      expect(screen.getAllByText("Gruta da Ilha").length).toBeGreaterThan(0),
    );
    expect(screen.queryByRole("button", { name: /adicionar saída/i })).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Todos os domingos temos duas saídas.")).toHaveAttribute(
      "readonly",
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Abrir saída de/ })[0]);
    expect(await screen.findByText(/saída\(s\) neste dia/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /excluir/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Nº 6/ })).not.toBeInTheDocument();
  });
});

describe("minhas saídas", () => {
  it("destaca a saída que a conta logada dirige", async () => {
    const { ContaContext } = await import("../auth/papel");
    render(
      <ContaContext.Provider value="conta-kleber">
        <MemoryRouter>
          <Calendario />
        </MemoryRouter>
      </ContaContext.Provider>,
    );
    expect(await screen.findByText("você dirige")).toBeInTheDocument();
  });

  it("não destaca nada para quem não é o dirigente", async () => {
    const { ContaContext } = await import("../auth/papel");
    render(
      <ContaContext.Provider value="outra-conta">
        <MemoryRouter>
          <Calendario />
        </MemoryRouter>
      </ContaContext.Provider>,
    );
    await waitFor(() => expect(screen.getAllByText("Gruta da Ilha").length).toBeGreaterThan(0));
    expect(screen.queryByText("você dirige")).not.toBeInTheDocument();
  });
});
