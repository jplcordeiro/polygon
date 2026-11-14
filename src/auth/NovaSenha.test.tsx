import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NovaSenha } from "./NovaSenha";

const updateUser = vi.fn();
vi.mock("../lib/supabase", () => ({
  supabase: { auth: { updateUser: (...a: unknown[]) => updateUser(...a) } },
}));

describe("NovaSenha", () => {
  beforeEach(() => vi.clearAllMocks());

  it("grava a nova senha e avisa que terminou", async () => {
    updateUser.mockResolvedValue({ error: null });
    const pronto = vi.fn();
    render(<NovaSenha onPronto={pronto} />);
    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "segredo1" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar nova senha" }));

    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ password: "segredo1" }));
    expect(pronto).toHaveBeenCalled();
  });

  it("recusa senha curta sem chamar o Supabase", async () => {
    render(<NovaSenha onPronto={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar nova senha" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/6 caracteres/i);
    expect(updateUser).not.toHaveBeenCalled();
  });
});
