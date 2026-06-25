"use client";

import { FormEvent, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import FormInput from "@/components/ui/FormInput";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import AlertBanner from "@/components/ui/AlertBanner";
import LocationButton from "@/components/forms/LocationButton";
import { insertRow } from "@/lib/submit";
import { SKILL_OPTIONS, DONATION_TYPES } from "@/lib/types";

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
 * Onboarding dentro del portal: el usuario logueado completa su perfil de
 * voluntario o donante. Como siempre se hace con sesión activa, el registro
 * queda vinculado a su cuenta (user_id) sin posibilidad de quedar anónimo.
 */
export default function HelperOnboarding({
  userId,
  email,
  onDone,
}: {
  userId: string;
  email: string | null;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<Mode>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [hasVehicle, setHasVehicle] = useState(false);
  const [coords, setCoords] = useState<{
    latitude: number | null;
    longitude: number | null;
  }>({ latitude: null, longitude: null });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function toggleSkill(skill: string) {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
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
    const res = await insertRow("volunteers", {
      full_name: String(data.get("full_name")).trim(),
      phone: String(data.get("phone") || "").trim() || null,
      state: String(data.get("state") || "").trim() || null,
      city: String(data.get("city") || "").trim() || null,
      skills: skills.join(", "),
      has_vehicle: hasVehicle,
      availability: String(data.get("availability") || "").trim() || null,
      latitude: coords.latitude,
      longitude: coords.longitude,
      user_id: userId,
    });
    setSubmitting(false);
    if (res.ok) onDone();
    else setError(res.error || "No se pudo guardar.");
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
    const res = await insertRow("donations", {
      donor_name: String(data.get("donor_name") || "").trim() || null,
      phone: String(data.get("phone") || "").trim() || null,
      donation_type: String(data.get("donation_type")),
      description: String(data.get("description") || "").trim() || null,
      state: String(data.get("state") || "").trim() || null,
      city: String(data.get("city") || "").trim() || null,
      latitude: coords.latitude,
      longitude: coords.longitude,
      user_id: userId,
    });
    setSubmitting(false);
    if (res.ok) onDone();
    else setError(res.error || "No se pudo guardar.");
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

      {mode === "volunteer" ? (
        <form onSubmit={submitVolunteer} className="space-y-4">
          <Card className="space-y-4">
            <FormInput label="Nombre completo" name="full_name" required placeholder="Ej. María Pérez" />
            <FormInput label="Teléfono" name="phone" type="tel" placeholder="+58 414 1234567" hint="Para coordinar. No se muestra públicamente." />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormInput label="Estado" name="state" placeholder="Ej. Carabobo" />
              <FormInput label="Ciudad" name="city" placeholder="Ej. Valencia" />
            </div>
          </Card>
          <Card className="space-y-3">
            <p className="text-sm font-semibold text-gray-800">Habilidades</p>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map((skill) => {
                const active = skills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={
                      active
                        ? "rounded-full border-2 border-trust bg-trust/10 px-3 py-1.5 text-sm font-semibold text-trust"
                        : "rounded-full border-2 border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:border-trust"
                    }
                  >
                    {active ? "✓ " : ""}
                    {skill}
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
