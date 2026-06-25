"use client";

// TODO: Proteger esta ruta con Supabase Auth (solo coordinadores).
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminLayout from "@/components/layout/AdminLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import StatCard from "@/components/ui/StatCard";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import AlertBanner from "@/components/ui/AlertBanner";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { autoAssignReport } from "@/lib/matching";
import type { Assignment, Donation, Report, Volunteer } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const ACTIVE = ["asignado", "aceptado", "en_camino"];

interface PersonLoad {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  activeCases: number;
}

export default function AdminAsignacionesPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  // Sin Supabase no hay nada que cargar: arrancamos sin spinner.
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabaseClient();
    const [rRes, vRes, dRes, aRes] = await Promise.all([
      supabase!.from("reports").select("*").order("created_at", { ascending: false }),
      supabase!.from("volunteers").select("*"),
      supabase!.from("donations").select("*"),
      supabase!.from("assignments").select("*"),
    ]);
    setReports((rRes.data as Report[]) || []);
    setVolunteers((vRes.data as Volunteer[]) || []);
    setDonations((dRes.data as Donation[]) || []);
    setAssignments((aRes.data as Assignment[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  // Conteo de casos activos por persona.
  const activeByPerson = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assignments) {
      if (!ACTIVE.includes(a.status)) continue;
      const key = `${a.assigned_to_type}:${a.assigned_to_id}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [assignments]);

  const assignedCases = useMemo(
    () => reports.filter((r) => r.assigned_to_id && ACTIVE.includes(r.assignment_status)),
    [reports]
  );

  const unassignedCases = useMemo(
    () =>
      reports.filter(
        (r) =>
          !r.assigned_to_id &&
          !["atendido", "falso", "duplicado"].includes(r.status)
      ),
    [reports]
  );

  const pendingToRetry = useMemo(
    () => reports.filter((r) => r.assignment_status === "pendiente_sin_asignar"),
    [reports]
  );

  const volunteersWithCases: PersonLoad[] = useMemo(
    () =>
      volunteers
        .map((v) => ({
          id: v.id,
          name: v.full_name,
          city: v.city,
          state: v.state,
          activeCases: activeByPerson.get(`volunteer:${v.id}`) ?? 0,
        }))
        .filter((p) => p.activeCases > 0)
        .sort((a, b) => b.activeCases - a.activeCases),
    [volunteers, activeByPerson]
  );

  const donorsWithCases: PersonLoad[] = useMemo(
    () =>
      donations
        .map((d) => ({
          id: d.id,
          name: d.donor_name || "Donante",
          city: d.city,
          state: d.state,
          activeCases: activeByPerson.get(`donor:${d.id}`) ?? 0,
        }))
        .filter((p) => p.activeCases > 0)
        .sort((a, b) => b.activeCases - a.activeCases),
    [donations, activeByPerson]
  );

  const peopleNames = useMemo(() => {
    const names: Record<string, string> = {};
    for (const v of volunteers) names[v.id] = v.full_name;
    for (const d of donations) names[d.id] = d.donor_name || "Donante";
    return names;
  }, [volunteers, donations]);

  async function retryPending() {
    if (!isSupabaseConfigured || pendingToRetry.length === 0) return;
    setRunning(true);
    setMessage("");
    let assignedNow = 0;
    for (const r of pendingToRetry) {
      const res = await autoAssignReport(r.id);
      if (res.assigned) assignedNow += 1;
    }
    await load();
    setRunning(false);
    setMessage(
      `Reasignación ejecutada sobre ${pendingToRetry.length} caso(s) pendiente(s): ${assignedNow} asignado(s).`
    );
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Asignaciones"
        subtitle="Quién está atendiendo cada caso y qué casos siguen sin asignar."
        icon="🔗"
      />

      {!isSupabaseConfigured && (
        <AlertBanner tone="warning" className="mb-4">
          Supabase no está configurado. No hay asignaciones para mostrar.
        </AlertBanner>
      )}

      {loading ? (
        <LoadingState />
      ) : (
        <div className="space-y-6">
          {/* Resumen */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Casos asignados" value={assignedCases.length} icon="✅" accent="trust" />
            <StatCard label="Sin asignar" value={unassignedCases.length} icon="⏳" accent="warning" />
            <StatCard label="Voluntarios activos" value={volunteersWithCases.length} icon="🤝" accent="trust" />
            <StatCard label="Donantes activos" value={donorsWithCases.length} icon="🎁" accent="safe" />
          </div>

          {/* Reasignación automática de pendientes */}
          <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">
                Casos pendientes sin asignar: {pendingToRetry.length}
              </h3>
              <p className="text-sm text-gray-600">
                Vuelve a intentar la asignación automática (útil tras registrar
                nuevos voluntarios o donantes).
              </p>
            </div>
            <Button
              variant="primary"
              disabled={running || pendingToRetry.length === 0}
              onClick={retryPending}
            >
              {running ? "Ejecutando…" : "Reintentar asignación"}
            </Button>
          </Card>
          {message && <AlertBanner tone="info">{message}</AlertBanner>}

          {/* Casos sin asignar */}
          <section>
            <h2 className="mb-2 text-lg font-bold text-gray-900">Casos sin asignar</h2>
            {unassignedCases.length === 0 ? (
              <EmptyState title="Todo asignado 🎉" description="No hay casos pendientes." icon="✅" />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {unassignedCases.map((r) => (
                  <Card key={r.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-gray-900">{r.help_type}</span>
                      <StatusBadge value={r.urgency} />
                    </div>
                    <p className="text-sm text-gray-600">
                      {r.city || "—"}, {r.state || "—"}
                    </p>
                    <StatusBadge value={r.assignment_status || "sin_asignar"} />
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Casos asignados */}
          <section>
            <h2 className="mb-2 text-lg font-bold text-gray-900">Casos asignados</h2>
            {assignedCases.length === 0 ? (
              <EmptyState title="Sin casos asignados todavía" icon="🔗" />
            ) : (
              <Card padded={false} className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-3 py-2">Fecha</th>
                        <th className="px-3 py-2">Tipo</th>
                        <th className="px-3 py-2">Zona</th>
                        <th className="px-3 py-2">Asignado a</th>
                        <th className="px-3 py-2">Distancia</th>
                        <th className="px-3 py-2">Asignación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {assignedCases.map((r) => (
                        <tr key={r.id} className="hover:bg-surface/50">
                          <td className="whitespace-nowrap px-3 py-2 text-gray-500">
                            {formatDate(r.assigned_at || r.created_at)}
                          </td>
                          <td className="px-3 py-2 text-gray-700">{r.help_type}</td>
                          <td className="px-3 py-2 text-gray-700">
                            {r.city || "—"}, {r.state || "—"}
                          </td>
                          <td className="px-3 py-2">
                            <span className="font-medium text-gray-900">
                              {(r.assigned_to_id && peopleNames[r.assigned_to_id]) || "Persona"}
                            </span>{" "}
                            <span className="text-xs text-gray-500">
                              ({r.assigned_to_type === "donor" ? "Donante" : "Voluntario"})
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                            {r.distance_km != null ? `${r.distance_km} km` : "—"}
                          </td>
                          <td className="px-3 py-2">
                            <StatusBadge value={r.assignment_status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </section>

          {/* Carga por persona */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PersonLoadList title="Voluntarios con casos activos" icon="🤝" people={volunteersWithCases} />
            <PersonLoadList title="Donantes con casos activos" icon="🎁" people={donorsWithCases} />
          </div>

          <p className="text-sm text-gray-500">
            ¿Necesitas reasignar manualmente o marcar como atendido?{" "}
            <Link href="/admin/reportes" className="font-semibold text-trust underline">
              Ir a Reportes
            </Link>
            .
          </p>
        </div>
      )}
    </AdminLayout>
  );
}

function PersonLoadList({
  title,
  icon,
  people,
}: {
  title: string;
  icon: string;
  people: PersonLoad[];
}) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-bold text-gray-900">{title}</h2>
      {people.length === 0 ? (
        <EmptyState title="Nadie con casos activos" icon={icon} />
      ) : (
        <Card padded={false} className="divide-y divide-gray-100">
          {people.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium text-gray-900">{p.name}</p>
                <p className="text-xs text-gray-500">
                  {p.city || "—"}, {p.state || "—"}
                </p>
              </div>
              <span className="rounded-full bg-trust/10 px-3 py-1 text-sm font-semibold text-trust">
                {p.activeCases} caso(s)
              </span>
            </div>
          ))}
        </Card>
      )}
    </section>
  );
}
