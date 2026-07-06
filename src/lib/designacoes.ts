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

// Nº de designações ABERTAS (territórios em posse agora) por publicador.
// A UI usa isto para mostrar quantos territórios o publicador tem no momento;
// ao devolver o último, a contagem zera e o publicador volta a poder ser
// excluído (sujeito ainda ao histórico via FK `on delete restrict`).
export async function contagemPorPublicador(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("designacao")
    .select("publicador_id")
    .is("data_devolucao", null);
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
