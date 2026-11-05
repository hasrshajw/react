import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import {
  Bell, Sparkles, X, User, Users, CreditCard, ShieldCheck, Activity,
  Languages, BookOpen, LifeBuoy, LogOut, ExternalLink,
} from "lucide-react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Create from "./pages/Create";

/* =========================================================
   THEME  (applied on load, and "System" now follows the OS)
   ========================================================= */
const LS_THEME = "schedy_theme";

function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(LS_THEME) || "light"; } catch { return "light"; }
  });

  useEffect(() => {
    try { localStorage.setItem(LS_THEME, theme); } catch { /* ignore */ }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === "system" ? (mq.matches ? "dark" : "light") : theme;
    };
    apply();
    if (theme !== "system") return;
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  return [theme, setTheme];
}

/* =========================================================
   PROFILE MENU (opens from the navbar profile button)
   ========================================================= */
function ProfileMenu({ onClose, theme, setTheme }) {
  useEffect(() => {
    const down = (e) => {
      if (!e.target.closest(".pm") && !e.target.closest("[data-pm-trigger]")) onClose();
    };
    const key = (e) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [onClose]);

  const Item = ({ icon: Icon, label, value, external }) => (
    <button type="button" className="pm-item" role="menuitem" onClick={onClose}>
      <Icon size={20} strokeWidth={1.8} />
      <span>{label}</span>
      {value && <em className="pm-val">{value}</em>}
      {external && <ExternalLink className="pm-val" size={17} strokeWidth={1.8} />}
    </button>
  );

  return createPortal(
    <div className="pm" role="menu" aria-label="Profile menu">
      <div className="pm-head">
        <b>Harsha Vardhan</b>
        <span>schedy.in@gmail.com</span>
      </div>
      <i className="pm-sep" />
      <Item icon={User} label="Account information" />
      <Item icon={Users} label="Account sharing" />
      <Item icon={CreditCard} label="Billing" />
      <i className="pm-sep" />
      <Item icon={ShieldCheck} label="Security" />
      <Item icon={Activity} label="Account activity" />
      <Item icon={Bell} label="Notification settings" />
      <Item icon={Languages} label="Language" value="English" />
      <i className="pm-sep" />
      <Item icon={BookOpen} label="Help center" external />
      <Item icon={LifeBuoy} label="Contact support" />
      <i className="pm-sep" />
      <div className="pm-theme">
        <span>Theme</span>
        <div className="pm-seg" role="radiogroup" aria-label="Theme">
          {[["light", "Light"], ["dark", "Dark"], ["system", "System"]].map(([k, l]) => (
            <button
              key={k} type="button" role="radio" aria-checked={theme === k}
              className={theme === k ? "on" : ""} onClick={() => setTheme(k)}
            >{l}</button>
          ))}
        </div>
      </div>
      <i className="pm-sep" />
      <Item icon={LogOut} label="Log out" />
    </div>,
    document.body
  );
}

/* Sidebar links that have no page yet land here instead of a blank screen */
function ComingSoon({ title }) {
  return (
    <div className="coming-soon">
      <h1>{title}</h1>
      <p>This page isn't built yet.</p>
    </div>
  );
}

const PLACEHOLDER_ROUTES = [
  ["/inventory", "Inventory"],
  ["/coupons", "Manage Coupons"],
  ["/customize/hero-section", "Hero section"],
  ["/customize/sections", "Sections"],
  ["/customize/popup", "Popup"],
  ["/customize/combo", "Combo offer"],
];

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [promoOpen, setPromoOpen] = useState(true);
  const [theme, setTheme] = useTheme();

  /* Lets the profile menu (portaled to <body>) and mobile header sit right under the strip */
  useEffect(() => {
    document.documentElement.style.setProperty("--chrome-top", promoOpen ? "44px" : "8px");
  }, [promoOpen]);

  return (
    <BrowserRouter>
      <div className={`workspace-shell${promoOpen ? "" : " no-promo"}`}>
        {/* Slim announcement strip. Profile and notifications now live in the white navbar. */}
        {promoOpen && (
          <header className="workspace-promo">
            <div className="promo-brand">
              <span className="promo-mark" aria-hidden="true">S</span>
              <span className="promo-name">Schedy Admin</span>
            </div>

            <NavLink to="/" className="promo-center">
              <Sparkles size={15} />
              <span>You're viewing a demo workspace</span>
              <strong>Explore the dashboard</strong>
            </NavLink>

            <button
              type="button" className="promo-dismiss" aria-label="Dismiss banner"
              onClick={() => setPromoOpen(false)}
            >
              <X size={16} />
            </button>
          </header>
        )}

        <div className="workspace-body">
          <div className="app">
            <Sidebar
              collapsed={sidebarCollapsed}
              setCollapsed={setSidebarCollapsed}
              panelOpen={panelOpen}
              onHoverExpand={setHoverExpanded}
              profileOpen={profileOpen}
              onProfileClick={() => setProfileOpen((o) => !o)}
              /* onSearch={() => setPaletteOpen(true)}  <- pass this to show Search + Ctrl K */
            />

            <main
              className={`main-content ${
                (sidebarCollapsed || panelOpen) && !hoverExpanded ? "content-collapsed" : "content-expanded"
              }`}
            >
              <Routes>
                <Route path="/" element={<Dashboard onPanelChange={setPanelOpen} />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/create" element={<Create onPanelChange={setPanelOpen} />} />
                {PLACEHOLDER_ROUTES.map(([path, title]) => (
                  <Route key={path} path={path} element={<ComingSoon title={title} />} />
                ))}
              </Routes>
            </main>
          </div>

          <div id="preview-slot" className="preview-slot" />
        </div>
      </div>

      {profileOpen && (
        <ProfileMenu onClose={() => setProfileOpen(false)} theme={theme} setTheme={setTheme} />
      )}

      <style>{`
        * { box-sizing: border-box; }

        :root { --chrome-top: 44px; }

        html, body, #root { width: 100%; min-height: 100%; margin: 0; padding: 0; }

        body {
          font-family: "DM Sans", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: #110C29;
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
          background: #110C29;
        }
        .workspace-shell.no-promo { padding-top: 8px; }

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
          /* soft violet glow on the right, ends exactly on the shell colour (#110C29) so there is no seam */
          background:
            radial-gradient(48% 170% at 82% 0%, rgba(139, 92, 246, .5), transparent 72%),
            radial-gradient(36% 140% at 8% 0%, rgba(71, 30, 167, .35), transparent 70%),
            linear-gradient(#150F33, #110C29);
          border-bottom: 1px solid rgba(255, 255, 255, .07);
        }

        .promo-brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .promo-mark {
          width: 24px; text-align: center;
          font-size: 22px; line-height: 1; font-weight: 900; font-style: italic;
        }
        .promo-name { color: rgba(255, 255, 255, .78); font-weight: 600; white-space: nowrap; }

        .promo-center {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 14px;
          border: 1px solid rgba(255, 255, 255, .16);
          border-radius: 999px;
          background: rgba(255, 255, 255, .06);
          color: #fff; text-decoration: none; white-space: nowrap;
          transition: background .15s, border-color .15s;
        }
        .promo-center:hover { background: rgba(255, 255, 255, .13); border-color: rgba(255, 255, 255, .28); }
        .promo-center svg { color: #d9c6ff; flex-shrink: 0; }
        .promo-center strong { color: #e7d9ff; font-weight: 600; }

        .promo-dismiss {
          justify-self: end;
          width: 30px; height: 30px; border: 0; border-radius: 50%;
          background: transparent; color: rgba(255, 255, 255, .7);
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          transition: background .15s, color .15s;
        }
        .promo-dismiss:hover { background: rgba(255, 255, 255, .12); color: #fff; }
        .promo-dismiss:focus-visible, .promo-center:focus-visible { outline: 2px solid #d9c6ff; outline-offset: 2px; }

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
        .pm-sep { display: block; height: 1px; margin: 6px 16px; background: #e7e8ee; }
        .pm-item {
          width: calc(100% - 16px); height: 44px; margin: 0 8px; padding: 0 14px;
          display: flex; align-items: center; gap: 14px;
          border: 0; border-radius: 12px; background: transparent;
          color: #2b2d3a; font: inherit; font-size: 14px; font-weight: 500; text-align: left; cursor: pointer;
          transition: background .15s;
        }
        .pm-item:hover { background: #f3f1fb; }
        .pm-item:focus-visible, .pm-seg button:focus-visible { outline: 2px solid #6d3fe0; outline-offset: -2px; }
        .pm-item svg { flex-shrink: 0; color: #4a4c5c; }
        .pm-item .pm-val { margin-left: auto; font-style: normal; font-size: 13px; color: #6d7081; }
        .pm-theme { padding: 8px 22px 10px; display: flex; flex-direction: column; gap: 10px; font-size: 14px; font-weight: 500; }
        .pm-seg { display: flex; padding: 3px; gap: 2px; border-radius: 999px; background: #f1f1f4; }
        .pm-seg button { flex: 1; height: 34px; border: 0; border-radius: 999px; background: transparent; color: #6d7081; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
        .pm-seg button.on { background: #fff; color: #202027; box-shadow: 0 1px 4px rgba(24, 28, 45, .18); }

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
          transition: margin-left .3s cubic-bezier(.4, 0, .2, 1);
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
          .workspace-shell.no-promo { padding-top: 5px; }

          .workspace-promo { padding: 0 6px 0 10px; }
          .promo-name, .promo-center strong { display: none; }

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
    </BrowserRouter>
  );
}

export default App;
