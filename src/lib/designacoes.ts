import { supabase } from "./supabase";
import type { Designacao } from "./types";

export async function designacoesAbertas(): Promise<Designacao[]> {
  const { data, error } = await supabase
    .from("designacao")
    .select("*")
    .is("data_devolucao", null);
  if (error) throw error;
  return data as Designacao[];
}

// Nº de designações (abertas + histórico) por publicador. Como a FK é
// `on delete restrict`, qualquer contagem > 0 significa que o publicador
// não pode ser excluído — a UI usa isto para sinalizar isso de antemão.
export async function contagemPorPublicador(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("designacao")
    .select("publicador_id");
  if (error) throw error;
  const contagem: Record<string, number> = {};
  for (const { publicador_id } of data as { publicador_id: string }[]) {
    contagem[publicador_id] = (contagem[publicador_id] ?? 0) + 1;
  }
  return contagem;
}

export async function designar(
  territorio_id: string,
  publicador_id: string,
): Promise<Designacao> {
  const { data, error } = await supabase
    .from("designacao")
    .insert({ territorio_id, publicador_id })
    .select()
    .single();
  // O índice único parcial rejeita uma 2ª designação aberta no mesmo território.
  if (error) throw error;
  return data as Designacao;
}

export async function devolver(designacao_id: string): Promise<void> {
  const { error } = await supabase
    .from("designacao")
    .update({ data_devolucao: new Date().toISOString().slice(0, 10) })
    .eq("id", designacao_id);
  if (error) throw error;
}
