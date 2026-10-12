import type { Database } from "@/types/database.types";
import { supabase } from "./supabaseClient";

export type CatalogWork = Database["public"]["Tables"]["works"]["Row"];

export async function listCatalogWorks(page = 0, pageSize = 20): Promise<CatalogWork[]> {
  if (!Number.isSafeInteger(page) || page < 0) {
    throw new Error("La página debe ser un entero mayor o igual que cero.");
  }

  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new Error("El tamaño de página debe estar entre 1 y 100.");
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;

  if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to)) {
    throw new Error("El intervalo solicitado es demasiado grande.");
  }

  const { data, error } = await supabase
    .from("works")
    .select("*")
    .eq("status", "active")
    .order("title", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to);

  if (error) {
    throw new Error(`No se pudo consultar el catálogo: ${error.message}`);
  }

  return data;
}
