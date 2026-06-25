"use client";

// TODO: Proteger esta ruta con Supabase Auth (solo coordinadores).
import { useEffect, useState } from "react";
import Link from "next/link";
import AdminLayout from "@/components/layout/AdminLayout";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import LoadingState from "@/components/ui/LoadingState";
import AlertBanner from "@/components/ui/AlertBanner";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

interface Stats {
  totalReports: number;
  highUrgency: number;
  safePeople: number;
  missingPeople: number;
  volunteers: number;
  pendingDonations: number;
}

const EMPTY: Stats = {
  totalReports: 0,
  highUrgency: 0,
  safePeople: 0,
  missingPeople: 0,
  volunteers: 0,
  pendingDonations: 0,
};

async function count(table: string, filters?: Record<string, string>) {
  const supabase = getSupabaseClient();
  if (!supabase) return 0;
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  if (filters) {
    for (const [k, v] of Object.entries(filters)) query = query.eq(k, v);
  }
  const { count: c } = await query;
  return c || 0;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!isSupabaseConfigured) {
        if (active) setLoading(false);
        return;
      }
      const [
        totalReports,
        highUrgency,
        safePeople,
        missingPeople,
        volunteers,
        pendingDonations,
      ] = await Promise.all([
        count("reports"),
        count("reports", { urgency: "alta" }),
        count("safe_reports"),
        count("missing_people", { status: "buscando" }),
        count("volunteers"),
        count("donations", { status: "pendiente" }),
      ]);
      if (active) {
        setStats({
          totalReports,
          highUrgency,
          safePeople,
          missingPeople,
          volunteers,
          pendingDonations,
        });
        setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <AdminLayout>
      <PageHeader
        title="Dashboard"
        subtitle="Resumen general de la situación."
        icon="📊"
      />

      {!isSupabaseConfigured && (
        <AlertBanner tone="warning" className="mb-6">
          Supabase no está configurado. Las estadísticas se muestran en cero.
          Configura las variables de entorno para ver datos reales.
        </AlertBanner>
      )}

      {loading ? (
        <LoadingState label="Cargando estadísticas…" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard
              label="Total reportes"
              value={stats.totalReports}
              icon="🆘"
              accent="trust"
            />
            <StatCard
              label="Urgencia alta"
              value={stats.highUrgency}
              icon="🚨"
              accent="emergency"
            />
            <StatCard
              label="Reportados bien"
              value={stats.safePeople}
              icon="✅"
              accent="safe"
            />
            <StatCard
              label="Personas buscadas"
              value={stats.missingPeople}
              icon="🔎"
              accent="warning"
            />
            <StatCard
              label="Voluntarios"
              value={stats.volunteers}
              icon="🤝"
              accent="trust"
            />
            <StatCard
              label="Donaciones pendientes"
              value={stats.pendingDonations}
              icon="🎁"
              accent="warning"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <QuickLink
              href="/admin/reportes"
              title="Gestionar reportes"
              description="Revisa, asigna y actualiza el estado de los casos."
              icon="🆘"
            />
            <QuickLink
              href="/admin/personas"
              title="Personas"
              description="Reportadas bien y personas buscadas."
              icon="👥"
            />
            <QuickLink
              href="/admin/voluntarios"
              title="Voluntarios"
              description="Disponibilidad y asignación del equipo."
              icon="🤝"
            />
          </div>
        </>
      )}
    </AdminLayout>
  );
}

function QuickLink({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition-colors hover:border-trust">
        <div className="text-2xl">{icon}</div>
        <h3 className="mt-2 font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </Card>
    </Link>
  );
}
