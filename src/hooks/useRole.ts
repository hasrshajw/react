import { useCallback, useEffect, useState } from "react";
import { fetchIsAdmin } from "../lib/api";
import { onUserDataReset } from "../lib/userData";
import { useAuth } from "./useAuth";

/* Track B (B4): which app the signed-in person gets. `admin` for a row in `admins`, `client` for any other signed-in person (the client
   area shows "No invitations to show" when `my_invitations()` is empty), `none` when nobody is signed in.
   This is for choosing a screen only. Every real permission is enforced by row level security and the RPCs, so a wrong answer here can
   show the wrong page but never reveal or change data.
   The answer comes from the database (`is_admin()`), is remembered in memory only (never in localStorage, which a person could edit),
   and is forgotten on sign-out. While it is unknown `role` is null: do not guess "admin" or "client" from a failed or slow request. */

export type Role = "admin" | "client" | "none";
export interface RoleState { role: Role | null; loading: boolean; error: boolean; retry: () => void }

let cache: { email: string; admin: boolean } | null = null;
onUserDataReset(() => { cache = null; });

export function useRole(): RoleState {
  const { session } = useAuth();
  const email = session?.email.trim().toLowerCase() || null;
  const [answer, setAnswer] = useState<{ email: string; admin: boolean } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const known = !email ? null : cache?.email === email ? cache.admin : answer?.email === email ? answer.admin : null;

  useEffect(() => {
    if (!email || known !== null) return;
    let live = true;
    setFailed(null);
    fetchIsAdmin().then(
      (admin) => { if (!live) return; cache = { email, admin }; setAnswer({ email, admin }); },
      () => { if (live) setFailed(email); },
    );
    return () => { live = false; };
  }, [email, known, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const error = !!email && known === null && failed === email;
  return {
    role: !email ? "none" : known === null ? null : known ? "admin" : "client",
    loading: !!email && known === null && !error,
    error,
    retry,
  };
}
