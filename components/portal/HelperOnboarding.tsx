"use client";

import { FormEvent, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import FormInput from "@/components/ui/FormInput";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import AlertBanner from "@/components/ui/AlertBanner";
import LocationButton from "@/components/forms/LocationButton";
import { insertRowReturning } from "@/lib/submit";
import { getSupabaseClient } from "@/lib/supabase/client";
import { CAPABILITIES, DONATION_TYPES } from "@/lib/types";

/** Clave de acceso de 4 dígitos. */
function gen4(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export interface OnboardingResult {
  code: string;
  email: string | null;
  emailed: boolean;
}

/**
 * Guarda email + clave en el registro recién creado (mejor esfuerzo: si la
 * migración 0011 aún no se corrió, no rompe el registro) y envía la clave por
 * correo si hay email. Devuelve si el correo se envió.
 */
async function attachAccessCode(
  table: "volunteers" | "donations",
  id: string,
  email: string | null,
  code: string,
  name: string | null,
  role: "volunteer" | "donor"
): Promise<boolean> {
  const sb = getSupabaseClient();
  if (sb) {
    try {
      await sb.from(table).update({ access_code: code, ...(email ? { email } : {}) }).eq("id", id);
    } catch {
      /* columnas aún no existen: el código igual se muestra en pantalla */
    }
  }
  if (!email) return false;
  try {
    const res = await fetch("/api/send-access-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, name, role }),
    });
    const j = await res.json().catch(() => ({}));
    return Boolean(j?.sent);
  } catch {
    return false;
  }
}

const AVAILABILITY = [
  "Inmediata",
  "Mañanas",
  "Tardes",
  "Noches",
  "Fines de semana",
  "Solo emergencias",
];

type Mode = "volunteer" | "donor" | null;

/**
 * Onboarding de voluntario o donante. Funciona en dos contextos:
 *  - Dentro del portal con sesión activa (userId presente): queda vinculado a
 *    la cuenta.
 *  - Público, sin login (userId null): registro anónimo, sin depender del
 *    correo de Supabase (evita el "email rate limit").
 *
 * `forceMode` fija el tipo (voluntario/donante) y oculta el selector inicial,
 * útil para las páginas dedicadas /voluntario y /donar.
 */
export default function HelperOnboarding({
  userId,
  email,
  onDone,
  forceMode,
}: {
  userId: string | null;
  email?: string | null;
  onDone: (result?: OnboardingResult) => void;
  forceMode?: Exclude<Mode, null>;
}) {
  const [mode, setMode] = useState<Mode>(forceMode ?? null);
  const [caps, setCaps] = useState<string[]>([]);
  const [hasVehicle, setHasVehicle] = useState(false);
  const [coords, setCoords] = useState<{
    latitude: number | null;
    longitude: number | null;
  }>({ latitude: null, longitude: null });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function toggleCap(value: string) {
    setCaps((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  }

  async function submitVolunteer(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setError("");
    const data = new FormData(ev.currentTarget);
    if (!String(data.get("full_name") || "").trim()) {
      setError("Pon tu nombre completo.");
      return;
    }
    setSubmitting(true);
    const fullName = String(data.get("full_name")).trim();
    const vEmail = String(data.get("email") || "").trim() || null;
    const code = gen4();
    const res = await insertRowReturning("volunteers", {
      full_name: fullName,
      phone: String(data.get("phone") || "").trim() || null,
      state: String(data.get("state") || "").trim() || null,
      city: String(data.get("city") || "").trim() || null,
      capabilities: caps.join(", "),
      has_vehicle: hasVehicle,
      availability: String(data.get("availability") || "").trim() || null,
      latitude: coords.latitude,
      longitude: coords.longitude,
      ...(userId ? { user_id: userId } : {}),
    });
    if (!res.ok) {
      setSubmitting(false);
      setError(res.error || "No se pudo guardar.");
      return;
    }
    let emailed = false;
    if (res.id) emailed = await attachAccessCode("volunteers", res.id, vEmail, code, fullName, "volunteer");
    setSubmitting(false);
    onDone({ code, email: vEmail, emailed });
  }

  async function submitDonor(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setError("");
    const data = new FormData(ev.currentTarget);
    if (!String(data.get("donation_type") || "")) {
      setError("Selecciona el tipo de donación.");
      return;
    }
    setSubmitting(true);
    const donorName = String(data.get("donor_name") || "").trim() || null;
    const dEmail = String(data.get("email") || "").trim() || null;
    const code = gen4();
    const res = await insertRowReturning("donations", {
      donor_name: donorName,
      phone: String(data.get("phone") || "").trim() || null,
      donation_type: String(data.get("donation_type")),
      description: String(data.get("description") || "").trim() || null,
      state: String(data.get("state") || "").trim() || null,
      city: String(data.get("city") || "").trim() || null,
      latitude: coords.latitude,
      longitude: coords.longitude,
      ...(userId ? { user_id: userId } : {}),
    });
    if (!res.ok) {
      setSubmitting(false);
      setError(res.error || "No se pudo guardar.");
      return;
    }
    let emailed = false;
    if (res.id) emailed = await attachAccessCode("donations", res.id, dEmail, code, donorName, "donor");
    setSubmitting(false);
    onDone({ code, email: dEmail, emailed });
  }

  const locationCard = (
    <Card className="space-y-2">
      <p className="text-sm font-semibold text-gray-800">
        📍 Tu ubicación (recomendada)
      </p>
      <p className="text-xs text-gray-600">
        Nos ayuda a calcular qué tan cerca estás de cada caso y mostrarte la
        distancia en kilómetros.
      </p>
      <LocationButton onLocated={setCoords} />
      {coords.latitude != null ? (
        <p className="text-xs font-semibold text-green-700">
          ✓ Ubicación capturada
        </p>
      ) : (
        <p className="text-xs text-gray-500">
          Sin ubicación te asignaremos por ciudad/estado (sin distancia exacta).
        </p>
      )}
    </Card>
  );

  // Paso 0: elegir si es voluntario o donante.
  if (mode === null) {
    return (
      <div className="space-y-4">
        <AlertBanner tone="info">
          <strong>¡Ya entraste!</strong> Para empezar a recibir casos, cuéntanos
          cómo puedes ayudar. Esto se guarda en tu cuenta ({email ?? "tu correo"}).
        </AlertBanner>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("volunteer")}
            className="rounded-xl border-2 border-trust/30 bg-trust/5 p-5 text-left transition-colors hover:border-trust"
          >
            <div className="text-3xl">🤝</div>
            <h3 className="mt-2 text-lg font-bold text-gray-900">Soy voluntario</h3>
            <p className="mt-1 text-sm text-gray-600">
              Ayudo con mi tiempo, habilidades o vehículo.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setMode("donor")}
            className="rounded-xl border-2 border-warning-dark/30 bg-warning/10 p-5 text-left transition-colors hover:border-warning-dark"
          >
            <div className="text-3xl">🎁</div>
            <h3 className="mt-2 text-lg font-bold text-gray-900">Quiero donar</h3>
            <p className="mt-1 text-sm text-gray-600">
              Ofrezco agua, comida, medicinas, transporte, etc.
            </p>
          </button>
        </div>
      </div>
    );
  }

  // Paso 1: formulario según el tipo elegido.
  return (
    <div className="space-y-4">
      {!forceMode && (
        <button
          type="button"
          onClick={() => {
            setMode(null);
            setError("");
          }}
          className="text-sm font-semibold text-trust"
        >
          ← Cambiar
        </button>
      )}

      {mode === "volunteer" ? (
        <form onSubmit={submitVolunteer} className="space-y-4">
          <Card className="space-y-4">
            <FormInput label="Nombre completo" name="full_name" required placeholder="Ej. María Pérez" />
            <FormInput label="Teléfono" name="phone" type="tel" placeholder="+58 414 1234567" hint="Para coordinar. No se muestra públicamente." />
            <FormInput label="Correo electrónico" name="email" type="email" placeholder="tucorreo@ejemplo.com" hint="Te enviamos tu clave de acceso de 4 dígitos." />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormInput label="Estado" name="state" placeholder="Ej. Carabobo" />
              <FormInput label="Ciudad" name="city" placeholder="Ej. Valencia" />
            </div>
          </Card>
          <Card className="space-y-3">
            <p className="text-sm font-semibold text-gray-800">
              ¿Qué puedes ofrecer? <span className="text-gray-500">(elige todo lo que apliques)</span>
            </p>
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
              <span className="text-sm font-medium text-gray-800">
                Tengo vehículo para transporte
              </span>
            </label>
            <Select label="Disponibilidad" name="availability" options={AVAILABILITY} placeholder="Selecciona…" />
          </Card>
          {locationCard}
          {error && <AlertBanner tone="emergency">{error}</AlertBanner>}
          <Button type="submit" variant="primary" size="lg" fullWidth disabled={submitting}>
            {submitting ? "Guardando…" : "Guardar mi perfil de voluntario"}
          </Button>
        </form>
      ) : (
        <form onSubmit={submitDonor} className="space-y-4">
          <Card className="space-y-4">
            <FormInput label="Tu nombre / organización" name="donor_name" placeholder="Ej. Fundación Esperanza" />
            <FormInput label="Teléfono" name="phone" type="tel" placeholder="+58 414 1234567" hint="Para coordinar la entrega. No se muestra públicamente." />
            <FormInput label="Correo electrónico" name="email" type="email" placeholder="tucorreo@ejemplo.com" hint="Te enviamos tu clave de acceso de 4 dígitos." />
            <Select label="Tipo de donación" name="donation_type" options={DONATION_TYPES} placeholder="Selecciona…" required />
            <Textarea label="Descripción" name="description" placeholder="Ej. 200 litros de agua, 50 cajas de medicinas…" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormInput label="Estado" name="state" placeholder="Ej. Carabobo" />
              <FormInput label="Ciudad" name="city" placeholder="Ej. Valencia" />
            </div>
          </Card>
          {locationCard}
          {error && <AlertBanner tone="emergency">{error}</AlertBanner>}
          <Button type="submit" variant="warning" size="lg" fullWidth disabled={submitting}>
            {submitting ? "Guardando…" : "Guardar mi perfil de donante"}
          </Button>
        </form>
      )}
    </div>
  );
}
