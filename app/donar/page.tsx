"use client";

// Registro PÚBLICO de donantes (sin login). Mismo motivo que /voluntario:
// el correo de Supabase (magic link) tiene un límite bajo que bloqueaba el
// registro. El portal /panel sigue disponible para seguimiento con cuenta.
import { useState } from "react";
import Link from "next/link";
import PublicLayout from "@/components/layout/PublicLayout";
import PageHeader from "@/components/ui/PageHeader";
import FormSuccess from "@/components/forms/FormSuccess";
import AlertBanner from "@/components/ui/AlertBanner";
import HelperOnboarding from "@/components/portal/HelperOnboarding";

export default function DonarPage() {
  const [done, setDone] = useState(false);

  return (
    <PublicLayout>
      <PageHeader
        title="Quiero donar"
        subtitle="Registra qué puedes donar para que el sistema te conecte con quienes lo necesitan."
        icon="🎁"
      />

      {done ? (
        <FormSuccess
          title="¡Gracias por tu aporte!"
          message="Tu donación quedó registrada. Un coordinador puede contactarte para coordinar la entrega."
          onReset={() => setDone(false)}
          resetLabel="Registrar otra donación"
        />
      ) : (
        <div className="space-y-4">
          <AlertBanner tone="info">
            No necesitas crear una cuenta. Si quieres seguir tus aportes con
            sesión, puedes{" "}
            <Link href="/panel" className="font-semibold underline">entrar al portal</Link>.
          </AlertBanner>
          <HelperOnboarding userId={null} forceMode="donor" onDone={() => setDone(true)} />
        </div>
      )}
    </PublicLayout>
  );
}
