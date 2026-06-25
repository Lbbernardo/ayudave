"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PublicLayout from "@/components/layout/PublicLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import AlertBanner from "@/components/ui/AlertBanner";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { CaseUpdate, Report } from "@/lib/types";
import { formatDate } from "@/lib/utils";

// Mensaje amigable según el estado del match.
const STATUS_MESSAGE: Record<string, string> = {
  sin_asignar: "Estamos buscando a una persona cercana que pueda ayudarte.",
  pendiente_sin_asignar:
    "Todavía no encontramos una persona disponible. Un coordinador revisará tu caso.",
  asignado: "Encontramos a alguien cercano. Esperamos que confirme que puede ayudarte.",
  aceptado: "¡Una persona aceptó ayudarte! Se está coordinando contigo.",
  en_camino: "La persona que te va a ayudar va en camino 🚗.",
  completado: "Tu caso fue atendido. ✅",
  rechazado: "Estamos buscando a otra persona para tu caso.",
};

function firstName(full?: string | null): string {
  if (!full) return "Una persona";
  return full.trim().split(/\s+/)[0];
}

export default function SeguirCasoPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<Report | null>(null);
  const [helperName, setHelperName] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<CaseUpdate[]>([]);

  const load = useCallback(async () => {
    const sb = getSupabaseClient();
    if (!sb || !token) {
      setLoading(false);
      return;
    }
    const { data } = await sb
      .from("reports")
      .select("*")
      .eq("tracking_token", token)
      .single();
    const r = (data as Report) || null;
    setReport(r);

    if (r?.assigned_to_id) {
      const table = r.assigned_to_type === "donor" ? "donations" : "volunteers";
      const col = r.assigned_to_type === "donor" ? "donor_name" : "full_name";
      const { data: h } = await sb.from(table).select(col).eq("id", r.assigned_to_id).single();
      setHelperName((h as Record<string, string | null>)?.[col] ?? null);
    }
    if (r) {
      const { data: cu } = await sb
        .from("case_updates")
        .select("*")
        .eq("report_id", r.id)
        .order("created_at", { ascending: false });
      setTimeline((cu as CaseUpdate[]) || []);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  return (
    <PublicLayout>
      <PageHeader
        title="Seguimiento de tu caso"
        subtitle="Aquí puedes ver cómo avanza tu solicitud de ayuda."
        icon="🔎"
      />

      {!isSupabaseConfigured ? (
        <AlertBanner tone="warning">Configuración no disponible.</AlertBanner>
      ) : loading ? (
        <LoadingState />
      ) : !report ? (
        <EmptyState
          title="No encontramos tu caso"
          description="Verifica que el enlace sea correcto. Es el que te enviamos por correo al reportar."
          icon="🔎"
        />
      ) : (
        <div className="space-y-4">
          <AlertBanner
            tone={
              report.assignment_status === "completado"
                ? "safe"
                : report.assignment_status === "pendiente_sin_asignar"
                ? "warning"
                : "info"
            }
          >
            {STATUS_MESSAGE[report.assignment_status] ?? "Tu caso fue recibido."}
          </AlertBanner>

          <Card className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-lg font-bold text-gray-900">{report.help_type}</span>
              <StatusBadge value={report.assignment_status || "sin_asignar"} />
            </div>
            <p className="text-sm text-gray-600">
              {report.city || "—"}, {report.state || "—"} · Urgencia {report.urgency}
            </p>
            {report.assigned_to_id && (
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Quién te ayuda:</span>{" "}
                {firstName(helperName)} (
                {report.assigned_to_type === "donor" ? "donante" : "voluntario"})
                {report.distance_km != null ? ` · a ~${report.distance_km} km` : ""}
              </p>
            )}
          </Card>

          <Card>
            <h3 className="mb-2 font-semibold text-gray-900">Línea de tiempo</h3>
            {timeline.length === 0 ? (
              <p className="text-sm text-gray-500">Sin eventos todavía.</p>
            ) : (
              <ol className="space-y-2">
                {timeline.map((cu) => (
                  <li key={cu.id} className="flex gap-2 text-sm">
                    <span aria-hidden>•</span>
                    <div>
                      <p className="text-gray-800">{cu.note}</p>
                      <p className="text-xs text-gray-400">{formatDate(cu.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <p className="text-center text-xs text-gray-400">
            Guarda este enlace para volver a consultar tu caso.
          </p>
        </div>
      )}
    </PublicLayout>
  );
}
