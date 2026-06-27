// Sesión simple del centro de acopio (no usa auth de Supabase).
// El objeto del centro se guarda en sessionStorage tras el login.

import type { CollectionCenter } from "@/lib/types";

export const CENTER_SESSION_KEY = "ayudave_center";

export function getCenterSession(): CollectionCenter | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CENTER_SESSION_KEY);
    return raw ? (JSON.parse(raw) as CollectionCenter) : null;
  } catch {
    return null;
  }
}

export function clearCenterSession(): void {
  if (typeof window !== "undefined") sessionStorage.removeItem(CENTER_SESSION_KEY);
}
