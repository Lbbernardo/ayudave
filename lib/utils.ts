// Utilidades compartidas de AyudaVE.

/**
 * Oculta un número de teléfono para uso público.
 * Mantiene el prefijo de país (si existe) y los últimos 4 dígitos.
 * Ejemplo: +584141234567 -> +58******4567
 */
export function maskPhone(phone?: string | null): string {
  if (!phone) return "No proporcionado";
  const trimmed = phone.trim();
  const digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.length <= 4) return "******";

  const hasPlus = digits.startsWith("+");
  const prefix = hasPlus ? digits.slice(0, 3) : ""; // +58
  const last4 = digits.slice(-4);
  return `${prefix}******${last4}`;
}

/** Formatea una fecha ISO a un formato legible en español. */
export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Versión corta solo con fecha. */
export function formatDateShort(iso?: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Color de marcador/insignia según urgencia. */
export function urgencyColor(urgency?: string | null): string {
  switch (urgency) {
    case "alta":
      return "#dc2626"; // rojo
    case "media":
      return "#facc15"; // amarillo
    case "baja":
      return "#16a34a"; // verde
    default:
      return "#6b7280"; // gris
  }
}

/**
 * Caja delimitadora (bounding box) aproximada del territorio venezolano,
 * incluyendo sus islas del Caribe (Los Roques, La Tortuga, etc.).
 *   - Latitud:  0.5° N  →  12.5° N
 *   - Longitud: -74.0° O → -59.5° O
 * Es deliberadamente generosa: el objetivo es bloquear solicitudes
 * claramente fuera del país (España, EE. UU., Chile…), no trazar la
 * frontera exacta.
 */
export function isInVenezuela(lat?: number | null, lng?: number | null): boolean {
  if (lat == null || lng == null) return false;
  return lat >= 0.5 && lat <= 12.5 && lng >= -74.0 && lng <= -59.5;
}

/** Une clases condicionalmente sin dependencias externas. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
