"use client";

// TODO: Proteger esta ruta con Supabase Auth (solo coordinadores).
import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import AlertBanner from "@/components/ui/AlertBanner";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { deleteRow } from "@/lib/admin";

interface Refugio {
  id: string; name: string; type: string; address: string | null;
  city: string | null; state: string | null; capacity: number | null;
  contact_name: string | null; contact_phone: string | null; is_active: boolean;
}
interface CentroExterior {
  id: string; name: string; organization: string | null; country: string;
  city: string; phone: string | null; email: string | null;
  schedule: string | null; is_active: boolean;
}

type Tab = "refugios" | "exterior";

export default function AdminLugaresPage() {
  const [tab, setTab] = useState<Tab>("refugios");
  const [refugios, setRefugios] = useState<Refugio[]>([]);
  const [centros, setCentros] = useState<CentroExterior[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    const sb = getSupabaseClient()!;
    const [r, c] = await Promise.all([
      sb.from("refugios").select("*").order("created_at", { ascending: false }),
      sb.from("centros_exterior").select("*").order("country"),
    ]);
    setRefugios((r.data as Refugio[]) || []);
    setCentros((c.data as CentroExterior[]) || []);
    setLoading(false);
  }

  useEffect(() => { void Promise.resolve().then(load); }, []);

  async function toggleActive(table: string, id: string, current: boolean) {
    setBusy(id);
    const sb = getSupabaseClient()!;
    await sb.from(table).update({ is_active: !current }).eq("id", id);
    await load();
    setBusy(null);
  }

  async function remove(table: string, id: string, name: string) {
    if (!confirm(`¿Borrar "${name}"?`)) return;
    setBusy(id);
    const res = await deleteRow(table, id);
    if (!res.ok) alert("No se pudo borrar: " + res.error);
    await load();
    setBusy(null);
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Lugares"
        subtitle="Refugios y centros de acopio (dentro y fuera de Venezuela)."
        icon="🏠"
      />

      <div className="mb-4 flex gap-2">
        <TabButton active={tab === "refugios"} onClick={() => setTab("refugios")}>
          🏠 Refugios / Acopio VE ({refugios.length})
        </TabButton>
        <TabButton active={tab === "exterior"} onClick={() => setTab("exterior")}>
          🌎 Exterior ({centros.length})
        </TabButton>
      </div>

      {!isSupabaseConfigured && (
        <AlertBanner tone="warning" className="mb-4">Supabase no configurado.</AlertBanner>
      )}

      {loading ? (
        <LoadingState />
      ) : tab === "refugios" ? (
        refugios.length === 0 ? (
          <EmptyState title="Sin refugios registrados" icon="🏠" />
        ) : (
          <Card padded={false} className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Zona</th>
                    <th className="px-3 py-2">Capacidad</th>
                    <th className="px-3 py-2">Contacto</th>
                    <th className="px-3 py-2">Activo</th>
                    <th className="px-3 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {refugios.map((r) => (
                    <tr key={r.id} className="hover:bg-surface/50">
                      <td className="px-3 py-2 font-medium text-gray-900">{r.name}</td>
                      <td className="px-3 py-2 text-gray-700">{r.type === "centro_acopio" ? "📦 Acopio" : "🏠 Refugio"}</td>
                      <td className="px-3 py-2 text-gray-700">{[r.city, r.state].filter(Boolean).join(", ") || "—"}</td>
                      <td className="px-3 py-2 text-gray-700">{r.capacity ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-700">{[r.contact_name, r.contact_phone].filter(Boolean).join(" · ") || "—"}</td>
                      <td className="px-3 py-2">{r.is_active ? "✅" : "🚫"}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" disabled={busy === r.id}
                            onClick={() => toggleActive("refugios", r.id, r.is_active)}>
                            {r.is_active ? "Ocultar" : "Activar"}
                          </Button>
                          <Button size="sm" variant="ghost" className="text-emergency hover:bg-emergency/5"
                            disabled={busy === r.id} onClick={() => remove("refugios", r.id, r.name)}>
                            🗑
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : centros.length === 0 ? (
        <EmptyState title="Sin centros en el exterior" icon="🌎" />
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Organización</th>
                  <th className="px-3 py-2">País / Ciudad</th>
                  <th className="px-3 py-2">Contacto</th>
                  <th className="px-3 py-2">Horario</th>
                  <th className="px-3 py-2">Activo</th>
                  <th className="px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {centros.map((c) => (
                  <tr key={c.id} className="hover:bg-surface/50">
                    <td className="px-3 py-2 font-medium text-gray-900">{c.name}</td>
                    <td className="px-3 py-2 text-gray-700">{c.organization || "—"}</td>
                    <td className="px-3 py-2 text-gray-700">{c.country} · {c.city}</td>
                    <td className="px-3 py-2 text-gray-700">{[c.phone, c.email].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="px-3 py-2 text-gray-700">{c.schedule || "—"}</td>
                    <td className="px-3 py-2">{c.is_active ? "✅" : "🚫"}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" disabled={busy === c.id}
                          onClick={() => toggleActive("centros_exterior", c.id, c.is_active)}>
                          {c.is_active ? "Ocultar" : "Activar"}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-emergency hover:bg-emergency/5"
                          disabled={busy === c.id} onClick={() => remove("centros_exterior", c.id, c.name)}>
                          🗑
                        </Button>
                      </div>
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

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={active
        ? "rounded-lg bg-trust px-4 py-2 text-sm font-semibold text-white"
        : "rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-trust"}>
      {children}
    </button>
  );
}
