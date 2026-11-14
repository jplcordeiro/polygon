import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import { saidasPorDirigente, Publicadores } from "./Publicadores";
import { renomearPublicador } from "../lib/publicadores";
import type { Saida } from "../lib/types";

vi.mock("../lib/publicadores", () => ({
  listPublicadores: vi.fn().mockResolvedValue([
    { id: "p1", nome: "Kleber Souza", telefone: "11988771234", created_at: "" },
    { id: "p2", nome: "Ana Ribeiro", telefone: null, created_at: "" },
  ]),
  criarPublicador: vi.fn(),
  excluirPublicador: vi.fn(),
  renomearPublicador: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../lib/territorios", async (orig) => {
  const actual = await (orig() as Promise<Record<string, unknown>>);
  return {
    ...actual,
    listTerritorios: vi.fn().mockResolvedValue([
      { id: "t1", numero: "6", nome: null, limites: null, ativo: true, created_at: "" },
      { id: "t2", numero: "12", nome: null, limites: null, ativo: true, created_at: "" },
    ]),
  };
});
vi.mock("../lib/saidas", async (orig) => {
  const actual = await (orig() as Promise<Record<string, unknown>>);
  return {
    ...actual,
    listSaidas: vi.fn().mockResolvedValue([
      {
        id: "s1",
        data: "2026-07-05",
        periodo: "manha",
        local: "Salão",
        publicador_id: "p1",
        observacao: null,
        created_at: "",
        territorio_ids: ["t1", "t2"],
      },
    ]),
  };
});

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

describe("Publicadores", () => {
  it("mostra as saídas que o publicador dirige no mês", async () => {
    render(
      <MemoryRouter>
        <Publicadores />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText("Kleber Souza")).toBeInTheDocument());
    expect(screen.getByText(/domingo, 05\/07/)).toBeInTheDocument();
    expect(screen.getByText("manhã")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("filtra a lista pelo nome buscado, ignorando acento e caixa", async () => {
    render(
      <MemoryRouter>
        <Publicadores />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText("Kleber Souza")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText("Buscar por nome"), {
      target: { value: "klÉber" },
    });

    expect(screen.getByText("Kleber Souza")).toBeInTheDocument();
    expect(screen.queryByText("Ana Ribeiro")).not.toBeInTheDocument();
  });

  it("diz quando a busca não encontra ninguém", async () => {
    render(
      <MemoryRouter>
        <Publicadores />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText("Kleber Souza")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText("Buscar por nome"), {
      target: { value: "zzz" },
    });

    expect(screen.getByText(/Nenhum publicador com esse nome/)).toBeInTheDocument();
  });

  it("diz quando o publicador não dirige nada no mês", async () => {
    render(
      <MemoryRouter>
        <Publicadores />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText("Ana Ribeiro")).toBeInTheDocument());
    expect(screen.getByText("Sem saídas neste mês")).toBeInTheDocument();
  });
});

describe("Publicadores — editar nome", () => {
  it("salva o novo nome no botão de confirmar", async () => {
    render(<MemoryRouter><Publicadores /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Editar nome de Ana Ribeiro" }));
    const campo = screen.getByRole("textbox", { name: "Nome de Ana Ribeiro" });
    fireEvent.change(campo, { target: { value: "  Ana Ribeiro Lima " } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar nome" }));
    await waitFor(() => expect(renomearPublicador).toHaveBeenCalledWith("p2", "Ana Ribeiro Lima"));
  });

  it("Esc cancela sem salvar", async () => {
    vi.mocked(renomearPublicador).mockClear();
    render(<MemoryRouter><Publicadores /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Editar nome de Kleber Souza" }));
    const campo = screen.getByRole("textbox", { name: "Nome de Kleber Souza" });
    fireEvent.change(campo, { target: { value: "Outro" } });
    fireEvent.keyDown(campo, { key: "Escape" });
    expect(screen.queryByRole("textbox", { name: "Nome de Kleber Souza" })).toBeNull();
    expect(renomearPublicador).not.toHaveBeenCalled();
  });
});
