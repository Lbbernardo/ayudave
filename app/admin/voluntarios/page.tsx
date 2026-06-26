"use client";

// TODO: Proteger esta ruta con Supabase Auth (solo coordinadores).
import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import AlertBanner from "@/components/ui/AlertBanner";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  VOLUNTEER_STATUSES,
  type Volunteer,
  type VolunteerStatus,
} from "@/lib/types";
import { deleteRow } from "@/lib/admin";
import { formatDate } from "@/lib/utils";

export default function AdminVoluntariosPage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!isSupabaseConfigured) {
        if (active) setLoading(false);
        return;
      }
      const supabase = getSupabaseClient();
      const { data } = await supabase!
        .from("volunteers")
        .select("*")
        .order("created_at", { ascending: false });
      if (active) {
        setVolunteers((data as Volunteer[]) || []);
        setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  async function changeStatus(id: string, status: VolunteerStatus) {
    setVolunteers((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status } : v))
    );
    if (!isSupabaseConfigured) return;
    setSavingId(id);
    const supabase = getSupabaseClient();
    await supabase!.from("volunteers").update({ status }).eq("id", id);
    setSavingId(null);
  }

  async function remove(id: string, name: string) {
    if (!confirm(`¿Borrar al voluntario "${name}"?`)) return;
    setSavingId(id);
    const res = await deleteRow("volunteers", id);
    if (!res.ok) alert("No se pudo borrar: " + res.error);
    else setVolunteers((prev) => prev.filter((v) => v.id !== id));
    setSavingId(null);
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Voluntarios"
        subtitle="Equipo registrado, habilidades y disponibilidad."
        icon="🤝"
      />

      {!isSupabaseConfigured && (
        <AlertBanner tone="warning" className="mb-4">
          Supabase no está configurado. No hay voluntarios para mostrar.
        </AlertBanner>
      )}

      {loading ? (
        <LoadingState />
      ) : volunteers.length === 0 ? (
        <EmptyState title="Sin voluntarios registrados" icon="🤝" />
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Teléfono</th>
                  <th className="px-3 py-2">Ciudad</th>
                  <th className="px-3 py-2">Habilidades</th>
                  <th className="px-3 py-2">Vehículo</th>
                  <th className="px-3 py-2">Disponibilidad</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Cambiar</th>
                  <th className="px-3 py-2">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {volunteers.map((v) => (
                  <tr key={v.id} className="hover:bg-surface/50">
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {v.full_name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                      {v.phone || "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {v.city || "—"}
                      {v.state ? `, ${v.state}` : ""}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{v.skills || "—"}</td>
                    <td className="px-3 py-2">
                      {v.has_vehicle ? "✅ Sí" : "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {v.availability || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge value={v.status} />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={v.status}
                        disabled={savingId === v.id}
                        onChange={(e) =>
                          changeStatus(v.id, e.target.value as VolunteerStatus)
                        }
                        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-trust"
                      >
                        {VOLUNTEER_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-emergency hover:bg-emergency/5"
                        disabled={savingId === v.id}
                        onClick={() => remove(v.id, v.full_name)}
                      >
                        🗑
                      </Button>
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
