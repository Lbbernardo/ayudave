import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Indica si Supabase está configurado.
 * Si no lo está, la app funciona en "modo demo": los formularios
 * simulan el envío y las listas muestran datos vacíos, sin romper la UI.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let cachedClient: SupabaseClient | null = null;

/**
 * Devuelve un cliente de Supabase (singleton en el navegador) o null
 * si las variables de entorno no están definidas.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (cachedClient) return cachedClient;
  cachedClient = createClient(supabaseUrl as string, supabaseAnonKey as string);
  return cachedClient;
}
