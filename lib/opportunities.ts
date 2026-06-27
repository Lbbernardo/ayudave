// Lógica del sistema de oportunidades (help_needs / help_claims).
// Reglas explícitas, sin IA, sin colas, sin cron. Read-modify-write simple.

import { getSupabaseClient } from "@/lib/supabase/client";
import type { HelpCase, HelpNeed, HelpClaim, CollectionCenter, Volunteer } from "@/lib/types";
import {
  notifyVolunteerClaimCreated,
  notifyCenterClaimCreated,
  notifyNeedFilled,
  notifyVolunteerCancelled,
} from "@/lib/notifications";

export interface Opportunity {
  need: HelpNeed;
  helpCase: HelpCase | null;
  center: CollectionCenter | null;
}

export interface ClaimResult {
  ok: boolean;
  error?: string;
}

type Ok<T> = { ok: true; value: T };
type Err = { ok: false; error: string };

// ── Lectura ────────────────────────────────────────────────────────────────

/** Oportunidades abiertas (necesidades con cupos), con su caso y centro. */
export async function fetchOpenOpportunities(): Promise<Opportunity[]> {
  const sb = getSupabaseClient();
  if (!sb) return [];
  const { data } = await sb
    .from("help_needs")
    .select("*, help_cases(*, collection_centers(*))")
    .in("status", ["abierta", "llena"])
    .order("created_at", { ascending: false });

  type Row = HelpNeed & {
    help_cases: (HelpCase & { collection_centers: CollectionCenter | null }) | null;
  };
  return ((data as Row[]) || []).map((row) => {
    const { help_cases, ...need } = row;
    const center = help_cases?.collection_centers ?? null;
    const helpCase = help_cases ? ({ ...help_cases, collection_centers: undefined } as HelpCase) : null;
    return { need: need as HelpNeed, helpCase, center };
  });
}

/** Voluntario por teléfono (tolerante a formatos). Devuelve el primero que coincida. */
export async function fetchVolunteerByPhone(phone: string): Promise<Volunteer | null> {
  const sb = getSupabaseClient();
  if (!sb || !phone.trim()) return null;
  const { data } = await sb.from("volunteers").select("*");
  const digits = (s?: string | null) => (s || "").replace(/\D/g, "");
  const target = digits(phone);
  const match = ((data as Volunteer[]) || []).find((v) => {
    const d = digits(v.phone);
    return d && (d === target || d.endsWith(target) || target.endsWith(d));
  });
  return match ?? null;
}

/** Cupos tomados por un teléfono, con la necesidad y el caso/centro. */
export async function fetchClaimsByPhone(phone: string): Promise<
  { claim: HelpClaim; opportunity: Opportunity | null }[]
> {
  const sb = getSupabaseClient();
  if (!sb || !phone.trim()) return [];
  const digits = (phone.match(/\d/g) || []).join("");
  // Traemos todos los claims y filtramos por dígitos (tolerante).
  const { data } = await sb
    .from("help_claims")
    .select("*")
    .order("claimed_at", { ascending: false });
  const claims = ((data as HelpClaim[]) || []).filter((c) => {
    const d = (c.volunteer_phone || "").replace(/\D/g, "");
    return d && (d === digits || d.endsWith(digits) || digits.endsWith(d));
  });
  if (claims.length === 0) return [];

  const needIds = Array.from(new Set(claims.map((c) => c.need_id)));
  const { data: needData } = await sb
    .from("help_needs")
    .select("*, help_cases(*, collection_centers(*))")
    .in("id", needIds);
  type Row = HelpNeed & {
    help_cases: (HelpCase & { collection_centers: CollectionCenter | null }) | null;
  };
  const oppByNeed = new Map<string, Opportunity>();
  for (const row of (needData as Row[]) || []) {
    const { help_cases, ...need } = row;
    oppByNeed.set(row.id, {
      need: need as HelpNeed,
      helpCase: help_cases ? ({ ...help_cases, collection_centers: undefined } as HelpCase) : null,
      center: help_cases?.collection_centers ?? null,
    });
  }
  return claims.map((claim) => ({ claim, opportunity: oppByNeed.get(claim.need_id) ?? null }));
}

