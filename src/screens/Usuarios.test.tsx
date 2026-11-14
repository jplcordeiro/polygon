import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Usuarios } from "./Usuarios";
import { ContaContext } from "../auth/papel";

vi.mock("../lib/usuarios", () => ({
  listUsuarios: vi.fn(),
  definirAdmin: vi.fn().mockResolvedValue(undefined),
  vincularPublicador: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../lib/publicadores", () => ({
  listPublicadores: vi.fn().mockResolvedValue([
    { id: "p1", nome: "Kleber", telefone: null, created_at: "" },
  ]),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

async function montar() {
  const { listUsuarios } = await import("../lib/usuarios");
  vi.mocked(listUsuarios).mockResolvedValue([
    { id: "eu", email: "eu@x.com", created_at: "", admin: true, publicador_id: null },
    { id: "u2", email: "kleber@x.com", created_at: "", admin: false, publicador_id: "p1" },
  ]);
  render(
    <ContaContext.Provider value="eu">
      <Usuarios />
    </ContaContext.Provider>,
  );
  return within(await screen.findByRole("listitem", { name: "kleber@x.com" }));
}

describe("Usuarios", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mostra cada conta com o publicador ligado", async () => {
    const kleber = await montar();
    expect(kleber.getByRole("combobox")).toHaveTextContent("Kleber");
  });

  it("promove uma conta a admin", async () => {
    const { definirAdmin } = await import("../lib/usuarios");
    const kleber = await montar();
    fireEvent.click(kleber.getByRole("checkbox", { name: "Admin" }));
    await waitFor(() => expect(definirAdmin).toHaveBeenCalledWith("u2", true));
  });

  it("não deixa o admin tirar o próprio acesso", async () => {
    await montar();
    const eu = within(screen.getByRole("listitem", { name: "eu@x.com" }));
    expect(eu.getByRole("checkbox", { name: "Admin" })).toBeDisabled();
  });
});
