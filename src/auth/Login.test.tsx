import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Login } from "./Login";

const signUp = vi.fn();
const signInWithPassword = vi.fn();
vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      signUp: (...a: unknown[]) => signUp(...a),
      signInWithPassword: (...a: unknown[]) => signInWithPassword(...a),
    },
  },
}));

function criarConta(email = "Ana@Exemplo.com", senha = "segredo1") {
  render(<Login />);
  fireEvent.click(screen.getByRole("tab", { name: "Criar conta" }));
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: senha } });
  fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));
}

describe("Login", () => {
  beforeEach(() => vi.clearAllMocks());

  it("entra com e-mail e senha", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    render(<Login />);
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() =>
      expect(signInWithPassword).toHaveBeenCalledWith({ email: "a@b.com", password: "x" }),
    );
  });

  it("cria a conta com o e-mail em minúsculas", async () => {
    signUp.mockResolvedValue({ data: { session: null }, error: null });
    criarConta();
    await waitFor(() =>
      expect(signUp).toHaveBeenCalledWith({ email: "ana@exemplo.com", password: "segredo1" }),
    );
    expect(await screen.findByText(/confirme pelo link/i)).toBeInTheDocument();
  });

  it("avisa quando a conta já existe", async () => {
    signUp.mockResolvedValue({
      data: { session: null },
      error: { code: "user_already_exists", message: "User already registered" },
    });
    criarConta();
    expect(await screen.findByRole("alert")).toHaveTextContent(/já tem conta/i);
  });

  it("pede senha mais longa antes de chamar o Supabase", async () => {
    criarConta("ana@exemplo.com", "123");
    expect(await screen.findByRole("alert")).toHaveTextContent(/6 caracteres/i);
    expect(signUp).not.toHaveBeenCalled();
  });
});
