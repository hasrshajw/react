import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  SESSION_KEY, clearSession, getSession, signInWithEmail, signInWithGoogle, type Session,
} from "../lib/auth";

interface AuthState {
  session: Session | null;
  signInGoogle: () => Promise<Session>;
  signInEmail: (email: string, password: string) => Promise<Session>;
  logout: () => void;
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

  const signInGoogle = useCallback(async () => { const s = await signInWithGoogle(); setSession(s); return s; }, []);
  const signInEmail = useCallback(async (email: string, password: string) => { const s = await signInWithEmail(email, password); setSession(s); return s; }, []);
  const logout = useCallback(() => { clearSession(); setSession(null); }, []);

  const value = useMemo(() => ({ session, signInGoogle, signInEmail, logout }), [session, signInGoogle, signInEmail, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
