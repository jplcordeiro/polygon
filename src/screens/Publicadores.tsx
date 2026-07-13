import type { Saida } from "../lib/types";

export function saidasPorDirigente(saidas: Saida[]): Map<string, Saida[]> {
  const grupos = new Map<string, Saida[]>();
  const ordenadas = [...saidas].sort((a, b) =>
    a.data === b.data
      ? Number(a.periodo === "tarde") - Number(b.periodo === "tarde")
      : a.data.localeCompare(b.data),
  );
  for (const s of ordenadas) {
    if (!s.publicador_id) continue;
    const grupo = grupos.get(s.publicador_id);
    if (grupo) grupo.push(s);
    else grupos.set(s.publicador_id, [s]);
  }
  return grupos;
}
