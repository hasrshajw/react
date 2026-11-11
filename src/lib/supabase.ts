/* Supabase client. The app stores everything in Supabase (data and login); there is no offline or demo mode.
   Set these in .env.local (and in the Vercel project settings for the live site):
     VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
     VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   (or the legacy VITE_SUPABASE_ANON_KEY) */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_CONFIGURED, SUPABASE_KEY, SUPABASE_URL } from "./config";

export { SUPABASE_CONFIGURED };

export const supabase: SupabaseClient | null = SUPABASE_CONFIGURED ? createClient(SUPABASE_URL!, SUPABASE_KEY!) : null;

export function db(): SupabaseClient {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}
