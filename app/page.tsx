import Link from "next/link";
import PublicLayout from "@/components/layout/PublicLayout";
import EmergencyNotice from "@/components/ui/EmergencyNotice";

const ACTIONS = [
  {
    href: "/reportar-ayuda",
    title: "Necesito ayuda",
    description: "Comida, agua, medicamentos, rescate o cualquier emergencia.",
    icon: "🆘",
    bg: "bg-red-50 border-red-200 hover:border-red-400",
    badge: "bg-red-600 text-white",
    badgeText: "Urgente",
  },
  {
    href: "/estoy-bien",
    title: "Estoy bien",
    description: "Avisa a tu familia que estás a salvo. Aparece en el mapa.",
    icon: "✅",
    bg: "bg-green-50 border-green-200 hover:border-green-400",
    badge: "bg-green-600 text-white",
    badgeText: "Tranquiliza a tu familia",
  },
  {
    href: "/buscar-familiar",
    title: "Busco a alguien",
    description: "Registra a una persona desaparecida con foto. Aparece en el mapa.",
    icon: "🔎",
    bg: "bg-purple-50 border-purple-200 hover:border-purple-400",
    badge: "bg-purple-600 text-white",
    badgeText: "Con foto",
  },
  {
    href: "/mapa",
    title: "Ver el mapa",
    description: "Reportes, personas buscadas, refugios y centros de acopio en tiempo real.",
    icon: "🗺️",
    bg: "bg-blue-50 border-blue-200 hover:border-blue-400",
    badge: "bg-blue-600 text-white",
    badgeText: "En tiempo real",
  },
  {
    href: "/voluntario",
    title: "Quiero ser voluntario",
    description: "Regístrate y el sistema te conecta automáticamente con quien te necesita.",
    icon: "🤝",
    bg: "bg-amber-50 border-amber-200 hover:border-amber-400",
    badge: "bg-amber-600 text-white",
    badgeText: "Ayuda directa",
  },
  {
    href: "/donar",
    title: "Quiero donar",
    description: "Registra qué puedes donar: alimentos, medicina, ropa, transporte.",
    icon: "💛",
    bg: "bg-yellow-50 border-yellow-200 hover:border-yellow-400",
    badge: "bg-yellow-600 text-white",
    badgeText: "Cualquier ayuda cuenta",
  },
  {
    href: "/refugio",
    title: "Registrar refugio",
    description: "¿Tienes un refugio o centro de acopio en Venezuela? Regístralo.",
    icon: "🏠",
    bg: "bg-violet-50 border-violet-200 hover:border-violet-400",
    badge: "bg-violet-600 text-white",
    badgeText: "Dentro de Venezuela",
  },
  {
    href: "/acopio-exterior",
    title: "Acopio fuera de Venezuela",
    description: "Encuentra o registra centros en el exterior para enviar ayuda.",
    icon: "🌎",
    bg: "bg-sky-50 border-sky-200 hover:border-sky-400",
    badge: "bg-sky-600 text-white",
    badgeText: "Diáspora venezolana",
  },
];

const HOW = [
  { icon: "📝", title: "Reporta en segundos", desc: "Llena un formulario corto con tu necesidad y ubicación GPS." },
  { icon: "🔗", title: "El sistema conecta", desc: "AyudaVE busca automáticamente al voluntario o donante más cercano." },
  { icon: "🤝", title: "Se coordina la ayuda", desc: "El voluntario recibe los datos y se dirige hacia ti." },
  { icon: "✅", title: "Caso completado", desc: "El mapa muestra un ❤️ por cada persona que recibió ayuda." },
];

