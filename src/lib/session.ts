/* The cached login (localStorage only, no Supabase SDK), so public pages can check "is someone signed in?"
   without downloading the auth code. lib/auth.ts re-exports these and stays the source of truth. */
import { readJSON } from "./storage";

export interface Session {
  provider: "google" | "email";
  email: string;
  name: string;
  at: number;
  /** False when the person signed in with email/password and has not confirmed yet. Google is treated as verified.
   *  RLS already hides invitations for unverified emails (D3); the client UI uses this for the B7 banner. */
  emailVerified?: boolean;
}

export const SESSION_KEY = "schedy_session";

export function getSession(): Session | null {
  const s = readJSON<Session | null>(SESSION_KEY, null);
  return s && typeof s.email === "string" ? s : null;
}
