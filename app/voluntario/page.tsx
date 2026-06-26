"use client";

// Registro PÚBLICO de voluntarios (sin login). Antes vivía dentro del portal
// (/panel) con magic link, pero el correo de Supabase tiene un límite bajo
// ("email rate limit") que bloqueaba el registro. Ahora se guarda directo,
// sin depender del correo. El portal /panel sigue disponible para hacer
// seguimiento con cuenta.
import { useState } from "react";
import Link from "next/link";
import PublicLayout from "@/components/layout/PublicLayout";
import PageHeader from "@/components/ui/PageHeader";
import FormSuccess from "@/components/forms/FormSuccess";
import AlertBanner from "@/components/ui/AlertBanner";
import HelperOnboarding from "@/components/portal/HelperOnboarding";

export default function VoluntarioPage() {
  const [done, setDone] = useState(false);

  return (
    <PublicLayout>
      <PageHeader
        title="Quiero ser voluntario"
        subtitle="Regístrate para que el sistema te conecte con quienes necesitan ayuda cerca de ti."
        icon="🤝"
      />

      {done ? (
        <FormSuccess
          title="¡Gracias por sumarte!"
          message="Tu perfil de voluntario quedó registrado. Un coordinador puede contactarte y el sistema te asignará casos cercanos."
          onReset={() => setDone(false)}
          resetLabel="Registrar otro voluntario"
        />
      ) : (
        <div className="space-y-4">
          <AlertBanner tone="info">
            No necesitas crear una cuenta. Si más adelante quieres seguir tus
            casos con sesión, puedes{" "}
            <Link href="/panel" className="font-semibold underline">entrar al portal</Link>.
          </AlertBanner>
          <HelperOnboarding userId={null} forceMode="volunteer" onDone={() => setDone(true)} />
        </div>
      )}
    </PublicLayout>
  );
}
