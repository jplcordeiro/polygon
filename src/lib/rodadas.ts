import { supabase } from "./supabase";
import type { Rodada, Territorio } from "./types";

export type EmRodada = Territorio & { inicio: string | null };

export function hojeISO(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(
    hoje.getDate(),
  ).padStart(2, "0")}`;
}

export function rodadasDe(territorio_id: string, rodadas: Rodada[]): Rodada[] {
  return rodadas
    .filter((r) => r.territorio_id === territorio_id)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
}

export function inicioDaRodada(
  territorio_id: string,
  rodadas: Rodada[],
): string | null {
  const minhas = rodadasDe(territorio_id, rodadas);
  return minhas.length > 0 ? minhas[minhas.length - 1].inicio : null;
}

export function rodadaEm(
  territorio_id: string,
  data: string,
  rodadas: Rodada[],
): { inicio: string | null; fim: string | null } {
  let inicio: string | null = null;
  let fim: string | null = null;
  for (const r of rodadasDe(territorio_id, rodadas)) {
    if (r.inicio <= data) inicio = r.inicio;
    else {
      fim = r.inicio;
      break;
    }
  }
  return { inicio, fim };
}

export function comRodada(t: Territorio, rodadas: Rodada[]): EmRodada {
  return { ...t, inicio: inicioDaRodada(t.id, rodadas) };
}

export async function listRodadas(): Promise<Rodada[]> {
  const { data, error } = await supabase
    .from("rodada")
    .select("id, territorio_id, inicio, nome, created_at");
  if (error) throw error;
  return data as Rodada[];
}

export async function comecarRodadaEmTodos(
  territorio_ids: string[],
  inicio: string = hojeISO(),
  nome: string | null = null,
): Promise<void> {
  if (territorio_ids.length === 0) return;
  const { error } = await supabase
    .from("rodada")
    .upsert(
      territorio_ids.map((territorio_id) => ({ territorio_id, inicio, nome })),
      { onConflict: "territorio_id,inicio" },
    );
  if (error) throw error;
}
