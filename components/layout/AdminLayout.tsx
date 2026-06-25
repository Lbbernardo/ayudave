import Link from "next/link";
import { ReactNode } from "react";
import AlertBanner from "@/components/ui/AlertBanner";

const adminNav = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/reportes", label: "Reportes", icon: "🆘" },
  { href: "/admin/personas", label: "Personas", icon: "👥" },
  { href: "/admin/voluntarios", label: "Voluntarios", icon: "🤝" },
];

// TODO: Proteger todas las rutas /admin con Supabase Auth.
// En esta primera versión el panel es accesible sin login para desarrollo.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="border-b border-gray-200 bg-trust text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emergency text-white">
              ❤
            </span>
            <span className="text-lg">
              AyudaVE <span className="text-warning">· Admin</span>
            </span>
          </Link>
          <Link
            href="/"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-white/90 hover:bg-white/10"
          >
            ← Ver sitio público
          </Link>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2">
          {adminNav.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-white/90 hover:bg-white/10"
            >
              <span>{l.icon}</span>
              {l.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <AlertBanner tone="info" className="mb-6">
          Modo desarrollo: el panel no requiere inicio de sesión.{" "}
          <strong>TODO:</strong> proteger con Supabase Auth antes de producción.
        </AlertBanner>
        {children}
      </main>
    </div>
  );
}
