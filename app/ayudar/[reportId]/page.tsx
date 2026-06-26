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

export default function AyudarCasoPage() {
  const params = useParams<{ reportId: string }>();
  const reportId = params?.reportId;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const sb = getSupabaseClient();
    if (!sb || !reportId) { setLoading(false); return; }
    const { data } = await sb
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .single();
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
    setError("");
    const data = new FormData(ev.currentTarget);
    const v = validate(data);
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setSubmitting(true);
    const sb = getSupabaseClient();
    if (!sb || !reportId) {
      setError("Sin conexión a la base de datos.");
      setSubmitting(false);
      return;
    }

    // 1. Registrar el voluntario.
    const { data: inserted, error: insertErr } = await sb
      .from("volunteers")
      .insert({
        full_name: String(data.get("full_name")).trim(),
        phone: String(data.get("phone")).trim(),
        state: report?.state ?? null,
        city: report?.city ?? null,
        status: "disponible",
        has_vehicle: false,
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      setError("No se pudo registrar. Intenta de nuevo.");
      setSubmitting(false);
      return;
    }

    // 2. Asignar directamente al caso.
    const result = await directAssignToReport(reportId, (inserted as { id: string }).id);
    if (!result.ok) {
      setError(result.reason ?? "No se pudo asignar el caso.");
      setSubmitting(false);
      return;
    }

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
      ) : success ? (
        <div className="space-y-4">
          <AlertBanner tone="safe">
            ¡Gracias! Quedaste registrado y asignado a este caso. El coordinador
            puede contactarte por el teléfono que indicaste.
          </AlertBanner>
          {report.tracking_token && (
            <AlertBanner tone="info">
              Puedes ver el avance del caso aquí:{" "}
              <a
                href={`/seguir/${report.tracking_token}`}
                className="font-semibold underline"
              >
                ver estado del caso
              </a>
            </AlertBanner>
          )}
          <Card className="space-y-1">
            <p className="text-sm font-semibold text-gray-700">Caso asignado</p>
            <p className="font-bold text-gray-900">{report.help_type}</p>
            <p className="text-sm text-gray-600">
              {report.city || "—"}, {report.state || "—"}
            </p>
          </Card>
        </div>
      ) : locked ? (
        <div className="space-y-4">
          <AlertBanner tone="warning">
            Este caso ya está siendo atendido por otra persona. ¡Gracias por tu
            disposición!
          </AlertBanner>
          <a href="/mapa" className="block w-full rounded-lg border-2 border-trust py-3 text-center font-semibold text-trust hover:bg-trust/5">
            Ver otros casos en el mapa
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          <EmergencyNotice compact />

          {/* Resumen del caso */}
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

          {/* Mini formulario */}
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
            </Card>

            {error && <AlertBanner tone="emergency">{error}</AlertBanner>}

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
