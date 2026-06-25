import Link from "next/link";
import { ReactNode } from "react";

const navLinks = [
  { href: "/reportar-ayuda", label: "Necesito ayuda" },
  { href: "/estoy-bien", label: "Estoy bien" },
  { href: "/buscar-familiar", label: "Buscar familiar" },
  { href: "/voluntario", label: "Voluntario" },
  { href: "/donar", label: "Donar" },
  { href: "/mi-ayuda", label: "Mis casos" },
  { href: "/mapa", label: "Mapa" },
];

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emergency text-white">
              ❤
            </span>
            <span className="text-lg text-trust">
              Ayuda<span className="text-emergency">VE</span>
            </span>
          </Link>
          <nav className="hidden gap-1 md:flex">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-surface hover:text-trust"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/reportar-ayuda"
            className="rounded-lg bg-emergency px-3 py-1.5 text-sm font-semibold text-white hover:bg-emergency-dark md:hidden"
          >
            Ayuda
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-gray-500">
          <p className="font-semibold text-gray-700">
            AyudaVE — SOS Venezuela
          </p>
          <p className="mt-1">
            Esta plataforma no reemplaza a Protección Civil, bomberos, policía,
            ambulancias ni servicios oficiales de emergencia.
          </p>
          <div className="mt-3 flex flex-wrap gap-4">
            <Link href="/privacidad" className="hover:text-trust">
              Privacidad
            </Link>
            <Link href="/mapa" className="hover:text-trust">
              Mapa de ayuda
            </Link>
            <Link href="/admin" className="hover:text-trust">
              Panel de coordinación
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
