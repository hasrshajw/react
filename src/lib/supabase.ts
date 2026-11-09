/* Supabase client. It is only created when the app is told to use it:
   VITE_DATA_SOURCE=supabase plus VITE_SUPABASE_URL and a public key.
   The key can be the new "publishable key" (VITE_SUPABASE_PUBLISHABLE_KEY, sb_publishable_...)
   or the legacy anon key (VITE_SUPABASE_ANON_KEY). The publishable key wins if both are set.
   Without those the app runs in demo mode (browser localStorage), exactly as before. */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const wantsSupabase = import.meta.env.VITE_DATA_SOURCE === "supabase";
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = ((import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)) as string | undefined;

export const USE_SUPABASE = wantsSupabase && !!url && !!key;

if (wantsSupabase && !USE_SUPABASE) {
  console.warn(
    "VITE_DATA_SOURCE=supabase is set, but VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY is missing. Falling back to demo mode."
  );
}

export const supabase: SupabaseClient | null = USE_SUPABASE ? createClient(url!, key!) : null;

export function db(): SupabaseClient {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}