// ── Crear casos con varias necesidades ───────────────────────────────────────

export interface NeedInput {
  need_type: string;
  title: string;
  description?: string | null;
  quantity_needed: number;
  unit?: string;
  urgency?: string;
}

export interface CaseInput {
  case_type?: "individual" | "group" | "center";
  center_id?: string | null;
  requester_name?: string | null;
  requester_phone?: string | null;
  state?: string | null;
  city?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
  urgency?: string;
}

/** Crea un caso y todas sus necesidades. Devuelve el id del caso. */
export async function createCaseWithNeeds(
  caseInput: CaseInput,
  needs: NeedInput[]
): Promise<{ ok: boolean; caseId?: string; error?: string }> {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: "Sin conexión." };
  if (needs.length === 0) return { ok: false, error: "Agrega al menos una necesidad." };

  const { data: created, error } = await sb
    .from("help_cases")
    .insert({
      case_type: caseInput.case_type ?? "individual",
      center_id: caseInput.center_id ?? null,
      requester_name: caseInput.requester_name ?? null,
      requester_phone: caseInput.requester_phone ?? null,
      state: caseInput.state ?? null,
      city: caseInput.city ?? null,
      address: caseInput.address ?? null,
      latitude: caseInput.latitude ?? null,
      longitude: caseInput.longitude ?? null,
      description: caseInput.description ?? null,
      urgency: caseInput.urgency ?? "media",
    })
    .select("id")
    .single();
  if (error || !created) return { ok: false, error: error?.message || "No se pudo crear el caso." };

  const caseId = (created as { id: string }).id;
  const rows = needs.map((nd) => ({
    case_id: caseId,
    need_type: nd.need_type,
    title: nd.title,
    description: nd.description ?? null,
    quantity_needed: Math.max(1, nd.quantity_needed),
    unit: nd.unit ?? "personas",
    urgency: nd.urgency ?? caseInput.urgency ?? "media",
  }));
  const { error: needErr } = await sb.from("help_needs").insert(rows);
  if (needErr) return { ok: false, caseId, error: "El caso se creó pero falló alguna necesidad." };
  return { ok: true, caseId };
}

// ── Tomar / cancelar / avanzar cupos ─────────────────────────────────────────

/** Un voluntario toma un cupo de una necesidad. */
export async function claimNeed(
  needId: string,
  volunteer: { id?: string | null; name?: string | null; phone: string }
): Promise<ClaimResult> {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: "Sin conexión." };
  if (!volunteer.phone.trim()) return { ok: false, error: "Necesitas un teléfono para tomar el cupo." };

  // 1. Leer la necesidad actual.
  const { data: need, error } = await sb.from("help_needs").select("*").eq("id", needId).single();
  if (error || !need) return { ok: false, error: "Esta oportunidad ya no existe." };
  const n = need as HelpNeed;

  if (n.status === "cancelada" || n.status === "completada")
    return { ok: false, error: "Esta oportunidad ya no está disponible." };
  if (n.quantity_claimed >= n.quantity_needed)
    return { ok: false, error: "Ya no quedan cupos disponibles." };

  // 2. Evitar doble reserva del mismo teléfono.
  const phoneDigits = volunteer.phone.replace(/\D/g, "");
  const { data: existing } = await sb
    .from("help_claims")
    .select("id, volunteer_phone, status")
    .eq("need_id", needId)
    .not("status", "in", "(cancelado,no_asistio)");
  const already = ((existing as { volunteer_phone: string | null }[]) || []).some(
    (c) => (c.volunteer_phone || "").replace(/\D/g, "") === phoneDigits
  );
  if (already) return { ok: false, error: "Ya tomaste un cupo en esta oportunidad." };

  // 3. Crear el claim.
  const { error: insErr } = await sb.from("help_claims").insert({
    need_id: needId,
    volunteer_id: volunteer.id ?? null,
    volunteer_name: volunteer.name ?? null,
    volunteer_phone: volunteer.phone.trim(),
    status: "reservado",
  });
  if (insErr) {
    // Índice único: carrera de doble reserva.
    return { ok: false, error: "No se pudo tomar el cupo (¿ya lo tomaste?)." };
  }

  // 4. Subir el contador y marcar llena si corresponde.
  const newClaimed = n.quantity_claimed + 1;
  const full = newClaimed >= n.quantity_needed;
  await sb
    .from("help_needs")
    .update({
      quantity_claimed: newClaimed,
      status: full ? "llena" : "abierta",
      updated_at: new Date().toISOString(),
    })
    .eq("id", needId);

  notifyVolunteerClaimCreated({ volunteerName: volunteer.name, needTitle: n.title });
  notifyCenterClaimCreated({
    needTitle: n.title,
    remaining: Math.max(0, n.quantity_needed - newClaimed),
    volunteerName: volunteer.name,
  });
  if (full) notifyNeedFilled({ needTitle: n.title });

  return { ok: true };
}

