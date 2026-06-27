"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

// Pestañas principales (móvil). El centro "Ayuda" va destacado.
const TABS = [
  { href: "/", label: "Inicio", icon: "🏠" },
  { href: "/oportunidades", label: "Ayudar", icon: "✨" },
  { href: "/reportar-ayuda", label: "Ayuda", icon: "🆘", center: true },
  { href: "/mi-ayuda", label: "Mis casos", icon: "📋" },
];

// Destinos secundarios que se abren en la hoja "Más".
const MORE = [
  { href: "/casos/nuevo", label: "Publicar un caso", icon: "📣", desc: "Pide ayuda con varias necesidades" },
  { href: "/voluntario", label: "Soy voluntario", icon: "🤝", desc: "Regístrate para ayudar" },
  { href: "/centros/login", label: "Centro de acopio", icon: "🏢", desc: "Ingresar o registrar un centro" },
  { href: "/mapa", label: "Mapa", icon: "🗺️", desc: "Reportes, refugios y más" },
  { href: "/estoy-bien", label: "Estoy bien", icon: "✅", desc: "Avisa que estás a salvo" },
  { href: "/buscar-familiar", label: "Buscar familiar", icon: "🔎", desc: "Reporta a una persona" },
  { href: "/donar", label: "Quiero donar", icon: "💛", desc: "Registra qué puedes donar" },
  { href: "/refugio", label: "Refugio / Acopio", icon: "🏠", desc: "Dentro de Venezuela" },
  { href: "/acopio-exterior", label: "Acopio exterior", icon: "🌎", desc: "Centros fuera del país" },
  { href: "/privacidad", label: "Privacidad", icon: "🔒", desc: "Cómo cuidamos tus datos" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function BottomNav() {
  const pathname = usePathname() || "/";
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE.some((m) => isActive(pathname, m.href));

  return (
    <>
      {/* Hoja "Más" */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <button
            aria-label="Cerrar menú"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-black/40 animate-fade-in"
          />
          <div className="absolute inset-x-0 bottom-0 animate-slide-up rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-300" />
            <h2 className="mb-3 px-1 text-sm font-bold text-gray-900">Más opciones</h2>
            <div className="grid grid-cols-1 gap-1">
              {MORE.map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  onClick={() => setMoreOpen(false)}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors ${
                    isActive(pathname, m.href) ? "bg-trust/10" : "active:bg-gray-100"
                  }`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface text-xl">
                    {m.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-900">{m.label}</span>
                    <span className="block text-xs text-gray-500">{m.desc}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Barra inferior (solo móvil) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
          {TABS.map((t) =>
            t.center ? (
              <Link
                key={t.href}
                href={t.href}
                className="flex flex-1 flex-col items-center justify-center"
              >
                <span className="-mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emergency text-2xl text-white shadow-lg shadow-emergency/30 ring-4 ring-white active:scale-95 transition-transform">
                  {t.icon}
                </span>
                <span className="mt-0.5 text-[10px] font-semibold text-emergency">{t.label}</span>
              </Link>
            ) : (
              <Link
                key={t.href}
                href={t.href}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5"
              >
                <span className={`text-xl leading-none transition-transform ${isActive(pathname, t.href) ? "scale-110" : "opacity-60"}`}>
                  {t.icon}
                </span>
                <span className={`text-[10px] font-medium ${isActive(pathname, t.href) ? "text-trust font-bold" : "text-gray-500"}`}>
                  {t.label}
                </span>
              </Link>
            )
          )}
          {/* Botón Más */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5"
          >
            <span className={`text-xl leading-none transition-transform ${moreActive || moreOpen ? "scale-110" : "opacity-60"}`}>☰</span>
            <span className={`text-[10px] font-medium ${moreActive || moreOpen ? "text-trust font-bold" : "text-gray-500"}`}>Más</span>
          </button>
        </div>
      </nav>
    </>
  );
}
