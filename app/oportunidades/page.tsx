"use client";

// Timeline de oportunidades de ayuda. Cada necesidad abierta es una tarjeta.
// El voluntario entra con su teléfono (para ver compatibles y tomar cupos).
import { useCallback, useEffect, useMemo, useState } from "react";
import PublicLayout from "@/components/layout/PublicLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import FormInput from "@/components/ui/FormInput";
import Select from "@/components/ui/Select";
import StatusBadge from "@/components/ui/StatusBadge";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import AlertBanner from "@/components/ui/AlertBanner";
import LocationButton from "@/components/forms/LocationButton";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  fetchOpenOpportunities,
  fetchVolunteerByPhone,
  fetchClaimsByPhone,
  claimNeed,
  type Opportunity,
} from "@/lib/opportunities";
import { calculateDistanceKm } from "@/lib/matching";
import { URGENCY_OPTIONS, NEED_TYPES, needMeta, type Volunteer } from "@/lib/types";

const URGENCY_RANK: Record<string, number> = { alta: 0, media: 1, baja: 2 };

export default function OportunidadesPage() {
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [identifiedPhone, setIdentifiedPhone] = useState("");
  const [claimedNeedIds, setClaimedNeedIds] = useState<Set<string>>(new Set());
  const [coords, setCoords] = useState<{ latitude: number | null; longitude: number | null }>({ latitude: null, longitude: null });
  const [busyNeed, setBusyNeed] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [filters, setFilters] = useState({ city: "", state: "", need_type: "", urgency: "" });
  const [onlyCompatible, setOnlyCompatible] = useState(false);
  const [nearMe, setNearMe] = useState(false);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    setOpps(await fetchOpenOpportunities());
    setLoading(false);
  }, []);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  async function identify() {
    setNotice("");
    if (!phone.trim()) return;
    const v = await fetchVolunteerByPhone(phone);
    setVolunteer(v);
    setIdentifiedPhone(phone.trim());
    if (v && (v.latitude != null && v.longitude != null) && coords.latitude == null) {
      setCoords({ latitude: v.latitude, longitude: v.longitude });
    }
    const claims = await fetchClaimsByPhone(phone);
    setClaimedNeedIds(new Set(claims.filter((c) => c.claim.status !== "cancelado").map((c) => c.claim.need_id)));
    if (!v) setNotice("No encontramos un voluntario con ese teléfono. Igual puedes tomar cupos; te recomendamos registrarte primero.");
  }

  async function take(opp: Opportunity) {
    if (!identifiedPhone) { setNotice("Ingresa tu teléfono arriba para tomar un cupo."); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setBusyNeed(opp.need.id);
    setNotice("");
    const res = await claimNeed(opp.need.id, {
      id: volunteer?.id ?? null,
      name: volunteer?.full_name ?? null,
      phone: identifiedPhone,
    });
    if (res.ok) {
      setNotice("Tomaste esta oportunidad. Confirma si vas a asistir en “Mis casos”.");
      setClaimedNeedIds((prev) => new Set(prev).add(opp.need.id));
      await load();
    } else {
      setNotice(res.error || "No se pudo tomar el cupo.");
    }
    setBusyNeed(null);
  }

  const cities = useMemo(
    () => Array.from(new Set(opps.map((o) => o.need && (o.center?.city || o.helpCase?.city)).filter(Boolean) as string[])).sort(),
    [opps]
  );

  function caps(v: Volunteer | null): Record<string, boolean> {
    return (v as unknown as Record<string, boolean>) || {};
  }

  function isCompatible(o: Opportunity): boolean {
    const cap = needMeta(o.need.need_type).cap;
    if (!cap) return true; // general
    if (!volunteer) return true;
    return Boolean(caps(volunteer)[cap]);
  }

  function distanceOf(o: Opportunity): number | null {
    const lat = o.center?.latitude ?? o.helpCase?.latitude;
    const lng = o.center?.longitude ?? o.helpCase?.longitude;
    if (coords.latitude == null || coords.longitude == null || lat == null || lng == null) return null;
    return calculateDistanceKm(coords.latitude, coords.longitude, lat, lng);
  }

  const visible = useMemo(() => {
    const list = opps
      .map((o) => ({ o, dist: distanceOf(o) }))
      .filter(({ o }) => {
        const city = o.center?.city || o.helpCase?.city || "";
        const state = o.center?.state || o.helpCase?.state || "";
        if (filters.city && city !== filters.city) return false;
        if (filters.state && state.toLowerCase() !== filters.state.toLowerCase()) return false;
        if (filters.need_type && o.need.need_type !== filters.need_type) return false;
        if (filters.urgency && o.need.urgency !== filters.urgency) return false;
        if (onlyCompatible && !isCompatible(o)) return false;
        if (nearMe && (distanceOf(o) == null)) return false;
        return true;
      });

    const myCity = (volunteer?.city || "").toLowerCase();
    list.sort((a, b) => {
      const ua = URGENCY_RANK[a.o.need.urgency] ?? 1;
      const ub = URGENCY_RANK[b.o.need.urgency] ?? 1;
      if (ua !== ub) return ua - ub;
      const ca = (a.o.center?.city || a.o.helpCase?.city || "").toLowerCase() === myCity ? 0 : 1;
      const cb = (b.o.center?.city || b.o.helpCase?.city || "").toLowerCase() === myCity ? 0 : 1;
      if (myCity && ca !== cb) return ca - cb;
      const da = a.dist ?? Number.POSITIVE_INFINITY;
      const db = b.dist ?? Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return (b.o.need.created_at || "").localeCompare(a.o.need.created_at || "");
    });
    return list;
  }, [opps, filters, onlyCompatible, nearMe, volunteer, coords]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PublicLayout>
      <PageHeader
        title="Oportunidades de ayuda"
        subtitle="Elige en qué puedes ayudar. Toma un cupo y queda reservado para ti."
        icon="✨"
      />

      {/* Identificación del voluntario */}
      <Card className="mb-4 space-y-3">
        <p className="text-sm font-semibold text-gray-800">Tu teléfono</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            placeholder="+58 414 1234567"
            className="min-h-[48px] flex-1 rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-trust/60"
          />
          <Button type="button" variant="primary" onClick={identify}>Entrar</Button>
        </div>
        {volunteer && (
          <p className="text-xs font-semibold text-green-700">
            ✓ Hola {volunteer.full_name}. Mostramos oportunidades; activa “solo compatibles” para filtrar por tus habilidades.
          </p>
        )}
        <div className="flex items-center gap-3">
          <LocationButton onLocated={setCoords} />
          {coords.latitude != null && <span className="text-xs font-semibold text-green-700">✓ Ubicación lista</span>}
        </div>
      </Card>

      {/* Filtros */}
      <Card className="mb-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Select label="Ciudad" options={cities} placeholder="Todas" value={filters.city}
            onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))} />
          <Select label="Tipo" options={NEED_TYPES.map((t) => ({ value: t.value, label: t.label }))} placeholder="Todos" value={filters.need_type}
            onChange={(e) => setFilters((f) => ({ ...f, need_type: e.target.value }))} />
          <Select label="Urgencia" options={URGENCY_OPTIONS} placeholder="Todas" value={filters.urgency}
            onChange={(e) => setFilters((f) => ({ ...f, urgency: e.target.value }))} />
          <FormInput label="Estado" name="state" placeholder="Todos" value={filters.state}
            onChange={(e) => setFilters((f) => ({ ...f, state: e.target.value }))} />
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={onlyCompatible} onChange={(e) => setOnlyCompatible(e.target.checked)} className="h-5 w-5 rounded text-trust" />
            Solo compatibles conmigo
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={nearMe} onChange={(e) => setNearMe(e.target.checked)} className="h-5 w-5 rounded text-trust" />
            Cerca de mí
          </label>
        </div>
      </Card>

      {notice && <AlertBanner tone="info" className="mb-4">{notice}</AlertBanner>}

      {loading ? (
        <LoadingState label="Cargando oportunidades…" />
      ) : visible.length === 0 ? (
        <EmptyState title="No hay oportunidades" description="No hay necesidades abiertas con esos filtros. Vuelve pronto." icon="✨" />
      ) : (
        <div className="space-y-3">
          {visible.map(({ o, dist }) => (
            <OpportunityCard
              key={o.need.id}
              opp={o}
              distance={dist}
              claimed={claimedNeedIds.has(o.need.id)}
              busy={busyNeed === o.need.id}
              onTake={() => take(o)}
            />
          ))}
        </div>
      )}
    </PublicLayout>
  );
}

