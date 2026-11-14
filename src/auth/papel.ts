import { createContext, useContext } from "react";
import { supabase } from "../lib/supabase";

export async function ehAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("admin")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export const AdminContext = createContext(true);

export const useAdmin = () => useContext(AdminContext);

export const ContaContext = createContext<string | null>(null);

export const useConta = () => useContext(ContaContext);

export const inicioDe = (admin: boolean) => (admin ? "/" : "/mapa");
