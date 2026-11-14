import { useState, type ReactNode } from "react";
import { Routes, Route, NavLink, useLocation } from "react-router-dom";
import { Sparkles, AlertTriangle, ArrowRight } from "./components/Icons";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Create from "./pages/Create";
import Invitations from "./pages/Invitations";
import Reviews from "./pages/Reviews";
import Templates from "./pages/Templates";
import { useEnquiryBadge } from "./features/dashboard/hooks/useEnquiryBadge";
import { useReviewBadge } from "./features/dashboard/hooks/useReviewBadge";
import schedyMark from "./assets/schedy-mark.svg";
import { AccountProvider, useAccount } from "./hooks/useAccount";
import { AuthProvider } from "./hooks/useAuth";
import { RoleGate } from "./components/RoleGate";
import { Loading, SkText } from "./components/Skeleton";
import type { Plan } from "./lib/api";
import { DOCS_URL, SUPPORT_URL } from "./lib/helpLinks";
import { ProfileMenu } from "./components/ProfileMenu";

/* ADMIN APP. Everything the signed-in user sees (shell, sidebar, dashboard, create, invitations, templates)
   lives in this file's import tree. App.tsx loads it with React.lazy(), so the landing page, the login page
   and public invitations never download any of it. */

/* The plan comes from useAccount() (see lib/api.ts). */
function getPlanBanner(plan: Plan) {
  if (plan.status === "past_due") {
    return { tone: "warn" as const, text: "Your last payment didn't go through", cta: "Update billing", to: "/billing" };
  }
  if (plan.status === "trial") {
    const n = plan.trialDaysLeft ?? 0;
    return { tone: "info" as const, text: `${n} day${n === 1 ? "" : "s"} left in your ${plan.name} trial`, cta: "Upgrade", to: "/billing" };
  }
  return { tone: "info" as const, text: `You're on the ${plan.name} plan`, cta: "Manage plan", to: "/billing" };
}

function HelpAnchor({ href, children }: { href: string; children: ReactNode }) {
  const external = href.startsWith("https:");
  return <a className="promo-link" href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{children}</a>;
}

/* Shown for any address inside the admin app that has no page (a mistyped URL, an old bookmark). */
function NotFound() {
  return (
    <div className="coming-soon">
      <h1>Page not found</h1>
      <p>There is no page at this address. <NavLink to="/dashboard">Go to the Dashboard</NavLink></p>
    </div>
  );
}

/* H-1: remount Create on every navigation to it (location.key changes even when the URL is the same).
   Create rewrites the address bar with history.replaceState after a save, so the router's own `search`
   can be stale; keying on `search` alone would keep a saved invitation in the form when the user clicks
   "Create Invitation" again, and the next Save would overwrite it. */
function CreateRoute({ onPanelChange }: { onPanelChange: (open: boolean) => void }) {
  const loc = useLocation();
  return <Create key={loc.key} onPanelChange={onPanelChange} />;
}

