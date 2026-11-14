import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Bell, User, Users, CreditCard, ShieldCheck, Activity, Languages, BookOpen, LifeBuoy, LogOut, ExternalLink } from "./Icons";
import type { IconComponent } from "./Icons";
import { SkText } from "./Skeleton";
import { useAccount } from "../hooks/useAccount";
import { DOCS_URL, SUPPORT_URL, openHelpLink } from "../lib/helpLinks";

/* Profile dropdown that opens from the navbar profile button. Shared by the admin shell and the client area. */
export function ProfileMenu({ onClose, variant = "admin" }: { onClose: () => void; variant?: "admin" | "client" }) {
  const client = variant === "client";
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
    const app = document.querySelector(".app, .client-app");
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
    <>
    <style>{PROFILE_MENU_CSS}</style>
    <div
      className="pm" role="menu" aria-label="Profile menu"
      style={pos ? { top: pos.top, right: pos.right, maxHeight: `calc(100vh - ${pos.top}px - 12px)` } : undefined}
    >
      <div className="pm-head">
        <div className="pm-head-row">
          <b>{loading ? <SkText w={14} /> : user?.name ?? "Account"}</b>
          {loading ? <em className="pm-badge sk-bg" aria-hidden="true">Pro trial</em> : !client && planLabel && <em className="pm-badge">{planLabel}</em>}
        </div>
        <span>{loading ? <SkText w={20} /> : user?.email}</span>
      </div>
      {!client && (
        <>
          <i className="pm-sep" />
          <Item icon={User} label="Account information" />
          <Item icon={Users} label="Account sharing" />
          <Item icon={CreditCard} label="Billing" to="/billing" />
          <i className="pm-sep" />
          <Item icon={ShieldCheck} label="Security" />
          <Item icon={Activity} label="Account activity" />
          <Item icon={Bell} label="Notification settings" />
          <Item icon={Languages} label="Language" value={loading ? <SkText w={7} /> : "English"} />
        </>
      )}
      <i className="pm-sep" />
      <Item icon={BookOpen} label="Help center" href={DOCS_URL} external />
      <Item icon={LifeBuoy} label="Contact support" href={SUPPORT_URL} />
      <i className="pm-sep" />
      {/* The login page clears the session when it opens, so a "Save your changes?" prompt can still cancel the logout. */}
      <Item icon={LogOut} label="Log out" onSelect={() => navigate("/login", { replace: true, state: { loggedOut: true } })} />
    </div>
    </>,
    document.body
  );
}

export const PROFILE_MENU_CSS = `
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
          font-family: "DM Sans", "Noto Sans Telugu", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          box-shadow: 0 18px 50px rgba(0, 0, 0, .28);
          animation: pm-in .16s ease;
        }
        @keyframes pm-in { from { opacity: 0; transform: translateY(-6px) scale(.98); } to { opacity: 1; transform: none; } }
        .pm-head { padding: 16px 22px 12px; display: flex; flex-direction: column; gap: 3px; }
        .pm-head b { font-size: 16px; font-weight: 700; }
        .pm-head span { font-size: 13px; color: #6d7081; overflow-wrap: anywhere; }
        .pm-head-row { display: flex; align-items: center; gap: 8px; }
        .pm-badge {
          font-style: normal; font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 999px;
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
        .pm-item .pm-soon { font-size: 12px; font-weight: 600; letter-spacing: .02em; text-transform: uppercase; }
                .pm-item:focus-visible { outline: 2px solid #6d3fe0; outline-offset: -2px; }
        .pm-item svg { flex-shrink: 0; color: #4a4c5c; }
        .pm-item .pm-val { margin-left: auto; font-style: normal; font-size: 13px; color: #6d7081; }
        @media (max-width: 768px) {
          .pm { top: calc(var(--chrome-top, 44px) + 76px); right: 8px; }
        }
`;
