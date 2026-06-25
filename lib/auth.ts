// Autenticación de AyudaVE (Supabase Auth, magic link por email).
// Todo del lado del cliente, consistente con el resto de la app.

import { getSupabaseClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

/** Devuelve la sesión actual (o null). */
export async function getSession(): Promise<Session | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session;
}

/** Envía un enlace mágico de acceso al correo indicado. */
export async function signInWithEmail(
  email: string,
  redirectTo: string
): Promise<{ error?: string }> {
  const sb = getSupabaseClient();
  if (!sb) return { error: "Supabase no está configurado." };
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  return { error: error?.message };
}

/** Cierra la sesión. */
export async function signOut(): Promise<void> {
  const sb = getSupabaseClient();
  await sb?.auth.signOut();
}

/**
 * Crea/actualiza el profile del usuario tras iniciar sesión.
 * Asegura que exista una fila en `profiles` para él.
 */
export async function ensureProfile(
  userId: string,
  email: string | null
): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;
  await sb.from("profiles").upsert(
    { id: userId, email },
    { onConflict: "id", ignoreDuplicates: true }
  );
}