async function setClaimStatus(claimId: string, status: HelpClaim["status"]): Promise<Ok<HelpClaim> | Err> {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: "Sin conexión." };
  const { data, error } = await sb
    .from("help_claims")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", claimId)
    .select("*")
    .single();
  if (error || !data) return { ok: false, error: "No se pudo actualizar." };
  return { ok: true, value: data as HelpClaim };
}

export async function confirmClaim(claimId: string): Promise<ClaimResult> {
  const r = await setClaimStatus(claimId, "confirmado");
  return r.ok ? { ok: true } : r;
}

export async function startClaim(claimId: string): Promise<ClaimResult> {
  const r = await setClaimStatus(claimId, "en_camino");
  return r.ok ? { ok: true } : r;
}

/** Completa un cupo: sube quantity_completed y cierra la necesidad si se cumplió. */
export async function completeClaim(claimId: string): Promise<ClaimResult> {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: "Sin conexión." };
  const r = await setClaimStatus(claimId, "completado");
  if (!r.ok) return r;
  const claim = r.value;
  const { data: need } = await sb.from("help_needs").select("*").eq("id", claim.need_id).single();
  if (need) {
    const n = need as HelpNeed;
    const newCompleted = n.quantity_completed + 1;
    const done = newCompleted >= n.quantity_needed;
    await sb
      .from("help_needs")
      .update({
        quantity_completed: newCompleted,
        status: done ? "completada" : n.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", n.id);
  }
  return { ok: true };
}

/** Cancela un cupo: lo libera y baja quantity_claimed. */
export async function cancelClaim(claimId: string): Promise<ClaimResult> {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: "Sin conexión." };
  const { data: claim } = await sb.from("help_claims").select("*").eq("id", claimId).single();
  if (!claim) return { ok: false, error: "Cupo no encontrado." };
  const c = claim as HelpClaim;
  if (c.status === "cancelado") return { ok: true };

  await sb
    .from("help_claims")
    .update({ status: "cancelado", updated_at: new Date().toISOString() })
    .eq("id", claimId);

  // Bajar el contador de la necesidad y reabrir si estaba llena.
  const { data: need } = await sb.from("help_needs").select("*").eq("id", c.need_id).single();
  if (need) {
    const n = need as HelpNeed;
    const newClaimed = Math.max(0, n.quantity_claimed - 1);
    const reopen = n.status === "llena" && newClaimed < n.quantity_needed;
    await sb
      .from("help_needs")
      .update({
        quantity_claimed: newClaimed,
        status: reopen ? "abierta" : n.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", n.id);
    notifyVolunteerCancelled({ needTitle: n.title, volunteerName: c.volunteer_name });
  }
  return { ok: true };
}

/** Cupos (claims) de una necesidad — para el panel del centro/admin. */
export async function fetchClaimsForNeed(needId: string): Promise<HelpClaim[]> {
  const sb = getSupabaseClient();
  if (!sb) return [];
  const { data } = await sb
    .from("help_claims")
    .select("*")
    .eq("need_id", needId)
    .order("claimed_at", { ascending: false });
  return (data as HelpClaim[]) || [];
}
