import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    "VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY são obrigatórios (.env)",
  );
}

export const supabase = createClient(url, key);

export const LINHAS_POR_PAGINA = 1000;

export async function todasAsLinhas<T>(
  pagina: (
    de: number,
    ate: number,
  ) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const linhas: T[] = [];
  for (let de = 0; ; de += LINHAS_POR_PAGINA) {
    const { data, error } = await pagina(de, de + LINHAS_POR_PAGINA - 1);
    if (error) throw error;
    const lote = data ?? [];
    linhas.push(...lote);
    if (lote.length < LINHAS_POR_PAGINA) return linhas;
  }
}
