/* ==========================================================================
   Authentication, through Supabase Auth (email + password, Google).
   The app reads the small Session below (cached in localStorage so the first screen needs no request),
   so the login page and route guard stay simple. Supabase remains the source of truth:
   syncSupabaseSession() drops the cached Session whenever Supabase has no login.
   ========================================================================== */
import { readJSON, removeKey, writeJSON } from "./storage";
import { db, supabase } from "./supabase";

export interface Session {
  provider: "google" | "email";
  email: string;
  name: string;
  at: number;
}

export const SESSION_KEY = "schedy_session";
export const MIN_PASSWORD = 6;

export class AuthError extends Error {}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isEmail = (v: string) => EMAIL_RE.test(v.trim());

/** "jane.doe@x.com" -> "Jane Doe" */
const nameFromEmail = (email: string) =>
  email.split("@")[0].split(/[._-]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") || "Account";

export function getSession(): Session | null {
  const s = readJSON<Session | null>(SESSION_KEY, null);
  return s && typeof s.email === "string" ? s : null;
}

function startSession(s: Omit<Session, "at">): Session {
  const session: Session = { ...s, at: Date.now() };
  if (!writeJSON(SESSION_KEY, session)) throw new AuthError("Couldn’t save your session. Check that browser storage is allowed.");
  return session;
}

export const clearSession = () => {
  removeKey(SESSION_KEY);
  if (supabase) void supabase.auth.signOut();
};

/** After a Google redirect (or on a new tab) turn the Supabase login into our Session; drop ours if Supabase has none. */
export async function syncSupabaseSession(): Promise<Session | null> {
  const { data } = await db().auth.getSession();
  const u = data.session?.user;
  if (!u) { removeKey(SESSION_KEY); return null; }
  const existing = getSession();
  if (existing && existing.email === u.email) return existing;
  const meta = (u.user_metadata ?? {}) as Record<string, string | undefined>;
  const email = u.email ?? "";
  return startSession({ provider: u.app_metadata?.provider === "google" ? "google" : "email", email, name: meta.full_name || meta.name || nameFromEmail(email) });
}

export async function signInWithGoogle(): Promise<Session> {
  const { error } = await db().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/login` } });
  if (error) throw new AuthError(error.message);
  return new Promise<Session>(() => { /* the browser is redirected to Google */ });
}

export async function signInWithEmail(email: string, password: string): Promise<Session> {
  if (!isEmail(email)) throw new AuthError("Enter a valid email address.");
  if (password.length < MIN_PASSWORD) throw new AuthError(`Password must be at least ${MIN_PASSWORD} characters.`);
  const { data, error } = await db().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new AuthError(error.message);
  const meta = (data.user.user_metadata ?? {}) as Record<string, string | undefined>;
  const clean = (data.user.email ?? email).trim().toLowerCase();
  return startSession({ provider: "email", email: clean, name: meta.full_name || nameFromEmail(clean) });
}
