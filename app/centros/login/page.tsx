"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PublicLayout from "@/components/layout/PublicLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import FormInput from "@/components/ui/FormInput";
import Button from "@/components/ui/Button";
import AlertBanner from "@/components/ui/AlertBanner";
import { loginCenter } from "@/lib/centers";
import { CENTER_SESSION_KEY } from "@/lib/centerSession";

export default function CentroLoginPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setError("");
    const data = new FormData(ev.currentTarget);
    const phone = String(data.get("phone") || "").trim();
    const code = String(data.get("code") || "").trim();
    if (!phone || !code) return;

    setSubmitting(true);
    const res = await loginCenter(phone, code);
    setSubmitting(false);
    if (res.ok) {
      sessionStorage.setItem(CENTER_SESSION_KEY, JSON.stringify(res.center));
      router.push("/centros/dashboard");
    } else if (res.reason === "pendiente") {
      setError("Tu centro aún no ha sido aprobado por un coordinador. Intenta más tarde.");
    } else if (res.reason === "conexion") {
      setError("Sin conexión a la base de datos.");
    } else {
      setError("Teléfono o clave incorrectos.");
    }
  }

  return (
    <PublicLayout>
      <PageHeader
        title="Ingresar — Centro de acopio"
        subtitle="Entra con el teléfono de tu centro y la clave que te dio el coordinador."
        icon="🔑"
      />
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="space-y-3">
          <FormInput label="Teléfono del centro" name="phone" type="tel" required placeholder="+58 414 1234567" />
          <FormInput label="Clave de acceso" name="code" type="text" required placeholder="••••" />
          <Button type="submit" variant="primary" size="lg" fullWidth disabled={submitting}>
            {submitting ? "Entrando…" : "Entrar"}
          </Button>
        </Card>
        {error && <AlertBanner tone="emergency">{error}</AlertBanner>}
        <p className="text-center text-sm text-gray-500">
          ¿Aún no tienes centro?{" "}
          <Link href="/centros/registrar" className="font-semibold text-trust underline">Regístralo aquí</Link>
        </p>
      </form>
    </PublicLayout>
  );
}
