/* Supabase client. The app stores everything in Supabase (data and login); there is no offline or demo mode.
   Set these in .env.local (and in the Vercel project settings for the live site):
     VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
     VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   (or the legacy VITE_SUPABASE_ANON_KEY) */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = ((import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)) as string | undefined;

/** False when the environment variables above are missing. main.tsx shows a setup message instead of the app. */
export const SUPABASE_CONFIGURED = !!url && !!key;

export const supabase: SupabaseClient | null = SUPABASE_CONFIGURED ? createClient(url!, key!) : null;

export function db(): SupabaseClient {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}
