"use client";

import { useState, FormEvent } from "react";
import PublicLayout from "@/components/layout/PublicLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import FormInput from "@/components/ui/FormInput";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import AlertBanner from "@/components/ui/AlertBanner";
import FormSuccess from "@/components/forms/FormSuccess";
import { insertRow } from "@/lib/submit";
import { getSession } from "@/lib/auth";
import { SKILL_OPTIONS } from "@/lib/types";

const AVAILABILITY = [
  "Inmediata",
  "Mañanas",
  "Tardes",
  "Noches",
  "Fines de semana",
  "Solo emergencias",
];

export default function VoluntarioPage() {
  const [skills, setSkills] = useState<string[]>([]);
  const [hasVehicle, setHasVehicle] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [demo, setDemo] = useState(false);
  const [serverError, setServerError] = useState("");
  const [formKey, setFormKey] = useState(0);

  function toggleSkill(skill: string) {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  async function handleSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setServerError("");
    const data = new FormData(ev.currentTarget);
    const e: Record<string, string> = {};
    if (!String(data.get("full_name") || "").trim())
      e.full_name = "El nombre es obligatorio.";
    if (skills.length === 0) e.skills = "Selecciona al menos una habilidad.";
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSubmitting(true);
    const session = await getSession();
    const uid = session?.user.id;
    const payload = {
      full_name: String(data.get("full_name")).trim(),
      phone: String(data.get("phone") || "").trim() || null,
      state: String(data.get("state") || "").trim() || null,
      city: String(data.get("city") || "").trim() || null,
      skills: skills.join(", "),
      has_vehicle: hasVehicle,
      availability: String(data.get("availability") || "").trim() || null,
      // Solo si hay sesión (requiere la migración 0003); evita romper si no se corrió.
      ...(uid ? { user_id: uid } : {}),
    };
    const res = await insertRow("volunteers", payload);
    setSubmitting(false);
    if (res.ok) {
      setDemo(res.demo);
      setSuccess(true);
    } else {
      setServerError(res.error || "No se pudo registrar.");
    }
  }

  function reset() {
    setSuccess(false);
    setErrors({});
    setSkills([]);
    setHasVehicle(false);
    setServerError("");
    setFormKey((k) => k + 1);
  }

  return (
    <PublicLayout>
      <PageHeader
        title="Soy voluntario"
        subtitle="Regístrate para ayudar con tus habilidades, tiempo o vehículo."
        icon="🤝"
      />

      {success ? (
        <div className="space-y-4">
          {demo && (
            <AlertBanner tone="info">
              Modo demo: Supabase no está configurado, el registro no se guardó en
              una base de datos real.
            </AlertBanner>
          )}
          <FormSuccess
            title="¡Gracias por sumarte como voluntario!"
            message="Gracias por registrarte. Cuando haya un caso cercano que coincida con tu disponibilidad, podrá ser asignado a ti."
            onReset={reset}
            resetLabel="Registrar a otro voluntario"
          />
        </div>
      ) : (
        <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
          <Card className="space-y-4">
            <FormInput
              label="Nombre completo"
              name="full_name"
              required
              placeholder="Ej. Luis Martínez"
              error={errors.full_name}
            />
            <FormInput
              label="Teléfono"
              name="phone"
              type="tel"
              placeholder="+58 414 1234567"
              hint="Opcional pero recomendado para coordinarte."
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormInput label="Estado" name="state" placeholder="Ej. Miranda" />
              <FormInput label="Ciudad" name="city" placeholder="Ej. Los Teques" />
            </div>
          </Card>

          <Card className="space-y-3">
            <p className="text-sm font-semibold text-gray-800">
              Habilidades <span className="text-emergency">*</span>
            </p>
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
            {errors.skills && (
              <p className="text-xs font-medium text-emergency">{errors.skills}</p>
            )}
          </Card>

          <Card className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={hasVehicle}
                onChange={(e) => setHasVehicle(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-trust focus:ring-trust"
              />
              <span className="text-sm font-medium text-gray-800">
                Cuento con vehículo para transporte
              </span>
            </label>
            <Select
              label="Disponibilidad"
              name="availability"
              options={AVAILABILITY}
              placeholder="Selecciona…"
            />
          </Card>

          {serverError && <AlertBanner tone="emergency">{serverError}</AlertBanner>}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={submitting}
          >
            {submitting ? "Enviando…" : "Registrarme como voluntario"}
          </Button>
        </form>
      )}
    </PublicLayout>
  );
}
