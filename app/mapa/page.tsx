"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import PublicLayout from "@/components/layout/PublicLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import StatusBadge from "@/components/ui/StatusBadge";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import AlertBanner from "@/components/ui/AlertBanner";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { HELP_TYPES, URGENCY_OPTIONS, type Report } from "@/lib/types";
import { formatDateShort } from "@/lib/utils";
import type { Refugio } from "@/components/map/ReportsMap";

const ReportsMap = dynamic(() => import("@/components/map/ReportsMap"), {
  ssr: false,
  loading: () => <LoadingState label="Cargando mapa…" />,
});

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function MapaPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [refugios, setRefugios] = useState<Refugio[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ urgency: "", help_type: "", state: "", city: "" });

  useEffect(() => {
    let active = true;
    async function load() {
      if (!isSupabaseConfigured) { if (active) setLoading(false); return; }
      const supabase = getSupabaseClient()!;
      const [rRes, refRes] = await Promise.all([
        supabase.from("reports").select("*").eq("is_public", true).order("created_at", { ascending: false }),
        supabase.from("refugios").select("*").eq("is_active", true),
      ]);
      if (active) {
        setReports((rRes.data as Report[]) || []);
        setRefugios(
          ((refRes.data as Refugio[]) || []).filter(
            (r) => r.latitude != null && r.longitude != null
          )
        );
        setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const states = useMemo(() => unique(reports.map((r) => r.state).filter(Boolean) as string[]), [reports]);
  const cities = useMemo(() => unique(reports.map((r) => r.city).filter(Boolean) as string[]), [reports]);

  const filtered = useMemo(() => reports.filter((r) => {
    if (filters.urgency && r.urgency !== filters.urgency) return false;
    if (filters.help_type && r.help_type !== filters.help_type) return false;
    if (filters.state && r.state !== filters.state) return false;
    if (filters.city && r.city !== filters.city) return false;
    return true;
  }), [reports, filters]);

  const withGeo = filtered.filter((r) => r.latitude != null && r.longitude != null);
  const hasMapData = withGeo.length > 0 || refugios.length > 0;

  function update(key: keyof typeof filters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  return (
    <PublicLayout>
      <PageHeader
        title="Mapa de ayuda"
        subtitle="Reportes, refugios y centros de acopio. Los teléfonos no se muestran aquí."
        icon="🗺️"
      />

      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Select label="Urgencia" options={URGENCY_OPTIONS} placeholder="Todas"
            value={filters.urgency} onChange={(e) => update("urgency", e.target.value)} />
          <Select label="Tipo de ayuda" options={HELP_TYPES} placeholder="Todos"
            value={filters.help_type} onChange={(e) => update("help_type", e.target.value)} />
          <Select label="Estado" options={states} placeholder="Todos"
            value={filters.state} onChange={(e) => update("state", e.target.value)} />
          <Select label="Ciudad" options={cities} placeholder="Todas"
            value={filters.city} onChange={(e) => update("city", e.target.value)} />
        </div>
        <p className="mt-3 text-xs text-gray-500">
          {filtered.length} reporte(s) · {refugios.length} refugio(s)/centro(s)
          {withGeo.length !== filtered.length && ` · ${withGeo.length} con ubicación en el mapa`}.
        </p>
      </Card>

      <div className="mb-4 flex flex-wrap gap-2">
        <a
          href="/refugio"
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
        >
          🏠 Registrar refugio o centro de acopio
        </a>
      </div>

      {!isSupabaseConfigured && (
        <AlertBanner tone="info" className="mb-4">
          Supabase no está configurado: no hay datos que mostrar.
        </AlertBanner>
      )}

      {loading ? (
        <LoadingState label="Cargando…" />
      ) : !MAPBOX_TOKEN ? (
        <FallbackList reports={filtered} />
      ) : !hasMapData ? (
        <>
          <AlertBanner tone="warning" className="mb-4">
            No hay reportes ni refugios con ubicación para mostrar con los filtros actuales.
          </AlertBanner>
          <FallbackList reports={filtered} />
        </>
      ) : (
        <div className="space-y-4">
          <ReportsMap token={MAPBOX_TOKEN} reports={withGeo} refugios={refugios} />
          <Legend />
        </div>
      )}
    </PublicLayout>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
      <LegendItem icon="🔴" label="Urgencia alta" />
      <LegendItem icon="🟡" label="Urgencia media" />
      <LegendItem icon="🟢" label="Urgencia baja" />
      <LegendItem icon="❤️" label="Persona ayudada" />
      <LegendItem icon="🏠" label="Refugio" />
      <LegendItem icon="📦" label="Centro de acopio" />
    </div>
  );
}

function LegendItem({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span>{icon}</span>
      {label}
    </span>
  );
}

function FallbackList({ reports }: { reports: Report[] }) {
  if (reports.length === 0) {
    return (
      <EmptyState title="Sin reportes" description="No hay reportes públicos que coincidan." icon="🗺️" />
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {reports.map((r) => (
        <Card key={r.id} className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-gray-900">{r.help_type}</span>
            <StatusBadge value={r.urgency} />
          </div>
          <p className="text-sm text-gray-600">{r.city || "—"}, {r.state || "—"}</p>
          {r.description && <p className="text-sm text-gray-500">{r.description.slice(0, 140)}</p>}
          <p className="text-xs text-gray-400">{formatDateShort(r.created_at)}</p>
        </Card>
      ))}
    </div>
  );
}

function unique(arr: string[]): string[] {
  return Array.from(new Set(arr)).sort();
}
