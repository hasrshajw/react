/* Environment config only. No Supabase SDK is imported here, so the landing page, main.tsx and public
   invitations can read it without downloading the SDK (about a third of the old bundle). */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const SUPABASE_KEY = ((import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)) as string | undefined;

/** False when the environment variables are missing. main.tsx shows a setup message instead of the app. */
export const SUPABASE_CONFIGURED = !!SUPABASE_URL && !!SUPABASE_KEY;

/** The administrator's address, for DISPLAY only (for example a "Contact admin" link). Never use it to decide who may see or do something:
 *  it ships in the browser bundle, and real permissions come from the database (`admins`, row level security). */
const rawAdminEmail = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.trim() ?? "";
export const ADMIN_EMAIL: string | null = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(rawAdminEmail) ? rawAdminEmail : null;
