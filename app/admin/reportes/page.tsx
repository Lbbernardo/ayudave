"use client";

// TODO: Proteger esta ruta con Supabase Auth (solo coordinadores).
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import AlertBanner from "@/components/ui/AlertBanner";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  REPORT_STATUSES,
  URGENCY_OPTIONS,
  type Donation,
  type Report,
  type ReportStatus,
  type Volunteer,
} from "@/lib/types";
import {
  autoAssignReport,
  markReportAttended,
  reassignReport,
  unassignReport,
} from "@/lib/matching";
import { deleteReportCascade } from "@/lib/admin";
import { formatDate } from "@/lib/utils";

type QuickFilter = "todos" | "sin_asignar" | "asignados" | "urgencia_alta";

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "sin_asignar", label: "Sin asignar" },
  { key: "asignados", label: "Asignados" },
  { key: "urgencia_alta", label: "Urgencia alta" },
];

export default function AdminReportesPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [people, setPeople] = useState<Record<string, string>>({});
  // Sin Supabase no hay nada que cargar: arrancamos sin spinner.
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ urgency: "", city: "", status: "" });
  const [quick, setQuick] = useState<QuickFilter>("todos");

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabaseClient();
    const [reportsRes, volsRes, donsRes] = await Promise.all([
      supabase!.from("reports").select("*").order("created_at", { ascending: false }),
      supabase!.from("volunteers").select("id, full_name"),
      supabase!.from("donations").select("id, donor_name"),
    ]);
    const names: Record<string, string> = {};
    for (const v of (volsRes.data as Pick<Volunteer, "id" | "full_name">[]) || [])
      names[v.id] = v.full_name;
    for (const d of (donsRes.data as Pick<Donation, "id" | "donor_name">[]) || [])
      names[d.id] = d.donor_name || "Donante";
    setPeople(names);
    setReports((reportsRes.data as Report[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const cities = useMemo(
    () => Array.from(new Set(reports.map((r) => r.city).filter(Boolean) as string[])).sort(),
    [reports]
  );

  const filtered = reports.filter((r) => {
    if (filters.urgency && r.urgency !== filters.urgency) return false;
    if (filters.city && r.city !== filters.city) return false;
    if (filters.status && r.status !== filters.status) return false;
    if (quick === "sin_asignar" && r.assigned_to_id) return false;
    if (quick === "asignados" && !r.assigned_to_id) return false;
    if (quick === "urgencia_alta" && r.urgency !== "alta") return false;
    return true;
  });

  async function changeStatus(id: string, status: ReportStatus) {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    if (!isSupabaseConfigured) return;
    setSavingId(id);
    const supabase = getSupabaseClient();
    await supabase!.from("reports").update({ status }).eq("id", id);
    setSavingId(null);
  }

  async function runAction(id: string, action: () => Promise<unknown>) {
    if (!isSupabaseConfigured) return;
    setSavingId(id);
    await action();
    await load();
    setSavingId(null);
  }

  async function deleteReport(id: string, name: string) {
    if (!confirm(`¿Borrar el reporte de "${name}"? Esta acción no se puede deshacer.`)) return;
    setSavingId(id);
    const res = await deleteReportCascade(id);
    if (!res.ok) alert("No se pudo borrar: " + res.error);
    await load();
    setSavingId(null);
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Reportes de ayuda"
        subtitle="Gestiona, asigna y prioriza los casos. Aquí sí se muestra el teléfono completo."
        icon="🆘"
      />

      {/* Filtros rápidos */}
      <div className="mb-4 flex flex-wrap gap-2">
        {QUICK_FILTERS.map((q) => (
          <Button
            key={q.key}
            size="sm"
            variant={quick === q.key ? "primary" : "outline"}
            onClick={() => setQuick(q.key)}
          >
            {q.label}
          </Button>
        ))}
      </div>

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select
            label="Urgencia"
            options={URGENCY_OPTIONS}
            placeholder="Todas"
            value={filters.urgency}
            onChange={(e) => setFilters((f) => ({ ...f, urgency: e.target.value }))}
          />
          <Select
            label="Ciudad"
            options={cities}
            placeholder="Todas"
            value={filters.city}
            onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
          />
          <Select
            label="Status"
            options={REPORT_STATUSES}
            placeholder="Todos"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          />
        </div>
      </Card>

      {!isSupabaseConfigured && (
        <AlertBanner tone="warning" className="mb-4">
          Supabase no está configurado. No hay reportes para mostrar.
        </AlertBanner>
      )}

      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Sin reportes"
          description="No hay reportes que coincidan con los filtros."
          icon="🆘"
        />
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Teléfono</th>
                  <th className="px-3 py-2">Ciudad</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Urgencia</th>
                  <th className="px-3 py-2">Asignado a</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">Distancia</th>
                  <th className="px-3 py-2">Asignación</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => {
                  const busy = savingId === r.id;
                  return (
                    <tr key={r.id} className="align-middle hover:bg-surface/50">
                      <td className="whitespace-nowrap px-3 py-2 text-gray-500">
                        {formatDate(r.created_at)}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {r.full_name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                        {r.phone || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{r.city || "—"}</td>
                      <td className="px-3 py-2 text-gray-700">{r.help_type}</td>
                      <td className="px-3 py-2">
                        <StatusBadge value={r.urgency} />
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {r.assigned_to_id ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">
                              {people[r.assigned_to_id] || "Persona"}
                            </span>
                            <span className="text-xs text-gray-500">
                              {r.assigned_to_type === "donor"
                                ? "Donante"
                                : "Voluntario"}
                            </span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {r.match_score != null ? `${r.match_score}/100` : "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                        {r.distance_km != null ? `${r.distance_km} km` : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge value={r.assignment_status || "sin_asignar"} />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={r.status}
                          disabled={busy}
                          onChange={(e) =>
                            changeStatus(r.id, e.target.value as ReportStatus)
                          }
                          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-trust"
                        >
                          {REPORT_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1">
                          {r.assigned_to_id ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => runAction(r.id, () => reassignReport(r.id))}
                            >
                              Reasignar
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={busy}
                              onClick={() => runAction(r.id, () => autoAssignReport(r.id))}
                            >
                              Buscar match
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="safe"
                            disabled={busy || r.status === "atendido"}
                            onClick={() =>
                              runAction(r.id, () => markReportAttended(r.id))
                            }
                          >
                            Atendido
                          </Button>
                          {r.assigned_to_id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy}
                              onClick={() =>
                                runAction(r.id, () => unassignReport(r.id))
                              }
                            >
                              Quitar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-emergency hover:bg-emergency/5"
                            disabled={busy}
                            onClick={() => deleteReport(r.id, r.full_name)}
                          >
                            🗑 Borrar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AdminLayout>
  );
}
