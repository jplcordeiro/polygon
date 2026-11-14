import { useState } from "react";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LocatorSeal } from "@/components/LocatorSeal";
import { cn } from "@/lib/utils";

type Modo = "entrar" | "criar";

const SENHA_MINIMA = 6;

function erroDoCadastro(error: { code?: string; message: string }) {
  if (error.code === "user_already_exists" || /already registered/i.test(error.message))
    return "Este e-mail já tem conta. Use a aba Entrar.";
  if (error.code === "weak_password")
    return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
  if (error.code === "signup_disabled")
    return "A criação de contas está desligada no Supabase.";
  return "Não foi possível criar a conta. Tente novamente.";
}

export function Login() {
  const [modo, setModo] = useState<Modo>("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmarEm, setConfirmarEm] = useState<string | null>(null);

  function trocar(m: Modo) {
    setModo(m);
    setErro(null);
  }

  async function entrar() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    if (error) setErro("E-mail ou senha inválidos.");
  }

  async function criar() {
    if (senha.length < SENHA_MINIMA) {
      setErro(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
      return;
    }
    const endereco = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: endereco,
      password: senha,
    });
    if (error) setErro(erroDoCadastro(error));
    else if (!data.session) setConfirmarEm(endereco);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    await (modo === "entrar" ? entrar() : criar());
    setEnviando(false);
  }

  const aba = (m: Modo, rotulo: string) => (
    <button
      type="button"
      role="tab"
      id={`aba-${m}`}
      aria-selected={modo === m}
      aria-controls="painel-acesso"
      onClick={() => trocar(m)}
      className={cn(
        "cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        modo === m ? "bg-white text-jwblue-deep shadow-card" : "text-ink-soft hover:text-ink",
      )}
    >
      {rotulo}
    </button>
  );

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center">
          <LocatorSeal />
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-jwblue-deep">
            polygon
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Territórios de campo da congregação
          </p>
        </div>

        {confirmarEm ? (
          <div
            role="status"
            className="mt-8 grid justify-items-center gap-3 rounded-xl border border-line bg-card p-6 text-center shadow-card"
          >
            <MailCheck className="size-8 text-sage" aria-hidden="true" />
            <p className="text-base font-semibold text-ink">Conta criada</p>
            <p className="text-sm text-ink-soft">
              Enviamos um e-mail para <b className="font-medium text-ink">{confirmarEm}</b>.
              Confirme pelo link e depois entre com sua senha.
            </p>
            <Button
              variant="outline"
              className="mt-2 cursor-pointer"
              onClick={() => {
                setConfirmarEm(null);
                trocar("entrar");
              }}
            >
              Voltar para entrar
            </Button>
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-line bg-card p-6 shadow-card">
            <div
              role="tablist"
              aria-label="Acesso"
              className="grid grid-cols-2 gap-1 rounded-lg bg-mist p-1"
            >
              {aba("entrar", "Entrar")}
              {aba("criar", "Criar conta")}
            </div>

            <form
              id="painel-acesso"
              role="tabpanel"
              aria-labelledby={`aba-${modo}`}
              onSubmit={enviar}
              className="mt-5 grid gap-4"
            >
              <div className="grid gap-1.5">
                <label htmlFor="email" className="text-sm font-medium text-ink">
                  E-mail
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={erro != null}
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="senha" className="text-sm font-medium text-ink">
                  Senha
                </label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={mostrarSenha ? "text" : "password"}
                    autoComplete={modo === "entrar" ? "current-password" : "new-password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    aria-invalid={erro != null}
                    aria-describedby={modo === "criar" ? "dica-senha" : undefined}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                    aria-pressed={mostrarSenha}
                    className="absolute inset-y-0 right-0 flex cursor-pointer items-center px-3 text-ink-soft transition-colors hover:text-ink"
                  >
                    {mostrarSenha ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  </button>
                </div>
                {modo === "criar" && (
                  <p id="dica-senha" className="text-xs text-ink-soft">
                    Pelo menos {SENHA_MINIMA} caracteres.
                  </p>
                )}
              </div>

              <p role="alert" aria-live="polite" className="min-h-5 text-sm text-danger">
                {erro}
              </p>

              <Button type="submit" size="lg" disabled={enviando} className="cursor-pointer">
                {modo === "entrar"
                  ? enviando
                    ? "Entrando…"
                    : "Entrar"
                  : enviando
                    ? "Criando conta…"
                    : "Criar conta"}
              </Button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
