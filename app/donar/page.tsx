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
import { insertRow } from "@/lib/submit";
import { DONATION_TYPES } from "@/lib/types";

export default function DonarPage() {
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
    if (!String(data.get("donation_type") || ""))
      e.donation_type = "Selecciona el tipo de donación.";
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSubmitting(true);
    const payload = {
      donor_name: String(data.get("donor_name") || "").trim() || null,
      phone: String(data.get("phone") || "").trim() || null,
      donation_type: String(data.get("donation_type")),
      description: String(data.get("description") || "").trim() || null,
      state: String(data.get("state") || "").trim() || null,
      city: String(data.get("city") || "").trim() || null,
    };
    const res = await insertRow("donations", payload);
    setSubmitting(false);
    if (res.ok) {
      setDemo(res.demo);
      setSuccess(true);
    } else {
      setServerError(res.error || "No se pudo registrar la donación.");
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
        title="Quiero donar"
        subtitle="Ofrece recursos para los afectados. Un coordinador te contactará."
        icon="🎁"
      />

      {success ? (
        <div className="space-y-4">
          {demo && (
            <AlertBanner tone="info">
              Modo demo: Supabase no está configurado, la donación no se guardó en
              una base de datos real.
            </AlertBanner>
          )}
          <FormSuccess
            title="¡Gracias por tu ofrecimiento!"
            message="Gracias por ofrecer ayuda. El sistema podrá conectar tu donación con una persona cercana que la necesite."
            onReset={reset}
            resetLabel="Ofrecer otra donación"
          />
        </div>
      ) : (
        <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
          <AlertBanner tone="info">
            Tu teléfono <strong>no se mostrará públicamente</strong>. Solo lo verán
            los coordinadores para organizar la entrega.
          </AlertBanner>

          <Card className="space-y-4">
            <FormInput
              label="Tu nombre"
              name="donor_name"
              placeholder="Ej. Fundación Esperanza / Pedro Ruiz"
            />
            <FormInput
              label="Teléfono"
              name="phone"
              type="tel"
              placeholder="+58 414 1234567"
              hint="Opcional pero recomendado para coordinar la entrega."
            />
            <Select
              label="Tipo de donación"
              name="donation_type"
              options={DONATION_TYPES}
              placeholder="Selecciona…"
              required
              error={errors.donation_type}
            />
            <Textarea
              label="Descripción"
              name="description"
              placeholder="Ej. 200 litros de agua potable, 50 cajas de medicinas, etc."
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormInput label="Estado" name="state" placeholder="Ej. Carabobo" />
              <FormInput label="Ciudad" name="city" placeholder="Ej. Valencia" />
            </div>
          </Card>

          {serverError && <AlertBanner tone="emergency">{serverError}</AlertBanner>}

          <Button
            type="submit"
            variant="warning"
            size="lg"
            fullWidth
            disabled={submitting}
          >
            {submitting ? "Enviando…" : "Ofrecer donación"}
          </Button>
        </form>
      )}
    </PublicLayout>
  );
}
