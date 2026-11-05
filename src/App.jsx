import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import {
  Bell, Sparkles, Gift, ArrowRight, User, Users, CreditCard, ShieldCheck, Activity,
  Languages, BookOpen, LifeBuoy, LogOut, ExternalLink,
} from "lucide-react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Create from "./pages/Create";

/* =========================================================
   PROFILE MENU (opens from the top-right profile button)
   Rendered in a portal so the promo bar's button styles don't leak in.
   ========================================================= */
const LS_THEME = "schedy_theme";

function ProfileMenu({ onClose }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(LS_THEME) || "light"; } catch { return "light"; }
  });

  useEffect(() => {
    try { localStorage.setItem(LS_THEME, theme); } catch { /* ignore */ }
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const down = (e) => {
      if (!e.target.closest(".pm") && !e.target.closest(".promo-user")) onClose();
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

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  // True while a right-side panel (preview / requests) is open.
  // The sidebar then becomes a slim rail and its full menu opens as an overlay.
  const [panelOpen, setPanelOpen] = useState(false);
  // True while a collapsed sidebar is hover-expanded (no panel open): the page makes room, like a normal expanded sidebar.
  const [hoverExpanded, setHoverExpanded] = useState(false);

  return (
    <BrowserRouter>
      <div className="workspace-shell">
        {/* Dark promotional strip above the rounded application workspace */}
        <header className="workspace-promo">
          <div className="promo-brand" aria-label="Schedy">S</div>

          <div className="promo-referral">
            <Gift size={15} />
            <span>DEMO WORKSPACE</span>
            <strong>Explore your dashboard</strong>
          </div>

          <div className="promo-center">
            <Sparkles size={16} />
            <span>Schedy Admin</span>
            <span className="promo-separator">·</span>
            <span className="promo-center-subtitle">Manage your invitation business</span>
            <ArrowRight size={15} />
          </div>

          <div className="promo-actions">
            <span className="promo-agent"><Sparkles size={14} /> Demo mode</span>
            <button type="button" className="promo-bell" aria-label="Notifications"><Bell size={18} /><i /></button>
            <button
              type="button" className="promo-user" aria-label="Profile"
              aria-haspopup="menu" aria-expanded={profileOpen}
              onClick={() => setProfileOpen((o) => !o)}
            >
              <span className="promo-avatar">H</span>
              <span className="promo-user-info">
                <span className="promo-user-name">Harsha</span>
                <span className="promo-user-role">Administrator</span>
              </span>
            </button>
          </div>
        </header>

        <div className="workspace-body">
        {/* Main rounded dashboard frame */}
        <div className="app">
          <Sidebar
            collapsed={sidebarCollapsed}
            setCollapsed={setSidebarCollapsed}
            panelOpen={panelOpen}
            onHoverExpand={setHoverExpanded}
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
            </Routes>
          </main>
        </div>

        {/* Pages (e.g. Create) portal their side panel here, as a separate rounded card */}
        <div id="preview-slot" className="preview-slot" />
        </div>
      </div>

      {profileOpen && <ProfileMenu onClose={() => setProfileOpen(false)} />}

      <style>{`
        * { box-sizing: border-box; }

        html, body, #root {
          width: 100%;
          min-height: 100%;
          margin: 0;
          padding: 0;
        }

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

        .workspace-promo {
          position: relative;
          z-index: 3000;
          width: 100%;
          height: 64px;
          flex: 0 0 64px;
          padding: 0 16px;
          display: flex;
          align-items: center;
          gap: 22px;
          color: #fff;
          background: linear-gradient(105deg, #101011 0%, #471ea7 50%, #101011 100%);
          font-size: 13px;
        }

        .promo-brand {
          width: 40px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-right: 1px solid rgba(255,255,255,.18);
          padding-right: 12px;
          color: #fff;
          font-size: 29px;
          line-height: 1;
          font-weight: 900;
          font-style: italic;
        }

        .promo-referral {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 13px;
          border: 1px solid rgba(255,255,255,.28);
          border-radius: 30px;
          background: rgba(255,255,255,.12);
          white-space: nowrap;
        }

        .promo-referral strong {
          color: #e7d9ff;
          font-weight: 600;
        }

        .promo-center {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          margin: 0 auto;
          padding: 9px 17px;
          border: 1px solid rgba(255,255,255,.22);
          border-radius: 30px;
          background: rgba(9,7,20,.35);
          white-space: nowrap;
        }

        .promo-center > svg:first-child { color: #d9c6ff; }
        .promo-separator { color: rgba(255,255,255,.48); }

        .promo-actions {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .promo-agent,
        .promo-actions button {
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          color: #fff;
          border: 1px solid rgba(255,255,255,.22);
          background: rgba(255,255,255,.09);
        }

        .promo-agent {
          padding: 0 13px;
          border-radius: 24px;
          white-space: nowrap;
        }

        .promo-actions button {
          position: relative;
          width: 28px;
          border-radius: 50%;
          cursor: pointer;
        }

        .promo-actions button.promo-bell { width: 38px; }

        .promo-actions button.promo-user {
          width: auto;
          padding: 0 14px 0 4px;
          gap: 9px;
          border-radius: 24px;
          text-align: left;
        }

        .promo-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          color: #351775;
          font-size: 12px;
          font-weight: 700;
        }

        .promo-user-info { display: flex; flex-direction: column; gap: 2px; line-height: 1; }
        .promo-user-name { font-size: 13px; font-weight: 700; }
        .promo-user-role { font-size: 11px; color: rgba(255,255,255,.66); }

        .promo-actions button i {
          position: absolute;
          top: 6px;
          right: 7px;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #fb4778;
        }

        /* ---------- profile dropdown ---------- */
        .pm, .pm * { box-sizing: border-box; }
        .pm {
          position: fixed;
          top: 70px;
          right: 20px;
          z-index: 5000;
          width: 304px;
          max-width: calc(100vw - 16px);
          max-height: calc(100vh - 82px);
          overflow-y: auto;
          padding: 6px 0;
          border-radius: 24px;
          background: #fff;
          color: #202027;
          font-family: "DM Sans", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          box-shadow: 0 18px 50px rgba(0, 0, 0, .38);
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
          transition: margin-left .3s cubic-bezier(.4,0,.2,1);
        }

        .main-content.content-expanded { margin-left: 260px; }
        .main-content.content-collapsed { margin-left: 90px; }

        /* Reposition the existing sidebar and top navigation inside the frame. */
        .app .top-navbar {
          position: fixed !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          width: auto !important;
          border-radius: 26px 26px 0 0 !important;
          overflow: hidden;
          z-index: 1500 !important;
        }

        .app .d-sidebar {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          height: 100% !important;
          /* Round both outer-left corners to match the app frame. */
          border-radius: 26px 0 0 26px !important;
          overflow: hidden;
          z-index: 2000 !important;
        }

        .app .d-sidebar-inner { overflow-y: auto; border-top-left-radius: 26px !important; }
        .app .d-sidebar-header { border-top-left-radius: 26px !important; }
        .app .d-sidebar, .app .d-sidebar * { -webkit-mask-image: -webkit-radial-gradient(white, black); }

        @media (max-width: 900px) {
          .promo-center { display: none; }
          .promo-referral { margin-right: auto; }
        }

        @media (max-width: 900px) {
          .workspace-body { gap: 0; }
          .preview-slot { display: contents; }
        }

        @media (max-width: 768px) {
          .workspace-shell {
            min-height: 0;
            padding: 0 5px 5px;
          }

          .workspace-promo {
            height: 64px;
            flex-basis: 64px;
            padding: 0 10px;
            gap: 10px;
          }

          .promo-brand {
            width: 31px;
            height: 34px;
            padding-right: 8px;
            font-size: 24px;
          }

          .promo-referral {
            gap: 6px;
            padding: 7px 9px;
            font-size: 11px;
          }

          .promo-referral strong { display: none; }
          .promo-agent { padding: 0 9px; font-size: 11px; }
          .promo-actions { gap: 5px; }
          .promo-actions button { width: 34px; height: 34px; }
          .promo-actions button.promo-bell { width: 34px; }
          .promo-actions button.promo-user { width: 34px; padding: 0; }
          .promo-user-info { display: none; }
          .promo-avatar { width: 26px; height: 26px; }

          .app {
            height: auto;
            min-height: 0;
            flex: 1 1 0;
            border-radius: 20px;
            clip-path: inset(0 round 20px);
            -webkit-clip-path: inset(0 round 20px);
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

          .app .m-header {
            top: 32px !important;
            left: 5px !important;
            right: 5px !important;
          }

          .app .m-overlay { top: 32px !important; }

          .pm { right: 8px; }
        }
      `}</style>
    </BrowserRouter>
  );
}

export default App;
