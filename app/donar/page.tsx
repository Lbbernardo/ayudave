"use client";

// Registro PÚBLICO de donantes (sin login). La clave de 4 dígitos se muestra
// en pantalla y, si dejan email, también se envía por correo.
import { useState } from "react";
import Link from "next/link";
import PublicLayout from "@/components/layout/PublicLayout";
import PageHeader from "@/components/ui/PageHeader";
import AlertBanner from "@/components/ui/AlertBanner";
import AccessCodeSuccess from "@/components/forms/AccessCodeSuccess";
import HelperOnboarding, { type OnboardingResult } from "@/components/portal/HelperOnboarding";

export default function DonarPage() {
  const [result, setResult] = useState<OnboardingResult | null>(null);

  return (
    <PublicLayout>
      <PageHeader
        title="Quiero donar"
        subtitle="Registra qué puedes donar para que el sistema te conecte con quienes lo necesitan."
        icon="🎁"
      />

      {result ? (
        <AccessCodeSuccess result={result} onReset={() => setResult(null)} resetLabel="Registrar otra donación" />
      ) : (
        <div className="space-y-4">
          <AlertBanner tone="info">
            No necesitas crear una cuenta. Si quieres seguir tus aportes con
            sesión, puedes{" "}
            <Link href="/panel" className="font-semibold underline">entrar al portal</Link>.
          </AlertBanner>
          <HelperOnboarding userId={null} forceMode="donor" onDone={(r) => setResult(r ?? null)} />
        </div>
      )}
    </PublicLayout>
  );
}
