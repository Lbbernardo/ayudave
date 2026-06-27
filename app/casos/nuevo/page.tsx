"use client";

// Crear un caso de ayuda con VARIAS necesidades (persona individual o grupo).
// No reemplaza /reportar-ayuda (el sistema antiguo sigue intacto); es la nueva
// vía para publicar necesidades que los voluntarios pueden tomar por cupos.
import { useState, FormEvent } from "react";
import Link from "next/link";
import PublicLayout from "@/components/layout/PublicLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import FormInput from "@/components/ui/FormInput";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import AlertBanner from "@/components/ui/AlertBanner";
import LocationButton from "@/components/forms/LocationButton";
import NeedsBuilder from "@/components/forms/NeedsBuilder";
import { createCaseWithNeeds, type NeedInput } from "@/lib/opportunities";
import { URGENCY_OPTIONS } from "@/lib/types";
import { isInVenezuela } from "@/lib/utils";

const CASE_TYPES = [
  { value: "individual", label: "Persona / familia" },
  { value: "group", label: "Grupo de personas afectadas" },
];

export default function NuevoCasoPage() {
  const [needs, setNeeds] = useState<NeedInput[]>([
    { need_type: "agua", title: "", description: "", quantity_needed: 1, unit: "personas", urgency: "media" },
  ]);
  const [coords, setCoords] = useState<{ latitude: number | null; longitude: number | null }>({
    latitude: null, longitude: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setError("");
    const data = new FormData(ev.currentTarget);
    const city = String(data.get("city") || "").trim();
    const state = String(data.get("state") || "").trim();
    if (!city || !state) { setError("Indica estado y ciudad."); return; }
    const validNeeds = needs.filter((n) => n.title.trim() && n.quantity_needed >= 1);
    if (validNeeds.length === 0) { setError("Agrega al menos una necesidad con título."); return; }
    if (coords.latitude != null && !isInVenezuela(coords.latitude, coords.longitude)) {
      setError("La ubicación está fuera de Venezuela. Este portal coordina ayuda dentro del país.");
      return;
    }

    setSubmitting(true);
    const res = await createCaseWithNeeds(
      {
        case_type: (String(data.get("case_type")) as "individual" | "group") || "individual",
        requester_name: String(data.get("requester_name") || "").trim() || null,
        requester_phone: String(data.get("requester_phone") || "").trim() || null,
        state, city,
        address: String(data.get("address") || "").trim() || null,
        latitude: coords.latitude,
        longitude: coords.longitude,
        description: String(data.get("description") || "").trim() || null,
        urgency: String(data.get("urgency") || "media"),
      },
      validNeeds
    );
    setSubmitting(false);
    if (res.ok) setDone(true);
    else setError(res.error || "No se pudo crear el caso.");
  }

  return (
    <PublicLayout>
      <PageHeader
        title="Publicar un caso de ayuda"
        subtitle="Describe lo que necesitas. Cada necesidad será una oportunidad que un voluntario puede tomar."
        icon="📣"
      />

      {done ? (
        <div className="space-y-4">
          <AlertBanner tone="safe">
            Tu caso fue registrado. Las personas cercanas podrán ver las necesidades y ofrecer ayuda.
          </AlertBanner>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Link href="/oportunidades" className="w-full sm:w-auto">
              <Button variant="primary" fullWidth>Ver oportunidades</Button>
            </Link>
            <Link href="/" className="w-full sm:w-auto">
              <Button variant="outline" fullWidth>Volver al inicio</Button>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="space-y-4">
            <Select label="Tipo de caso" name="case_type" options={CASE_TYPES} defaultValue="individual" />
            <FormInput label="Tu nombre" name="requester_name" placeholder="Ej. Familia Pérez" />
            <FormInput label="Teléfono de contacto" name="requester_phone" type="tel" placeholder="+58 414 1234567" hint="No se muestra públicamente; solo coordinadores." />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormInput label="Estado" name="state" required placeholder="Ej. Carabobo" />
              <FormInput label="Ciudad" name="city" required placeholder="Ej. Valencia" />
            </div>
            <FormInput label="Dirección o referencia" name="address" placeholder="Sector, punto de referencia" />
            <Select label="Urgencia general" name="urgency" options={URGENCY_OPTIONS} defaultValue="media" />
            <Textarea label="Descripción del caso" name="description" placeholder="Cuéntanos la situación general." />
          </Card>

          <Card className="space-y-2">
            <p className="text-sm font-semibold text-gray-800">📍 Ubicación (opcional)</p>
            <p className="text-xs text-gray-600">Ayuda a que los voluntarios cercanos te encuentren.</p>
            <LocationButton onLocated={setCoords} />
            {coords.latitude != null && (
              <p className="text-xs font-semibold text-green-700">✓ Ubicación capturada</p>
            )}
          </Card>

          <div>
            <h2 className="mb-2 text-lg font-bold text-gray-900">¿Qué necesitas?</h2>
            <p className="mb-3 text-sm text-gray-600">Agrega cada necesidad por separado (agua, comida, voluntarios, etc.).</p>
            <NeedsBuilder needs={needs} onChange={setNeeds} />
          </div>

          {error && <AlertBanner tone="emergency">{error}</AlertBanner>}

          <Button type="submit" variant="emergency" size="lg" fullWidth disabled={submitting}>
            {submitting ? "Publicando…" : "Publicar caso"}
          </Button>
        </form>
      )}
    </PublicLayout>
  );
}
