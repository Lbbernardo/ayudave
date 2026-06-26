"use client";

import { useCallback, useEffect, useState, FormEvent } from "react";
import { useParams } from "next/navigation";
import PublicLayout from "@/components/layout/PublicLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import FormInput from "@/components/ui/FormInput";
import Button from "@/components/ui/Button";
import AlertBanner from "@/components/ui/AlertBanner";
import StatusBadge from "@/components/ui/StatusBadge";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import EmergencyNotice from "@/components/ui/EmergencyNotice";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { directAssignToReport } from "@/lib/matching";
import type { Report } from "@/lib/types";

interface VolunteerInfo {
  name: string;
  phone: string;
  email: string;
}

export default function AyudarCasoPage() {
  const params = useParams<{ reportId: string }>();
  const reportId = params?.reportId;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [volunteer, setVolunteer] = useState<VolunteerInfo | null>(null);
  const [serverError, setServerError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const sb = getSupabaseClient();
    if (!sb || !reportId) { setLoading(false); return; }
    const { data } = await sb.from("reports").select("*").eq("id", reportId).single();
    setReport((data as Report) || null);
    setLoading(false);
  }, [reportId]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  function validate(data: FormData): Record<string, string> {
    const e: Record<string, string> = {};
    if (!String(data.get("full_name") || "").trim())
      e.full_name = "El nombre es obligatorio.";
    if (!String(data.get("phone") || "").trim())
      e.phone = "El teléfono es obligatorio para coordinar.";
    return e;
  }

  async function handleSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setServerError("");
    const data = new FormData(ev.currentTarget);
    const v = validate(data);
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setSubmitting(true);
    const sb = getSupabaseClient();
    if (!sb || !reportId || !report) {
      setServerError("Sin conexión a la base de datos.");
      setSubmitting(false);
      return;
    }

    const fullName = String(data.get("full_name")).trim();
    const phone = String(data.get("phone")).trim();
    const email = String(data.get("email") || "").trim();

    // 1. Registrar como voluntario.
    const { data: inserted, error: insertErr } = await sb
      .from("volunteers")
      .insert({
        full_name: fullName,
        phone,
        state: report.state ?? null,
        city: report.city ?? null,
        status: "disponible",
        has_vehicle: false,
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      setServerError("No se pudo registrar. Intenta de nuevo.");
      setSubmitting(false);
      return;
    }

    // 2. Asignar directamente al caso.
    const result = await directAssignToReport(reportId, (inserted as { id: string }).id);
    if (!result.ok) {
      setServerError(result.reason ?? "No se pudo asignar el caso.");
      setSubmitting(false);
      return;
    }

    // 3. Enviar emails (mejor esfuerzo).
    const trackingUrl = report.tracking_token
      ? `${window.location.origin}/seguir/${report.tracking_token}`
      : null;

    fetch("/api/notify-assignment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        volunteerName: fullName,
        volunteerEmail: email || undefined,
        reportId,
        helpType: report.help_type,
        requesterName: report.full_name,
        requesterPhone: report.phone,
        requesterAddress: report.address,
        requesterDescription: report.description,
        city: report.city,
        state: report.state,
        requesterEmail: report.email,
        trackingUrl,
      }),
    }).catch(() => {});

    setVolunteer({ name: fullName, phone, email });
    setSubmitting(false);
    setSuccess(true);
  }

  const locked = report
    ? ["aceptado", "en_camino", "completado"].includes(report.assignment_status)
    : false;

  return (
    <PublicLayout>
      <PageHeader
        title="Quiero ayudar"
        subtitle="Viste este caso en el mapa y deseas ayudar. Regístrate y te asignamos."
        icon="🤝"
      />

      {!isSupabaseConfigured ? (
        <AlertBanner tone="warning">Configuración no disponible.</AlertBanner>
      ) : loading ? (
        <LoadingState />
      ) : !report ? (
        <EmptyState
          title="Caso no encontrado"
          description="El enlace puede ser incorrecto o el caso fue eliminado."
          icon="🔎"
        />
      ) : success && volunteer ? (
        <div className="space-y-4">
          <AlertBanner tone="safe">
            ¡Gracias, {volunteer.name}! Quedaste asignado a este caso.
            {volunteer.email && " Te enviamos los detalles por correo."}
          </AlertBanner>

          <Card className="space-y-3">
            <p className="text-base font-bold text-gray-900">
              🌟 Eres una luz en la oscuridad
            </p>
            <p className="text-sm leading-relaxed text-gray-700">
              En medio de la adversidad, personas como tú eligen actuar. Tu
              decisión de hoy puede cambiar la vida de alguien para siempre.
              Comunícate con la persona lo antes posible.
            </p>
          </Card>

          <Card className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">
              📋 Datos de la persona que necesita ayuda
            </p>
            <div className="space-y-2 text-sm">
              <Row label="Tipo de ayuda" value={report.help_type} bold />
              <Row label="Nombre" value={report.full_name} />
              {report.phone && <Row label="Teléfono" value={report.phone} bold />}
              {report.address && <Row label="Dirección" value={report.address} />}
              <Row
                label="Zona"
                value={[report.city, report.state].filter(Boolean).join(", ") || "—"}
              />
              {report.description && (
                <Row label="Descripción" value={report.description} />
              )}
            </div>
          </Card>

          {report.phone && (
            <a
              href={`tel:${report.phone}`}
              className="block w-full rounded-lg bg-green-600 py-3 text-center font-semibold text-white hover:bg-green-700"
            >
              📞 Llamar ahora — {report.phone}
            </a>
          )}

          <a
            href="/mapa"
            className="block w-full rounded-lg border-2 border-trust py-3 text-center font-semibold text-trust hover:bg-trust/5"
          >
            Ver otros casos en el mapa
          </a>
        </div>
      ) : locked ? (
        <div className="space-y-4">
          <AlertBanner tone="warning">
            Este caso ya está siendo atendido por otra persona. ¡Gracias por tu
            disposición!
          </AlertBanner>
          <a
            href="/mapa"
            className="block w-full rounded-lg border-2 border-trust py-3 text-center font-semibold text-trust hover:bg-trust/5"
          >
            Ver otros casos en el mapa
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          <EmergencyNotice compact />

          <Card className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-lg font-bold text-gray-900">
                {report.help_type}
              </span>
              <StatusBadge value={report.urgency} />
            </div>
            <p className="text-sm text-gray-600">
              {report.city || "—"}, {report.state || "—"}
            </p>
            {report.description && (
              <p className="text-sm text-gray-500">{report.description}</p>
            )}
          </Card>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Card className="space-y-4">
              <p className="text-sm font-semibold text-gray-800">
                Tus datos de contacto
              </p>
              <FormInput
                label="Nombre completo"
                name="full_name"
                required
                placeholder="Ej. Carlos Rodríguez"
                error={errors.full_name}
              />
              <FormInput
                label="Teléfono"
                name="phone"
                type="tel"
                required
                placeholder="+58 414 1234567"
                hint="El coordinador te contactará por este número."
                error={errors.phone}
              />
              <FormInput
                label="Correo electrónico"
                name="email"
                type="email"
                placeholder="tucorreo@ejemplo.com"
                hint="Opcional. Te enviamos los datos del caso por correo."
              />
            </Card>

            {serverError && (
              <AlertBanner tone="emergency">{serverError}</AlertBanner>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={submitting}
            >
              {submitting ? "Registrando…" : "Confirmar — quiero ayudar"}
            </Button>
          </form>
        </div>
      )}
    </PublicLayout>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <span className="w-28 shrink-0 text-gray-500">{label}</span>
      <span className={bold ? "font-semibold text-gray-900" : "text-gray-700"}>
        {value}
      </span>
    </div>
  );
}
