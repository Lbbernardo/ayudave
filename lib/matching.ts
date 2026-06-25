// Asignación automática de AyudaVE.
//
// Lógica simple y explícita (SIN inteligencia artificial):
//   1. Si hay coordenadas en ambos lados, se usa la distancia (Haversine).
//   2. Si no, se hace fallback por ciudad y luego por estado.
//   3. Se filtran personas inactivas o que ya superaron su máximo de casos.
//   4. Se prioriza la compatibilidad con el tipo de ayuda y la cercanía.
//
// Todo corre del lado del cliente con la misma anon key que usa el resto de
// la app. Si Supabase no está configurado (modo demo), las funciones no
// hacen nada y devuelven un resultado neutro.

import { getSupabaseClient } from "@/lib/supabase/client";
import {
  MAX_ACTIVE_CASES_DONOR,
  MAX_ACTIVE_CASES_VOLUNTEER,
  MEDICAL_SKILLS,
  type AssignedToType,
  type Donation,
  type Report,
  type Volunteer,
} from "@/lib/types";
import {
  notifyAdminUnassignedCase,
  notifyDonorAssignment,
  notifyVolunteerAssignment,
} from "@/lib/notifications";

// Estados de asignación que cuentan como "caso activo" (ocupan un cupo).
const ACTIVE_STATUSES = ["asignado", "aceptado", "en_camino"] as const;

// ---------------------------------------------------------------------
// Timeline (case_updates) y notificaciones in-app (notifications)
// ---------------------------------------------------------------------

/** Agrega un evento al timeline del caso. No falla el flujo si hay error. */
export async function addTimelineEvent(
  reportId: string,
  note: string,
  status: string | null,
  actor: string
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    await supabase
      .from("case_updates")
      .insert({ report_id: reportId, note, status, actor });
  } catch (e) {
    console.error("addTimelineEvent:", e);
  }
}

/** Crea una notificación in-app para la cuenta de un ayudante (si tiene). */
async function notifyHelperInApp(
  userId: string | null,
  type: string,
  title: string,
  body: string,
  reportId: string
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase || !userId) return; // sin cuenta vinculada => no hay a quién notificar
  try {
    await supabase
      .from("notifications")
      .insert({ user_id: userId, type, title, body, report_id: reportId });
  } catch (e) {
    console.error("notifyHelperInApp:", e);
  }
}

/** Busca el user_id (cuenta) vinculado a un voluntario/donante. */
async function getHelperUserId(
  type: MatchCandidate["type"],
  id: string
): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const table = type === "volunteer" ? "volunteers" : "donations";
  const { data } = await supabase.from(table).select("user_id").eq("id", id).single();
  return (data as { user_id: string | null } | null)?.user_id ?? null;
}

// Tipos de ayuda que solo puede atender un voluntario (no un donante).
const VOLUNTEER_ONLY_HELP = new Set(["Médica", "Atrapado", "Transporte"]);

export interface MatchCandidate {
  type: Exclude<AssignedToType, "admin">; // 'volunteer' | 'donor'
  id: string;
  name: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  distanceKm: number | null; // null cuando el match fue por ciudad/estado
  geoRank: number; // 0 = coordenadas, 1 = misma ciudad, 2 = mismo estado
  compatible: boolean; // coincide con el tipo de ayuda (skill / vehículo / donación)
  activeCases: number;
}

export interface AutoAssignResult {
  assigned: boolean;
  demo: boolean;
  candidate?: MatchCandidate;
  reason?: string;
}

// ---------------------------------------------------------------------
// 1. Distancia (Haversine)
// ---------------------------------------------------------------------

/** Distancia en kilómetros entre dos coordenadas usando la fórmula Haversine. */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // radio de la Tierra en km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // un decimal
}

// ---------------------------------------------------------------------
// 2. Conteo de casos activos
// ---------------------------------------------------------------------

/** Cantidad de casos activos (no cerrados) que tiene una persona. */
export async function getActiveAssignmentCount(
  personType: MatchCandidate["type"],
  personId: string
): Promise<number> {
  const supabase = getSupabaseClient();
  if (!supabase) return 0;
  const { count } = await supabase
    .from("assignments")
    .select("*", { count: "exact", head: true })
    .eq("assigned_to_type", personType)
    .eq("assigned_to_id", personId)
    .in("status", ACTIVE_STATUSES as unknown as string[]);
  return count ?? 0;
}

