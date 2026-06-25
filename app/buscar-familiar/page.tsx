"use client";

import { useState, FormEvent } from "react";
import PublicLayout from "@/components/layout/PublicLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import FormInput from "@/components/ui/FormInput";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import AlertBanner from "@/components/ui/AlertBanner";
import FormSuccess from "@/components/forms/FormSuccess";
import { insertRow } from "@/lib/submit";

export default function BuscarFamiliarPage() {
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
    if (!String(data.get("missing_name") || "").trim())
      e.missing_name = "El nombre de la persona buscada es obligatorio.";
    if (!String(data.get("contact_name") || "").trim())
      e.contact_name = "Tu nombre de contacto es obligatorio.";
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSubmitting(true);
    const payload = {
      missing_name: String(data.get("missing_name")).trim(),
      last_known_location:
        String(data.get("last_known_location") || "").trim() || null,
      description: String(data.get("description") || "").trim() || null,
      contact_name: String(data.get("contact_name")).trim(),
      contact_phone: String(data.get("contact_phone") || "").trim() || null,
    };
    const res = await insertRow("missing_people", payload);
    setSubmitting(false);
    if (res.ok) {
      setDemo(res.demo);
      setSuccess(true);
    } else {
      setServerError(res.error || "No se pudo enviar la búsqueda.");
    }
  }

  function reset() {
    setSuccess(false);
    setErrors({});
    setServerError("");
    setFormKey((k) => k + 1);
  }

  return (
    <PublicLayout>
      <PageHeader
        title="Buscar familiar"
        subtitle="Reporta a una persona que no logras localizar."
        icon="🔎"
      />

      {success ? (
        <div className="space-y-4">
          {demo && (
            <AlertBanner tone="info">
              Modo demo: Supabase no está configurado, la búsqueda no se guardó en
              una base de datos real.
            </AlertBanner>
          )}
          <FormSuccess
            title="Registramos tu búsqueda"
            onReset={reset}
            resetLabel="Buscar a otra persona"
          />
        </div>
      ) : (
        <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
          <AlertBanner tone="info">
            Tu teléfono de contacto <strong>no se mostrará públicamente</strong>.
            Solo lo verán los coordinadores para ayudarte.
          </AlertBanner>

          <Card className="space-y-4">
            <FormInput
              label="Nombre de la persona buscada"
              name="missing_name"
              required
              placeholder="Ej. Carlos Gómez"
              error={errors.missing_name}
            />
            <FormInput
              label="Última ubicación conocida"
              name="last_known_location"
              placeholder="Ej. Sector El Valle, Caracas"
            />
            <Textarea
              label="Descripción"
              name="description"
              placeholder="Edad aproximada, vestimenta, señas particulares, circunstancias."
            />
          </Card>

          <Card className="space-y-4">
            <p className="text-sm font-semibold text-gray-800">
              Tus datos de contacto
            </p>
            <FormInput
              label="Tu nombre"
              name="contact_name"
              required
              placeholder="Ej. Ana Gómez"
              error={errors.contact_name}
            />
            <FormInput
              label="Tu teléfono"
              name="contact_phone"
              type="tel"
              placeholder="+58 414 1234567"
              hint="Opcional pero recomendado. No se mostrará públicamente."
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
            {submitting ? "Enviando…" : "Reportar persona buscada"}
          </Button>
        </form>
      )}
    </PublicLayout>
  );
}
