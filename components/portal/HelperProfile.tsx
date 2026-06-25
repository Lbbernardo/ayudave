"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import FormInput from "@/components/ui/FormInput";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import AlertBanner from "@/components/ui/AlertBanner";
import LoadingState from "@/components/ui/LoadingState";
import LocationButton from "@/components/forms/LocationButton";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  CAPABILITIES,
  DONATION_TYPES,
  type Donation,
  type Volunteer,
} from "@/lib/types";

const AVAILABILITY = [
  "Inmediata",
  "Mañanas",
  "Tardes",
  "Noches",
  "Fines de semana",
  "Solo emergencias",
];

type Coords = { latitude: number | null; longitude: number | null };

/**
 * "Mi perfil": el voluntario/donante ve y EDITA la información que registró.
 * Si le falta un tipo de perfil (p. ej. es voluntario pero quiere también
 * donar), puede crearlo aquí.
 */
export default function HelperProfile({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [donor, setDonor] = useState<Donation | null>(null);

  const load = useCallback(async () => {
    const sb = getSupabaseClient();
    if (!sb) return;
    setLoading(true);
    const [v, d] = await Promise.all([
      sb.from("volunteers").select("*").eq("user_id", userId).order("created_at").limit(1),
      sb.from("donations").select("*").eq("user_id", userId).order("created_at").limit(1),
    ]);
    setVolunteer(((v.data as Volunteer[]) || [])[0] ?? null);
    setDonor(((d.data as Donation[]) || [])[0] ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  if (loading) return <LoadingState label="Cargando tu perfil…" />;

  return (
    <div className="space-y-6">
      <VolunteerEditor row={volunteer} userId={userId} onSaved={load} />
      <DonorEditor row={donor} userId={userId} onSaved={load} />
    </div>
  );
}

// ---------------------------------------------------------------------
// Editor de perfil de VOLUNTARIO
// ---------------------------------------------------------------------
function VolunteerEditor({
  row,
  userId,
  onSaved,
}: {
  row: Volunteer | null;
  userId: string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(Boolean(row));
  const [caps, setCaps] = useState<string[]>(
    row?.capabilities
      ? row.capabilities.split(",").map((s) => s.trim()).filter(Boolean)
      : []
  );
  const [hasVehicle, setHasVehicle] = useState(row?.has_vehicle ?? false);
  const [coords, setCoords] = useState<Coords>({
    latitude: row?.latitude ?? null,
    longitude: row?.longitude ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  function toggleCap(v: string) {
    setCaps((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

  async function save(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setError("");
    setMsg("");
    const data = new FormData(ev.currentTarget);
    if (!String(data.get("full_name") || "").trim()) {
      setError("Pon tu nombre.");
      return;
    }
    const sb = getSupabaseClient();
    if (!sb) return;
    setSaving(true);
    const payload = {
      full_name: String(data.get("full_name")).trim(),
      phone: String(data.get("phone") || "").trim() || null,
      state: String(data.get("state") || "").trim() || null,
      city: String(data.get("city") || "").trim() || null,
      capabilities: caps.join(", "),
      has_vehicle: hasVehicle,
      availability: String(data.get("availability") || "").trim() || null,
      latitude: coords.latitude,
      longitude: coords.longitude,
    };
    const res = row
      ? await sb.from("volunteers").update(payload).eq("id", row.id)
      : await sb.from("volunteers").insert({ ...payload, user_id: userId });
    setSaving(false);
    if (res.error) setError(res.error.message);
    else {
      setMsg("Perfil de voluntario guardado.");
      onSaved();
    }
  }

  if (!row && !open) {
    return (
      <Card className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900">🤝 Perfil de voluntario</h3>
          <p className="text-sm text-gray-600">Aún no lo tienes.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          ➕ Agregar
        </Button>
      </Card>
    );
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <h3 className="text-lg font-bold text-gray-900">🤝 Mi perfil de voluntario</h3>
      <Card className="space-y-4">
        <FormInput label="Nombre completo" name="full_name" required defaultValue={row?.full_name ?? ""} />
        <FormInput label="Teléfono" name="phone" type="tel" defaultValue={row?.phone ?? ""} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput label="Estado" name="state" defaultValue={row?.state ?? ""} />
          <FormInput label="Ciudad" name="city" defaultValue={row?.city ?? ""} />
        </div>
      </Card>
      <Card className="space-y-3">
        <p className="text-sm font-semibold text-gray-800">¿Qué puedes ofrecer?</p>
        <div className="flex flex-wrap gap-2">
          {CAPABILITIES.map((cap) => {
            const active = caps.includes(cap.value);
            return (
              <button
                key={cap.value}
                type="button"
                onClick={() => toggleCap(cap.value)}
                className={
                  active
                    ? "rounded-full border-2 border-trust bg-trust/10 px-3 py-1.5 text-sm font-semibold text-trust"
                    : "rounded-full border-2 border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:border-trust"
                }
              >
                {active ? "✓ " : ""}
                {cap.label}
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-3 pt-1">
          <input
            type="checkbox"
            checked={hasVehicle}
            onChange={(e) => setHasVehicle(e.target.checked)}
            className="h-5 w-5 rounded border-gray-300 text-trust focus:ring-trust"
          />
          <span className="text-sm font-medium text-gray-800">Tengo vehículo</span>
        </label>
        <Select label="Disponibilidad" name="availability" options={AVAILABILITY} placeholder="Selecciona…" defaultValue={row?.availability ?? ""} />
      </Card>
      <Card className="space-y-2">
        <p className="text-sm font-semibold text-gray-800">📍 Tu ubicación</p>
        <LocationButton onLocated={setCoords} />
        <p className="text-xs font-semibold text-green-700">
          {coords.latitude != null ? "✓ Ubicación guardada" : "Sin ubicación (se asigna por ciudad/estado)"}
        </p>
      </Card>
      {error && <AlertBanner tone="emergency">{error}</AlertBanner>}
      {msg && <AlertBanner tone="safe">{msg}</AlertBanner>}
      <Button type="submit" variant="primary" size="lg" fullWidth disabled={saving}>
        {saving ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------
// Editor de perfil de DONANTE (soporta varios tipos de donación)
// ---------------------------------------------------------------------
function DonorEditor({
  row,
  userId,
  onSaved,
}: {
  row: Donation | null;
  userId: string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(Boolean(row));
  const [types, setTypes] = useState<string[]>(
    row?.donation_type
      ? row.donation_type.split(",").map((s) => s.trim()).filter(Boolean)
      : []
  );
  const [coords, setCoords] = useState<Coords>({
    latitude: row?.latitude ?? null,
    longitude: row?.longitude ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  function toggleType(t: string) {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function save(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setError("");
    setMsg("");
    if (types.length === 0) {
      setError("Selecciona al menos un tipo de donación.");
      return;
    }
    const data = new FormData(ev.currentTarget);
    const sb = getSupabaseClient();
    if (!sb) return;
    setSaving(true);
    const payload = {
      donor_name: String(data.get("donor_name") || "").trim() || null,
      phone: String(data.get("phone") || "").trim() || null,
      donation_type: types.join(", "),
      description: String(data.get("description") || "").trim() || null,
      state: String(data.get("state") || "").trim() || null,
      city: String(data.get("city") || "").trim() || null,
      latitude: coords.latitude,
      longitude: coords.longitude,
    };
    const res = row
      ? await sb.from("donations").update(payload).eq("id", row.id)
      : await sb.from("donations").insert({ ...payload, user_id: userId });
    setSaving(false);
    if (res.error) setError(res.error.message);
    else {
      setMsg("Perfil de donante guardado.");
      onSaved();
    }
  }

  if (!row && !open) {
    return (
      <Card className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900">🎁 Perfil de donante</h3>
          <p className="text-sm text-gray-600">Aún no lo tienes.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          ➕ Agregar
        </Button>
      </Card>
    );
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <h3 className="text-lg font-bold text-gray-900">🎁 Mi perfil de donante</h3>
      <Card className="space-y-4">
        <FormInput label="Nombre / organización" name="donor_name" defaultValue={row?.donor_name ?? ""} />
        <FormInput label="Teléfono" name="phone" type="tel" defaultValue={row?.phone ?? ""} />
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-800">
            ¿Qué puedes donar? <span className="text-gray-500">(puedes elegir varios)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {DONATION_TYPES.map((t) => {
              const active = types.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleType(t)}
                  className={
                    active
                      ? "rounded-full border-2 border-warning-dark bg-warning/20 px-3 py-1.5 text-sm font-semibold text-yellow-900"
                      : "rounded-full border-2 border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:border-warning-dark"
                  }
                >
                  {active ? "✓ " : ""}
                  {t}
                </button>
              );
            })}
          </div>
        </div>
        <Textarea label="Descripción" name="description" defaultValue={row?.description ?? ""} placeholder="Ej. 200 litros de agua, 50 cajas de medicinas…" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput label="Estado" name="state" defaultValue={row?.state ?? ""} />
          <FormInput label="Ciudad" name="city" defaultValue={row?.city ?? ""} />
        </div>
      </Card>
      <Card className="space-y-2">
        <p className="text-sm font-semibold text-gray-800">📍 Tu ubicación</p>
        <LocationButton onLocated={setCoords} />
        <p className="text-xs font-semibold text-green-700">
          {coords.latitude != null ? "✓ Ubicación guardada" : "Sin ubicación (se asigna por ciudad/estado)"}
        </p>
      </Card>
      {error && <AlertBanner tone="emergency">{error}</AlertBanner>}
      {msg && <AlertBanner tone="safe">{msg}</AlertBanner>}
      <Button type="submit" variant="warning" size="lg" fullWidth disabled={saving}>
        {saving ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
