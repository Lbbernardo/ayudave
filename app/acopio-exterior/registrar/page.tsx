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
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

const COUNTRIES = [
  "Argentina", "Brasil", "Canada", "Chile", "Colombia", "Costa Rica",
  "Ecuador", "España", "Estados Unidos", "Mexico", "Panama", "Peru",
  "Portugal", "Puerto Rico", "República Dominicana", "Trinidad y Tobago",
  "Uruguay", "Otro",
];

export default function RegistrarCentroExteriorPage() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");
  const [formKey, setFormKey] = useState(0);

  function validate(data: FormData): Record<string, string> {
    const e: Record<string, string> = {};
    if (!String(data.get("name") || "").trim()) e.name = "El nombre es obligatorio.";
    if (!String(data.get("country") || "").trim()) e.country = "El país es obligatorio.";
    if (!String(data.get("city") || "").trim()) e.city = "La ciudad es obligatoria.";
    if (!String(data.get("phone") || "").trim() && !String(data.get("email") || "").trim())
      e.contact = "Ingresa al menos un teléfono o correo de contacto.";
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
    if (!sb) { setServerError("Sin conexión."); setSubmitting(false); return; }

    const { error } = await sb.from("centros_exterior").insert({
      name: String(data.get("name")).trim(),
      organization: String(data.get("organization") || "").trim() || null,
      country: String(data.get("country")).trim(),
      city: String(data.get("city")).trim(),
      address: String(data.get("address") || "").trim() || null,
      phone: String(data.get("phone") || "").trim() || null,
      email: String(data.get("email") || "").trim() || null,
      website: String(data.get("website") || "").trim() || null,
      schedule: String(data.get("schedule") || "").trim() || null,
      notes: String(data.get("notes") || "").trim() || null,
    });

    setSubmitting(false);
    if (error) { setServerError("No se pudo registrar. Intenta de nuevo."); return; }
    setSuccess(true);
  }

  function reset() {
    setSuccess(false); setErrors({}); setServerError(""); setFormKey((k) => k + 1);
  }

  return (
    <PublicLayout>
      <PageHeader
        title="Registrar centro de acopio"
        subtitle="¿Tienes un centro fuera de Venezuela? Regístralo para que los venezolanos te encuentren."
        icon="📦"
      />

      {!isSupabaseConfigured && (
        <AlertBanner tone="warning" className="mb-4">Supabase no configurado.</AlertBanner>
      )}

      {success ? (
        <FormSuccess
          title="Centro registrado con éxito"
          message="Ya aparece en la lista de centros de acopio. Gracias por apoyar a la comunidad venezolana."
          onReset={reset}
          resetLabel="Registrar otro centro"
        />
      ) : (
        <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
          <Card className="space-y-4">
            <p className="text-sm font-semibold text-gray-800">Datos del centro</p>
            <FormInput
              label="Nombre del centro"
              name="name"
              required
              placeholder="Ej. Centro Comunitario Venezuela Unida"
              error={errors.name}
            />
            <FormInput
              label="Organización o responsable"
              name="organization"
              placeholder="Ej. Asociación de Venezolanos en Madrid"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  País <span className="text-red-500">*</span>
                </label>
                <select
                  name="country"
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust/40"
                >
                  <option value="">Selecciona un país…</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {errors.country && <p className="text-xs text-red-600">{errors.country}</p>}
              </div>
              <FormInput
                label="Ciudad"
                name="city"
                required
                placeholder="Ej. Madrid"
                error={errors.city}
              />
            </div>
            <FormInput
              label="Dirección"
              name="address"
              placeholder="Ej. Calle Gran Vía 45, piso 2"
            />
          </Card>

          <Card className="space-y-4">
            <p className="text-sm font-semibold text-gray-800">Contacto</p>
            {errors.contact && (
              <p className="text-xs text-red-600">{errors.contact}</p>
            )}
            <FormInput
              label="Teléfono / WhatsApp"
              name="phone"
              type="tel"
              placeholder="+34 600 123 456"
            />
            <FormInput
              label="Correo electrónico"
              name="email"
              type="email"
              placeholder="centro@ejemplo.com"
            />
            <FormInput
              label="Página web o red social"
              name="website"
              placeholder="https://instagram.com/mi-centro"
            />
          </Card>

          <Card className="space-y-4">
            <p className="text-sm font-semibold text-gray-800">Horario y notas</p>
            <FormInput
              label="Horario de acopio"
              name="schedule"
              placeholder="Ej. Lunes a viernes 10:00–18:00, sábados 10:00–14:00"
            />
            <Textarea
              label="Qué aceptan / notas adicionales"
              name="notes"
              placeholder="Ej. Ropa, medicamentos, alimentos no perecederos. No aceptamos muebles."
            />
          </Card>

          {serverError && <AlertBanner tone="emergency">{serverError}</AlertBanner>}

          <Button type="submit" variant="primary" size="lg" fullWidth disabled={submitting}>
            {submitting ? "Registrando…" : "Registrar centro"}
          </Button>
        </form>
      )}
    </PublicLayout>
  );
}
