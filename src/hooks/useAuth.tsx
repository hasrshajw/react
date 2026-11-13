import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { resetUserData } from "../lib/userData";
import {
  SESSION_KEY, getSession, signInWithEmail, signInWithGoogle, signOut, signUpWithEmail, syncSupabaseSession, watchAuthChanges, type Session,
} from "../lib/auth";

interface AuthState {
  session: Session | null;
  signInGoogle: (from?: string) => Promise<Session>;
  signInEmail: (email: string, password: string) => Promise<Session>;
  /** Creates an account. Resolves to the Session when the person is signed in at once, or null when they must confirm their email first. */
  signUpEmail: (email: string, password: string) => Promise<Session | null>;
  /** Signs out now; the promise settles when Supabase has finished (wait for it before the next sign-in). */
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(getSession);

  /* Signing out (or in) in another tab applies here too. */
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === SESSION_KEY || e.key === null) setSession(getSession()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* Pick up a login that happened outside this page (the Google redirect, another tab). */
  useEffect(() => {
    let live = true;
    syncSupabaseSession().then((s) => { if (live) setSession(s); }, () => {});
    return () => { live = false; };
  }, []);

  /* M-1: follow Supabase's own events: a refresh token that stopped working, or a sign-out/sign-in in another tab. */
  useEffect(() => watchAuthChanges(setSession), []);

  /* M-1: whenever the person is gone or has changed (any path: logout, another tab, expired login), drop their drafts and caches. */
  const lastEmail = useRef<string | null>(session?.email ?? null);
  useEffect(() => {
    const now = session?.email ?? null;
    if (lastEmail.current !== null && lastEmail.current !== now) resetUserData();
    lastEmail.current = now;
  }, [session]);

  const signInGoogle = useCallback(async (from?: string) => { const s = await signInWithGoogle(from); setSession(s); return s; }, []);
  const signInEmail = useCallback(async (email: string, password: string) => { const s = await signInWithEmail(email, password); setSession(s); return s; }, []);
  const signUpEmail = useCallback(async (email: string, password: string) => { const s = await signUpWithEmail(email, password); if (s) setSession(s); return s; }, []);
  const logout = useCallback(() => { setSession(null); return signOut(); }, []);

  const value = useMemo(() => ({ session, signInGoogle, signInEmail, signUpEmail, logout }), [session, signInGoogle, signInEmail, signUpEmail, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
