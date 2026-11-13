import { Link, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { useAsync } from "./hooks/useAsync";
import { RoleGate } from "./components/RoleGate";
import { fetchMyInvitations, type MyInvitation } from "./lib/api";
import { ADMIN_EMAIL } from "./lib/config";

/* Track B (B4): the client area, a separate chunk so clients never download admin code. This is the shell: it decides between the
   three landing cases (nothing linked, one invitation, several). The restricted editor, the submit button and the pending and
   rejected banners are B6 and are not here yet. */
const page = { maxWidth: 560, margin: "0 auto", padding: "48px 20px", fontFamily: "system-ui, sans-serif", color: "#23263a" } as const;
const names = (i: MyInvitation) => [i.groomName, i.brideName].filter(Boolean).join(" & ") || "Your invitation";

function Frame({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <main style={page}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <strong>Your invitations</strong>
        {/* Same flow as the admin menu: the login page signs out on arrival, so a cancelled prompt can never leave a half sign-out. */}
        <button type="button" onClick={() => navigate("/login", { replace: true, state: { loggedOut: true } })}>Log out</button>
      </div>
      {children}
    </main>
  );
}

function Landing() {
  const { data, loading, error } = useAsync(fetchMyInvitations);
  if (loading) return <Frame><p>Loading…</p></Frame>;
  if (error || !data) return <Frame><p role="alert">We couldn’t load your invitations. Reload the page to try again.</p></Frame>;
  if (data.length === 0) {
    return (
      <Frame>
        <p>No invitations are linked to this account.</p>
        <p>Sign in with the email address your invitation was set up with{ADMIN_EMAIL ? <>, or <a href={`mailto:${ADMIN_EMAIL}`}>contact us</a></> : ""}.</p>
      </Frame>
    );
  }
  if (data.length === 1) return <Navigate to={`/my/${encodeURIComponent(data[0].id)}`} replace />;
  return (
    <Frame>
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
        {data.map((i) => <li key={i.id}><Link to={`/my/${encodeURIComponent(i.id)}`}>{names(i)}</Link></li>)}
      </ul>
    </Frame>
  );
}

function Editor() {
  const { id = "" } = useParams();
  const { data, loading, error } = useAsync(fetchMyInvitations);
  if (loading) return <Frame><p>Loading…</p></Frame>;
  if (error || !data) return <Frame><p role="alert">We couldn’t load your invitation. Reload the page to try again.</p></Frame>;
  const inv = data.find((i) => i.id === id);
  if (!inv) return <Frame><p>This invitation isn’t linked to your account.</p><Link to="/my">Back</Link></Frame>;
  return (
    <Frame>
      <h1 style={{ fontSize: 22 }}>{names(inv)}</h1>
      <p>Editing will be available here soon.</p>
      {data.length > 1 && <Link to="/my">All invitations</Link>}
    </Frame>
  );
}

export default function ClientApp() {
  return (
    <AuthProvider>
      <RoleGate allow="client">
        <Routes>
          <Route path="/my" element={<Landing />} />
          <Route path="/my/:id" element={<Editor />} />
          <Route path="*" element={<Navigate to="/my" replace />} />
        </Routes>
      </RoleGate>
    </AuthProvider>
  );
}
