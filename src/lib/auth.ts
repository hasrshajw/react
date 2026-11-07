/* ==========================================================================
   Demo authentication.
   The session lives in localStorage. Nothing here talks to a server yet.

   TODO(auth): replace the bodies of signInWithGoogle / signInWithEmail with the
   real provider (e.g. Supabase signInWithOAuth / signInWithPassword) and keep the
   same return type. The login page, route guard and logout do not need to change.
   ========================================================================== */
import { readJSON, removeKey, writeJSON } from "./storage";

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

export const clearSession = () => removeKey(SESSION_KEY);

/** Demo: signs in straight away as the demo user. */
export async function signInWithGoogle(): Promise<Session> {
  await wait(700);
  return startSession({ provider: "google", ...DEMO_USER });
}

/** Demo: any valid email with a password of at least MIN_PASSWORD characters signs in. */
export async function signInWithEmail(email: string, password: string): Promise<Session> {
  await wait(600);
  if (!isEmail(email)) throw new AuthError("Enter a valid email address.");
  if (password.length < MIN_PASSWORD) throw new AuthError(`Password must be at least ${MIN_PASSWORD} characters.`);
  const clean = email.trim().toLowerCase();
  const isDemo = clean === DEMO_USER.email;
  return startSession({ provider: "email", email: clean, name: isDemo ? DEMO_USER.name : nameFromEmail(clean) });
}
