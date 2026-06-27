"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import PublicLayout from "@/components/layout/PublicLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import FormInput from "@/components/ui/FormInput";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import AlertBanner from "@/components/ui/AlertBanner";
import LocationButton from "@/components/forms/LocationButton";
import { registerCenter } from "@/lib/centers";

export default function RegistrarCentroPage() {
  const [coords, setCoords] = useState<{ latitude: number | null; longitude: number | null }>({ latitude: null, longitude: null });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setError("");
    const data = new FormData(ev.currentTarget);
    const name = String(data.get("name") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    if (!name || !phone) { setError("El nombre del centro y un teléfono son obligatorios."); return; }

    setSubmitting(true);
    const res = await registerCenter({
      name,
      manager_name: String(data.get("manager_name") || "").trim() || null,
      phone,
      email: String(data.get("email") || "").trim() || null,
      state: String(data.get("state") || "").trim() || null,
      city: String(data.get("city") || "").trim() || null,
      address: String(data.get("address") || "").trim() || null,
      latitude: coords.latitude,
      longitude: coords.longitude,
      schedule: String(data.get("schedule") || "").trim() || null,
      description: String(data.get("description") || "").trim() || null,
    });
    setSubmitting(false);
    if (res.ok) setDone(true);
    else setError(res.error || "No se pudo registrar el centro.");
  }

  return (
    <PublicLayout>
      <PageHeader
        title="Registrar centro de acopio"
        subtitle="Tu centro quedará pendiente de aprobación. Un coordinador te dará una clave para ingresar."
        icon="🏢"
      />

      {done ? (
        <div className="space-y-4">
          <AlertBanner tone="safe">
            ¡Centro registrado! Queda <strong>pendiente de aprobación</strong>. Un coordinador lo revisará y te
            entregará tu clave de acceso. Luego podrás entrar en{" "}
            <Link href="/centros/login" className="font-semibold underline">Centros · Ingresar</Link>.
          </AlertBanner>
          <Link href="/"><Button variant="outline" fullWidth>Volver al inicio</Button></Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="space-y-4">
            <FormInput label="Nombre del centro" name="name" required placeholder="Ej. Centro de Acopio La Guaira" />
            <FormInput label="Responsable" name="manager_name" placeholder="Ej. María Rodríguez" />
            <FormInput label="Teléfono" name="phone" type="tel" required placeholder="+58 414 1234567" hint="Con este teléfono y tu clave entrarás al panel." />
            <FormInput label="Correo electrónico" name="email" type="email" placeholder="centro@ejemplo.com" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormInput label="Estado" name="state" placeholder="Ej. La Guaira" />
              <FormInput label="Ciudad" name="city" placeholder="Ej. Maiquetía" />
            </div>
            <FormInput label="Dirección" name="address" placeholder="Calle, sector, referencia" />
            <FormInput label="Horario de atención" name="schedule" placeholder="Ej. L-V 8:00–17:00" />
            <Textarea label="Descripción" name="description" placeholder="Qué reciben, qué hacen, etc." />
          </Card>

          <Card className="space-y-2">
            <p className="text-sm font-semibold text-gray-800">📍 Ubicación (recomendada)</p>
            <LocationButton onLocated={setCoords} />
            {coords.latitude != null && <p className="text-xs font-semibold text-green-700">✓ Ubicación capturada</p>}
          </Card>

          {error && <AlertBanner tone="emergency">{error}</AlertBanner>}
          <Button type="submit" variant="primary" size="lg" fullWidth disabled={submitting}>
            {submitting ? "Registrando…" : "Registrar centro"}
          </Button>
        </form>
      )}
    </PublicLayout>
  );
}
