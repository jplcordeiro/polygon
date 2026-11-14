import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LocatorSeal } from "@/components/LocatorSeal";
import { SENHA_MINIMA } from "./Login";

export function NovaSenha({ onPronto }: { onPronto: () => void }) {
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (senha.length < SENHA_MINIMA) {
      setErro(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
      return;
    }
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);
    if (error) {
      setErro("Não foi possível salvar a senha. Peça um novo link e tente de novo.");
      return;
    }
    toast.success("Senha alterada.");
    onPronto();
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center">
          <LocatorSeal />
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-jwblue-deep">
            Nova senha
          </h1>
          <p className="mt-1 text-sm text-ink-soft">Escolha a senha que vai usar para entrar.</p>
        </div>

        <form
          onSubmit={salvar}
          className="mt-8 grid gap-4 rounded-xl border border-line bg-card p-6 shadow-card"
        >
          <div className="grid gap-1.5">
            <label htmlFor="nova-senha" className="text-sm font-medium text-ink">
              Nova senha
            </label>
            <div className="relative">
              <Input
                id="nova-senha"
                type={mostrarSenha ? "text" : "password"}
                autoComplete="new-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                aria-invalid={erro != null}
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
            <p className="text-xs text-ink-soft">Pelo menos {SENHA_MINIMA} caracteres.</p>
          </div>

          <p role="alert" aria-live="polite" className="min-h-5 text-sm text-danger">
            {erro}
          </p>

          <Button type="submit" size="lg" disabled={salvando} className="cursor-pointer">
            {salvando ? "Salvando…" : "Salvar nova senha"}
          </Button>
        </form>
      </div>
    </main>
  );
}
