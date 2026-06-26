"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Report } from "@/lib/types";
import { urgencyColor, formatDateShort } from "@/lib/utils";

export interface Refugio {
  id: string;
  name: string;
  type: "refugio" | "centro_acopio";
  address?: string | null;
  city?: string | null;
  state?: string | null;
  latitude: number;
  longitude: number;
  capacity?: number | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  notes?: string | null;
}

interface ReportsMapProps {
  token: string;
  reports: Report[];
  refugios?: Refugio[];
}

const VENEZUELA_CENTER: [number, number] = [-66.9, 10.48];

const REFUGIO_COLOR = "#7c3aed";   // morado — refugio
const ACOPIO_COLOR  = "#ea580c";   // naranja — centro de acopio
const DONE_COLOR    = "#ec4899";   // rosa — caso completado (corazón)

export default function ReportsMap({ token, reports, refugios = [] }: ReportsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: VENEZUELA_CENTER,
      zoom: 5,
    });
    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = new mapboxgl.LngLatBounds();
    let hasPoints = false;

    // ── Reportes ──────────────────────────────────────────────────────────
    const withGeo = reports.filter((r) => r.latitude != null && r.longitude != null);
    withGeo.forEach((r) => {
      const done = r.assignment_status === "completado";

      const el = document.createElement("div");
      if (done) {
        // Corazón para casos completados
        el.style.fontSize = "22px";
        el.style.lineHeight = "1";
        el.style.cursor = "default";
        el.textContent = "❤️";
        el.title = "Persona ayudada";
      } else {
        el.style.width = "18px";
        el.style.height = "18px";
        el.style.borderRadius = "50%";
        el.style.border = "2px solid white";
        el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.4)";
        el.style.background = urgencyColor(r.urgency);
        el.style.cursor = "pointer";
      }

      const popupHtml = done
        ? `<div style="min-width:160px;text-align:center">
            <div style="font-size:28px">❤️</div>
            <div style="font-weight:700;color:#16a34a;margin-top:4px">Persona ayudada</div>
            <div style="color:#374151;font-size:13px;margin-top:2px">${escapeHtml(r.help_type)}</div>
            <div style="color:#6b7280;font-size:12px">${escapeHtml(r.city || "—")}, ${escapeHtml(r.state || "—")}</div>
           </div>`
        : `<div style="min-width:180px">
            <div style="font-weight:700;color:#111827">${escapeHtml(r.help_type)} · ${escapeHtml(r.urgency)}</div>
            <div style="color:#374151;margin-top:2px">${escapeHtml(r.city || "—")}, ${escapeHtml(r.state || "—")}</div>
            ${r.description ? `<div style="color:#6b7280;margin-top:4px">${escapeHtml(r.description.slice(0, 120))}</div>` : ""}
            <div style="color:#9ca3af;margin-top:6px;font-size:11px">${formatDateShort(r.created_at)}</div>
            <a href="/ayudar/${r.id}" style="display:block;margin-top:10px;background:#1d4ed8;color:#fff;
               text-align:center;padding:8px 12px;border-radius:8px;font-weight:600;
               font-size:13px;text-decoration:none">
              🤝 Quiero ayudar
            </a>
           </div>`;

      const popup = new mapboxgl.Popup({ offset: 14 }).setHTML(popupHtml);
      const marker = new mapboxgl.Marker(el)
        .setLngLat([r.longitude as number, r.latitude as number])
        .setPopup(popup)
        .addTo(map);
      markersRef.current.push(marker);
      bounds.extend([r.longitude as number, r.latitude as number]);
      hasPoints = true;
    });

    // ── Refugios y centros de acopio ─────────────────────────────────────
    refugios.forEach((ref) => {
      const isAcopio = ref.type === "centro_acopio";
      const color = isAcopio ? ACOPIO_COLOR : REFUGIO_COLOR;
      const icon = isAcopio ? "📦" : "🏠";
      const label = isAcopio ? "Centro de acopio" : "Refugio";

      const el = document.createElement("div");
      el.style.fontSize = "22px";
      el.style.lineHeight = "1";
      el.style.cursor = "pointer";
      el.textContent = icon;
      el.title = label;

      const zona = [ref.city, ref.state].filter(Boolean).join(", ") || "—";
      const popupHtml = `
        <div style="min-width:180px">
          <div style="font-size:20px">${icon}</div>
          <div style="font-weight:700;color:${color};margin-top:4px">${label}</div>
          <div style="font-weight:600;color:#111827;margin-top:2px">${escapeHtml(ref.name)}</div>
          <div style="color:#374151;font-size:13px">${escapeHtml(zona)}</div>
          ${ref.address ? `<div style="color:#6b7280;font-size:12px;margin-top:2px">${escapeHtml(ref.address)}</div>` : ""}
          ${ref.capacity ? `<div style="color:#6b7280;font-size:12px;margin-top:2px">Capacidad: ${ref.capacity}</div>` : ""}
          ${ref.contact_name || ref.contact_phone ? `
          <div style="margin-top:6px;font-size:12px;color:#374151">
            ${ref.contact_name ? escapeHtml(ref.contact_name) : ""}
            ${ref.contact_phone ? ` · ${escapeHtml(ref.contact_phone)}` : ""}
          </div>` : ""}
          ${ref.notes ? `<div style="color:#6b7280;font-size:12px;margin-top:4px">${escapeHtml(ref.notes)}</div>` : ""}
        </div>`;

      const popup = new mapboxgl.Popup({ offset: 14 }).setHTML(popupHtml);
      const marker = new mapboxgl.Marker(el)
        .setLngLat([ref.longitude, ref.latitude])
        .setPopup(popup)
        .addTo(map);
      markersRef.current.push(marker);
      bounds.extend([ref.longitude, ref.latitude]);
      hasPoints = true;
    });

    if (!hasPoints) return;
    if (markersRef.current.length > 1) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 600 });
    } else {
      const first = markersRef.current[0];
      const lngLat = first.getLngLat();
      map.flyTo({ center: [lngLat.lng, lngLat.lat], zoom: 11 });
    }
  }, [reports, refugios]);

  return (
    <div
      ref={containerRef}
      className="h-[60vh] min-h-[360px] w-full overflow-hidden rounded-xl border border-gray-200"
    />
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
