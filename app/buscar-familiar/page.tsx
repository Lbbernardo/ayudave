"use client";

import { useState, FormEvent, useRef } from "react";
import PublicLayout from "@/components/layout/PublicLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import FormInput from "@/components/ui/FormInput";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import AlertBanner from "@/components/ui/AlertBanner";
import FormSuccess from "@/components/forms/FormSuccess";
import LocationButton from "@/components/forms/LocationButton";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { insertRow } from "@/lib/submit";

interface Coords { latitude: number | null; longitude: number | null; }

export default function BuscarFamiliarPage() {
  const [coords, setCoords] = useState<Coords>({ latitude: null, longitude: null });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [demo, setDemo] = useState(false);
  const [serverError, setServerError] = useState("");
  const [formKey, setFormKey] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

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

    // Subir foto si hay una.
    let photoUrl: string | null = null;
    const sb = getSupabaseClient();
    if (photoFile && sb) {
      const ext = photoFile.name.split(".").pop() ?? "jpg";
      const path = `missing/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await sb.storage.from("fotos").upload(path, photoFile, { upsert: false });
      if (!upErr) {
        const { data: urlData } = sb.storage.from("fotos").getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }
    }

    const payload = {
      missing_name: String(data.get("missing_name")).trim(),
      last_known_location: String(data.get("last_known_location") || "").trim() || null,
      description: String(data.get("description") || "").trim() || null,
      contact_name: String(data.get("contact_name")).trim(),
      contact_phone: String(data.get("contact_phone") || "").trim() || null,
      city: String(data.get("city") || "").trim() || null,
      state: String(data.get("state") || "").trim() || null,
      latitude: coords.latitude,
      longitude: coords.longitude,
      photo_url: photoUrl,
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
    setCoords({ latitude: null, longitude: null });
    setPhotoFile(null);
    setPhotoPreview(null);
    setServerError("");
    setFormKey((k) => k + 1);
  }

  return (
    <PublicLayout>
      <PageHeader
        title="Buscar familiar"
        subtitle="Reporta a una persona que no logras localizar. Aparecerá en el mapa."
        icon="🔎"
      />

      {success ? (
        <div className="space-y-4">
          {demo && (
            <AlertBanner tone="info">
              Modo demo: Supabase no configurado, la búsqueda no se guardó.
            </AlertBanner>
          )}
          <FormSuccess
            title="Registramos tu búsqueda"
            message="La búsqueda ya aparece en el mapa. Si alguien tiene información, verá tus datos de contacto."
            onReset={reset}
            resetLabel="Buscar a otra persona"
          />
        </div>
      ) : (
        <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
          <AlertBanner tone="info">
            Tu teléfono de contacto{" "}
            <strong>no se mostrará públicamente</strong>. Solo lo verán los
            coordinadores para ayudarte.
          </AlertBanner>

          {/* Datos de la persona buscada */}
          <Card className="space-y-4">
            <p className="text-sm font-semibold text-gray-800">
              Datos de la persona buscada
            </p>
            <FormInput
              label="Nombre completo"
              name="missing_name"
              required
              placeholder="Ej. Carlos Gómez"
              error={errors.missing_name}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormInput
                label="Estado donde fue visto/a"
                name="state"
                placeholder="Ej. Vargas"
              />
              <FormInput
                label="Ciudad"
                name="city"
                placeholder="Ej. La Guaira"
              />
            </div>
            <FormInput
              label="Última ubicación conocida"
              name="last_known_location"
              placeholder="Ej. Sector El Valle, cerca del mercado"
            />
            <Textarea
              label="Descripción"
              name="description"
              placeholder="Edad, vestimenta, señas particulares, circunstancias en que se perdió."
            />

            {/* Foto */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Foto de la persona{" "}
                <span className="text-gray-400">(opcional pero muy útil)</span>
              </p>
              {photoPreview && (
                <div className="flex items-start gap-3">
                  <img
                    src={photoPreview}
                    alt="Vista previa"
                    className="h-24 w-24 rounded-lg object-cover border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                    className="text-xs text-red-500 underline"
                  >
                    Quitar foto
                  </button>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-trust/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-trust hover:file:bg-trust/20"
              />
              <p className="text-xs text-gray-400">
                Se mostrará en el mapa para que quien la vea la reconozca.
              </p>
            </div>
          </Card>

          {/* Tus datos */}
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
              hint="No se mostrará públicamente. El coordinador te contactará si hay información."
            />
          </Card>

          {/* Ubicación donde fue visto por última vez */}
          <Card className="space-y-3">
            <p className="text-sm font-semibold text-gray-800">
              Ubicación aproximada donde fue visto/a
            </p>
            <p className="text-xs text-gray-600">
              Si sabes dónde fue visto/a por última vez, comparte la ubicación
              para que aparezca en el mapa en ese punto.
            </p>
            <LocationButton onLocated={setCoords} />
            {coords.latitude != null && (
              <p className="text-xs font-semibold text-green-700">
                ✓ Ubicación marcada ({coords.latitude.toFixed(5)},{" "}
                {coords.longitude!.toFixed(5)})
              </p>
            )}
          </Card>

          {serverError && <AlertBanner tone="emergency">{serverError}</AlertBanner>}

          <Button type="submit" variant="primary" size="lg" fullWidth disabled={submitting}>
            {submitting ? "Enviando…" : "Reportar persona buscada"}
          </Button>
        </form>
      )}
    </PublicLayout>
  );
}
