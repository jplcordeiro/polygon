import { supabase } from "./supabase";
import { quadrasDe } from "./territorios";
import type { Publicador, Territorio } from "./types";

export interface Marca {
  saida_id: string;
  territorio_id: string;
  quadra_id: string;
  data: string;
  local: string | null;
  publicador_id: string | null;
}

export interface PassagemQuadra {
  data: string;
  local: string | null;
  dirigente: string | null;
}

export interface Parada {
  territorio_id: string;
  quadra_id: string;
  saida_id: string;
  lng: number;
  lat: number;
  data: string;
  local: string | null;
  publicador_id: string | null;
}

export interface Progresso {
  feitas: number;
  total: number;
  emAndamento: number;
  concluido: boolean;
}

export function marcasDaRodada(t: Territorio, marcas: Marca[]): Marca[] {
  return marcas.filter(
    (m) =>
      m.territorio_id === t.id && (!t.progresso_desde || m.data >= t.progresso_desde),
  );
}

export function quadrasFeitasDe(t: Territorio, marcas: Marca[]): Set<string> {
  const existentes = new Set(quadrasDe(t.limites).map((q) => q.id));
  return new Set(
    marcasDaRodada(t, marcas)
      .map((m) => m.quadra_id)
      .filter((id) => existentes.has(id)),
  );
}

export function paradasDaRodada(t: Territorio, paradas: Parada[]): Parada[] {
  return paradas.filter(
    (p) =>
      p.territorio_id === t.id && (!t.progresso_desde || p.data >= t.progresso_desde),
  );
}

export function paradaAtualDe(
  t: Territorio,
  marcas: Marca[],
  paradas: Parada[],
): Map<string, Parada> {
  const existentes = new Set(quadrasDe(t.limites).map((q) => q.id));
  const feitas = quadrasFeitasDe(t, marcas);
  const atual = new Map<string, Parada>();
  for (const p of paradasDaRodada(t, paradas)) {
    if (!existentes.has(p.quadra_id) || feitas.has(p.quadra_id)) continue;
    atual.set(p.quadra_id, p);
  }
  return atual;
}

export function historicoDaQuadra(
  territorio_id: string,
  quadra_id: string,
  marcas: Marca[],
  publicadores: Publicador[],
): PassagemQuadra[] {
  const nome = (id: string | null) =>
    id ? (publicadores.find((p) => p.id === id)?.nome ?? null) : null;
  return marcas
    .filter((m) => m.territorio_id === territorio_id && m.quadra_id === quadra_id)
    .map((m) => ({ data: m.data, local: m.local, dirigente: nome(m.publicador_id) }))
    .sort((a, b) => b.data.localeCompare(a.data));
}

export function progressoDe(
  t: Territorio,
  marcas: Marca[],
  paradas: Parada[] = [],
): Progresso {
  const total = quadrasDe(t.limites).length;
  const feitas = quadrasFeitasDe(t, marcas).size;
  const emAndamento = paradaAtualDe(t, marcas, paradas).size;
  return { feitas, total, emAndamento, concluido: total > 0 && feitas === total };
}

type MarcaRow = Omit<Marca, "data" | "local" | "publicador_id">;
type SaidaRow = { id: string; data: string; local: string | null; publicador_id: string | null };
type ParadaRow = {
  territorio_id: string;
  quadra_id: string;
  saida_id: string;
  lng: number;
  lat: number;
};

export async function listMarcas(): Promise<Marca[]> {
  const [marcadas, saidas] = await Promise.all([
    supabase.from("quadra_feita").select("saida_id, territorio_id, quadra_id"),
    supabase.from("saida").select("id, data, local, publicador_id"),
  ]);
  if (marcadas.error) throw marcadas.error;
  if (saidas.error) throw saidas.error;

  const saidaDe = new Map((saidas.data as SaidaRow[]).map((s) => [s.id, s]));
  return (marcadas.data as MarcaRow[]).flatMap((m) => {
    const s = saidaDe.get(m.saida_id);
    return s
      ? [{ ...m, data: s.data, local: s.local, publicador_id: s.publicador_id }]
      : [];
  });
}

export async function listParadas(): Promise<Parada[]> {
  const [paradas, saidas] = await Promise.all([
    supabase.from("ponto_parada").select("territorio_id, quadra_id, saida_id, lng, lat"),
    supabase.from("saida").select("id, data, local, publicador_id"),
  ]);
  if (paradas.error) throw paradas.error;
  if (saidas.error) throw saidas.error;

  const saidaDe = new Map((saidas.data as SaidaRow[]).map((s) => [s.id, s]));
  return (paradas.data as ParadaRow[]).flatMap((p) => {
    const s = saidaDe.get(p.saida_id);
    return s
      ? [{ ...p, data: s.data, local: s.local, publicador_id: s.publicador_id }]
      : [];
  });
}

export async function pararEm(
  saida_id: string,
  territorio_id: string,
  quadra_id: string,
  lng: number,
  lat: number,
): Promise<void> {
  const { error } = await supabase
    .from("ponto_parada")
    .upsert(
      { saida_id, territorio_id, quadra_id, lng, lat },
      { onConflict: "territorio_id,quadra_id" },
    );
  if (error) throw error;
}

export async function limparParada(
  territorio_id: string,
  quadra_id: string,
): Promise<void> {
  const { error } = await supabase
    .from("ponto_parada")
    .delete()
    .eq("territorio_id", territorio_id)
    .eq("quadra_id", quadra_id);
  if (error) throw error;
}

export async function marcarQuadra(
  saida_id: string,
  territorio_id: string,
  quadra_id: string,
): Promise<void> {
  const { error } = await supabase
    .from("quadra_feita")
    .insert({ saida_id, territorio_id, quadra_id });
  if (error) throw error;
}

export async function desmarcarQuadra(
  saida_id: string,
  territorio_id: string,
  quadra_id: string,
): Promise<void> {
  const { error } = await supabase
    .from("quadra_feita")
    .delete()
    .eq("saida_id", saida_id)
    .eq("territorio_id", territorio_id)
    .eq("quadra_id", quadra_id);
  if (error) throw error;
}

export async function iniciarNovaRodada(territorio_id: string): Promise<void> {
  const hoje = new Date();
  const data = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(
    hoje.getDate(),
  ).padStart(2, "0")}`;
  const { error } = await supabase
    .from("territorio")
    .update({ progresso_desde: data })
    .eq("id", territorio_id);
  if (error) throw error;
}
