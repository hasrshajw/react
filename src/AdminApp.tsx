import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Routes, Route, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Bell, Sparkles, AlertTriangle, ArrowRight, User, Users, CreditCard, ShieldCheck, Activity,
  Languages, BookOpen, LifeBuoy, LogOut, ExternalLink,
} from "./components/Icons";
import type { IconComponent } from "./components/Icons";
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
import { DOCS_URL, SUPPORT_URL, openHelpLink } from "./lib/helpLinks";

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

/* =========================================================
   PROFILE MENU (opens from the navbar profile button)
   ========================================================= */
function ProfileMenu({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { user, plan, loading } = useAccount();
  const planLabel = plan ? (plan.status === "trial" ? `${plan.name} trial` : plan.name) : "";

  /* Anchor the menu under the profile button. The preview panel shrinks the app
     (and moves the button left), so a fixed window offset would drift away. */
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  useLayoutEffect(() => {
    const place = () => {
      const t = document.querySelector(".navbar-user[data-pm-trigger]");
      if (!t || window.innerWidth <= 768) { setPos(null); return; } // mobile uses the CSS position
      const r = t.getBoundingClientRect();
      if (!r.width) { setPos(null); return; }
      const top = Math.round(r.bottom + 11);
      setPos({ top, right: Math.max(8, Math.round(window.innerWidth - r.right - 12)) });
    };
    place();
    window.addEventListener("resize", place);
    const app = document.querySelector(".app");
    const ro = typeof ResizeObserver !== "undefined" && app ? new ResizeObserver(place) : null;
    if (app) ro?.observe(app);
    return () => { window.removeEventListener("resize", place); ro?.disconnect(); };
  }, []);

  useEffect(() => {
    const down = (e: MouseEvent) => {
      const t = e.target as Element;
      if (!t.closest(".pm") && !t.closest("[data-pm-trigger]")) onClose();
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [onClose]);

  /* An item with no page, address or action yet is shown as disabled ("Soon") instead of closing the menu and doing nothing. */
  const Item = ({ icon: Icon, label, value, external, to, href, onSelect }: {
    icon: IconComponent; label: string; value?: ReactNode; external?: boolean; to?: string; href?: string | null; onSelect?: () => void;
  }) => {
    const live = !!(to || onSelect || href);
    return (
      <button
        type="button" className="pm-item" role="menuitem" disabled={!live}
        onClick={() => { if (to) navigate(to); if (href) openHelpLink(href); onSelect?.(); onClose(); }}
      >
        <Icon size={20} strokeWidth={1.8} />
        <span>{label}</span>
        {!live ? <em className="pm-val pm-soon">Soon</em> : value && <em className="pm-val">{value}</em>}
        {live && external && <ExternalLink className="pm-val" size={17} strokeWidth={1.8} />}
      </button>
    );
  };

  return createPortal(
    <div
      className="pm" role="menu" aria-label="Profile menu"
      style={pos ? { top: pos.top, right: pos.right, maxHeight: `calc(100vh - ${pos.top}px - 12px)` } : undefined}
    >
      <div className="pm-head">
        <div className="pm-head-row">
          <b>{loading ? <SkText w={14} /> : user?.name ?? "Account"}</b>
          {loading ? <em className="pm-badge sk-bg" aria-hidden="true">Pro trial</em> : planLabel && <em className="pm-badge">{planLabel}</em>}
        </div>
        <span>{loading ? <SkText w={20} /> : user?.email}</span>
      </div>
      <i className="pm-sep" />
      <Item icon={User} label="Account information" />
      <Item icon={Users} label="Account sharing" />
      <Item icon={CreditCard} label="Billing" to="/billing" />
      <i className="pm-sep" />
      <Item icon={ShieldCheck} label="Security" />
      <Item icon={Activity} label="Account activity" />
      <Item icon={Bell} label="Notification settings" />
      <Item icon={Languages} label="Language" value={loading ? <SkText w={7} /> : "English"} />
      <i className="pm-sep" />
      <Item icon={BookOpen} label="Help center" href={DOCS_URL} external />
      <Item icon={LifeBuoy} label="Contact support" href={SUPPORT_URL} />
      <i className="pm-sep" />
      {/* The login page clears the session when it opens, so a "Save your changes?" prompt can still cancel the logout. */}
      <Item icon={LogOut} label="Log out" onSelect={() => navigate("/login", { replace: true, state: { loggedOut: true } })} />
    </div>,
    document.body
  );
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

/* Sidebar links that have no page yet land here instead of a blank screen */
/* H-1: remount Create on every navigation to it (location.key changes even when the URL is the same).
   Create rewrites the address bar with history.replaceState after a save, so the router's own `search`
   can be stale; keying on `search` alone would keep a saved invitation in the form when the user clicks
   "Create Invitation" again, and the next Save would overwrite it. */
function CreateRoute({ onPanelChange }: { onPanelChange: (open: boolean) => void }) {
  const loc = useLocation();
  return <Create key={loc.key} onPanelChange={onPanelChange} />;
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="coming-soon">
      <h1>{title}</h1>
      <p>This page isn't built yet.</p>
    </div>
  );
}

const PLACEHOLDER_ROUTES: [string, string][] = [
  ["/inventory", "Inventory"],
  ["/billing", "Billing"],
  ["/customize/hero-section", "Hero section"],
  ["/customize/sections", "Sections"],
  ["/customize/popup", "Popup"],
  ["/customize/combo", "Combo offer"],
];

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
              className={`main-content ${
                (sidebarCollapsed || panelOpen) && !hoverExpanded ? "content-collapsed" : "content-expanded"
              }`}
            >
              <Routes>
                <Route path="/dashboard" element={<Dashboard onPanelChange={setPanelOpen} onEnquiryCountChange={enquiries.report} />} />
                <Route path="/invitations" element={<Invitations onPanelChange={setPanelOpen} />} />
                <Route path="/reviews" element={<Reviews onPendingCountChange={reviews.report} />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/create" element={<CreateRoute onPanelChange={setPanelOpen} />} />
                {PLACEHOLDER_ROUTES.map(([path, title]) => (
                  <Route key={path} path={path} element={<ComingSoon title={title} />} />
                ))}
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
          font-family: "DM Sans", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
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

        /* ---------- profile dropdown ---------- */
        .pm, .pm * { box-sizing: border-box; }
        .pm {
          position: fixed;
          top: calc(var(--chrome-top, 44px) + 64px);
          right: 20px;
          z-index: 5000;
          width: 304px;
          max-width: calc(100vw - 16px);
          max-height: calc(100vh - var(--chrome-top, 44px) - 76px);
          overflow-y: auto;
          padding: 6px 0;
          border-radius: 24px;
          background: #fff;
          color: #202027;
          font-family: "DM Sans", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          box-shadow: 0 18px 50px rgba(0, 0, 0, .28);
          animation: pm-in .16s ease;
        }
        @keyframes pm-in { from { opacity: 0; transform: translateY(-6px) scale(.98); } to { opacity: 1; transform: none; } }
        .pm-head { padding: 16px 22px 12px; display: flex; flex-direction: column; gap: 3px; }
        .pm-head b { font-size: 16px; font-weight: 700; }
        .pm-head span { font-size: 13px; color: #6d7081; overflow-wrap: anywhere; }
        .pm-head-row { display: flex; align-items: center; gap: 8px; }
        .pm-badge {
          font-style: normal; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px;
          color: var(--primary, #6d3fe0);
          background: color-mix(in srgb, var(--primary, #6d3fe0) 12%, #fff);
        }
        .pm-sep { display: block; height: 1px; margin: 6px 16px; background: #e7e8ee; }
        .pm-item {
          width: calc(100% - 16px); height: 44px; margin: 0 8px; padding: 0 14px;
          display: flex; align-items: center; gap: 14px;
          border: 0; border-radius: 12px; background: transparent;
          color: #2b2d3a; font: inherit; font-size: 14px; font-weight: 500; text-align: left; cursor: pointer;
          transition: background .15s;
        }
        .pm-item:hover:not(:disabled) { background: #f3f1fb; }
        .pm-item:disabled { cursor: default; color: #9a9cac; }
        .pm-item:disabled svg { color: #b4b6c4; }
        .pm-item .pm-soon { font-size: 11px; font-weight: 600; letter-spacing: .02em; text-transform: uppercase; }
        .coming-soon a { color: #6d3fe0; font-weight: 600; }
        .pm-item:focus-visible { outline: 2px solid #6d3fe0; outline-offset: -2px; }
        .pm-item svg { flex-shrink: 0; color: #4a4c5c; }
        .pm-item .pm-val { margin-left: auto; font-style: normal; font-size: 13px; color: #6d7081; }

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

        .coming-soon { padding: 8px 0; }
        .coming-soon h1 { margin: 0 0 6px; font-size: 24px; font-weight: 700; }
        .coming-soon p { margin: 0; color: #6d7081; }

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

          .pm { top: calc(var(--chrome-top, 44px) + 76px); right: 8px; }
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
