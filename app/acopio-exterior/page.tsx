"use client";

import { useEffect, useMemo, useState } from "react";
import PublicLayout from "@/components/layout/PublicLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import AlertBanner from "@/components/ui/AlertBanner";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

interface CentroExterior {
  id: string;
  name: string;
  organization: string | null;
  country: string;
  city: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  schedule: string | null;
  notes: string | null;
  created_at: string;
}

export default function AcopioExteriorPage() {
  const [centros, setCentros] = useState<CentroExterior[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCountry, setFilterCountry] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!isSupabaseConfigured) { if (active) setLoading(false); return; }
      const sb = getSupabaseClient()!;
      const { data } = await sb
        .from("centros_exterior")
        .select("*")
        .eq("is_active", true)
        .order("country")
        .order("city");
      if (active) {
        setCentros((data as CentroExterior[]) || []);
        setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const countries = useMemo(
    () => Array.from(new Set(centros.map((c) => c.country))).sort(),
    [centros]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return centros.filter((c) => {
      if (filterCountry && c.country !== filterCountry) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.organization || "").toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        (c.notes || "").toLowerCase().includes(q)
      );
    });
  }, [centros, search, filterCountry]);

  // Agrupar por país
  const byCountry = useMemo(() => {
    const map = new Map<string, CentroExterior[]>();
    for (const c of filtered) {
      const list = map.get(c.country) ?? [];
      list.push(c);
      map.set(c.country, list);
    }
    return map;
  }, [filtered]);

  return (
    <PublicLayout>
      <PageHeader
        title="Centros de acopio fuera de Venezuela"
        subtitle="Encuentra un centro cerca de ti para recibir o enviar ayuda a Venezuela."
        icon="🌎"
      />

      <div className="mb-4 flex justify-end">
        <a
          href="/acopio-exterior/registrar"
          className="rounded-lg bg-trust px-4 py-2 text-sm font-semibold text-white hover:bg-trust/90"
        >
          + Registrar mi centro
        </a>
      </div>

      {!isSupabaseConfigured && (
        <AlertBanner tone="info" className="mb-4">
          Supabase no configurado: no hay datos que mostrar.
        </AlertBanner>
      )}

      {/* Búsqueda y filtro */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          placeholder="Buscar por nombre, ciudad, organización…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust/40"
        />
        <select
          value={filterCountry}
          onChange={(e) => setFilterCountry(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust/40"
        >
          <option value="">Todos los países</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingState label="Cargando centros…" />
      ) : centros.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            title="Aún no hay centros registrados"
            description="Sé el primero en registrar un centro de acopio fuera de Venezuela."
            icon="📦"
          />
          <a
            href="/acopio-exterior/registrar"
            className="block w-full rounded-lg bg-trust py-3 text-center font-semibold text-white hover:bg-trust/90"
          >
            Registrar mi centro
          </a>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Sin resultados"
          description="Prueba con otro término o país."
          icon="🔎"
        />
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-gray-500">{filtered.length} centro(s) encontrado(s)</p>
          {Array.from(byCountry.entries()).map(([country, list]) => (
            <div key={country}>
              <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-gray-800">
                <span>🌎</span> {country}
                <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-500">
                  {list.length}
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {list.map((c) => (
                  <CentroCard key={c.id} centro={c} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </PublicLayout>
  );
}

function CentroCard({ centro: c }: { centro: CentroExterior }) {
  return (
    <Card className="space-y-2">
      <div>
        <p className="font-bold text-gray-900">{c.name}</p>
        {c.organization && (
          <p className="text-xs text-trust font-medium">{c.organization}</p>
        )}
        <p className="text-sm text-gray-500">
          📍 {c.city}, {c.country}
        </p>
        {c.address && (
          <p className="text-xs text-gray-400">{c.address}</p>
        )}
      </div>

      {c.schedule && (
        <p className="text-xs text-gray-600">
          🕐 {c.schedule}
        </p>
      )}

      {c.notes && (
        <p className="text-xs text-gray-500 border-t border-gray-100 pt-2">
          {c.notes}
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {c.phone && (
          <a
            href={`tel:${c.phone}`}
            className="flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 hover:bg-green-100"
          >
            📞 {c.phone}
          </a>
        )}
        {c.email && (
          <a
            href={`mailto:${c.email}`}
            className="flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
          >
            ✉️ {c.email}
          </a>
        )}
        {c.website && (
          <a
            href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-md bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
          >
            🔗 Ver página
          </a>
        )}
      </div>
    </Card>
  );
}
