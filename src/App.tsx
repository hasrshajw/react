import { Suspense, lazy, type ReactNode } from "react";
import { createBrowserRouter, RouterProvider, useLocation } from "react-router-dom";
import Landing from "./pages/Landing";
import PublicInvitation from "./pages/PublicInvitation";
import { isReserved } from "./lib/reserved";
import { loadAdmin, loadClient, loadLogin } from "./lib/preload";

/* CODE SPLITTING
   Only the landing page and public invitations are in the main bundle (they are what strangers and wedding
   guests open, often on mobile data). The login page and the whole admin app are separate chunks that the
   browser downloads on demand, the first time someone goes to /login or an admin page. */
const Login = lazy(loadLogin);
const AdminApp = lazy(loadAdmin);
const ClientApp = lazy(loadClient);

function ChunkFallback() {
  return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "#6d7081", fontFamily: "system-ui, sans-serif" }}>Loading…</div>;
}

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<ChunkFallback />}>{children}</Suspense>;
}

/* Short links: example.com/<slug>.
   A plain "/:slug" route would outrank the "*" route below and catch /invitations, /create and so on,
   so one catch-all decides instead: a path with exactly one segment that is not a reserved word is an
   invitation link, everything else is the admin shell. The shell stays mounted while the user moves
   between its pages, because this component keeps returning the same <Protected /> element.
   Unknown one-segment paths show the "invitation isn't available" page, which doubles as the 404.
   Every new top-level app route must be added to RESERVED (src/lib/reserved.ts). */
function Gate() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 1) {
    let slug = parts[0];
    try { slug = decodeURIComponent(slug); } catch { /* keep the raw segment */ }
    if (!isReserved(slug)) return <PublicInvitation slug={slug} />;
  }
  return <Lazy><AdminApp /></Lazy>;
}

const router = createBrowserRouter([
  { path: "/", element: <Landing /> }, /* public landing page; the dashboard is at /dashboard */
  { path: "/login", element: <Lazy><Login /></Lazy> },
  { path: "/i/:slug", element: <PublicInvitation /> }, /* old links that were already shared: no auth, no admin code */
  { path: "/my/*", element: <Lazy><ClientApp /></Lazy> }, /* client area (Track B): its own chunk, `my` is a reserved word */
  { path: "*", element: <Gate /> },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