function OpportunityCard({
  opp, distance, claimed, busy, onTake,
}: {
  opp: Opportunity; distance: number | null; claimed: boolean; busy: boolean; onTake: () => void;
}) {
  const { need, center, helpCase } = opp;
  const meta = needMeta(need.need_type);
  const remaining = Math.max(0, need.quantity_needed - need.quantity_claimed);
  const full = remaining <= 0 || need.status !== "abierta";
  const who = center?.name || helpCase?.requester_name || (helpCase?.case_type === "group" ? "Grupo afectado" : "Caso de ayuda");
  const city = center?.city || helpCase?.city || "—";
  const state = center?.state || helpCase?.state || "—";

  return (
    <Card className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{meta.icon}</span>
          <div>
            <p className="font-bold text-gray-900">{need.title}</p>
            <p className="text-xs text-gray-500">{who} · {city}, {state}</p>
          </div>
        </div>
        <StatusBadge value={need.urgency} />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full bg-trust/10 px-2.5 py-1 font-semibold text-trust">
          Faltan {remaining} de {need.quantity_needed} {need.unit}
        </span>
        {distance != null && (
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">a ~{distance} km</span>
        )}
        {center && <span className="rounded-full bg-violet-100 px-2.5 py-1 text-violet-700">Centro de acopio</span>}
      </div>

      {need.description && <p className="text-sm text-gray-600">{need.description}</p>}

      {claimed ? (
        <div className="rounded-xl bg-safe/10 px-4 py-2.5 text-center text-sm font-semibold text-green-700">
          ✓ Ya tomaste este cupo — gestiónalo en “Mis casos”
        </div>
      ) : full ? (
        <div className="rounded-xl bg-gray-100 px-4 py-2.5 text-center text-sm font-semibold text-gray-500">
          Cupos llenos
        </div>
      ) : (
        <Button variant="primary" size="lg" fullWidth disabled={busy} onClick={onTake}>
          {busy ? "Tomando…" : "Puedo ayudar — tomar cupo"}
        </Button>
      )}
    </Card>
  );
}
