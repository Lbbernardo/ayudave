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

// El mapa solo se carga en el cliente (mapbox-gl usa window).
const ReportsMap = dynamic(() => import("@/components/map/ReportsMap"), {
  ssr: false,
  loading: () => <LoadingState label="Cargando mapa…" />,
});

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function MapaPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    urgency: "",
    help_type: "",
    state: "",
    city: "",
  });

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
        .eq("is_public", true)
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

  const states = useMemo(
    () => unique(reports.map((r) => r.state).filter(Boolean) as string[]),
    [reports]
  );
  const cities = useMemo(
    () => unique(reports.map((r) => r.city).filter(Boolean) as string[]),
    [reports]
  );

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (filters.urgency && r.urgency !== filters.urgency) return false;
      if (filters.help_type && r.help_type !== filters.help_type) return false;
      if (filters.state && r.state !== filters.state) return false;
      if (filters.city && r.city !== filters.city) return false;
      return true;
    });
  }, [reports, filters]);

  const withGeo = filtered.filter(
    (r) => r.latitude != null && r.longitude != null
  );

  function update(key: keyof typeof filters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  return (
    <PublicLayout>
      <PageHeader
        title="Mapa de ayuda"
        subtitle="Reportes públicos por zona. Los teléfonos no se muestran aquí."
        icon="🗺️"
      />

      {/* Filtros */}
      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Select
            label="Urgencia"
            options={URGENCY_OPTIONS}
            placeholder="Todas"
            value={filters.urgency}
            onChange={(e) => update("urgency", e.target.value)}
          />
          <Select
            label="Tipo de ayuda"
            options={HELP_TYPES}
            placeholder="Todos"
            value={filters.help_type}
            onChange={(e) => update("help_type", e.target.value)}
          />
          <Select
            label="Estado"
            options={states}
            placeholder="Todos"
            value={filters.state}
            onChange={(e) => update("state", e.target.value)}
          />
          <Select
            label="Ciudad"
            options={cities}
            placeholder="Todas"
            value={filters.city}
            onChange={(e) => update("city", e.target.value)}
          />
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Mostrando {filtered.length} reporte(s)
          {withGeo.length !== filtered.length &&
            ` · ${withGeo.length} con ubicación en el mapa`}
          .
        </p>
      </Card>

      {!isSupabaseConfigured && (
        <AlertBanner tone="info" className="mb-4">
          Supabase no está configurado: no hay reportes que mostrar. Configura las
          variables de entorno para ver datos reales.
        </AlertBanner>
      )}

      {loading ? (
        <LoadingState label="Cargando reportes…" />
      ) : !MAPBOX_TOKEN ? (
        <FallbackList reports={filtered} />
      ) : withGeo.length === 0 ? (
        <>
          <AlertBanner tone="warning" className="mb-4">
            No hay reportes con ubicación para mostrar en el mapa con los filtros
            actuales. Abajo puedes ver la lista completa.
          </AlertBanner>
          <FallbackList reports={filtered} />
        </>
      ) : (
        <div className="space-y-4">
          <ReportsMap token={MAPBOX_TOKEN} reports={withGeo} />
          <Legend />
        </div>
      )}
    </PublicLayout>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
      <LegendItem color="#dc2626" label="Urgencia alta" />
      <LegendItem color="#facc15" label="Urgencia media" />
      <LegendItem color="#16a34a" label="Urgencia baja" />
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className="inline-block h-3 w-3 rounded-full border border-white shadow"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

function FallbackList({ reports }: { reports: Report[] }) {
  if (reports.length === 0) {
    return (
      <EmptyState
        title="Sin reportes"
        description="No hay reportes públicos que coincidan con los filtros."
        icon="🗺️"
      />
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
          <p className="text-sm text-gray-600">
            {r.city || "—"}, {r.state || "—"}
          </p>
          {r.description && (
            <p className="text-sm text-gray-500">
              {r.description.slice(0, 140)}
            </p>
          )}
          <p className="text-xs text-gray-400">
            {formatDateShort(r.created_at)}
          </p>
        </Card>
      ))}
    </div>
  );
}

function unique(arr: string[]): string[] {
  return Array.from(new Set(arr)).sort();
}
