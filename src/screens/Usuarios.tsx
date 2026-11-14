import { useEffect, useState } from "react";
import { toast } from "sonner";
import { definirAdmin, listUsuarios, vincularPublicador, type Usuario } from "../lib/usuarios";
import { listPublicadores } from "../lib/publicadores";
import type { Publicador } from "../lib/types";
import { useConta } from "../auth/papel";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NENHUM = "__nenhum__";

export function Usuarios() {
  const eu = useConta();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [publicadores, setPublicadores] = useState<Publicador[]>([]);
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    const [u, p] = await Promise.all([listUsuarios(), listPublicadores()]);
    setUsuarios(u);
    setPublicadores(p);
  }

  useEffect(() => {
    carregar()
      .catch(() => toast.error("Não foi possível carregar as contas."))
      .finally(() => setCarregando(false));
  }, []);

  async function alterar(acao: () => Promise<void>, sucesso: string) {
    try {
      await acao();
      toast.success(sucesso);
    } catch {
      toast.error("Não foi possível salvar. Tente novamente.");
    }
    await carregar();
  }

  const ligadoA = new Set(usuarios.map((u) => u.publicador_id).filter(Boolean));

  return (
    <div className="mx-auto grid max-w-220 gap-[clamp(20px,4vw,32px)] px-[clamp(14px,4vw,32px)] pt-[clamp(16px,4vw,40px)] pb-16">
      <div className="grid gap-1 border-b border-line pb-4">
        <h2 className="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-ink-soft">
          Usuários
        </h2>
        <p className="text-[0.88rem] text-ink-soft">
          Ligue cada conta ao publicador que ela é, para o calendário destacar as saídas
          dele. Admin pode editar tudo; os outros só consultam o mapa e o calendário.
        </p>
      </div>

      {carregando ? (
        <ul role="status" aria-label="Carregando contas" className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <li
              key={i}
              className="h-16 animate-pulse rounded-xl border border-line bg-white shadow-card"
            />
          ))}
        </ul>
      ) : (
        <ul className="grid gap-3">
          {usuarios.map((u) => {
            const souEu = u.id === eu;
            return (
              <li
                key={u.id}
                aria-label={u.email}
                className="grid gap-3 rounded-xl border border-line bg-white px-4 py-3.5 shadow-card sm:grid-cols-[1fr_14rem_auto] sm:items-center"
              >
                <span className="min-w-0 truncate font-medium text-ink">
                  {u.email}
                  {souEu && <span className="ml-2 text-[0.8rem] text-ink-soft">(você)</span>}
                </span>

                <Select
                  value={u.publicador_id ?? NENHUM}
                  onValueChange={(v) =>
                    alterar(
                      () => vincularPublicador(u.id, v === NENHUM ? null : v),
                      v === NENHUM ? "Conta desligada do publicador." : "Conta ligada ao publicador.",
                    )
                  }
                >
                  <SelectTrigger aria-label={`Publicador de ${u.email}`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NENHUM}>Nenhum publicador</SelectItem>
                    {publicadores.map((p) => (
                      <SelectItem
                        key={p.id}
                        value={p.id}
                        disabled={ligadoA.has(p.id) && p.id !== u.publicador_id}
                      >
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <label
                  className="flex items-center gap-2 text-[0.88rem] text-ink"
                  title={souEu ? "Você não pode tirar o seu próprio acesso de admin." : undefined}
                >
                  <Checkbox
                    checked={u.admin}
                    disabled={souEu}
                    aria-label="Admin"
                    onCheckedChange={(v) =>
                      alterar(
                        () => definirAdmin(u.id, v === true),
                        v === true ? `${u.email} agora é admin.` : `${u.email} deixou de ser admin.`,
                      )
                    }
                  />
                  Admin
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
