import { supabase } from "./supabase";
import type { Publicador } from "./types";

export async function listPublicadores(): Promise<Publicador[]> {
  const { data, error } = await supabase
    .from("publicador")
    .select("*")
    .order("nome");
  if (error) throw error;
  return data as Publicador[];
}

export async function listNomesPublicadores(): Promise<Publicador[]> {
  const { data, error } = await supabase
    .from("publicador_nome")
    .select("*")
    .order("nome");
  if (error) throw error;
  return data as Publicador[];
}

export async function criarPublicador(input: {
  nome: string;
}): Promise<Publicador> {
  const { data, error } = await supabase
    .from("publicador")
    .insert({ nome: input.nome })
    .select()
    .single();
  if (error) throw error;
  return data as Publicador;
}

export async function renomearPublicador(id: string, nome: string): Promise<void> {
  const { error } = await supabase.from("publicador").update({ nome }).eq("id", id);
  if (error) throw error;
}

export async function excluirPublicador(id: string): Promise<void> {
  const { error } = await supabase.from("publicador").delete().eq("id", id);
  if (error) throw error;
}
