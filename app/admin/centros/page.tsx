"use client";

// TODO: Proteger con Supabase Auth (hoy /admin va con Basic Auth vía proxy.ts).
import { useCallback, useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import AlertBanner from "@/components/ui/AlertBanner";
import StatusBadge from "@/components/ui/StatusBadge";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { deleteRow } from "@/lib/admin";
import type { CollectionCenter } from "@/lib/types";

function gen4(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export default function AdminCentrosPage() {
  const [centers, setCenters] = useState<CollectionCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    const sb = getSupabaseClient()!;
    const { data } = await sb.from("collection_centers").select("*").order("created_at", { ascending: false });
    setCenters((data as CollectionCenter[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  async function approve(c: CollectionCenter) {
    setBusy(c.id);
    const sb = getSupabaseClient()!;
    const code = c.access_code || gen4();
    await sb.from("collection_centers").update({ status: "aprobado", access_code: code, updated_at: new Date().toISOString() }).eq("id", c.id);
    await load();
    setBusy(null);
  }
  async function setStatus(c: CollectionCenter, status: string) {
    setBusy(c.id);
    const sb = getSupabaseClient()!;
    await sb.from("collection_centers").update({ status, updated_at: new Date().toISOString() }).eq("id", c.id);
    await load();
    setBusy(null);
  }
  async function regenerate(c: CollectionCenter) {
    setBusy(c.id);
    const sb = getSupabaseClient()!;
    await sb.from("collection_centers").update({ access_code: gen4(), updated_at: new Date().toISOString() }).eq("id", c.id);
    await load();
    setBusy(null);
  }
  async function remove(c: CollectionCenter) {
    if (!confirm(`¿Borrar el centro "${c.name}"?`)) return;
    setBusy(c.id);
    await deleteRow("collection_centers", c.id);
    await load();
    setBusy(null);
  }

  return (
    <AdminLayout>
      <PageHeader title="Centros de acopio" subtitle="Aprueba centros y genera su clave de acceso." icon="🏢" />
      {!isSupabaseConfigured && <AlertBanner tone="warning" className="mb-4">Supabase no configurado.</AlertBanner>}

      {loading ? (
        <LoadingState />
      ) : centers.length === 0 ? (
        <EmptyState title="Sin centros registrados" icon="🏢" />
      ) : (
        <div className="space-y-3">
          {centers.map((c) => (
            <Card key={c.id} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-gray-900">{c.name}</p>
                  <p className="text-sm text-gray-600">{c.city || "—"}, {c.state || "—"} · {c.phone || "sin teléfono"}</p>
                  {c.manager_name && <p className="text-xs text-gray-500">Responsable: {c.manager_name}</p>}
                  {c.schedule && <p className="text-xs text-gray-500">Horario: {c.schedule}</p>}
                </div>
                <StatusBadge value={c.status} />
              </div>

              {c.access_code && (
                <p className="text-sm">
                  Clave de acceso:{" "}
                  <span className="rounded-md bg-trust/10 px-2 py-0.5 font-mono font-bold tracking-widest text-trust">{c.access_code}</span>
                  <span className="ml-2 text-xs text-gray-500">(dásela al centro: entra con teléfono + clave)</span>
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {c.status !== "aprobado" && (
                  <Button size="sm" variant="safe" disabled={busy === c.id} onClick={() => approve(c)}>✓ Aprobar y generar clave</Button>
                )}
                {c.status === "aprobado" && (
                  <Button size="sm" variant="outline" disabled={busy === c.id} onClick={() => regenerate(c)}>Regenerar clave</Button>
                )}
                {c.status !== "rechazado" && (
                  <Button size="sm" variant="outline" disabled={busy === c.id} onClick={() => setStatus(c, "rechazado")}>Rechazar</Button>
                )}
                {c.status === "aprobado" && (
                  <Button size="sm" variant="outline" disabled={busy === c.id} onClick={() => setStatus(c, "pendiente_aprobacion")}>Pausar</Button>
                )}
                <Button size="sm" variant="ghost" className="text-emergency hover:bg-emergency/5" disabled={busy === c.id} onClick={() => remove(c)}>🗑</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
