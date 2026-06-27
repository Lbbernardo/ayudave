// Notificaciones de AyudaVE.
//
// Por ahora estas funciones solo hacen console.log. Dejan el punto de
// integración listo para conectar un proveedor real sin tocar el resto.
//
// TODO: integrar proveedor(es) real(es):
//   - Twilio (SMS / WhatsApp)
//   - GoHighLevel
//   - WhatsApp Cloud API
//   - Email (Resend, etc.)
// Cuando se integre, hacer estas funciones asíncronas y enviar el mensaje
// real; el código que las llama ya las trata como "dispara y olvida".

export interface PersonContact {
  name: string | null;
  phone: string | null;
}

export interface ReportSummary {
  id: string;
  help_type: string;
  city: string | null;
  state: string | null;
  urgency: string;
  distanceKm?: number | null;
  score?: number;
}

// ---------------------------------------------------------------------
// Eventos de matching
// ---------------------------------------------------------------------

/** Se creó un match: avisar al ayudante (voluntario/donante). */
export function notifyHelperNewMatch(
  helper: PersonContact,
  match: ReportSummary
): void {
  // TODO: enviar mensaje real (WhatsApp/SMS/Email).
  console.log("[notify] Nuevo match para ayudante", {
    to: helper.phone,
    name: helper.name,
    need: match.help_type,
    zona: `${match.city ?? "—"}, ${match.state ?? "—"}`,
    distancia_km: match.distanceKm ?? null,
    score: match.score ?? null,
  });
}

/** Se encontró un ayudante: avisar a quien pidió ayuda. */
export function notifyRequesterMatchFound(
  report: ReportSummary,
  helperName: string | null
): void {
  // TODO: enviar mensaje real a quien reportó.
  console.log("[notify] Match encontrado para el solicitante", {
    report: report.id,
    need: report.help_type,
    ayudante: helperName ?? "—",
  });
}

/** No se encontró ayudante: avisar a los coordinadores. */
export function notifyAdminNoMatchFound(report: ReportSummary): void {
  // TODO: alerta real al canal de coordinadores.
  console.log("[notify] SIN MATCH — revisar en el panel", {
    report: report.id,
    need: report.help_type,
    zona: `${report.city ?? "—"}, ${report.state ?? "—"}`,
    urgencia: report.urgency,
  });
}

/** El ayudante aceptó el match. */
export function notifyMatchAccepted(reportId: string): void {
  // TODO: avisar al solicitante / coordinador.
  console.log("[notify] Match ACEPTADO", { report: reportId });
}

/** El match se completó. */
export function notifyMatchCompleted(reportId: string): void {
  // TODO: avisar al solicitante / coordinador y cerrar el caso.
  console.log("[notify] Match COMPLETADO", { report: reportId });
}

// ---------------------------------------------------------------------
// Eventos de oportunidades (help_needs / help_claims)
// TODO: integrar WhatsApp / Twilio / GoHighLevel / Email.
// ---------------------------------------------------------------------

/** Un voluntario tomó un cupo de una necesidad. */
export function notifyVolunteerClaimCreated(info: {
  volunteerName?: string | null;
  needTitle: string;
  city?: string | null;
}): void {
  console.log("[notify] Voluntario tomó un cupo", info);
}

/** Avisar al centro/solicitante que alguien tomó un cupo de su necesidad. */
export function notifyCenterClaimCreated(info: {
  needTitle: string;
  remaining: number;
  volunteerName?: string | null;
}): void {
  console.log("[notify] Cupo tomado en una necesidad", info);
}

/** Una necesidad se llenó (ya no faltan cupos). */
export function notifyNeedFilled(info: { needTitle: string; city?: string | null }): void {
  console.log("[notify] Necesidad LLENA", info);
}

/** Un voluntario canceló su cupo (se liberó). */
export function notifyVolunteerCancelled(info: {
  needTitle: string;
  volunteerName?: string | null;
}): void {
  console.log("[notify] Cupo liberado por cancelación", info);
}

// ---------------------------------------------------------------------
// Alias antiguos (compatibilidad). No usar en código nuevo.
// ---------------------------------------------------------------------
export const notifyVolunteerAssignment = (
  helper: PersonContact,
  report: ReportSummary
) => notifyHelperNewMatch(helper, report);
export const notifyDonorAssignment = (
  helper: PersonContact,
  report: ReportSummary
) => notifyHelperNewMatch(helper, report);
export const notifyAdminUnassignedCase = (report: ReportSummary) =>
  notifyAdminNoMatchFound(report);
