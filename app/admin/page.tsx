"use client";

// TODO: Proteger esta ruta con Supabase Auth (solo coordinadores).
import { useEffect, useState } from "react";
import Link from "next/link";
import AdminLayout from "@/components/layout/AdminLayout";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import BarChart, { type BarDatum } from "@/components/ui/BarChart";
import LoadingState from "@/components/ui/LoadingState";
import AlertBanner from "@/components/ui/AlertBanner";
import StatusBadge from "@/components/ui/StatusBadge";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Report } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface DashData {
  reports: Report[];
  volunteers: number;
  donations: { total: number; pendientes: number };
  safe: number;
  missing: number;
  refugios: number;
  centrosExterior: number;
}

const EMPTY: DashData = {
  reports: [],
  volunteers: 0,
  donations: { total: 0, pendientes: 0 },
  safe: 0,
  missing: 0,
  refugios: 0,
  centrosExterior: 0,
};

async function count(table: string, filters?: Record<string, string>): Promise<number> {
  const sb = getSupabaseClient();
  if (!sb) return 0;
  let q = sb.from(table).select("*", { count: "exact", head: true });
  if (filters) for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
  const { count: c } = await q;
  return c || 0;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashData>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!isSupabaseConfigured) { if (active) setLoading(false); return; }
      const sb = getSupabaseClient()!;
      const [reportsRes, volunteers, donTotal, donPend, safe, missing, refugios, centros] =
        await Promise.all([
          sb.from("reports").select("*").order("created_at", { ascending: false }),
          count("volunteers"),
          count("donations"),
          count("donations", { status: "pendiente" }),
          count("safe_reports"),
          count("missing_people", { status: "buscando" }),
          count("refugios"),
          count("centros_exterior"),
        ]);
      if (active) {
        setData({
          reports: (reportsRes.data as Report[]) || [],
          volunteers,
          donations: { total: donTotal, pendientes: donPend },
          safe,
          missing,
          refugios,
          centrosExterior: centros,
        });
        setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const r = data.reports;
  const highUrgency = r.filter((x) => x.urgency === "alta").length;
  const unassigned = r.filter((x) => !x.assigned_to_id).length;
  const completed = r.filter((x) => x.assignment_status === "completado").length;

  // Datos para gráficos
  const byUrgency: BarDatum[] = [
    { label: "Alta", value: r.filter((x) => x.urgency === "alta").length, color: "bg-emergency" },
    { label: "Media", value: r.filter((x) => x.urgency === "media").length, color: "bg-warning" },
    { label: "Baja", value: r.filter((x) => x.urgency === "baja").length, color: "bg-safe" },
  ];

  const byAssignment: BarDatum[] = [
    { label: "Sin asignar", value: r.filter((x) => !x.assigned_to_id).length, color: "bg-gray-400" },
    { label: "Asignado", value: r.filter((x) => x.assignment_status === "asignado").length, color: "bg-trust" },
    { label: "Aceptado", value: r.filter((x) => x.assignment_status === "aceptado").length, color: "bg-blue-500" },
    { label: "En camino", value: r.filter((x) => x.assignment_status === "en_camino").length, color: "bg-indigo-500" },
    { label: "Completado", value: completed, color: "bg-safe" },
  ];

  // Tipos de ayuda (top)
  const helpCounts = new Map<string, number>();
  for (const x of r) helpCounts.set(x.help_type, (helpCounts.get(x.help_type) || 0) + 1);
  const byHelpType: BarDatum[] = [...helpCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value, color: "bg-trust" }));

  // Reportes por día (últimos 7)
  const days: BarDatum[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("es", { weekday: "short", day: "numeric" });
    const value = r.filter((x) => (x.created_at || "").slice(0, 10) === key).length;
    days.push({ label, value, color: "bg-trust-light" });
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">📊 Panel de control</h1>
        <p className="mt-1 text-sm text-gray-600">Resumen general y gestión del portal.</p>
      </div>

      {!isSupabaseConfigured && (
        <AlertBanner tone="warning" className="mb-6">
          Supabase no está configurado. Las estadísticas se muestran en cero.
        </AlertBanner>
      )}

      {loading ? (
        <LoadingState label="Cargando panel…" />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Total reportes" value={r.length} icon="🆘" accent="trust" />
            <StatCard label="Urgencia alta" value={highUrgency} icon="🚨" accent="emergency" />
            <StatCard label="Sin asignar" value={unassigned} icon="⏳" accent="warning"
              hint={unassigned > 0 ? "Requieren atención" : "Todo asignado"} />
            <StatCard label="Completados" value={completed} icon="❤️" accent="safe" />
            <StatCard label="Voluntarios" value={data.volunteers} icon="🤝" accent="trust" />
            <StatCard label="Donaciones" value={data.donations.total} icon="🎁" accent="neutral"
              hint={`${data.donations.pendientes} pendientes`} />
            <StatCard label="Personas buscadas" value={data.missing} icon="🔎" accent="warning" />
            <StatCard label="Reportados a salvo" value={data.safe} icon="✅" accent="safe" />
          </div>

          {/* Gráficos */}
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <h3 className="mb-3 font-bold text-gray-900">Reportes por urgencia</h3>
              <BarChart data={byUrgency} />
            </Card>
            <Card>
              <h3 className="mb-3 font-bold text-gray-900">Estado de asignación</h3>
              <BarChart data={byAssignment} />
            </Card>
            <Card>
              <h3 className="mb-3 font-bold text-gray-900">Tipos de ayuda más pedidos</h3>
              <BarChart data={byHelpType} emptyLabel="Aún no hay reportes" />
            </Card>
            <Card>
              <h3 className="mb-3 font-bold text-gray-900">Reportes últimos 7 días</h3>
              <BarChart data={days} />
            </Card>
          </div>

          {/* Lugares */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-2">
            <StatCard label="Refugios / acopio (VE)" value={data.refugios} icon="🏠" accent="trust" />
            <StatCard label="Centros en el exterior" value={data.centrosExterior} icon="🌎" accent="trust" />
          </div>

          {/* Reportes recientes */}
          <Card padded={false} className="mt-6 overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h3 className="font-bold text-gray-900">Reportes recientes</h3>
              <Link href="/admin/reportes" className="text-sm font-semibold text-trust hover:underline">
                Ver todos →
              </Link>
            </div>
            {r.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">Aún no hay reportes.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-2">Fecha</th>
                      <th className="px-4 py-2">Nombre</th>
                      <th className="px-4 py-2">Tipo</th>
                      <th className="px-4 py-2">Ciudad</th>
                      <th className="px-4 py-2">Urgencia</th>
                      <th className="px-4 py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {r.slice(0, 8).map((x) => (
                      <tr key={x.id} className="hover:bg-surface/50">
                        <td className="whitespace-nowrap px-4 py-2 text-gray-500">{formatDate(x.created_at)}</td>
                        <td className="px-4 py-2 font-medium text-gray-900">{x.full_name}</td>
                        <td className="px-4 py-2 text-gray-700">{x.help_type}</td>
                        <td className="px-4 py-2 text-gray-700">{x.city || "—"}</td>
                        <td className="px-4 py-2"><StatusBadge value={x.urgency} /></td>
                        <td className="px-4 py-2"><StatusBadge value={x.assignment_status || "sin_asignar"} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </AdminLayout>
  );
}
