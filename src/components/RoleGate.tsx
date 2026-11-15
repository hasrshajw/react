import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useRole, type Role } from "../hooks/useRole";
import ErrorCard, { CheckingScreen } from "./ErrorCard";

/* Track B (B4): which app a signed-in person may open. This is for the screen only: row level security and the RPCs are the real lock,
   so a wrong answer here can show the wrong page but never reveal or change data.
   Nobody signed in goes to /login (and comes back to the page they asked for); an administrator asked for the client area goes to the
   dashboard; anybody else asked for an admin page goes to /my. While the role is unknown nothing is shown, and a failed lookup shows a
   retry button instead of guessing. Must be rendered inside AuthProvider. */
export function RoleGate({ allow, children }: { allow: Exclude<Role, "none">; children: ReactNode }) {
  const { session, logout } = useAuth();
  const loc = useLocation();
  const { role, error, retry } = useRole();

  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  if (error) {
    return (
      <ErrorCard
        tone="warning"
        icon={<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 9.5-6.5" /><path d="M18 15v3.2M18 20.6h.01" /><circle cx="18" cy="18" r="4.4" /></svg>}
        title="We couldn’t check your account"
        body="Check your connection and try again."
        actions={<>
          <button type="button" className="ep-btn ep-btn-primary" onClick={retry}>Try again</button>
          {logout && <button type="button" className="ep-btn ep-btn-ghost" onClick={() => { void logout(); }}>Sign out</button>}
        </>}
      >
        {session.email && <p className="ep-signed">Signed in as <strong>{session.email}</strong></p>}
        <details className="ep-details">
          <summary>Still not working?</summary>
          <p className="ep-help">Sign out and sign in again. If you run this site, also check that the Supabase database setup (<code>01_schema.sql</code>) has been run and that the Vercel environment variables point to the same Supabase project.</p>
        </details>
      </ErrorCard>
    );
  }
  if (role === null) return <CheckingScreen />;
  if (role !== allow) return <Navigate to={allow === "admin" ? "/my" : "/dashboard"} replace />;
  return <>{children}</>;
}
