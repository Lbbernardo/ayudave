"use client";

// Registro PÚBLICO de voluntarios (sin login). No depende del correo para
// completarse: la clave de 4 dígitos se muestra en pantalla y, si dejan email,
// también se envía por correo. El portal /panel sigue disponible para
// seguimiento con cuenta.
import { useState } from "react";
import Link from "next/link";
import PublicLayout from "@/components/layout/PublicLayout";
import PageHeader from "@/components/ui/PageHeader";
import AlertBanner from "@/components/ui/AlertBanner";
import AccessCodeSuccess from "@/components/forms/AccessCodeSuccess";
import HelperOnboarding, { type OnboardingResult } from "@/components/portal/HelperOnboarding";

export default function VoluntarioPage() {
  const [result, setResult] = useState<OnboardingResult | null>(null);

  return (
    <PublicLayout>
      <PageHeader
        title="Quiero ser voluntario"
        subtitle="Regístrate para que el sistema te conecte con quienes necesitan ayuda cerca de ti."
        icon="🤝"
      />

      {result ? (
        <AccessCodeSuccess result={result} onReset={() => setResult(null)} resetLabel="Registrar otro voluntario" />
      ) : (
        <div className="space-y-4">
          <AlertBanner tone="info">
            No necesitas crear una cuenta. Si más adelante quieres seguir tus
            casos con sesión, puedes{" "}
            <Link href="/panel" className="font-semibold underline">entrar al portal</Link>.
          </AlertBanner>
          <HelperOnboarding userId={null} forceMode="volunteer" onDone={(r) => setResult(r ?? null)} />
        </div>
      )}
    </PublicLayout>
  );
}
