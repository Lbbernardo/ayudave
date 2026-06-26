"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Report, MissingPerson, SafeReport } from "@/lib/types";
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
  missingPeople?: MissingPerson[];
  safeReports?: SafeReport[];
}

const VENEZUELA_CENTER: [number, number] = [-66.9, 10.48];

export default function ReportsMap({
  token,
  reports,
  refugios = [],
  missingPeople = [],
  safeReports = [],
}: ReportsMapProps) {
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

    function addMarker(
      lng: number,
      lat: number,
      el: HTMLElement,
      popupHtml: string
    ) {
      const popup = new mapboxgl.Popup({ offset: 14, maxWidth: "240px" }).setHTML(popupHtml);
      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map!);
      markersRef.current.push(marker);
      bounds.extend([lng, lat]);
      hasPoints = true;
    }

    // ── Reportes de ayuda ────────────────────────────────────────────────
    reports
      .filter((r) => r.latitude != null && r.longitude != null)
      .forEach((r) => {
        const done = r.assignment_status === "completado";
        const el = document.createElement("div");

        if (done) {
          el.style.fontSize = "22px";
          el.style.lineHeight = "1";
          el.style.cursor = "default";
          el.textContent = "❤️";
        } else {
          el.style.width = "18px";
          el.style.height = "18px";
          el.style.borderRadius = "50%";
          el.style.border = "2px solid white";
          el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.4)";
          el.style.background = urgencyColor(r.urgency);
          el.style.cursor = "pointer";
        }

        const popup = done
          ? `<div style="text-align:center;padding:4px">
               <div style="font-size:26px">❤️</div>
               <div style="font-weight:700;color:#16a34a;margin-top:4px">Persona ayudada</div>
               <div style="color:#374151;font-size:13px">${esc(r.help_type)}</div>
               <div style="color:#6b7280;font-size:12px">${esc(r.city || "—")}, ${esc(r.state || "—")}</div>
             </div>`
          : `<div>
               <div style="font-weight:700;color:#111827">${esc(r.help_type)} · ${esc(r.urgency)}</div>
               <div style="color:#374151;margin-top:2px">${esc(r.city || "—")}, ${esc(r.state || "—")}</div>
               ${r.description ? `<div style="color:#6b7280;margin-top:4px;font-size:13px">${esc(r.description.slice(0, 100))}</div>` : ""}
               <div style="color:#9ca3af;margin-top:4px;font-size:11px">${formatDateShort(r.created_at)}</div>
               <a href="/ayudar/${r.id}" style="display:block;margin-top:10px;background:#1d4ed8;color:#fff;
                  text-align:center;padding:8px 12px;border-radius:8px;font-weight:600;
                  font-size:13px;text-decoration:none">🤝 Quiero ayudar</a>
             </div>`;

        addMarker(r.longitude as number, r.latitude as number, el, popup);
      });

    // ── Personas buscadas ────────────────────────────────────────────────
    missingPeople
      .filter((p) => p.latitude != null && p.longitude != null)
      .forEach((p) => {
        const el = document.createElement("div");
        el.style.fontSize = "22px";
        el.style.lineHeight = "1";
        el.style.cursor = "pointer";
        el.textContent = "🔍";

        const zona = [p.city, p.state].filter(Boolean).join(", ") || p.last_known_location || "—";
        const popup = `
          <div>
            ${p.photo_url
              ? `<img src="${p.photo_url}" alt="${esc(p.missing_name)}"
                   style="width:100%;height:130px;object-fit:cover;border-radius:8px;margin-bottom:8px">`
              : ""}
            <div style="font-size:11px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:.05em">Persona buscada</div>
            <div style="font-weight:700;color:#111827;margin-top:2px;font-size:15px">${esc(p.missing_name)}</div>
            <div style="color:#374151;font-size:13px;margin-top:2px">📍 ${esc(zona)}</div>
            ${p.description ? `<div style="color:#6b7280;font-size:12px;margin-top:4px">${esc(p.description.slice(0, 100))}</div>` : ""}
            <div style="margin-top:8px;padding:8px;background:#faf5ff;border-radius:6px;font-size:12px;color:#374151">
              <strong>${esc(p.contact_name)}</strong> está buscando a esta persona.<br>
              Si la has visto, contáctate con el coordinador.
            </div>
          </div>`;

        addMarker(p.longitude as number, p.latitude as number, el, popup);
      });

    // ── Reportes "Estoy bien" ────────────────────────────────────────────
    safeReports
      .filter((s) => s.latitude != null && s.longitude != null)
      .forEach((s) => {
        const el = document.createElement("div");
        el.style.fontSize = "20px";
        el.style.lineHeight = "1";
        el.style.cursor = "pointer";
        el.textContent = "✅";

        const zona = [s.city, s.state].filter(Boolean).join(", ") || "—";
        const popup = `
          <div style="text-align:center;padding:4px">
            <div style="font-size:26px">✅</div>
            <div style="font-weight:700;color:#16a34a;margin-top:4px">${esc(s.full_name)}</div>
            <div style="color:#374151;font-size:13px">dijo que está bien</div>
            <div style="color:#6b7280;font-size:12px;margin-top:2px">${esc(zona)}</div>
            ${s.message ? `<div style="color:#374151;font-size:13px;margin-top:6px;font-style:italic">"${esc(s.message)}"</div>` : ""}
            <div style="color:#9ca3af;font-size:11px;margin-top:4px">${formatDateShort(s.created_at)}</div>
          </div>`;

        addMarker(s.longitude as number, s.latitude as number, el, popup);
      });

    // ── Refugios y centros de acopio ─────────────────────────────────────
    refugios.forEach((ref) => {
      const isAcopio = ref.type === "centro_acopio";
      const color = isAcopio ? "#ea580c" : "#7c3aed";
      const icon = isAcopio ? "📦" : "🏠";
      const label = isAcopio ? "Centro de acopio" : "Refugio";
      const zona = [ref.city, ref.state].filter(Boolean).join(", ") || "—";

      const el = document.createElement("div");
      el.style.fontSize = "22px";
      el.style.lineHeight = "1";
      el.style.cursor = "pointer";
      el.textContent = icon;

      const popup = `
        <div>
          <div style="font-size:11px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:.05em">${label}</div>
          <div style="font-weight:700;color:#111827;margin-top:2px">${esc(ref.name)}</div>
          <div style="color:#374151;font-size:13px">${esc(zona)}</div>
          ${ref.address ? `<div style="color:#6b7280;font-size:12px;margin-top:2px">${esc(ref.address)}</div>` : ""}
          ${ref.capacity ? `<div style="color:#6b7280;font-size:12px;margin-top:2px">Capacidad: ${ref.capacity}</div>` : ""}
          ${ref.contact_name || ref.contact_phone
            ? `<div style="margin-top:6px;font-size:12px;color:#374151">${esc(ref.contact_name || "")}${ref.contact_phone ? " · " + esc(ref.contact_phone) : ""}</div>`
            : ""}
          ${ref.notes ? `<div style="color:#6b7280;font-size:12px;margin-top:4px">${esc(ref.notes)}</div>` : ""}
        </div>`;

      addMarker(ref.longitude, ref.latitude, el, popup);
    });

    if (!hasPoints) return;
    if (markersRef.current.length > 1) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 600 });
    } else {
      const lngLat = markersRef.current[0].getLngLat();
      map.flyTo({ center: [lngLat.lng, lngLat.lat], zoom: 11 });
    }
  }, [reports, refugios, missingPeople, safeReports]);

  return (
    <div
      ref={containerRef}
      className="h-[60vh] min-h-[360px] w-full overflow-hidden rounded-xl border border-gray-200"
    />
  );
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
