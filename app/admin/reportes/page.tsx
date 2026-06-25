"use client";

// TODO: Proteger esta ruta con Supabase Auth (solo coordinadores).
import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import StatusBadge from "@/components/ui/StatusBadge";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import AlertBanner from "@/components/ui/AlertBanner";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  REPORT_STATUSES,
  URGENCY_OPTIONS,
  type Report,
  type ReportStatus,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function AdminReportesPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ urgency: "", city: "", status: "" });

  useEffect(() => {
    let active = true;
    async function load() {
      if (!isSupabaseConfigured) {
        if (active) setLoading(false);
        return;
      }
      const supabase = getSupabaseClient();
      const { data } = await supabase!
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (active) {
        setReports((data as Report[]) || []);
        setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const cities = useMemo(
    () => Array.from(new Set(reports.map((r) => r.city).filter(Boolean) as string[])).sort(),
    [reports]
  );

  const filtered = reports.filter((r) => {
    if (filters.urgency && r.urgency !== filters.urgency) return false;
    if (filters.city && r.city !== filters.city) return false;
    if (filters.status && r.status !== filters.status) return false;
    return true;
  });

  async function changeStatus(id: string, status: ReportStatus) {
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
    if (!isSupabaseConfigured) return;
    setSavingId(id);
    const supabase = getSupabaseClient();
    await supabase!.from("reports").update({ status }).eq("id", id);
    setSavingId(null);
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Reportes de ayuda"
        subtitle="Gestiona y prioriza los casos. Aquí sí se muestra el teléfono completo."
        icon="🆘"
      />

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
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Ciudad</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Urgencia</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => (
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
                    <td className="px-3 py-2 text-gray-700">{r.state || "—"}</td>
                    <td className="px-3 py-2 text-gray-700">{r.city || "—"}</td>
                    <td className="px-3 py-2 text-gray-700">{r.help_type}</td>
                    <td className="px-3 py-2">
                      <StatusBadge value={r.urgency} />
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge value={r.status} />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={r.status}
                        disabled={savingId === r.id}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AdminLayout>
  );
}
