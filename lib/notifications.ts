// Notificaciones de AyudaVE.
//
// Por ahora estas funciones solo hacen console.log. Dejan el punto de
// integración listo para conectar un proveedor real (Twilio, GoHighLevel,
// WhatsApp Cloud API, etc.) sin tocar el resto de la app.
//
// TODO: integrar proveedor de mensajería real.
//   - Twilio SMS / WhatsApp
//   - GoHighLevel
//   - WhatsApp Cloud API
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
}

/** Avisa a un voluntario que se le asignó un caso. */
export function notifyVolunteerAssignment(
  volunteer: PersonContact,
  report: ReportSummary
): void {
  // TODO: enviar mensaje real (Twilio / WhatsApp).
  console.log("[notify] Voluntario asignado", {
    to: volunteer.phone,
    name: volunteer.name,
    report: report.id,
    help_type: report.help_type,
    zona: `${report.city ?? "—"}, ${report.state ?? "—"}`,
    distancia_km: report.distanceKm ?? null,
  });
}

/** Avisa a un donante que se le asignó un caso. */
export function notifyDonorAssignment(
  donor: PersonContact,
  report: ReportSummary
): void {
  // TODO: enviar mensaje real (Twilio / WhatsApp).
  console.log("[notify] Donante asignado", {
    to: donor.phone,
    name: donor.name,
    report: report.id,
    help_type: report.help_type,
    zona: `${report.city ?? "—"}, ${report.state ?? "—"}`,
    distancia_km: report.distanceKm ?? null,
  });
}

/** Avisa a los coordinadores que un caso quedó sin asignar. */
export function notifyAdminUnassignedCase(report: ReportSummary): void {
  // TODO: enviar alerta real al canal de coordinadores.
  console.log("[notify] Caso SIN ASIGNAR — revisar en el panel", {
    report: report.id,
    help_type: report.help_type,
    zona: `${report.city ?? "—"}, ${report.state ?? "—"}`,
    urgencia: report.urgency,
  });
}
