import { supabase } from "./supabase";
import type { Territorio, Designacao } from "./types";

export type StatusTerritorio = "disponivel" | "designado" | "inativo";

export function statusTerritorio(
  t: Territorio,
  designacaoAberta: Designacao | undefined,
): StatusTerritorio {
  if (!t.ativo) return "inativo";
  if (designacaoAberta) return "designado";
  return "disponivel";
}

export async function listTerritorios(): Promise<Territorio[]> {
  const { data, error } = await supabase
    .from("territorio")
    .select("*")
    .order("numero");
  if (error) throw error;
  return data as Territorio[];
}

export async function criarTerritorio(input: {
  numero: string;
  nome?: string;
  limites: GeoJSON.Polygon;
}): Promise<Territorio> {
  const { data, error } = await supabase
    .from("territorio")
    .insert({ numero: input.numero, nome: input.nome ?? null, limites: input.limites })
    .select()
    .single();
  if (error) throw error;
  return data as Territorio;
}

export async function setAtivo(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase.from("territorio").update({ ativo }).eq("id", id);
  if (error) throw error;
}
