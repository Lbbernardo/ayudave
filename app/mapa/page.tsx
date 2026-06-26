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
import { HELP_TYPES, URGENCY_OPTIONS, type Report, type MissingPerson, type SafeReport } from "@/lib/types";
import { formatDateShort } from "@/lib/utils";
import type { Refugio } from "@/components/map/ReportsMap";

const ReportsMap = dynamic(() => import("@/components/map/ReportsMap"), {
  ssr: false,
  loading: () => <LoadingState label="Cargando mapa…" />,
});

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
type Tab = "mapa" | "lista";

export default function MapaPage() {
  const [tab, setTab] = useState<Tab>("mapa");
  const [search, setSearch] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [refugios, setRefugios] = useState<Refugio[]>([]);
  const [missingPeople, setMissingPeople] = useState<MissingPerson[]>([]);
  const [safeReports, setSafeReports] = useState<SafeReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ urgency: "", help_type: "", state: "", city: "" });

  useEffect(() => {
    let active = true;
    async function load() {
      if (!isSupabaseConfigured) { if (active) setLoading(false); return; }
      const supabase = getSupabaseClient()!;
      const [rRes, refRes, missingRes, safeRes] = await Promise.all([
        supabase.from("reports").select("*").eq("is_public", true).order("created_at", { ascending: false }),
        supabase.from("refugios").select("*").eq("is_active", true),
        supabase.from("missing_people").select("*").eq("status", "buscando"),
        supabase.from("safe_reports").select("*").order("created_at", { ascending: false }).limit(200),
      ]);
      if (active) {
        setReports((rRes.data as Report[]) || []);
        setRefugios(((refRes.data as Refugio[]) || []).filter((r) => r.latitude != null && r.longitude != null));
        setMissingPeople(((missingRes.data as MissingPerson[]) || []).filter((p) => p.latitude != null && p.longitude != null));
        setSafeReports(((safeRes.data as SafeReport[]) || []).filter((s) => s.latitude != null && s.longitude != null));
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
  const hasMapData = withGeo.length > 0 || refugios.length > 0 || missingPeople.length > 0 || safeReports.length > 0;

  // Lista unificada para el tab "Lista", filtrada por búsqueda de nombre
  const q = search.toLowerCase();
  const listItems = useMemo(() => {
    const items: ListItem[] = [
      ...filtered.map((r): ListItem => ({
        id: r.id, kind: "reporte", icon: r.assignment_status === "completado" ? "❤️" : "🆘",
        name: r.help_type, sub: r.full_name, zone: [r.city, r.state].filter(Boolean).join(", "),
        badge: r.urgency, date: r.created_at, link: r.assignment_status !== "completado" ? `/ayudar/${r.id}` : undefined,
        linkLabel: "Quiero ayudar",
      })),
      ...missingPeople.map((p): ListItem => ({
        id: p.id, kind: "buscado", icon: "🔍",
        name: p.missing_name, sub: `Busca: ${p.contact_name}`,
        zone: [p.city, p.state].filter(Boolean).join(", ") || p.last_known_location || "",
        badge: "buscando", date: p.created_at, photo: p.photo_url,
      })),
      ...safeReports.map((s): ListItem => ({
        id: s.id, kind: "bien", icon: "✅",
        name: s.full_name, sub: s.message || "Está bien",
        zone: [s.city, s.state].filter(Boolean).join(", "),
        badge: "a salvo", date: s.created_at,
      })),
      ...refugios.map((r): ListItem => ({
        id: r.id, kind: "refugio", icon: r.type === "centro_acopio" ? "📦" : "🏠",
        name: r.name, sub: r.type === "centro_acopio" ? "Centro de acopio" : "Refugio",
        zone: [r.city, r.state].filter(Boolean).join(", "),
        badge: r.type, date: "",
      })),
    ];
    if (!q) return items;
    return items.filter((i) =>
      i.name.toLowerCase().includes(q) ||
      (i.sub || "").toLowerCase().includes(q) ||
      (i.zone || "").toLowerCase().includes(q)
    );
  }, [filtered, missingPeople, safeReports, refugios, q]);

  function update(key: keyof typeof filters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  return (
    <PublicLayout>
      <PageHeader
        title="Mapa de ayuda"
        subtitle="Reportes, personas buscadas, refugios y centros de acopio."
        icon="🗺️"
      />

      {/* Filtros */}
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
          {filtered.length} reporte(s) · {missingPeople.length} buscado(s) · {safeReports.length} a salvo · {refugios.length} refugio(s)/centro(s)
        </p>
      </Card>

      <div className="mb-4 flex flex-wrap gap-2">
        <a href="/refugio" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">
          🏠 Registrar refugio o centro de acopio
        </a>
      </div>

      {!isSupabaseConfigured && (
        <AlertBanner tone="info" className="mb-4">Supabase no está configurado: no hay datos que mostrar.</AlertBanner>
      )}

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-xl bg-gray-100 p-1">
        <TabButton active={tab === "mapa"} onClick={() => setTab("mapa")}>🗺️ Mapa</TabButton>
        <TabButton active={tab === "lista"} onClick={() => setTab("lista")}>📋 Lista de registros</TabButton>
      </div>

      {loading ? (
        <LoadingState label="Cargando…" />
      ) : tab === "mapa" ? (
        !MAPBOX_TOKEN ? (
          <AlertBanner tone="warning">Token de Mapbox no configurado.</AlertBanner>
        ) : !hasMapData ? (
          <AlertBanner tone="warning">No hay datos con ubicación para mostrar en el mapa.</AlertBanner>
        ) : (
          <div className="space-y-4">
            <ReportsMap token={MAPBOX_TOKEN} reports={withGeo} refugios={refugios} missingPeople={missingPeople} safeReports={safeReports} />
            <Legend />
          </div>
        )
      ) : (
        /* Tab Lista */
        <div className="space-y-3">
          <input
            type="search"
            placeholder="Buscar por nombre, zona…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust/40"
          />
          {listItems.length === 0 ? (
            <EmptyState title="Sin resultados" description="Prueba con otro término de búsqueda." icon="🔎" />
          ) : (
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white overflow-hidden">
              {listItems.map((item) => (
                <div key={`${item.kind}-${item.id}`} className="flex items-start gap-3 px-4 py-3">
                  {item.photo ? (
                    <img src={item.photo} alt={item.name} className="h-10 w-10 rounded-full object-cover shrink-0 border border-gray-200" />
                  ) : (
                    <span className="text-xl shrink-0 leading-none mt-0.5">{item.icon}</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{item.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeStyle(item.kind)}`}>
                        {item.badge}
                      </span>
                    </div>
                    {item.sub && <p className="text-xs text-gray-500 mt-0.5">{item.sub}</p>}
                    {item.zone && <p className="text-xs text-gray-400">📍 {item.zone}</p>}
                    {item.date && <p className="text-xs text-gray-300 mt-0.5">{formatDateShort(item.date)}</p>}
                  </div>
                  {item.link && (
                    <a href={item.link} className="shrink-0 rounded-lg bg-trust px-3 py-1.5 text-xs font-semibold text-white hover:bg-trust/90">
                      {item.linkLabel}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </PublicLayout>
  );
}

interface ListItem {
  id: string;
  kind: string;
  icon: string;
  name: string;
  sub?: string;
  zone?: string;
  badge: string;
  date: string;
  photo?: string | null;
  link?: string;
  linkLabel?: string;
}

function badgeStyle(kind: string): string {
  if (kind === "reporte") return "bg-red-100 text-red-700";
  if (kind === "buscado") return "bg-purple-100 text-purple-700";
  if (kind === "bien") return "bg-green-100 text-green-700";
  return "bg-orange-100 text-orange-700";
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
        active ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
      <LegendItem icon="🔴" label="Urgencia alta" />
      <LegendItem icon="🟡" label="Urgencia media" />
      <LegendItem icon="🟢" label="Urgencia baja" />
      <LegendItem icon="❤️" label="Persona ayudada" />
      <LegendItem icon="🔍" label="Persona buscada" />
      <LegendItem icon="✅" label="Está bien" />
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

function unique(arr: string[]): string[] {
  return Array.from(new Set(arr)).sort();
}
