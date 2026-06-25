import Link from "next/link";
import PublicLayout from "@/components/layout/PublicLayout";
import EmergencyNotice from "@/components/ui/EmergencyNotice";
import Card from "@/components/ui/Card";

const actions = [
  {
    href: "/reportar-ayuda",
    title: "Necesito ayuda",
    description: "Reporta una necesidad médica, agua, comida o rescate.",
    icon: "🆘",
    accent: "border-emergency/30 hover:border-emergency bg-emergency/5",
  },
  {
    href: "/estoy-bien",
    title: "Estoy bien",
    description: "Avisa a tus seres queridos que te encuentras a salvo.",
    icon: "✅",
    accent: "border-safe/30 hover:border-safe bg-safe/5",
  },
  {
    href: "/buscar-familiar",
    title: "Busco familiar",
    description: "Reporta a una persona desaparecida o que no localizas.",
    icon: "🔎",
    accent: "border-trust/30 hover:border-trust bg-trust/5",
  },
  {
    href: "/voluntario",
    title: "Soy voluntario",
    description: "Regístrate para ayudar con tus habilidades o vehículo.",
    icon: "🤝",
    accent: "border-trust/30 hover:border-trust bg-trust/5",
  },
  {
    href: "/donar",
    title: "Quiero donar",
    description: "Ofrece agua, comida, medicinas, transporte o refugio.",
    icon: "🎁",
    accent: "border-warning-dark/30 hover:border-warning-dark bg-warning/10",
  },
  {
    href: "/mi-ayuda",
    title: "Mis casos",
    description: "¿Eres voluntario o donante? Ingresa tu teléfono y revisa los casos asignados.",
    icon: "📋",
    accent: "border-trust/30 hover:border-trust bg-trust/5",
  },
  {
    href: "/mapa",
    title: "Ver mapa de ayuda",
    description: "Explora los reportes y necesidades por zona.",
    icon: "🗺️",
    accent: "border-gray-300 hover:border-trust bg-white",
  },
];

const steps = [
  {
    n: 1,
    title: "Reporta tu situación",
    description: "Completa un formulario corto con tu necesidad y ubicación.",
  },
  {
    n: 2,
    title: "Se registra en el sistema",
    description: "Tu reporte queda guardado y visible para los coordinadores.",
  },
  {
    n: 3,
    title: "Voluntarios y coordinadores pueden ayudarte",
    description: "El equipo prioriza los casos y coordina la respuesta.",
  },
];

export default function HomePage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-trust sm:text-5xl">
          Ayuda<span className="text-emergency">VE</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-gray-600 sm:text-lg">
          Reporta ayuda, encuentra familiares y coordina voluntarios.
        </p>
        <div className="mx-auto mt-5 max-w-2xl">
          <EmergencyNotice />
        </div>
      </section>

      {/* Acciones principales */}
      <section className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((a) => (
          <Link key={a.href} href={a.href} className="block">
            <div
              className={`flex h-full flex-col rounded-xl border-2 p-5 transition-colors ${a.accent}`}
            >
              <span className="text-3xl">{a.icon}</span>
              <h2 className="mt-3 text-lg font-bold text-gray-900">
                {a.title}
              </h2>
              <p className="mt-1 text-sm text-gray-600">{a.description}</p>
            </div>
          </Link>
        ))}
      </section>

      {/* Cómo funciona */}
      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Cómo funciona</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {steps.map((s) => (
            <Card key={s.n}>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-trust text-base font-bold text-white">
                {s.n}
              </div>
              <h3 className="mt-3 font-semibold text-gray-900">{s.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{s.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Privacidad */}
      <section className="mb-4">
        <Card className="bg-trust/5">
          <h2 className="text-xl font-bold text-trust">Tu privacidad importa</h2>
          <p className="mt-2 text-sm text-gray-700">
            Los números de teléfono <strong>nunca</strong> se muestran de forma
            pública. Solo los coordinadores autorizados pueden ver los datos de
            contacto completos para organizar la ayuda. La información se usa
            únicamente para coordinación humanitaria.
          </p>
          <Link
            href="/privacidad"
            className="mt-3 inline-block text-sm font-semibold text-trust underline"
          >
            Leer la política de privacidad →
          </Link>
        </Card>
      </section>
    </PublicLayout>
  );
}
