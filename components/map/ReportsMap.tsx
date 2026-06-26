"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Report } from "@/lib/types";
import { urgencyColor, formatDateShort } from "@/lib/utils";

interface ReportsMapProps {
  token: string;
  reports: Report[];
}

// Centro aproximado de Venezuela.
const VENEZUELA_CENTER: [number, number] = [-66.9, 10.48];

export default function ReportsMap({ token, reports }: ReportsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // Inicializa el mapa una sola vez.
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

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [token]);

  // Redibuja marcadores cuando cambian los reportes (filtros).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const withGeo = reports.filter(
      (r) => r.latitude != null && r.longitude != null
    );

    const bounds = new mapboxgl.LngLatBounds();

    withGeo.forEach((r) => {
      const el = document.createElement("div");
      el.style.width = "18px";
      el.style.height = "18px";
      el.style.borderRadius = "50%";
      el.style.border = "2px solid white";
      el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.4)";
      el.style.background = urgencyColor(r.urgency);
      el.style.cursor = "pointer";

      const popupHtml = `
        <div style="min-width:180px">
          <div style="font-weight:700;color:#111827">${escapeHtml(
            r.help_type
          )} · ${escapeHtml(r.urgency)}</div>
          <div style="color:#374151;margin-top:2px">${escapeHtml(
            r.city || "—"
          )}, ${escapeHtml(r.state || "—")}</div>
          ${
            r.description
              ? `<div style="color:#6b7280;margin-top:4px">${escapeHtml(
                  r.description.slice(0, 120)
                )}</div>`
              : ""
          }
          <div style="color:#9ca3af;margin-top:6px;font-size:11px">${formatDateShort(
            r.created_at
          )}</div>
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
    });

    if (withGeo.length > 1) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 600 });
    } else if (withGeo.length === 1) {
      map.flyTo({
        center: [
          withGeo[0].longitude as number,
          withGeo[0].latitude as number,
        ],
        zoom: 11,
      });
    }
  }, [reports]);

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
