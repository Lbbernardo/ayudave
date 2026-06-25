"use client";

import { useState, FormEvent } from "react";
import PublicLayout from "@/components/layout/PublicLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import FormInput from "@/components/ui/FormInput";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import EmergencyNotice from "@/components/ui/EmergencyNotice";
import AlertBanner from "@/components/ui/AlertBanner";
import LocationButton from "@/components/forms/LocationButton";
import FormSuccess from "@/components/forms/FormSuccess";
import { insertRowReturning } from "@/lib/submit";
import { autoAssignReport } from "@/lib/matching";
import { HELP_TYPES, URGENCY_OPTIONS } from "@/lib/types";

interface Coords {
  latitude: number | null;
  longitude: number | null;
}

export default function ReportarAyudaPage() {
  const [coords, setCoords] = useState<Coords>({
    latitude: null,
    longitude: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [demo, setDemo] = useState(false);
  const [assigned, setAssigned] = useState<boolean | null>(null);
  const [serverError, setServerError] = useState("");
  const [formKey, setFormKey] = useState(0);

  function validate(data: FormData): Record<string, string> {
    const e: Record<string, string> = {};
    if (!String(data.get("full_name") || "").trim())
      e.full_name = "El nombre es obligatorio.";
    if (!String(data.get("help_type") || ""))
      e.help_type = "Selecciona el tipo de ayuda.";
    if (!String(data.get("state") || "").trim())
      e.state = "Indica el estado.";
    if (!String(data.get("city") || "").trim())
      e.city = "Indica la ciudad.";
    const urgency = String(data.get("urgency") || "");
    if (!URGENCY_OPTIONS.includes(urgency as never))
      e.urgency = "Selecciona una urgencia válida.";
    const people = Number(data.get("people_count") || 1);
    if (!Number.isFinite(people) || people < 1)
      e.people_count = "Debe ser al menos 1.";
    return e;
  }

  async function handleSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setServerError("");
    const form = ev.currentTarget;
    const data = new FormData(form);
    const v = validate(data);
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setSubmitting(true);
    const payload = {
      full_name: String(data.get("full_name")).trim(),
      phone: String(data.get("phone") || "").trim() || null,
      state: String(data.get("state") || "").trim() || null,
      city: String(data.get("city") || "").trim() || null,
      address: String(data.get("address") || "").trim() || null,
      help_type: String(data.get("help_type")),
      urgency: String(data.get("urgency")),
      description: String(data.get("description") || "").trim() || null,
      people_count: Number(data.get("people_count") || 1),
      latitude: coords.latitude,
      longitude: coords.longitude,
    };

    const res = await insertRowReturning("reports", payload);
    if (!res.ok) {
      setSubmitting(false);
      setServerError(res.error || "No se pudo enviar el reporte.");
      return;
    }

    // El reporte se guardó: intentamos asignarlo automáticamente.
    // Si falla la asignación, el reporte igual quedó guardado.
    let wasAssigned: boolean | null = null;
    if (res.id) {
      try {
        const assignment = await autoAssignReport(res.id);
        wasAssigned = assignment.assigned;
      } catch (err) {
        console.error("Error en la asignación automática:", err);
      }
    }

    setSubmitting(false);
    setDemo(res.demo);
    setAssigned(wasAssigned);
    setSuccess(true);
  }

  function reset() {
    setSuccess(false);
    setAssigned(null);
    setErrors({});
    setCoords({ latitude: null, longitude: null });
    setServerError("");
    setFormKey((k) => k + 1);
  }

  return (
    <PublicLayout>
      <PageHeader
        title="Necesito ayuda"
        subtitle="Cuéntanos qué necesitas. Tu reporte llegará a los coordinadores."
        icon="🆘"
      />

      {success ? (
        <div className="space-y-4">
          {demo && (
            <AlertBanner tone="info">
              Modo demo: Supabase no está configurado, el reporte no se guardó en
              una base de datos real.
            </AlertBanner>
          )}
          {assigned === true && (
            <AlertBanner tone="safe">
              Tu caso fue asignado a una persona cercana que podría ayudarte.
            </AlertBanner>
          )}
          {assigned === false && (
            <AlertBanner tone="warning">
              Tu caso fue recibido, pero todavía no encontramos una persona
              cercana disponible. Un coordinador podrá revisarlo.
            </AlertBanner>
          )}
          <FormSuccess
            title="Tu reporte fue recibido"
            message="Estamos intentando conectarte con un voluntario o donante cercano. Si estás en peligro inmediato, intenta contactar servicios oficiales o personas cercanas."
            onReset={reset}
          />
        </div>
      ) : (
        <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
          <EmergencyNotice compact />

          <Card className="space-y-4">
            <FormInput
              label="Nombre completo"
              name="full_name"
              required
              placeholder="Ej. María Pérez"
              error={errors.full_name}
            />
            <FormInput
              label="Teléfono"
              name="phone"
              type="tel"
              placeholder="+58 414 1234567"
              hint="Opcional pero recomendado. No se mostrará públicamente."
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormInput
                label="Estado"
                name="state"
                placeholder="Ej. Distrito Capital"
                required
                error={errors.state}
              />
              <FormInput
                label="Ciudad"
                name="city"
                placeholder="Ej. Caracas"
                required
                error={errors.city}
              />
            </div>
            <FormInput
              label="Dirección o referencia"
              name="address"
              placeholder="Calle, sector, punto de referencia (ayuda a ubicarte)"
            />
          </Card>

          <Card className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Tipo de ayuda"
                name="help_type"
                options={HELP_TYPES}
                placeholder="Selecciona…"
                required
                error={errors.help_type}
              />
              <Select
                label="Urgencia"
                name="urgency"
                options={URGENCY_OPTIONS}
                defaultValue="media"
                required
                error={errors.urgency}
              />
            </div>
            <FormInput
              label="Número de personas"
              name="people_count"
              type="number"
              min={1}
              defaultValue={1}
              required
              error={errors.people_count}
            />
            <Textarea
              label="Descripción"
              name="description"
              placeholder="Describe la situación con el mayor detalle posible."
            />
          </Card>

          <Card className="space-y-3">
            <p className="text-sm font-semibold text-gray-800">
              📍 Tu ubicación (recomendada)
            </p>
            <p className="text-xs text-gray-600">
              Compartir tu ubicación exacta ayuda a que un voluntario o donante
              cercano te encuentre más rápido. Toca el botón y acepta el permiso.
            </p>
            <LocationButton onLocated={setCoords} />
            {coords.latitude != null && coords.longitude != null ? (
              <p className="text-xs font-semibold text-green-700">
                ✓ Ubicación compartida ({coords.latitude.toFixed(5)},{" "}
                {coords.longitude.toFixed(5)})
              </p>
            ) : (
              <AlertBanner tone="warning">
                Aún no compartiste tu ubicación. Si puedes, toca{" "}
                <strong>“Usar mi ubicación”</strong> para que te localicen más
                rápido.
              </AlertBanner>
            )}
          </Card>

          {serverError && <AlertBanner tone="emergency">{serverError}</AlertBanner>}

          <Button
            type="submit"
            variant="emergency"
            size="lg"
            fullWidth
            disabled={submitting}
          >
            {submitting ? "Enviando…" : "Enviar reporte"}
          </Button>
        </form>
      )}
    </PublicLayout>
  );
}
