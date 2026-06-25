import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export interface SubmitResult {
  ok: boolean;
  demo: boolean;
  error?: string;
}

/**
 * Inserta un registro en una tabla de Supabase.
 * Si Supabase no está configurado, simula un envío exitoso en "modo demo"
 * para que la app sea usable sin credenciales durante el desarrollo.
 */
export async function insertRow(
  table: string,
  payload: Record<string, unknown>
): Promise<SubmitResult> {
  if (!isSupabaseConfigured) {
    // Modo demo: simulamos latencia de red.
    await new Promise((r) => setTimeout(r, 600));
    console.info(`[demo] Inserción simulada en ${table}:`, payload);
    return { ok: true, demo: true };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, demo: false, error: "Cliente de Supabase no disponible." };
  }

  const { error } = await supabase.from(table).insert(payload);
  if (error) {
    return { ok: false, demo: false, error: error.message };
  }
  return { ok: true, demo: false };
}
