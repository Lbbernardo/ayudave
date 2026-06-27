"use client";

import { useCallback, useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PublicLayout from "@/components/layout/PublicLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import AlertBanner from "@/components/ui/AlertBanner";
import StatusBadge from "@/components/ui/StatusBadge";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getCenterSession, clearCenterSession } from "@/lib/centerSession";
import { createCenterNeed, fetchCenterCase } from "@/lib/centers";
import { fetchClaimsForNeed, cancelClaim, completeClaim } from "@/lib/opportunities";
import { NEED_TYPES, URGENCY_OPTIONS, needMeta, type CollectionCenter, type HelpNeed, type HelpClaim } from "@/lib/types";

export default function CentroDashboardPage() {
  const router = useRouter();
  const [center, setCenter] = useState<CollectionCenter | null>(null);
  const [needs, setNeeds] = useState<HelpNeed[]>([]);
  const [claimsByNeed, setClaimsByNeed] = useState<Record<string, HelpClaim[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async (c: CollectionCenter) => {
    const sb = getSupabaseClient();
    if (!sb) { setLoading(false); return; }
    const { helpCase } = await fetchCenterCase(c);
    if (!helpCase) { setNeeds([]); setLoading(false); return; }
    const { data } = await sb.from("help_needs").select("*").eq("case_id", helpCase.id).order("created_at", { ascending: false });
    const list = (data as HelpNeed[]) || [];
    setNeeds(list);
    const map: Record<string, HelpClaim[]> = {};
    for (const n of list) map[n.id] = await fetchClaimsForNeed(n.id);
    setClaimsByNeed(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => {
      const c = getCenterSession();
      if (!c) { router.replace("/centros/login"); return; }
      setCenter(c);
      return load(c);
    });
  }, [load, router]);

  async function addNeed(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (!center) return;
    setNotice("");
    const data = new FormData(ev.currentTarget);
    const need_type = String(data.get("need_type"));
    const title = String(data.get("title") || "").trim() || needMeta(need_type).label;
    setBusy(true);
    const res = await createCenterNeed(center, {
      need_type,
      title,
      description: String(data.get("description") || "").trim() || null,
      quantity_needed: Math.max(1, Number(data.get("quantity_needed")) || 1),
      unit: String(data.get("unit") || "personas"),
      urgency: String(data.get("urgency") || "media"),
    });
    setBusy(false);
    if (res.ok) {
      setNotice("Tu necesidad fue publicada. Los voluntarios compatibles podrán tomar cupos.");
      (ev.target as HTMLFormElement).reset();
      await load(center);
    } else {
      setNotice(res.error || "No se pudo publicar.");
    }
  }

  async function markNeed(needId: string, status: "completada" | "cancelada") {
    const sb = getSupabaseClient();
    if (!sb || !center) return;
    if (status === "cancelada" && !confirm("¿Cancelar esta necesidad?")) return;
    await sb.from("help_needs").update({ status, updated_at: new Date().toISOString() }).eq("id", needId);
    await load(center);
  }

  async function actClaim(claimId: string, action: "completar" | "cancelar") {
    if (!center) return;
    if (action === "completar") await completeClaim(claimId);
    else await cancelClaim(claimId);
    await load(center);
  }

  function logout() { clearCenterSession(); router.push("/centros/login"); }

  if (loading) return <PublicLayout><LoadingState label="Cargando panel…" /></PublicLayout>;
  if (!center) return <PublicLayout><LoadingState /></PublicLayout>;

  return (
    <PublicLayout>
      <div className="mb-4 flex items-start justify-between gap-3">
        <PageHeader title={center.name} subtitle="Panel del centro de acopio: publica necesidades y gestiona cupos." icon="🏢" />
        <button onClick={logout} className="shrink-0 text-sm font-semibold text-gray-500 hover:text-emergency">Salir</button>
      </div>

      {notice && <AlertBanner tone="info" className="mb-4">{notice}</AlertBanner>}

      {/* Crear necesidad */}
      <Card className="mb-6 space-y-3">
        <h2 className="font-bold text-gray-900">Publicar una necesidad</h2>
        <form onSubmit={addNeed} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-800">Tipo</label>
              <select name="need_type" defaultValue="cocinar" className="min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-trust/60">
                {NEED_TYPES.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-800">Título</label>
              <input name="title" placeholder="Ej. Personas para cocinar" className="min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-trust/60" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-800">Cantidad</label>
              <input name="quantity_needed" type="number" min={1} defaultValue={1} className="min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-trust/60" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-800">Unidad</label>
              <select name="unit" defaultValue="personas" className="min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-trust/60">
                <option value="personas">personas</option>
                <option value="litros">litros</option>
                <option value="kg">kg</option>
                <option value="cajas">cajas</option>
                <option value="unidades">unidades</option>
              </select>
            </div>
            <Select label="Urgencia" name="urgency" options={URGENCY_OPTIONS} defaultValue="media" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-800">Detalle (opcional)</label>
            <textarea name="description" rows={2} placeholder="Horario, dónde presentarse, etc." className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-trust/60" />
          </div>
          <Button type="submit" variant="primary" fullWidth disabled={busy}>{busy ? "Publicando…" : "Publicar necesidad"}</Button>
        </form>
      </Card>

      {/* Lista de necesidades */}
      <h2 className="mb-2 font-bold text-gray-900">Tus necesidades</h2>
      {needs.length === 0 ? (
        <EmptyState title="Aún no has publicado necesidades" description="Crea una arriba para que los voluntarios puedan tomar cupos." icon="📋" />
      ) : (
        <div className="space-y-3">
          {needs.map((n) => {
            const meta = needMeta(n.need_type);
            const claims = (claimsByNeed[n.id] || []).filter((c) => c.status !== "cancelado");
            const remaining = Math.max(0, n.quantity_needed - n.quantity_claimed);
            return (
              <Card key={n.id} className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{meta.icon}</span>
                    <div>
                      <p className="font-bold text-gray-900">{n.title}</p>
                      <p className="text-xs text-gray-500">
                        {n.quantity_claimed}/{n.quantity_needed} {n.unit} · faltan {remaining} · completados {n.quantity_completed}
                      </p>
                    </div>
                  </div>
                  <StatusBadge value={n.status} />
                </div>

                {claims.length > 0 && (
                  <div className="space-y-1 rounded-xl bg-surface p-3">
                    <p className="text-xs font-semibold uppercase text-gray-500">Voluntarios ({claims.length})</p>
                    {claims.map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-gray-800">{c.volunteer_name || "Voluntario"} · {c.volunteer_phone || "—"} <StatusBadge value={c.status} /></span>
                        <span className="flex gap-1">
                          {c.status !== "completado" && (
                            <button onClick={() => actClaim(c.id, "completar")} className="rounded-md bg-safe/10 px-2 py-1 text-xs font-semibold text-green-700">✓ Asistió</button>
                          )}
                          <button onClick={() => actClaim(c.id, "cancelar")} className="rounded-md bg-emergency/10 px-2 py-1 text-xs font-semibold text-emergency">Quitar</button>
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {n.status !== "completada" && n.status !== "cancelada" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="safe" onClick={() => markNeed(n.id, "completada")}>Marcar completada</Button>
                    <Button size="sm" variant="outline" onClick={() => markNeed(n.id, "cancelada")}>Cancelar</Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-center text-sm text-gray-400">
        <Link href="/oportunidades" className="underline">Ver cómo se ven tus necesidades en el timeline</Link>
      </p>
    </PublicLayout>
  );
}
