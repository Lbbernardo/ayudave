"use client";

// TODO: Proteger esta ruta con Supabase Auth (solo coordinadores).
// Nota: por ahora no se permite borrar registros.
import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import AlertBanner from "@/components/ui/AlertBanner";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { SafeReport, MissingPerson } from "@/lib/types";
import { deleteRow } from "@/lib/admin";
import { formatDate } from "@/lib/utils";

type Tab = "safe" | "missing";

export default function AdminPersonasPage() {
  const [tab, setTab] = useState<Tab>("safe");
  const [safe, setSafe] = useState<SafeReport[]>([]);
  const [missing, setMissing] = useState<MissingPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ city: "", state: "" });

  useEffect(() => {
    let active = true;
    async function load() {
      if (!isSupabaseConfigured) {
        if (active) setLoading(false);
        return;
      }
      const supabase = getSupabaseClient();
      const [s, m] = await Promise.all([
        supabase!
          .from("safe_reports")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase!
          .from("missing_people")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);
      if (active) {
        setSafe((s.data as SafeReport[]) || []);
        setMissing((m.data as MissingPerson[]) || []);
        setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  async function removeSafe(id: string, name: string) {
    if (!confirm(`¿Borrar el registro de "${name}"?`)) return;
    const res = await deleteRow("safe_reports", id);
    if (!res.ok) alert("No se pudo borrar: " + res.error);
    else setSafe((prev) => prev.filter((p) => p.id !== id));
  }

  async function removeMissing(id: string, name: string) {
    if (!confirm(`¿Borrar la búsqueda de "${name}"?`)) return;
    const res = await deleteRow("missing_people", id);
    if (!res.ok) alert("No se pudo borrar: " + res.error);
    else setMissing((prev) => prev.filter((p) => p.id !== id));
  }

  const cities = useMemo(() => {
    const src =
      tab === "safe"
        ? safe.map((r) => r.city)
        : missing.map((r) => extractCity(r.last_known_location));
    return Array.from(new Set(src.filter(Boolean) as string[])).sort();
  }, [tab, safe, missing]);

  const states = useMemo(
    () => Array.from(new Set(safe.map((r) => r.state).filter(Boolean) as string[])).sort(),
    [safe]
  );

  const filteredSafe = safe.filter((r) => {
    if (filters.city && r.city !== filters.city) return false;
    if (filters.state && r.state !== filters.state) return false;
    return true;
  });

  const filteredMissing = missing.filter((r) => {
    if (filters.city && !(r.last_known_location || "").includes(filters.city))
      return false;
    return true;
  });

  return (
    <AdminLayout>
      <PageHeader
        title="Personas"
        subtitle="Personas reportadas como a salvo y personas buscadas."
        icon="👥"
      />

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        <TabButton active={tab === "safe"} onClick={() => setTab("safe")}>
          ✅ Reportados bien ({safe.length})
        </TabButton>
        <TabButton active={tab === "missing"} onClick={() => setTab("missing")}>
          🔎 Buscadas ({missing.length})
        </TabButton>
      </div>

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="Ciudad"
            options={cities}
            placeholder="Todas"
            value={filters.city}
            onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
          />
          {tab === "safe" && (
            <Select
              label="Estado"
              options={states}
              placeholder="Todos"
              value={filters.state}
              onChange={(e) =>
                setFilters((f) => ({ ...f, state: e.target.value }))
              }
            />
          )}
        </div>
      </Card>

      {!isSupabaseConfigured && (
        <AlertBanner tone="warning" className="mb-4">
          Supabase no está configurado. No hay registros para mostrar.
        </AlertBanner>
      )}

      {loading ? (
        <LoadingState />
      ) : tab === "safe" ? (
        filteredSafe.length === 0 ? (
          <EmptyState title="Sin personas reportadas bien" icon="✅" />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filteredSafe.map((p) => (
              <Card key={p.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">
                    {p.full_name}
                  </span>
                  <StatusBadge value="encontrado" />
                </div>
                <p className="text-sm text-gray-600">
                  {p.city || "—"}, {p.state || "—"}
                </p>
                {p.message && (
                  <p className="text-sm text-gray-500">{p.message}</p>
                )}
                <p className="text-xs text-gray-400">{p.phone || "Sin teléfono"}</p>
                <p className="text-xs text-gray-400">{formatDate(p.created_at)}</p>
                <div className="pt-1">
                  <Button size="sm" variant="ghost" className="text-emergency hover:bg-emergency/5"
                    onClick={() => removeSafe(p.id, p.full_name)}>
                    🗑 Borrar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : filteredMissing.length === 0 ? (
        <EmptyState title="Sin personas buscadas" icon="🔎" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filteredMissing.map((p) => (
            <Card key={p.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">
                  {p.missing_name}
                </span>
                <StatusBadge value={p.status} />
              </div>
              <p className="text-sm text-gray-600">
                Última ubicación: {p.last_known_location || "—"}
              </p>
              {p.description && (
                <p className="text-sm text-gray-500">{p.description}</p>
              )}
              <p className="text-xs text-gray-500">
                Contacto: {p.contact_name} · {p.contact_phone || "Sin teléfono"}
              </p>
              <p className="text-xs text-gray-400">{formatDate(p.created_at)}</p>
              <div className="pt-1">
                <Button size="sm" variant="ghost" className="text-emergency hover:bg-emergency/5"
                  onClick={() => removeMissing(p.id, p.missing_name)}>
                  🗑 Borrar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? "rounded-lg bg-trust px-4 py-2 text-sm font-semibold text-white"
          : "rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-trust"
      }
    >
      {children}
    </button>
  );
}

function extractCity(location: string | null): string | null {
  if (!location) return null;
  return location.split(",")[0]?.trim() || null;
}
