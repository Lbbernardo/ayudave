// Helpers de administración: borrado de registros.
// Usados solo en el panel /admin (protegido por Basic Auth).

import { getSupabaseClient } from "@/lib/supabase/client";

/** Borra una fila por id de cualquier tabla. */
export async function deleteRow(table: string, id: string): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: "Sin conexión." };
  const { error } = await sb.from(table).delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Borra un reporte y sus dependencias (assignments, case_updates, notifications)
 * para no violar llaves foráneas.
 */
export async function deleteReportCascade(reportId: string): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: "Sin conexión." };
  // Hijos primero.
  await sb.from("case_updates").delete().eq("report_id", reportId);
  await sb.from("notifications").delete().eq("report_id", reportId);
  await sb.from("assignments").delete().eq("report_id", reportId);
  const { error } = await sb.from("reports").delete().eq("id", reportId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
