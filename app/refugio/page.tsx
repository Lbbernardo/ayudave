"use client";

import { useState, FormEvent } from "react";
import PublicLayout from "@/components/layout/PublicLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import FormInput from "@/components/ui/FormInput";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import AlertBanner from "@/components/ui/AlertBanner";
import FormSuccess from "@/components/forms/FormSuccess";
import LocationButton from "@/components/forms/LocationButton";
import EmergencyNotice from "@/components/ui/EmergencyNotice";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

const TIPOS = ["refugio", "centro_acopio"];
const TIPO_LABELS: Record<string, string> = {
  refugio: "Refugio (aloja personas)",
  centro_acopio: "Centro de acopio (recibe donaciones)",
};

interface Coords { latitude: number | null; longitude: number | null; }

export default function RegistrarRefugioPage() {
  const [coords, setCoords] = useState<Coords>({ latitude: null, longitude: null });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");
  const [formKey, setFormKey] = useState(0);

  function validate(data: FormData): Record<string, string> {
    const e: Record<string, string> = {};
    if (!String(data.get("name") || "").trim()) e.name = "El nombre es obligatorio.";
    if (!String(data.get("type") || "")) e.type = "Selecciona el tipo.";
    if (!String(data.get("state") || "").trim()) e.state = "Indica el estado.";
    if (!String(data.get("city") || "").trim()) e.city = "Indica la ciudad.";
    if (coords.latitude == null || coords.longitude == null)
      e.location = "La ubicación es obligatoria para aparecer en el mapa.";
    return e;
  }

  async function handleSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setServerError("");
    const data = new FormData(ev.currentTarget);
    const v = validate(data);
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setSubmitting(true);
    const sb = getSupabaseClient();
    if (!sb) {
      setServerError("Sin conexión a la base de datos.");
      setSubmitting(false);
      return;
    }

    const { error } = await sb.from("refugios").insert({
      name: String(data.get("name")).trim(),
      type: String(data.get("type")),
      address: String(data.get("address") || "").trim() || null,
      city: String(data.get("city")).trim(),
      state: String(data.get("state")).trim(),
      latitude: coords.latitude,
      longitude: coords.longitude,
      capacity: Number(data.get("capacity") || 0) || null,
      contact_name: String(data.get("contact_name") || "").trim() || null,
      contact_phone: String(data.get("contact_phone") || "").trim() || null,
      notes: String(data.get("notes") || "").trim() || null,
    });

    if (error) {
      setServerError("No se pudo registrar. Intenta de nuevo.");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setSuccess(true);
  }

  function reset() {
    setSuccess(false);
    setErrors({});
    setCoords({ latitude: null, longitude: null });
    setServerError("");
    setFormKey((k) => k + 1);
  }

  return (
    <PublicLayout>
      <PageHeader
        title="Registrar refugio o centro de acopio"
        subtitle="Tu ubicación aparecerá en el mapa para que las personas puedan encontrarla."
        icon="🏠"
      />

      {!isSupabaseConfigured && (
        <AlertBanner tone="warning" className="mb-4">
          Supabase no configurado: el registro no se guardará.
        </AlertBanner>
      )}

      {success ? (
        <FormSuccess
          title="Registrado con éxito"
          message="El refugio o centro de acopio ya aparece en el mapa. Gracias por ayudar a coordinar."
          onReset={reset}
          resetLabel="Registrar otro"
        />
      ) : (
        <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
          <EmergencyNotice compact />

          <Card className="space-y-4">
            <FormInput
              label="Nombre del lugar"
              name="name"
              required
              placeholder="Ej. Refugio Iglesia San José"
              error={errors.name}
            />
            <Select
              label="Tipo"
              name="type"
              options={TIPOS.map((t) => ({ value: t, label: TIPO_LABELS[t] }))}
              placeholder="Selecciona…"
              required
              error={errors.type}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormInput
                label="Estado"
                name="state"
                required
                placeholder="Ej. Distrito Capital"
                error={errors.state}
              />
              <FormInput
                label="Ciudad"
                name="city"
                required
                placeholder="Ej. Caracas"
                error={errors.city}
              />
            </div>
            <FormInput
              label="Dirección o referencia"
              name="address"
              placeholder="Calle, sector, punto de referencia"
            />
            <FormInput
              label="Capacidad (personas)"
              name="capacity"
              type="number"
              min={0}
              placeholder="Ej. 50"
              hint="Opcional. Cuántas personas puede albergar o cuántas raciones tiene."
            />
          </Card>

          <Card className="space-y-4">
            <p className="text-sm font-semibold text-gray-800">
              Contacto (opcional)
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormInput
                label="Nombre del responsable"
                name="contact_name"
                placeholder="Ej. Pastor Marcos"
              />
              <FormInput
                label="Teléfono de contacto"
                name="contact_phone"
                type="tel"
                placeholder="+58 414 1234567"
              />
            </div>
            <Textarea
              label="Notas adicionales"
              name="notes"
              placeholder="Horario de atención, qué reciben, restricciones, etc."
            />
          </Card>

          <Card className="space-y-3">
            <p className="text-sm font-semibold text-gray-800">
              📍 Ubicación en el mapa{" "}
              <span className="text-red-600">*</span>
            </p>
            <p className="text-xs text-gray-600">
              Necesaria para que aparezca en el mapa y las personas puedan
              encontrarlo.
            </p>
            <LocationButton onLocated={setCoords} />
            {coords.latitude != null ? (
              <p className="text-xs font-semibold text-green-700">
                ✓ Ubicación capturada ({coords.latitude.toFixed(5)},{" "}
                {coords.longitude!.toFixed(5)})
              </p>
            ) : errors.location ? (
              <AlertBanner tone="emergency">{errors.location}</AlertBanner>
            ) : (
              <AlertBanner tone="warning">
                Toca <strong>&ldquo;Usar mi ubicación&rdquo;</strong> para continuar.
              </AlertBanner>
            )}
          </Card>

          {serverError && <AlertBanner tone="emergency">{serverError}</AlertBanner>}

          <Button type="submit" variant="primary" size="lg" fullWidth disabled={submitting}>
            {submitting ? "Registrando…" : "Registrar en el mapa"}
          </Button>
        </form>
      )}
    </PublicLayout>
  );
}
