"use client";

import Link from "next/link";
import PublicLayout from "@/components/layout/PublicLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

export default function VoluntarioPage() {
  return (
    <PublicLayout>
      <PageHeader
        title="Soy voluntario"
        subtitle="Elige una opcion segun tu situacion."
        icon="🤝"
      />

      <div className="space-y-4 mt-2">
        {/* Opcion principal: ya registrado */}
        <Link href="/mi-ayuda" className="block">
          <Card className="flex items-center gap-4 p-5 active:scale-[0.98] transition-transform cursor-pointer hover:ring-2 hover:ring-trust/30">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-trust/10 text-4xl">
              📋
            </span>
            <div className="min-w-0">
              <p className="text-lg font-bold text-gray-900">Ver mis casos</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Ya me registre y tengo mi clave de 4 digitos
              </p>
            </div>
            <span className="ml-auto text-3xl text-gray-300 shrink-0">›</span>
          </Card>
        </Link>

        {/* Opcion secundaria: primera vez */}
        <Link href="/voluntario/registrar" className="block">
          <Card className="flex items-center gap-4 p-5 active:scale-[0.98] transition-transform cursor-pointer hover:ring-2 hover:ring-safe/30">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-safe/10 text-4xl">
              ✨
            </span>
            <div className="min-w-0">
              <p className="text-lg font-bold text-gray-900">Registrarme</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Primera vez aqui, aun no tengo clave
              </p>
            </div>
            <span className="ml-auto text-3xl text-gray-300 shrink-0">›</span>
          </Card>
        </Link>
      </div>

      <p className="mt-8 text-center text-sm text-gray-400">
        Si ya eres voluntario y perdiste tu clave,{" "}
        <Link href="/voluntario/registrar" className="underline text-trust">
          vuelvete a registrar con el mismo correo
        </Link>
        .
      </p>
    </PublicLayout>
  );
}