function Shell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const { loading: accountLoading, plan } = useAccount();
  /* M-6: the new-enquiry count lives here so the badge is right on every page, not only on the Dashboard. */
  const enquiries = useEnquiryBadge();
  /* B5: pending change-request count for the Reviews nav badge. */
  const reviews = useReviewBadge();
  const banner = plan ? getPlanBanner(plan) : null;

  return (
    <>
      <div className="workspace-shell">
        {/* Schedy's own strip: vendor branding + subscription state. Always visible. */}
        <header className="workspace-promo">
          <div className="promo-brand">
            <span className="promo-mark" aria-hidden="true">
              <img src={schedyMark} alt="" />
            </span>
            <span className="promo-name">Schedy Admin</span>
          </div>

          {accountLoading ? (
            /* same pill, same size: the message and the button text come from the server */
            <div className="promo-center sk-on-dark" aria-busy="true">
              <Sparkles size={15} />
              <span className="promo-long"><SkText w={26} /></span>
              <strong><SkText w={7} /></strong>
              <span className="promo-arrow" aria-hidden="true"><ArrowRight size={14} strokeWidth={2.2} /></span>
              <Loading label="Loading plan" />
            </div>
          ) : banner ? (
            <NavLink to={banner.to} className={`promo-center${banner.tone === "warn" ? " warn" : ""}`}>
              {banner.tone === "warn" ? <AlertTriangle size={15} /> : <Sparkles size={15} />}
              <span className="promo-long">{banner.text}</span>
              <strong>{banner.cta}</strong>
              <span className="promo-arrow" aria-hidden="true">
                <ArrowRight size={14} strokeWidth={2.2} />
              </span>
            </NavLink>
          ) : <span />}

          {/* Shown only when VITE_DOCS_URL / VITE_SUPPORT_URL are set (src/lib/helpLinks.ts); an empty cell keeps the strip's layout. */}
          {DOCS_URL || SUPPORT_URL ? (
            <nav className="promo-right" aria-label="Help">
              {DOCS_URL && <HelpAnchor href={DOCS_URL}>Docs</HelpAnchor>}
              {SUPPORT_URL && <HelpAnchor href={SUPPORT_URL}>Support</HelpAnchor>}
            </nav>
          ) : <span />}
        </header>

        <a
          className="skip-link"
          href="#main-content"
          onClick={(e) => { e.preventDefault(); document.getElementById("main-content")?.focus(); }}
        >
          Skip to main content
        </a>

        <div className="workspace-body">
          <div className="app">
            <Sidebar
              collapsed={sidebarCollapsed}
              setCollapsed={setSidebarCollapsed}
              panelOpen={panelOpen}
              onHoverExpand={setHoverExpanded}
              profileOpen={profileOpen}
              enquiryCount={enquiries.count}
              reviewCount={reviews.count}
              onProfileClick={() => setProfileOpen((o) => !o)}
              /* onSearch={() => setPaletteOpen(true)}  <- pass this to show Search + Ctrl K */
            />

            <main
              id="main-content"
              tabIndex={-1}
              className={`main-content ${
                (sidebarCollapsed || panelOpen) && !hoverExpanded ? "content-collapsed" : "content-expanded"
              }`}
            >
              <Routes>
                <Route path="/dashboard" element={<Dashboard onPanelChange={setPanelOpen} onEnquiryCountChange={enquiries.report} />} />
                <Route path="/invitations" element={<Invitations onPanelChange={setPanelOpen} />} />
                <Route path="/reviews" element={<Reviews onPendingCountChange={reviews.report} onPanelChange={setPanelOpen} />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/create" element={<CreateRoute onPanelChange={setPanelOpen} />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>

          <div id="preview-slot" className="preview-slot" />
        </div>
      </div>

      {profileOpen && (
        <ProfileMenu onClose={() => setProfileOpen(false)} />
      )}

      <style>{`
        * { box-sizing: border-box; }

        :root { --chrome-top: 44px; }

        html, body, #root { width: 100%; min-height: 100%; margin: 0; padding: 0; }

        body {
          font-family: "DM Sans", "Noto Sans Telugu", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: #101011;
          color: var(--text-color, #202027);
          overflow: hidden;
        }

        button, input, select, textarea { font: inherit; }

        .workspace-shell {
          width: 100%;
          height: 100vh;
          min-height: 0;
          display: flex;
          flex-direction: column;
          padding: 0 8px 8px;
          overflow: hidden;
          /* The glow lives on the shell, not on the strip, so it flows past the
             44px strip into the page/body: violet in the centre, dark at the
             left/right edges, and fading down into #101011 over 180px. */
          background:
            linear-gradient(180deg, rgba(16, 16, 17, 0) 0%, rgba(16, 16, 17, 0) 15%, #101011 100%) top / 100% 180px no-repeat,
            linear-gradient(90deg, #101011 0%, #471ea7 50%, #101011 100%) top / 100% 180px no-repeat,
            #101011;
        }

        /* ---------- slim gradient strip: 44px, one message ---------- */
        .workspace-promo {
          position: relative;
          z-index: 3000;
          width: 100%;
          height: 44px;
          flex: 0 0 44px;
          padding: 0 8px 0 12px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          color: #fff;
          font-size: 13px;
          /* Transparent on purpose: the gradient is drawn by .workspace-shell
             behind it, so there is no edge or line where the strip ends. */
          background: transparent;
          border-bottom: 0;
        }

        .promo-brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .promo-mark {
          width: 26px; height: 26px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          border-radius: 7px; background: #fff;
          border: 1px solid rgba(255, 255, 255, .5);
          box-shadow: 0 2px 8px rgba(0, 0, 0, .25);
        }
        .promo-mark img { width: 18px; height: 18px; object-fit: contain; display: block; }
        .promo-name { color: rgba(255, 255, 255, .8); font-weight: 600; white-space: nowrap; }

        .promo-center {
          display: flex; align-items: center; gap: 8px;
          padding: 4px 4px 4px 16px;
          border: 1px solid rgba(255, 255, 255, .2);
          border-radius: 999px;
          background: #1C0C42;
          color: #fff; text-decoration: none; white-space: nowrap;
          transition: background .15s, border-color .15s;
        }
        .promo-center:hover { background: #26125a; border-color: rgba(255, 255, 255, .34); }
        .promo-center svg { color: #d9c6ff; flex-shrink: 0; }
        .promo-arrow {
          width: 24px; height: 24px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%;
          background: var(--btn, #673de6);
        }
        .promo-center:hover .promo-arrow { background: var(--btn-hover, #471ea7); }
        .promo-center .promo-arrow svg { color: #fff; }
        .promo-center strong { color: #fff; font-weight: 700; }
        .promo-center.warn svg:first-child { color: #fbbf24; }

        .promo-right { justify-self: end; display: flex; align-items: center; gap: 2px; }
        .promo-link {
          padding: 6px 12px; border-radius: 999px;
          color: rgba(255, 255, 255, .72); text-decoration: none; font-weight: 600;
          transition: background .15s, color .15s;
        }
        .promo-link:hover { background: rgba(255, 255, 255, .12); color: #fff; }
        .promo-link:focus-visible, .promo-center:focus-visible { outline: 2px solid #d9c6ff; outline-offset: 2px; }

        .workspace-body {
          width: 100%;
          flex: 1 1 0;
          min-height: 0;
          display: flex;
          gap: 8px;
        }

        .preview-slot { flex: 0 0 auto; min-height: 0; display: flex; }
        .preview-slot:empty { display: none; }

        .app {
          position: relative;
          isolation: isolate;
          min-width: 0;
          height: auto;
          min-height: 0;
          flex: 1 1 0;
          overflow: hidden;
          border-radius: 26px !important;
          clip-path: inset(0 round 26px) !important;
          -webkit-clip-path: inset(0 round 26px) !important;
          background: #f5f5f7;
        }

        .main-content {
          position: relative;
          height: 100%;
          min-height: 0;
          padding: 96px 32px 32px;
          overflow-y: auto;
          background: #f5f5f7;
          transition: margin-left .45s var(--spring, cubic-bezier(.22, 1, .36, 1));
        }

        .main-content.content-expanded { margin-left: 260px; }
        .main-content.content-collapsed { margin-left: 90px; }

        .skip-link { position: absolute; left: 12px; top: -48px; z-index: 10000; padding: 10px 16px; border-radius: 10px; background: var(--primary); color: #fff; font-weight: 600; text-decoration: none; transition: top .15s; }
        .skip-link:focus { top: 12px; }
        .main-content:focus { outline: none; }
        .coming-soon { padding: 8px 0; }
        .coming-soon h1 { margin: 0 0 6px; font-size: 24px; font-weight: 700; }
        .coming-soon p { margin: 0; color: #6d7081; }
        .coming-soon a { color: #6d3fe0; font-weight: 600; }

        /* Sidebar and navbar are positioned inside the rounded frame.
           No overflow:hidden / mask on the sidebar, so the edge toggle can sit on its border. */
        .app .top-navbar {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          width: auto !important;
          z-index: 1500 !important;
        }

        .app .d-sidebar {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          height: 100% !important;
          border-radius: 26px 0 0 26px !important;
          z-index: 2000 !important;
        }

        @media (max-width: 900px) {
          .workspace-body { gap: 0; }
          .preview-slot { display: contents; }
        }

        @media (max-width: 768px) {
          .workspace-shell { padding: 0 5px 5px; }

          .workspace-promo { padding: 0 6px 0 10px; }
          .promo-name, .promo-long, .promo-link { display: none; }

          .app {
            height: auto;
            min-height: 0;
            flex: 1 1 0;
            border-radius: 20px !important;
            clip-path: inset(0 round 20px) !important;
            -webkit-clip-path: inset(0 round 20px) !important;
          }

          .main-content,
          .main-content.content-expanded,
          .main-content.content-collapsed {
            height: 100%;
            margin-left: 0;
            padding: 88px 18px 24px;
          }

          .app .top-navbar,
          .app .d-sidebar { display: none !important; }

          /* mobile header sits directly under the strip, matching the frame's rounded top */
          .app .m-header {
            top: var(--chrome-top, 44px) !important;
            left: 5px !important;
            right: 5px !important;
            width: auto !important;
            border-radius: 20px 20px 0 0;
          }

          .app .m-overlay { top: var(--chrome-top, 44px) !important; }

        }
      `}</style>
    </>
  );
}

/* Everything except /login needs a session. The account is loaded inside the guard, so it is fetched
   fresh after each sign-in and dropped on logout. */
function Protected() {
  /* RoleGate sends nobody to /login, and anybody who is not an administrator to the client area (/my). It is a screen choice only:
     row level security is the real lock. */
  return (
    <RoleGate allow="admin">
      <AccountProvider>
        <Shell />
      </AccountProvider>
    </RoleGate>
  );
}


/* The auth provider lives inside this chunk, so App.tsx (and with it the landing page and public invitations)
   never imports the auth code or the Supabase SDK. */
export default function AdminApp() {
  return <AuthProvider><Protected /></AuthProvider>;
}