export default function HomePage() {
  return (
    <PublicLayout>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mb-10 rounded-2xl bg-gradient-to-br from-trust to-trust/80 px-6 py-10 text-center text-white shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
          Red de ayuda humanitaria
        </p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">
          Ayuda<span className="text-red-400">VE</span>
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-base text-blue-100 sm:text-lg">
          Conectamos a quienes necesitan ayuda con voluntarios y donantes
          cercanos en Venezuela. Rápido, gratuito y sin registro obligatorio.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/reportar-ayuda"
            className="rounded-xl bg-red-500 px-6 py-3 font-bold text-white shadow hover:bg-red-600"
          >
            🆘 Necesito ayuda ahora
          </Link>
          <Link
            href="/mapa"
            className="rounded-xl bg-white/20 px-6 py-3 font-semibold text-white backdrop-blur hover:bg-white/30"
          >
            🗺️ Ver el mapa
          </Link>
        </div>
      </section>

      {/* ── Aviso emergencia ─────────────────────────────────────────────── */}
      <div className="mb-8">
        <EmergencyNotice />
      </div>

      {/* ── Acciones ─────────────────────────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="mb-4 text-xl font-bold text-gray-900">¿Qué necesitas hacer?</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ACTIONS.map((a) => (
            <Link key={a.href} href={a.href} className="group block">
              <div className={`flex h-full flex-col rounded-xl border-2 p-4 transition-all duration-150 ${a.bg}`}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-3xl">{a.icon}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${a.badge}`}>
                    {a.badgeText}
                  </span>
                </div>
                <h3 className="mt-3 font-bold text-gray-900">{a.title}</h3>
                <p className="mt-1 text-xs text-gray-600 leading-relaxed">{a.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Cómo funciona ────────────────────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="mb-4 text-xl font-bold text-gray-900">Cómo funciona</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {HOW.map((s, i) => (
            <div key={i} className="rounded-xl bg-white border border-gray-100 p-4 shadow-sm text-center">
              <div className="text-3xl">{s.icon}</div>
              <div className="mt-2 flex justify-center">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-trust text-xs font-bold text-white">
                  {i + 1}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-gray-900">{s.title}</p>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Acopio exterior banner ───────────────────────────────────────── */}
      <section className="mb-10">
        <div className="rounded-2xl bg-gradient-to-r from-sky-600 to-blue-700 p-6 text-white">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-sky-200">¿Estás fuera de Venezuela?</p>
              <h3 className="mt-1 text-xl font-bold">Centros de acopio en el exterior</h3>
              <p className="mt-1 text-sm text-sky-100">
                Encuentra un centro cerca de ti para enviar ayuda o registra el tuyo.
              </p>
            </div>
            <Link
              href="/acopio-exterior"
              className="shrink-0 rounded-xl bg-white px-5 py-3 font-bold text-sky-700 hover:bg-sky-50"
            >
              🌎 Ver centros
            </Link>
          </div>
        </div>
      </section>

      {/* ── Privacidad ───────────────────────────────────────────────────── */}
      <section className="mb-10">
        <div className="rounded-xl border border-trust/20 bg-trust/5 p-5">
          <h2 className="font-bold text-trust">🔒 Tu privacidad importa</h2>
          <p className="mt-2 text-sm text-gray-700">
            Los números de teléfono <strong>nunca</strong> se muestran
            públicamente. Solo los coordinadores autorizados pueden ver los
            datos de contacto completos. La información se usa únicamente para
            coordinación humanitaria.
          </p>
          <Link href="/privacidad" className="mt-2 inline-block text-sm font-semibold text-trust underline">
            Leer la política de privacidad →
          </Link>
        </div>
      </section>

      {/* ── Contactar al desarrollador ───────────────────────────────────── */}
      <section className="mb-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                ¿Tienes ideas o quieres colaborar?
              </p>
              <h3 className="mt-1 font-bold text-gray-900">Contactar al desarrollador</h3>
              <p className="mt-1 text-sm text-gray-600">
                AyudaVE es un proyecto de código abierto. Si tienes sugerencias,
                quieres reportar un problema o deseas colaborar, escríbenos.
              </p>
            </div>
            <a
              href="https://wa.me/6304154252"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-2 rounded-xl bg-green-500 px-5 py-3 font-bold text-white hover:bg-green-600 shadow"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
