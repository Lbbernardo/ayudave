// Lógica de centros de acopio: registro, login (teléfono + clave) y
// publicación de necesidades. La aprobación la hace el admin.

import { getSupabaseClient } from "@/lib/supabase/client";
import type { CollectionCenter, HelpCase } from "@/lib/types";
import type { NeedInput } from "@/lib/opportunities";

export interface CenterRegisterInput {
  name: string;
  manager_name?: string | null;
  phone: string;
  email?: string | null;
  state?: string | null;
  city?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  schedule?: string | null;
  description?: string | null;
}

/** Registra un centro como pendiente_aprobacion. */
export async function registerCenter(
  input: CenterRegisterInput
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: "Sin conexión." };
  const { error } = await sb.from("collection_centers").insert({
    name: input.name,
    manager_name: input.manager_name ?? null,
    phone: input.phone,
    email: input.email ?? null,
    state: input.state ?? null,
    city: input.city ?? null,
    address: input.address ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    schedule: input.schedule ?? null,
    description: input.description ?? null,
    status: "pendiente_aprobacion",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type CenterLoginResult =
  | { ok: true; center: CollectionCenter }
  | { ok: false; reason: "credenciales" | "pendiente" | "conexion" };

/** Login del centro: teléfono + clave. Solo entra si está aprobado. */
export async function loginCenter(phone: string, code: string): Promise<CenterLoginResult> {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, reason: "conexion" };
  const digits = (s?: string | null) => (s || "").replace(/\D/g, "");
  const target = digits(phone);
  const { data } = await sb.from("collection_centers").select("*");
  const list = (data as CollectionCenter[]) || [];

  // Coincide teléfono + clave.
  const byCreds = list.filter(
    (c) =>
      digits(c.phone) &&
      (digits(c.phone) === target || digits(c.phone).endsWith(target) || target.endsWith(digits(c.phone))) &&
      String(c.access_code ?? "").trim() === code.trim() &&
      code.trim() !== ""
  );
  if (byCreds.length === 0) return { ok: false, reason: "credenciales" };
  const approved = byCreds.find((c) => c.status === "aprobado");
  if (!approved) return { ok: false, reason: "pendiente" };
  return { ok: true, center: approved };
}

/** Encuentra (o crea) el caso del centro para colgar sus necesidades. */
async function ensureCenterCase(center: CollectionCenter): Promise<string | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;
  const { data: existing } = await sb
    .from("help_cases")
    .select("id")
    .eq("center_id", center.id)
    .eq("status", "abierto")
    .limit(1);
  const found = (existing as { id: string }[]) || [];
  if (found.length > 0) return found[0].id;

  const { data: created } = await sb
    .from("help_cases")
    .insert({
      case_type: "center",
      center_id: center.id,
      requester_name: center.name,
      requester_phone: center.phone,
      state: center.state,
      city: center.city,
      address: center.address,
      latitude: center.latitude,
      longitude: center.longitude,
      description: center.description,
    })
    .select("id")
    .single();
  return (created as { id: string } | null)?.id ?? null;
}

/** El centro publica una necesidad (cupo de voluntarios o insumos). */
export async function createCenterNeed(
  center: CollectionCenter,
  need: NeedInput
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: "Sin conexión." };
  const caseId = await ensureCenterCase(center);
  if (!caseId) return { ok: false, error: "No se pudo preparar el caso del centro." };
  const { error } = await sb.from("help_needs").insert({
    case_id: caseId,
    need_type: need.need_type,
    title: need.title,
    description: need.description ?? null,
    quantity_needed: Math.max(1, need.quantity_needed),
    unit: need.unit ?? "personas",
    urgency: need.urgency ?? "media",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Necesidades del centro (de su caso abierto). */
export async function fetchCenterCase(center: CollectionCenter): Promise<{
  helpCase: HelpCase | null;
}> {
  const sb = getSupabaseClient();
  if (!sb) return { helpCase: null };
  const { data } = await sb
    .from("help_cases")
    .select("*")
    .eq("center_id", center.id)
    .eq("status", "abierto")
    .limit(1);
  const found = (data as HelpCase[]) || [];
  return { helpCase: found[0] ?? null };
}
