/* Supabase client. It is only created when the app is told to use it:
   VITE_DATA_SOURCE=supabase plus VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
   Without those the app runs in demo mode (browser localStorage), exactly as before. */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const USE_SUPABASE = import.meta.env.VITE_DATA_SOURCE === "supabase" && !!url && !!key;
export const supabase: SupabaseClient | null = USE_SUPABASE ? createClient(url!, key!) : null;

export function db(): SupabaseClient {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}
