import { supabase } from "./supabase";

export interface Usuario {
  id: string;
  email: string;
  created_at: string;
  admin: boolean;
  publicador_id: string | null;
}

export async function listUsuarios(): Promise<Usuario[]> {
  const { data, error } = await supabase.rpc("listar_usuarios");
  if (error) throw error;
  return data as Usuario[];
}

export async function definirAdmin(userId: string, admin: boolean): Promise<void> {
  const { error } = admin
    ? await supabase.from("admin").insert({ user_id: userId })
    : await supabase.from("admin").delete().eq("user_id", userId);
  if (error) throw error;
}

export async function vincularPublicador(
  userId: string,
  publicadorId: string | null,
): Promise<void> {
  const solta = await supabase
    .from("publicador")
    .update({ user_id: null })
    .eq("user_id", userId);
  if (solta.error) throw solta.error;
  if (!publicadorId) return;
  const liga = await supabase
    .from("publicador")
    .update({ user_id: userId })
    .eq("id", publicadorId);
  if (liga.error) throw liga.error;
}
