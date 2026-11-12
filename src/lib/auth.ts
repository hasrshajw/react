/* ==========================================================================
   Authentication, through Supabase Auth (email + password, Google).
   The app reads the small Session below (cached in localStorage so the first screen needs no request),
   so the login page and route guard stay simple. Supabase remains the source of truth:
   syncSupabaseSession() drops the cached Session whenever Supabase has no login.
   ========================================================================== */
import { removeKey, writeJSON } from "./storage";
import { SESSION_KEY, getSession, type Session } from "./session";
import { db, supabase } from "./supabase";
import { resetUserData } from "./userData";

export { SESSION_KEY, getSession } from "./session";
export type { Session } from "./session";

export const MIN_PASSWORD = 6;

export class AuthError extends Error {}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isEmail = (v: string) => EMAIL_RE.test(v.trim());

/** "jane.doe@x.com" -> "Jane Doe" */
const nameFromEmail = (email: string) =>
  email.split("@")[0].split(/[._-]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") || "Account";

function startSession(s: Omit<Session, "at">): Session {
  const session: Session = { ...s, at: Date.now() };
  if (!writeJSON(SESSION_KEY, session)) throw new AuthError("Couldn’t save your session. Check that browser storage is allowed.");
  return session;
}

/** M-1: drops the cached login and everything stored for that person (drafts, caches), then ends the Supabase login.
 *  The local part runs first and at once, so the app treats the person as signed out even if the network call is slow.
 *  The returned promise settles when Supabase has finished: wait for it before signing in again, or a late
 *  sign-out could end the new login. If the server cannot be reached the login is still removed from this browser. */
export async function signOut(): Promise<void> {
  removeKey(SESSION_KEY);
  resetUserData();
  if (!supabase) return;
  try {
    const { error } = await supabase.auth.signOut();
    if (error) await supabase.auth.signOut({ scope: "local" });
  } catch {
    try { await supabase.auth.signOut({ scope: "local" }); } catch { /* nothing more can be done */ }
  }
}

/** M-1: follow Supabase's own login events. `onChange` gets null when Supabase ended the login (token refresh failed,
 *  signed out in another tab) and the new Session when another tab signed in as a different person. Returns an unsubscribe.
 *  The callback below only touches localStorage and never awaits a Supabase call (that can dead-lock the client). */
export function watchAuthChanges(onChange: (s: Session | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, s) => {
    if (event === "SIGNED_OUT") {
      removeKey(SESSION_KEY);
      resetUserData();
      onChange(null);
      return;
    }
    const cached = getSession();
    const email = s?.user?.email;
    /* Only when we already hold a login for someone else: a normal sign-in in this tab has no cached session yet. */
    if (event === "SIGNED_IN" && cached && email && cached.email.toLowerCase() !== email.toLowerCase()) {
      setTimeout(() => {
        removeKey(SESSION_KEY);
        resetUserData();
        syncSupabaseSession().then(onChange, () => onChange(null));
      }, 0);
    }
  });
  return () => data.subscription.unsubscribe();
}

/** After a Google redirect (or on a new tab) turn the Supabase login into our Session; drop ours if Supabase has none. */
export async function syncSupabaseSession(): Promise<Session | null> {
  const { data } = await db().auth.getSession();
  const u = data.session?.user;
  if (!u) {
    /* Supabase has no login (expired while the app was closed): drop what we kept for that person too. */
    if (getSession()) resetUserData();
    removeKey(SESSION_KEY);
    return null;
  }
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
