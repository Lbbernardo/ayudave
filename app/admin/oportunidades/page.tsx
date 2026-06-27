"use client";

// TODO: Proteger con Supabase Auth. Combina necesidades + oportunidades + claims.
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
import { fetchClaimsForNeed, cancelClaim, completeClaim } from "@/lib/opportunities";
import { needMeta, type HelpNeed, type HelpCase, type CollectionCenter, type HelpClaim } from "@/lib/types";

type Filter = "abiertas" | "todas" | "llenas" | "completadas";

interface Row {
  need: HelpNeed;
  helpCase: (HelpCase & { collection_centers?: CollectionCenter | null }) | null;
  claims: HelpClaim[];
}

export default function AdminOportunidadesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("abiertas");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    const sb = getSupabaseClient()!;
    const { data } = await sb
      .from("help_needs")
      .select("*, help_cases(*, collection_centers(*))")
      .order("created_at", { ascending: false });
    type Q = HelpNeed & { help_cases: (HelpCase & { collection_centers: CollectionCenter | null }) | null };
    const list = (data as Q[]) || [];
    const withClaims: Row[] = [];
    for (const r of list) {
      const { help_cases, ...need } = r;
      withClaims.push({ need: need as HelpNeed, helpCase: help_cases, claims: await fetchClaimsForNeed(r.id) });
    }
    setRows(withClaims);
    setLoading(false);
  }, []);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  async function needAction(needId: string, status: string) {
    setBusy(needId);
    const sb = getSupabaseClient()!;
    await sb.from("help_needs").update({ status, updated_at: new Date().toISOString() }).eq("id", needId);
    await load();
    setBusy(null);
  }
  async function claimAction(claimId: string, action: "completar" | "cancelar") {
    setBusy(claimId);
    if (action === "completar") await completeClaim(claimId);
    else await cancelClaim(claimId);
    await load();
    setBusy(null);
  }

  const visible = rows.filter((r) => {
    if (filter === "todas") return true;
    if (filter === "abiertas") return r.need.status === "abierta";
    if (filter === "llenas") return r.need.status === "llena";
    if (filter === "completadas") return r.need.status === "completada";
    return true;
  });

  return (
    <AdminLayout>
      <PageHeader title="Oportunidades y cupos" subtitle="Necesidades publicadas, voluntarios asignados y su estado." icon="✨" />

      <div className="mb-4 flex flex-wrap gap-2">
        {(["abiertas", "llenas", "completadas", "todas"] as Filter[]).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "primary" : "outline"} onClick={() => setFilter(f)}>
            {f}
          </Button>
        ))}
      </div>

      {!isSupabaseConfigured && <AlertBanner tone="warning" className="mb-4">Supabase no configurado.</AlertBanner>}

      {loading ? (
        <LoadingState />
      ) : visible.length === 0 ? (
        <EmptyState title="Sin necesidades" description="No hay necesidades con ese filtro." icon="✨" />
      ) : (
        <div className="space-y-3">
          {visible.map(({ need, helpCase, claims }) => {
            const meta = needMeta(need.need_type);
            const who = helpCase?.collection_centers?.name || helpCase?.requester_name || "Caso";
            const activeClaims = claims.filter((c) => c.status !== "cancelado");
            return (
              <Card key={need.id} className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{meta.icon}</span>
                    <div>
                      <p className="font-bold text-gray-900">{need.title}</p>
                      <p className="text-xs text-gray-500">
                        {who} · {helpCase?.city || "—"}, {helpCase?.state || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge value={need.urgency} />
                    <StatusBadge value={need.status} />
                  </div>
                </div>

                <p className="text-sm text-gray-600">
                  Cupos: <strong>{need.quantity_claimed}/{need.quantity_needed}</strong> {need.unit} ·
                  completados: <strong>{need.quantity_completed}</strong> · faltan{" "}
                  <strong>{Math.max(0, need.quantity_needed - need.quantity_claimed)}</strong>
                </p>

                {activeClaims.length > 0 && (
                  <div className="space-y-1 rounded-xl bg-surface p-3">
                    {activeClaims.map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-gray-800">{c.volunteer_name || "Voluntario"} · {c.volunteer_phone || "—"} <StatusBadge value={c.status} /></span>
                        <span className="flex gap-1">
                          {c.status !== "completado" && (
                            <button disabled={busy === c.id} onClick={() => claimAction(c.id, "completar")} className="rounded-md bg-safe/10 px-2 py-1 text-xs font-semibold text-green-700">✓ Completar</button>
                          )}
                          <button disabled={busy === c.id} onClick={() => claimAction(c.id, "cancelar")} className="rounded-md bg-emergency/10 px-2 py-1 text-xs font-semibold text-emergency">Cancelar</button>
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {need.status !== "completada" && need.status !== "cancelada" && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="safe" disabled={busy === need.id} onClick={() => needAction(need.id, "completada")}>Cerrar (completada)</Button>
                    <Button size="sm" variant="outline" disabled={busy === need.id} onClick={() => needAction(need.id, "cancelada")}>Cancelar necesidad</Button>
                    {need.status === "llena" && (
                      <Button size="sm" variant="outline" disabled={busy === need.id} onClick={() => needAction(need.id, "abierta")}>Reabrir</Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
