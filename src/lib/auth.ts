/* ==========================================================================
   Authentication.
   Supabase mode (VITE_DATA_SOURCE=supabase): real Supabase Auth (email + password, Google).
   Demo mode (default): fake sign-in, the session lives in localStorage and nothing talks to a server.
   Either way the app only reads the small Session below, so the login page and route guard are the same.

   TODO(auth): replace the bodies of signInWithGoogle / signInWithEmail with the
   real provider (e.g. Supabase signInWithOAuth / signInWithPassword) and keep the
   same return type. The login page, route guard and logout do not need to change.
   ========================================================================== */
import { readJSON, removeKey, writeJSON } from "./storage";
import { supabase } from "./supabase";

export interface Session {
  provider: "google" | "email";
  email: string;
  name: string;
  at: number;
}

/** The account the demo has always been signed in as. "Continue with Google" signs in as this user. */
export const DEMO_USER = { name: "Harsha Vardhan", email: "schedy.in@gmail.com" };

export const SESSION_KEY = "schedy_session";
export const MIN_PASSWORD = 6;

export class AuthError extends Error {}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isEmail = (v: string) => EMAIL_RE.test(v.trim());

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

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

/** Supabase mode: after a Google redirect (or on a new tab) turn the Supabase login into our Session; drop ours if Supabase has none. */
export async function syncSupabaseSession(): Promise<Session | null> {
  if (!supabase) return getSession();
  const { data } = await supabase.auth.getSession();
  const u = data.session?.user;
  if (!u) { removeKey(SESSION_KEY); return null; }
  const existing = getSession();
  if (existing && existing.email === u.email) return existing;
  const meta = (u.user_metadata ?? {}) as Record<string, string | undefined>;
  const email = u.email ?? "";
  return startSession({ provider: u.app_metadata?.provider === "google" ? "google" : "email", email, name: meta.full_name || meta.name || nameFromEmail(email) });
}

/** Demo: signs in straight away as the demo user. */
export async function signInWithGoogle(): Promise<Session> {
  if (supabase) {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/login` } });
    if (error) throw new AuthError(error.message);
    return new Promise<Session>(() => { /* the browser is redirected to Google */ });
  }
  await wait(700);
  return startSession({ provider: "google", ...DEMO_USER });
}

/** Demo: any valid email with a password of at least MIN_PASSWORD characters signs in. */
export async function signInWithEmail(email: string, password: string): Promise<Session> {
  if (!isEmail(email)) throw new AuthError("Enter a valid email address.");
  if (password.length < MIN_PASSWORD) throw new AuthError(`Password must be at least ${MIN_PASSWORD} characters.`);
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new AuthError(error.message);
    const meta = (data.user.user_metadata ?? {}) as Record<string, string | undefined>;
    const clean = (data.user.email ?? email).trim().toLowerCase();
    return startSession({ provider: "email", email: clean, name: meta.full_name || nameFromEmail(clean) });
  }
  await wait(600);
  const clean = email.trim().toLowerCase();
  const isDemo = clean === DEMO_USER.email;
  return startSession({ provider: "email", email: clean, name: isDemo ? DEMO_USER.name : nameFromEmail(clean) });
}