// ---------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------

function sameText(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

const hasCoords = (lat: number | null, lon: number | null): boolean =>
  lat != null && lon != null;

/**
 * Determina si una persona es elegible geográficamente para un reporte y con
 * qué prioridad. Devuelve null si no hay forma de relacionarlos.
 */
function geoMatch(
  report: Pick<Report, "latitude" | "longitude" | "city" | "state">,
  person: { latitude: number | null; longitude: number | null; city: string | null; state: string | null }
): { geoRank: number; distanceKm: number | null } | null {
  if (
    hasCoords(report.latitude, report.longitude) &&
    hasCoords(person.latitude, person.longitude)
  ) {
    return {
      geoRank: 0,
      distanceKm: calculateDistanceKm(
        report.latitude as number,
        report.longitude as number,
        person.latitude as number,
        person.longitude as number
      ),
    };
  }
  if (sameText(report.city, person.city)) return { geoRank: 1, distanceKm: null };
  if (sameText(report.state, person.state)) return { geoRank: 2, distanceKm: null };
  return null;
}

/** Compara dos candidatos: el "menor" es el mejor. */
function compareCandidates(a: MatchCandidate, b: MatchCandidate): number {
  if (a.compatible !== b.compatible) return a.compatible ? -1 : 1;
  if (a.geoRank !== b.geoRank) return a.geoRank - b.geoRank;
  const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
  const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
  if (da !== db) return da - db;
  return a.activeCases - b.activeCases; // a igualdad, quien tenga menos carga
}

/** Mapa "type:id" -> casos activos, calculado de una sola consulta. */
async function getActiveCounts(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const supabase = getSupabaseClient();
  if (!supabase) return counts;
  const { data } = await supabase
    .from("assignments")
    .select("assigned_to_type, assigned_to_id")
    .in("status", ACTIVE_STATUSES as unknown as string[]);
  for (const row of (data as { assigned_to_type: string; assigned_to_id: string }[]) || []) {
    const key = `${row.assigned_to_type}:${row.assigned_to_id}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function volunteerCompatible(helpType: string, v: Volunteer): boolean {
  if (helpType === "Médica") {
    const skills = (v.skills || "").toLowerCase();
    return MEDICAL_SKILLS.some((s) => skills.includes(s.toLowerCase()));
  }
  if (helpType === "Transporte") return Boolean(v.has_vehicle);
  return true; // cualquier voluntario puede ayudar con el resto
}

function donorCompatible(helpType: string, d: Donation): boolean {
  return sameText(helpType, d.donation_type);
}

// ---------------------------------------------------------------------
// 3 y 4. Mejor voluntario / mejor donante para un reporte
// ---------------------------------------------------------------------

/** Devuelve el mejor voluntario disponible para el reporte, o null. */
export async function findBestVolunteerForReport(
  report: Report,
  opts?: { excludeIds?: Set<string>; counts?: Map<string, number> }
): Promise<MatchCandidate | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const excludeIds = opts?.excludeIds ?? new Set<string>();
  const counts = opts?.counts ?? (await getActiveCounts());

  const { data } = await supabase
    .from("volunteers")
    .select("*")
    .neq("status", "inactivo"); // no asignar voluntarios inactivos

  const candidates: MatchCandidate[] = [];
  for (const v of (data as Volunteer[]) || []) {
    if (excludeIds.has(v.id)) continue;
    const active = counts.get(`volunteer:${v.id}`) ?? 0;
    const max = v.max_active_cases ?? MAX_ACTIVE_CASES_VOLUNTEER;
    if (active >= max) continue; // ya tiene demasiados casos
    const geo = geoMatch(report, v);
    if (!geo) continue;
    candidates.push({
      type: "volunteer",
      id: v.id,
      name: v.full_name,
      phone: v.phone,
      city: v.city,
      state: v.state,
      distanceKm: geo.distanceKm,
      geoRank: geo.geoRank,
      compatible: volunteerCompatible(report.help_type, v),
      activeCases: active,
    });
  }

  candidates.sort(compareCandidates);
  return candidates[0] ?? null;
}

/** Devuelve el mejor donante disponible para el reporte, o null. */
export async function findBestDonorForReport(
  report: Report,
  opts?: { excludeIds?: Set<string>; counts?: Map<string, number> }
): Promise<MatchCandidate | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const excludeIds = opts?.excludeIds ?? new Set<string>();
  const counts = opts?.counts ?? (await getActiveCounts());

  const { data } = await supabase
    .from("donations")
    .select("*")
    .neq("status", "inactivo"); // no asignar donantes inactivos

  const candidates: MatchCandidate[] = [];
  for (const d of (data as Donation[]) || []) {
    if (excludeIds.has(d.id)) continue;
    const active = counts.get(`donor:${d.id}`) ?? 0;
    const max = d.max_active_cases ?? MAX_ACTIVE_CASES_DONOR;
    if (active >= max) continue;
    const geo = geoMatch(report, d);
    if (!geo) continue;
    candidates.push({
      type: "donor",
      id: d.id,
      name: d.donor_name,
      phone: d.phone,
      city: d.city,
      state: d.state,
      distanceKm: geo.distanceKm,
      geoRank: geo.geoRank,
      compatible: donorCompatible(report.help_type, d),
      activeCases: active,
    });
  }

  candidates.sort(compareCandidates);
  return candidates[0] ?? null;
}

// ---------------------------------------------------------------------
// 5. Asignación automática completa
// ---------------------------------------------------------------------

/**
 * Busca el mejor candidato para un reporte y lo asigna automáticamente.
 * Si no hay nadie disponible, deja el reporte como pendiente_sin_asignar.
 */
export async function autoAssignReport(reportId: string): Promise<AutoAssignResult> {
  const supabase = getSupabaseClient();
  if (!supabase) return { assigned: false, demo: true };

  // 1. Buscar el reporte.
  const { data: report, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", reportId)
    .single();
  if (error || !report) {
    return { assigned: false, demo: false, reason: "Reporte no encontrado." };
  }
  const r = report as Report;

  // No reasignar a personas que ya tuvieron este caso (incluye rechazos).
  const { data: prior } = await supabase
    .from("assignments")
    .select("assigned_to_id")
    .eq("report_id", reportId);
  const excludeIds = new Set(
    ((prior as { assigned_to_id: string }[]) || []).map((p) => p.assigned_to_id)
  );

  const counts = await getActiveCounts();
  const allowDonors = !VOLUNTEER_ONLY_HELP.has(r.help_type);

  // 2-7. Buscar el mejor de cada tipo y comparar.
  const [bestVolunteer, bestDonor] = await Promise.all([
    findBestVolunteerForReport(r, { excludeIds, counts }),
    allowDonors
      ? findBestDonorForReport(r, { excludeIds, counts })
      : Promise.resolve(null),
  ]);

  const pool = [bestVolunteer, bestDonor].filter(Boolean) as MatchCandidate[];
  pool.sort(compareCandidates);
  const best = pool[0];

  const summary = {
    id: r.id,
    help_type: r.help_type,
    city: r.city,
    state: r.state,
    urgency: r.urgency,
  };

  // 11. Sin candidato -> pendiente.
  if (!best) {
    await supabase
      .from("reports")
      .update({
        assignment_status: "pendiente_sin_asignar",
        status: "pendiente",
        assigned_to_type: null,
        assigned_to_id: null,
        assigned_at: null,
        distance_km: null,
      })
      .eq("id", reportId);
    notifyAdminUnassignedCase(summary);
    return { assigned: false, demo: false };
  }

  // 8-9. Crear la asignación.
  await supabase.from("assignments").insert({
    report_id: reportId,
    assigned_to_type: best.type,
    assigned_to_id: best.id,
    distance_km: best.distanceKm,
    status: "asignado",
  });

  // 10. Actualizar el reporte.
  await supabase
    .from("reports")
    .update({
      assigned_to_type: best.type,
      assigned_to_id: best.id,
      assigned_at: new Date().toISOString(),
      assignment_status: "asignado",
      status: "asignado",
      distance_km: best.distanceKm,
    })
    .eq("id", reportId);

  // Notificar (placeholder externo: console.log para futuro WhatsApp/SMS).
  const contact = { name: best.name, phone: best.phone };
  const reportForNotify = { ...summary, distanceKm: best.distanceKm };
  if (best.type === "volunteer") notifyVolunteerAssignment(contact, reportForNotify);
  else notifyDonorAssignment(contact, reportForNotify);

  // Timeline + notificación in-app (portal).
  const zona = `${r.city ?? "—"}, ${r.state ?? "—"}`;
  const tipoPersona = best.type === "volunteer" ? "voluntario" : "donante";
  await addTimelineEvent(
    reportId,
    `Caso asignado automáticamente a ${best.name ?? "un " + tipoPersona} (${tipoPersona}).`,
    "asignado",
    "sistema"
  );
  const userId = await getHelperUserId(best.type, best.id);
  await notifyHelperInApp(
    userId,
    "assignment",
    "Nuevo caso asignado",
    `Te asignamos un caso de ${r.help_type} en ${zona} (urgencia ${r.urgency}).`,
    reportId
  );

  return { assigned: true, demo: false, candidate: best };
}

// ---------------------------------------------------------------------
// Acciones del panel admin
// ---------------------------------------------------------------------

/** Cierra las asignaciones activas de un reporte con un estado dado. */
async function closeActiveAssignments(
  reportId: string,
  status: "completado" | "rechazado"
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase
    .from("assignments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("report_id", reportId)
    .in("status", ACTIVE_STATUSES as unknown as string[]);
}

/**
 * Reasigna un caso: descarta la asignación activa actual y vuelve a correr
 * la asignación automática (que ya excluye a quien tuvo el caso antes).
 */
export async function reassignReport(reportId: string): Promise<AutoAssignResult> {
  await closeActiveAssignments(reportId, "rechazado");
  return autoAssignReport(reportId);
}

/** Marca un reporte como atendido y completa su asignación activa. */
export async function markReportAttended(reportId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await closeActiveAssignments(reportId, "completado");
  await supabase
    .from("reports")
    .update({ status: "atendido", assignment_status: "completado" })
    .eq("id", reportId);
}

// ---------------------------------------------------------------------
// Acciones del voluntario / donante (vista /mi-ayuda)
// ---------------------------------------------------------------------

const TIMELINE_NOTE: Record<string, string> = {
  aceptado: "El ayudante aceptó el caso.",
  en_camino: "El ayudante va en camino.",
  completado: "El ayudante marcó el caso como completado.",
};

async function setAssignmentAndReport(
  assignmentId: string,
  reportId: string,
  assignmentStatus: "aceptado" | "en_camino" | "completado",
  reportStatus: "en_proceso" | "atendido"
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase
    .from("assignments")
    .update({ status: assignmentStatus, updated_at: new Date().toISOString() })
    .eq("id", assignmentId);
  await supabase
    .from("reports")
    .update({ assignment_status: assignmentStatus, status: reportStatus })
    .eq("id", reportId);
  await addTimelineEvent(
    reportId,
    TIMELINE_NOTE[assignmentStatus] ?? `Estado: ${assignmentStatus}`,
    assignmentStatus,
    "ayudante"
  );
}

/** El voluntario/donante acepta el caso. */
export function acceptAssignment(assignmentId: string, reportId: string) {
  return setAssignmentAndReport(assignmentId, reportId, "aceptado", "en_proceso");
}

/** El voluntario/donante va en camino. */
export function startAssignment(assignmentId: string, reportId: string) {
  return setAssignmentAndReport(assignmentId, reportId, "en_camino", "en_proceso");
}

/** El voluntario/donante completó la ayuda. */
export function completeAssignment(assignmentId: string, reportId: string) {
  return setAssignmentAndReport(assignmentId, reportId, "completado", "atendido");
}

/**
 * El voluntario/donante no puede ayudar: se rechaza su asignación y el
 * sistema intenta reasignar el caso a otra persona automáticamente.
 */
export async function rejectAssignment(
  assignmentId: string,
  reportId: string
): Promise<AutoAssignResult> {
  const supabase = getSupabaseClient();
  if (!supabase) return { assigned: false, demo: true };
  await supabase
    .from("assignments")
    .update({ status: "rechazado", updated_at: new Date().toISOString() })
    .eq("id", assignmentId);
  await addTimelineEvent(
    reportId,
    "El ayudante no pudo tomar el caso; intentando reasignar.",
    "rechazado",
    "ayudante"
  );
  // autoAssignReport excluye a quien ya tuvo el caso (incluido este rechazo).
  return autoAssignReport(reportId);
}

/** Quita la asignación de un reporte y lo deja sin asignar. */
export async function unassignReport(reportId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await closeActiveAssignments(reportId, "rechazado");
  await supabase
    .from("reports")
    .update({
      assigned_to_type: null,
      assigned_to_id: null,
      assigned_at: null,
      assignment_status: "sin_asignar",
      status: "revisado",
      distance_km: null,
    })
    .eq("id", reportId);
}
