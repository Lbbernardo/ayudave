"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PublicLayout from "@/components/layout/PublicLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import FormInput from "@/components/ui/FormInput";
import Button from "@/components/ui/Button";
import AlertBanner from "@/components/ui/AlertBanner";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { getSession, signInWithEmail } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  // Si ya hay sesión, ir directo al panel.
  useEffect(() => {
    void getSession().then((s) => {
      if (s) router.replace("/panel");
    });
  }, [router]);

  async function handleSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setError("");
    const data = new FormData(ev.currentTarget);
    const email = String(data.get("email") || "").trim();
    if (!email) return;

    setSubmitting(true);
    const redirectTo = `${window.location.origin}/panel`;
    const res = await signInWithEmail(email, redirectTo);
    setSubmitting(false);
    if (res.error) setError(res.error);
    else setSent(true);
  }

  return (
    <PublicLayout>
      <PageHeader
        title="Entrar al portal"
        subtitle="Para voluntarios, donantes y coordinadores. Te enviamos un enlace de acceso a tu correo."
        icon="🔑"
      />

      {!isSupabaseConfigured && (
        <AlertBanner tone="warning" className="mb-4">
          Supabase no está configurado: el acceso por correo no funcionará en
          modo demo.
        </AlertBanner>
      )}

      {sent ? (
        <AlertBanner tone="safe">
          <strong>Revisa tu correo.</strong> Te enviamos un enlace para entrar.
          Ábrelo desde este mismo dispositivo. Puede tardar un par de minutos o
          llegar a la carpeta de spam.
        </AlertBanner>
      ) : (
        <form onSubmit={handleSubmit}>
          <Card className="space-y-3">
            <FormInput
              label="Tu correo"
              name="email"
              type="email"
              placeholder="tucorreo@ejemplo.com"
              required
            />
            {error && <AlertBanner tone="emergency">{error}</AlertBanner>}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={submitting}
            >
              {submitting ? "Enviando…" : "Enviarme el enlace de acceso"}
            </Button>
            <p className="text-center text-xs text-gray-500">
              ¿Aún no te registras como voluntario o donante? Hazlo en{" "}
              <a href="/voluntario" className="font-semibold text-trust underline">
                Voluntario
              </a>{" "}
              o{" "}
              <a href="/donar" className="font-semibold text-trust underline">
                Donar
              </a>
              .
            </p>
          </Card>
        </form>
      )}
    </PublicLayout>
  );
}
