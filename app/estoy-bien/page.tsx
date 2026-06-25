"use client";

import { useState, FormEvent } from "react";
import PublicLayout from "@/components/layout/PublicLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import FormInput from "@/components/ui/FormInput";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import AlertBanner from "@/components/ui/AlertBanner";
import LocationButton from "@/components/forms/LocationButton";
import FormSuccess from "@/components/forms/FormSuccess";
import { insertRow } from "@/lib/submit";

export default function EstoyBienPage() {
  const [coords, setCoords] = useState<{
    latitude: number | null;
    longitude: number | null;
  }>({ latitude: null, longitude: null });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [demo, setDemo] = useState(false);
  const [serverError, setServerError] = useState("");
  const [formKey, setFormKey] = useState(0);

  async function handleSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setServerError("");
    const data = new FormData(ev.currentTarget);
    const e: Record<string, string> = {};
    if (!String(data.get("full_name") || "").trim())
      e.full_name = "El nombre es obligatorio.";
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSubmitting(true);
    const payload = {
      full_name: String(data.get("full_name")).trim(),
      phone: String(data.get("phone") || "").trim() || null,
      state: String(data.get("state") || "").trim() || null,
      city: String(data.get("city") || "").trim() || null,
      message: String(data.get("message") || "").trim() || null,
      latitude: coords.latitude,
      longitude: coords.longitude,
    };
    const res = await insertRow("safe_reports", payload);
    setSubmitting(false);
    if (res.ok) {
      setDemo(res.demo);
      setSuccess(true);
    } else {
      setServerError(res.error || "No se pudo enviar el reporte.");
    }
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
        title="Estoy bien"
        subtitle="Avisa que te encuentras a salvo. Esto puede aparecer públicamente (sin tu teléfono)."
        icon="✅"
      />

      {success ? (
        <div className="space-y-4">
          {demo && (
            <AlertBanner tone="info">
              Modo demo: Supabase no está configurado, el mensaje no se guardó en
              una base de datos real.
            </AlertBanner>
          )}
          <FormSuccess
            title="Gracias, registramos que estás bien"
            onReset={reset}
            resetLabel="Registrar a otra persona"
          />
        </div>
      ) : (
        <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
          <AlertBanner tone="safe">
            Tu nombre y mensaje pueden mostrarse públicamente para tranquilizar a
            tus seres queridos. <strong>Tu teléfono nunca se muestra.</strong>
          </AlertBanner>

          <Card className="space-y-4">
            <FormInput
              label="Nombre completo"
              name="full_name"
              required
              placeholder="Ej. José Rodríguez"
              error={errors.full_name}
            />
            <FormInput
              label="Teléfono"
              name="phone"
              type="tel"
              placeholder="+58 414 1234567"
              hint="Opcional. No se mostrará públicamente."
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormInput label="Estado" name="state" placeholder="Ej. Vargas" />
              <FormInput label="Ciudad" name="city" placeholder="Ej. La Guaira" />
            </div>
            <Textarea
              label="Mensaje"
              name="message"
              placeholder="Ej. Estoy a salvo en casa de un familiar, sin novedad."
            />
          </Card>

          <Card className="space-y-3">
            <p className="text-sm font-semibold text-gray-800">
              Ubicación (opcional)
            </p>
            <LocationButton onLocated={setCoords} />
            {coords.latitude != null && coords.longitude != null && (
              <p className="text-xs text-gray-500">
                Coordenadas: {coords.latitude.toFixed(5)},{" "}
                {coords.longitude.toFixed(5)}
              </p>
            )}
          </Card>

          {serverError && <AlertBanner tone="emergency">{serverError}</AlertBanner>}

          <Button
            type="submit"
            variant="safe"
            size="lg"
            fullWidth
            disabled={submitting}
          >
            {submitting ? "Enviando…" : "Avisar que estoy bien"}
          </Button>
        </form>
      )}
    </PublicLayout>
  );
}
