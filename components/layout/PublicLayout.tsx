import Link from "next/link";
import { ReactNode } from "react";
import BottomNav from "./BottomNav";

// Navegación horizontal (solo escritorio). En móvil se usa la barra inferior.
const navLinks = [
  { href: "/reportar-ayuda", label: "Necesito ayuda" },
  { href: "/estoy-bien", label: "Estoy bien" },
  { href: "/buscar-familiar", label: "Buscar familiar" },
  { href: "/voluntario", label: "Quiero ayudar" },
  { href: "/mapa", label: "Mapa" },
  { href: "/refugio", label: "Refugio" },
  { href: "/acopio-exterior", label: "Acopio exterior" },
];

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emergency text-white shadow-sm">
              ❤
            </span>
            <span className="text-lg text-trust">
              Ayuda<span className="text-emergency">VE</span>
            </span>
          </Link>

          {/* Navegación de escritorio */}
          <nav className="hidden gap-1 md:flex">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-surface hover:text-trust"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* CTA móvil en el header */}
          <Link
            href="/reportar-ayuda"
            className="rounded-xl bg-emergency px-4 py-2 text-sm font-bold text-white shadow-sm active:scale-95 transition-transform md:hidden"
          >
            🆘 Ayuda
          </Link>
        </div>
      </header>

      {/* Contenido — padding inferior para no quedar bajo la barra de navegación móvil */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-[calc(var(--bottom-nav-h)+1.5rem)] md:pb-10">
        {children}
      </main>

      {/* Footer (solo escritorio; en móvil la barra inferior ocupa ese rol) */}
      <footer className="hidden border-t border-gray-200 bg-white md:block">
        <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-gray-500">
          <p className="font-semibold text-gray-700">AyudaVE — SOS Venezuela</p>
          <p className="mt-1">
            Esta plataforma no reemplaza a Protección Civil, bomberos, policía,
            ambulancias ni servicios oficiales de emergencia.
          </p>
          <div className="mt-3 flex flex-wrap gap-4">
            <Link href="/privacidad" className="hover:text-trust">Privacidad</Link>
            <Link href="/mapa" className="hover:text-trust">Mapa de ayuda</Link>
            <Link href="/admin" prefetch={false} className="hover:text-trust">Panel de coordinación</Link>
          </div>
        </div>
      </footer>

      {/* Barra de navegación inferior (solo móvil) */}
      <BottomNav />
    </div>
  );
}
