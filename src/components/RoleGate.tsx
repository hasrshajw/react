import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useRole, type Role } from "../hooks/useRole";

/* Track B (B4): which app a signed-in person may open. This is for the screen only: row level security and the RPCs are the real lock,
   so a wrong answer here can show the wrong page but never reveal or change data.
   Nobody signed in goes to /login (and comes back to the page they asked for); an administrator asked for the client area goes to the
   dashboard; anybody else asked for an admin page goes to /my. While the role is unknown nothing is shown, and a failed lookup shows a
   retry button instead of guessing. Must be rendered inside AuthProvider. */
const box = { minHeight: "100vh", display: "grid", placeItems: "center", color: "#6d7081", fontFamily: "system-ui, sans-serif", textAlign: "center" as const };

export function RoleGate({ allow, children }: { allow: Exclude<Role, "none">; children: ReactNode }) {
  const { session } = useAuth();
  const loc = useLocation();
  const { role, error, retry } = useRole();

  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  if (error) {
    return (
      <div style={box} role="alert">
        <div>
          <p>We couldn’t check your account. Check your connection and try again.</p>
          <button type="button" onClick={retry}>Try again</button>
        </div>
      </div>
    );
  }
  if (role === null) return <div style={box}>Loading…</div>;
  if (role !== allow) return <Navigate to={allow === "admin" ? "/my" : "/dashboard"} replace />;
  return <>{children}</>;
}
