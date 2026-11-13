import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, MailPlus, Mails, LayoutTemplate, Palette, Image as ImageIcon, LayoutGrid,
  PanelTop, Layers, ChevronRight, ChevronLeft, ChevronDown, ExternalLink, ArrowUpRight, Search, Bell, Plus, Inbox,
} from "./Icons";
import type { IconComponent } from "./Icons";
import { SkText } from "./Skeleton";
import { useAccount } from "../hooks/useAccount";
import { useLatest } from "../hooks/useLatest";
import { NotificationPanel } from "../features/notifications/NotificationPanel";
import { useAdminNotifications } from "../features/notifications/useAdminNotifications";

import logo from "../assets/logo.png";
import logoSmall from "../assets/logo-small.png";

/* =========================================================
   NAV DATA  (icons are Hugeicons: one set, follows currentColor,
   so hover / active states need no extra image files)
========================================================= */

const menuItems = [
  { name: "Dashboard", path: "/dashboard", Icon: LayoutDashboard },
  { name: "Create Invitation", path: "/create", Icon: MailPlus },
  { name: "All Invitations", path: "/invitations", Icon: Mails },
  { name: "Review queue", path: "/reviews", Icon: Inbox },
  { name: "Manage Templates", path: "/templates", Icon: LayoutTemplate },
];

const submenuItems = [
  { name: "Hero Section", path: "/customize/hero-section", Icon: ImageIcon },
  { name: "Sections", path: "/customize/sections", Icon: LayoutGrid },
  { name: "Popup", path: "/customize/popup", Icon: PanelTop },
  { name: "Combo Offer", path: "/customize/combo", Icon: Layers },
];

/* Breadcrumb comes from the route instead of being hardcoded */
const CRUMBS: Record<string, string[]> = {
  "/dashboard": ["Dashboard", "Overview"],
  "/create": ["Manage", "Create invitation"],
  "/invitations": ["Manage", "All invitations"],
  "/reviews": ["Manage", "Review queue"],
  "/templates": ["Manage", "Templates"],
  "/customize/hero-section": ["Customize site", "Hero section"],
  "/customize/sections": ["Customize site", "Sections"],
  "/customize/popup": ["Customize site", "Popup"],
  "/customize/combo": ["Customize site", "Combo offer"],
};

function getCrumbs(pathname: string): string[] {
  const clean = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  if (CRUMBS[clean]) return CRUMBS[clean];
  const last = clean.split("/").filter(Boolean).pop() || "Overview";
  return ["Dashboard", last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, " ")];
}

function MenuIcon({ Icon, size = 20 }: { Icon: IconComponent; size?: number }) {
  return (
    <span className="menu-icon" aria-hidden="true">
      <Icon size={size} strokeWidth={1.8} />
    </span>
  );
}

/* Always rendered so it can animate; hidden links are not focusable */
function Submenu({ id, open, onNavigate }: { id: string; open: boolean; onNavigate: () => void }) {
  return (
    <div id={id} className={`nav-submenu ${open ? "open" : ""}`}>
      <div className="nav-submenu-inner">
        {submenuItems.map(({ name, path, Icon }, i) => (
          <NavLink
            key={path}
            to={path}
            style={{ "--i": i }}
            onClick={onNavigate}
            className={({ isActive }) => `nav-submenu-item${isActive ? " active" : ""}`}
          >
            <MenuIcon Icon={Icon} size={18} />
            <span>{name}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   SIDEBAR
========================================================= */

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  panelOpen?: boolean;
  onHoverExpand?: (expanded: boolean) => void;
  onProfileClick?: () => void;
  profileOpen?: boolean;
  /** Optional: pass a handler to show the search button + Ctrl K shortcut. */
  onSearch?: () => void;
  liveSiteUrl?: string;
  /** Enquiries still marked "new"; the bell shows its dot only when this is above 0. */
  enquiryCount?: number;
  /** Pending change requests; the Review queue nav item shows a count badge when above 0. */
  reviewCount?: number;
}

interface Pill { x: number; y: number; w: number; h: number; sub: boolean }
type Timer = ReturnType<typeof setTimeout> | undefined;

export default function Sidebar({
  collapsed,
  setCollapsed,
  panelOpen = false,
  onHoverExpand,
  onProfileClick,
  profileOpen = false,
  onSearch,
  liveSiteUrl = "/",
  enquiryCount = 0,
  reviewCount = 0,
}: SidebarProps) {
  const { pathname } = useLocation();
  const { loading: accountLoading, user } = useAccount();
  const initial = (user?.name?.trim()[0] ?? "A").toUpperCase();
  const customizeActive = pathname.startsWith("/customize");
  const notifs = useAdminNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);

  const [siteOpen, setSiteOpen] = useState(customizeActive);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const showBellDot = notifs.unread > 0 || enquiryCount > 0;

  const overlayMode = panelOpen;

  /* Landing on (or reloading) a /customize page opens its group */
  useEffect(() => {
    if (customizeActive) setSiteOpen(true);
  }, [customizeActive]);

  /* ---- Hover "peek" ------------------------------------------------
     Hovering the collapsed sidebar opens it (pushing the content aside, or
     floating over it when the preview panel is open). A short delay on
     enter/leave stops flicker, and the Customize submenu only opens on click. */
  const [peek, setPeek] = useState(false);
  const [siteTouched, setSiteTouched] = useState(false);
  const peekTimer = useRef<Timer>(undefined);

  const baseExpanded = overlayMode ? overlayOpen : !collapsed;
  const isExpanded = baseExpanded || peek;
  const peeking = peek && !baseExpanded;
  /* Preview panel open  -> sidebar floats over the page (overlay).
     Preview panel closed -> hovering pushes the content aside and uses the space. */
  const floating = isExpanded && overlayMode;
  const narrowLayout = overlayMode || (collapsed && !peeking);
  const sidebarOpen = baseExpanded;
  const submenuOpen = siteOpen && (!peeking || siteTouched);

  const handlePointerEnter = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType && e.pointerType !== "mouse") return; // touch: tap, don't peek
    clearTimeout(peekTimer.current);
    if (baseExpanded) return;
    peekTimer.current = setTimeout(() => setPeek(true), 120);
  };
  const handlePointerLeave = () => {
    clearTimeout(peekTimer.current);
    peekTimer.current = setTimeout(() => setPeek(false), 180);
  };
  useEffect(() => () => clearTimeout(peekTimer.current), []);
  useEffect(() => { if (baseExpanded) setPeek(false); }, [baseExpanded]);

  /* ---- Sliding active pill -----------------------------------------
     Same look as the static highlight (soft brand bg + left accent bar),
     but it slides to whichever link is active. */
  const navRef = useRef<HTMLElement>(null);
  const [pill, setPill] = useState<Pill | null>(null);
  const [pillAnim, setPillAnim] = useState(false);

  const measurePill = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    const el =
      nav.querySelector<HTMLElement>(".nav-submenu.open .nav-submenu-item.active") ||
      nav.querySelector<HTMLElement>(".nav-item.active:not(.dropdown-open)");
    if (!el || !el.offsetWidth) { setPill(null); return; }
    let x = 0, y = 0;
    let n: HTMLElement | null = el;
    while (n && n !== nav) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent as HTMLElement | null; }
    const sub = el.classList.contains("nav-submenu-item");
    const next = { x, y, w: el.offsetWidth, h: el.offsetHeight, sub };
    setPill((p) => (p && p.x === next.x && p.y === next.y && p.w === next.w && p.h === next.h && p.sub === next.sub ? p : next));
  }, []);

  useLayoutEffect(() => { measurePill(); }, [pathname, isExpanded, submenuOpen, measurePill]);
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measurePill);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [measurePill]);

  /* The pill only slides right after a nav link is clicked. Any other layout
     change (collapse/expand, hover, first paint) repositions it instantly. */
  const animTimer = useRef<Timer>(undefined);
  const handleNavClick = (e: MouseEvent<HTMLElement>) => {
    if (!(e.target as Element).closest("a.nav-item, a.nav-submenu-item")) return;
    setPillAnim(true);
    clearTimeout(animTimer.current);
    animTimer.current = setTimeout(() => setPillAnim(false), 450);
  };
  useEffect(() => () => clearTimeout(animTimer.current), []);

  const hoverExpandRef = useLatest(onHoverExpand);
  useEffect(() => {
    hoverExpandRef.current?.(!overlayMode && peeking);
  }, [overlayMode, peeking, hoverExpandRef]);
  useEffect(() => () => hoverExpandRef.current?.(false), [hoverExpandRef]);

  useEffect(() => {
    if (!overlayMode) setOverlayOpen(false);
  }, [overlayMode]);

  useEffect(() => {
    if (!overlayOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOverlayOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlayOpen]);

  useEffect(() => {
    if (!onSearch) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSearch]);

  const closeOverlay = () => {
    if (overlayMode) setOverlayOpen(false);
  };

  const collapseNow = () => {
    clearTimeout(peekTimer.current);
    setPeek(false);
    if (overlayMode) setOverlayOpen(false);
    else setCollapsed(true);
  };

  const handleToggle = () => {
    clearTimeout(peekTimer.current);
    setPeek(false);
    if (overlayMode) {
      setOverlayOpen(!overlayOpen);
      return;
    }
    setCollapsed(!collapsed);
  };

  const handleCustomizeClick = () => {
    setSiteTouched(true);
    if (!isExpanded) {
      if (overlayMode) setOverlayOpen(true);
      else setCollapsed(false);
      setTimeout(() => setSiteOpen(true), 300);
      return;
    }
    setSiteOpen(!submenuOpen);
  };

  const closeMobileDrawer = () => setMobileOpen(false);

  const crumbs = getCrumbs(pathname);

  return (
    <>
      {/* ===================================================
          DESKTOP TOP NAVBAR
      =================================================== */}
      <header className="top-navbar">
        <div className={`top-navbar-inner ${narrowLayout ? "navbar-collapsed" : "navbar-expanded"}`}>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span className="breadcrumb-muted">{crumbs[0]}</span>
            <span className="breadcrumb-divider" aria-hidden="true">/</span>
            <span className="breadcrumb-current" aria-current="page">{crumbs[1]}</span>
          </nav>

          <div className="navbar-right">
            {onSearch && (
              <button type="button" className="nav-search" onClick={onSearch}>
                <Search size={16} strokeWidth={1.8} />
                <span>Search</span>
                <kbd>Ctrl K</kbd>
              </button>
            )}

            {pathname !== "/create" && (
              <NavLink to="/create" className="nav-cta">
                <Plus size={16} strokeWidth={2.2} />
                <span>Create</span>
              </NavLink>
            )}

            <div className="navbar-notif">
              <button
                ref={bellRef}
                type="button"
                className="navbar-icon-button"
                aria-label={
                  notifs.unread > 0
                    ? `Notifications, ${notifs.unread} unread`
                    : enquiryCount > 0
                      ? `Notifications, ${enquiryCount} new enquir${enquiryCount === 1 ? "y" : "ies"}`
                      : "Notifications"
                }
                aria-expanded={notifOpen}
                aria-haspopup="dialog"
                onClick={() => setNotifOpen((o) => !o)}
              >
                <Bell size={19} strokeWidth={1.8} />
                {showBellDot && <i className="notification-dot" />}
              </button>
              <NotificationPanel
                open={notifOpen}
                onClose={() => setNotifOpen(false)}
                items={notifs.items}
                loading={notifs.loading}
                error={notifs.error}
                unread={notifs.unread}
                onMarkRead={notifs.markRead}
                onMarkAllRead={notifs.markAllRead}
                onRetry={() => notifs.load()}
                anchorRef={bellRef}
              />
            </div>

            <i className="navbar-divider" aria-hidden="true" />

            <button
              type="button"
              className="navbar-user"
              data-pm-trigger
              aria-label="Profile"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              onClick={onProfileClick}
            >
              <span className={`navbar-avatar${accountLoading ? " sk-bg" : ""}`} aria-hidden={accountLoading || undefined}>{initial}</span>
              <span className="navbar-user-info">
                <span className="navbar-user-name">{accountLoading ? <SkText w={13} /> : user?.name}</span>
                <span className="navbar-user-role">{accountLoading ? <SkText w={11} /> : user?.role}</span>
              </span>
              <ChevronDown className="navbar-user-chevron" size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* ===================================================
          DESKTOP SIDEBAR
      =================================================== */}
      {overlayMode && overlayOpen && (
        <div className="d-scrim" onClick={() => setOverlayOpen(false)} aria-hidden="true" />
      )}

      <aside
        className={`d-sidebar ${isExpanded ? "expanded" : "collapsed"}${floating ? " as-overlay" : ""}`}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <div className="d-sidebar-header">
          {isExpanded ? (
            <NavLink to="/dashboard" className="brand-logo" onClick={closeOverlay}>
              <img src={logo} alt="Logo" />
            </NavLink>
          ) : (
            <span className="mini-logo">
              <img src={logoSmall} alt="Logo" />
            </span>
          )}
        </div>

        {/* Collapse chip sits on the sidebar edge, aligned with the logo row */}
        <button
          type="button"
          className="sidebar-edge-toggle"
          onClick={handleToggle}
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? <ChevronLeft size={15} strokeWidth={2.2} /> : <ChevronRight size={15} strokeWidth={2.2} />}
        </button>

        <div className="d-sidebar-inner">
          <nav aria-label="Main" className="d-nav" ref={navRef} onClickCapture={handleNavClick}>
            <div className="nav-section-label">Manage</div>

            {menuItems.map(({ name, path, Icon }, i) => (
              <NavLink
                key={path}
                to={path}
                end={path === "/dashboard"}
                style={{ "--i": i }}
                onClick={path === "/create" ? collapseNow : closeOverlay}
                aria-label={
                  path === "/reviews" && reviewCount > 0
                    ? `${name}, ${reviewCount} pending`
                    : isExpanded ? undefined : name
                }
                className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              >
                <MenuIcon Icon={Icon} />
                <span className="nav-label">{name}</span>
                {path === "/reviews" && reviewCount > 0 && (
                  <em className="nav-count" aria-hidden="true">{reviewCount > 99 ? "99+" : reviewCount}</em>
                )}
              </NavLink>
            ))}

            <div className="nav-section-label">Storefront</div>

            <button
              type="button"
              className={`nav-item${submenuOpen && isExpanded ? " dropdown-open" : ""}${customizeActive ? " active" : ""}`}
              style={{ "--i": menuItems.length }}
              onClick={handleCustomizeClick}
              aria-label={isExpanded ? undefined : "Customize Site"}
              aria-expanded={isExpanded && submenuOpen}
              aria-controls="site-submenu"
            >
              <MenuIcon Icon={Palette} />
              <span className="nav-label">Customize Site</span>
              {isExpanded && <ChevronRight className="nav-chevron" size={16} strokeWidth={2} />}
            </button>

            {isExpanded && <Submenu id="site-submenu" open={submenuOpen} onNavigate={closeOverlay} />}

            {/* Sliding active highlight (desktop only) */}
            <span
              className={`nav-pill${pill ? " show" : ""}${pillAnim ? " anim" : ""}${pill?.sub ? " sub" : ""}`}
              style={pill ? { transform: `translate(${pill.x}px, ${pill.y}px)`, width: pill.w, height: pill.h } : undefined}
              aria-hidden="true"
            />
          </nav>

          {/* Footer: a useful action instead of a duplicate of the profile */}
          <div className="d-footer">
            <a className="live-site" href={liveSiteUrl} target="_blank" rel="noreferrer" aria-label={isExpanded ? undefined : "View live site"}>
              <MenuIcon Icon={ExternalLink} size={18} />
              <span className="nav-label" style={{ "--i": menuItems.length + 1 }}>View live site</span>
              <ArrowUpRight className="live-arrow" size={16} strokeWidth={2} aria-hidden="true" />
              <span className="live-dot" aria-label="Store is live" title="Store is live" />
            </a>
            <div className="powered">Powered by Schedy</div>
          </div>
        </div>
      </aside>

      {/* ===================================================
          MOBILE HEADER
      =================================================== */}
      <header className="m-header">
        <button className="m-menu-btn" onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <div className="m-menu-lines"><span /></div>
        </button>

        <NavLink to="/dashboard" className="mobile-brand-logo">
          <img src={logo} alt="Logo" />
        </NavLink>

        <button
          type="button"
          className="m-profile-btn"
          data-pm-trigger
          aria-label="Profile"
          aria-haspopup="menu"
          aria-expanded={profileOpen}
          onClick={onProfileClick}
        >
          H
        </button>
      </header>

      {/* ===================================================
          MOBILE DRAWER
      =================================================== */}
      <div
        className={`m-overlay ${mobileOpen ? "open" : ""}`}
        onClick={(e) => e.target === e.currentTarget && closeMobileDrawer()}
      >
        <div className="m-drawer">
          <div className="m-drawer-header">
            <NavLink to="/dashboard" className="brand-logo" onClick={closeMobileDrawer}>
              <img src={logo} alt="Logo" />
            </NavLink>
            <button className="m-drawer-close" onClick={closeMobileDrawer} aria-label="Close menu">
              <div className="m-drawer-close-icon" />
            </button>
          </div>

          <nav className="m-drawer-nav" aria-label="Main">
            <div className="nav-section-label">Manage</div>

            {menuItems.map(({ name, path, Icon }) => (
              <NavLink
                key={path}
                to={path}
                end={path === "/dashboard"}
                onClick={closeMobileDrawer}
                className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
                aria-label={path === "/reviews" && reviewCount > 0 ? `${name}, ${reviewCount} pending` : undefined}
              >
                <MenuIcon Icon={Icon} />
                <span className="nav-label">{name}</span>
                {path === "/reviews" && reviewCount > 0 && (
                  <em className="nav-count" aria-hidden="true">{reviewCount > 99 ? "99+" : reviewCount}</em>
                )}
              </NavLink>
            ))}

            <div className="nav-section-label">Storefront</div>

            <button
              type="button"
              className={`nav-item${siteOpen ? " dropdown-open" : ""}${customizeActive ? " active" : ""}`}
              onClick={() => setSiteOpen(!siteOpen)}
              aria-expanded={siteOpen}
              aria-controls="m-site-submenu"
            >
              <MenuIcon Icon={Palette} />
              <span className="nav-label">Customize Site</span>
              <ChevronRight className="nav-chevron" size={16} strokeWidth={2} />
            </button>

            <Submenu id="m-site-submenu" open={siteOpen} onNavigate={closeMobileDrawer} />
          </nav>

          <div className="m-account-section">
            <button
              type="button"
              className="account-card account-button"
              data-pm-trigger
              onClick={() => {
                closeMobileDrawer();
                onProfileClick?.();
              }}
            >
              <span className={`account-avatar${accountLoading ? " sk-bg" : ""}`} aria-hidden={accountLoading || undefined}>{initial}</span>
              <span className="account-text">
                <span className="account-name">{accountLoading ? <SkText w={13} /> : user?.name}</span>
                <span className="account-email">{accountLoading ? <SkText w={11} /> : user?.role}</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        :root {
          --header-height-desktop: 64px;
          --sidebar-width: 260px;
          --sidebar-collapsed-width: 90px;
          --row-height: 48px;
          --sidebar-bg: var(--white);
          --header-bg: var(--white);
          --page-bg: var(--gray-light);
          --text-color: var(--dark);
          --icon-color: var(--gray);
          --brand-primary: var(--primary);
          --active-bg: var(--primary-light);
          --hover-bg: var(--primary-lightest);
          --border-subtle: var(--gray-border);
          --radius-md: 10px;
          --radius-lg: 14px;
          --tooltip-bg: var(--gray-dark);
          --spring: cubic-bezier(.22, 1, .36, 1);
        }

        .d-sidebar, .top-navbar, .m-header, .m-drawer {
          font-family: "DM Sans", Roboto, sans-serif;
          font-weight: 500;
          color: var(--text-color);
        }

        .d-sidebar button, .top-navbar button, .m-header button, .m-drawer button { font-family: inherit; }

        .nav-item:focus-visible,
        .nav-submenu-item:focus-visible,
        .sidebar-edge-toggle:focus-visible,
        .navbar-icon-button:focus-visible,
        .navbar-user:focus-visible,
        .nav-cta:focus-visible,
        .nav-search:focus-visible,
        .live-site:focus-visible,
        .account-button:focus-visible,
        .m-profile-btn:focus-visible {
          outline: 2px solid var(--brand-primary);
          outline-offset: 2px;
        }

        /* ---------- TOP NAVBAR ---------- */

        .top-navbar {
          position: fixed;
          top: 0; left: 0; right: 0;
          height: var(--header-height-desktop);
          background: var(--header-bg);
          /* lighter than the sidebar's edge so the sidebar reads as the dominant plane */
          border-bottom: 1px solid color-mix(in srgb, var(--border-subtle) 55%, transparent);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .7);
          z-index: 1500;
        }

        .top-navbar-inner {
          height: var(--header-height-desktop);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 0 24px;
          transition: margin-left .45s var(--spring);
        }

        .navbar-expanded { margin-left: var(--sidebar-width); }
        .navbar-collapsed { margin-left: var(--sidebar-collapsed-width); }

        .breadcrumb { display: flex; align-items: center; gap: 9px; min-width: 0; font-size: 13px; white-space: nowrap; }
        .breadcrumb-muted { color: var(--gray); }
        .breadcrumb-divider { color: var(--gray-border); }
        .breadcrumb-current { color: var(--text-color); font-size: 16px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; }

        .navbar-right { display: flex; align-items: center; gap: 8px; }

        .nav-search {
          height: 38px;
          display: flex; align-items: center; gap: 8px;
          padding: 0 8px 0 12px;
          border: 1px solid var(--border-subtle);
          border-radius: 10px;
          background: var(--gray-light);
          color: var(--gray);
          font-size: 13px;
          cursor: pointer;
        }
        .nav-search:hover { color: var(--text-color); border-color: var(--gray); }
        .nav-search kbd {
          font: inherit; font-size: 11px; padding: 2px 6px; border-radius: 6px;
          background: var(--white); border: 1px solid var(--border-subtle);
        }

        .nav-cta {
          height: 38px;
          display: flex; align-items: center; gap: 6px;
          padding: 0 16px 0 12px;
          border-radius: 10px;
          background: var(--btn);
          color: var(--white, #fff);
          font-size: 14px; font-weight: 600;
          text-decoration: none;
          box-shadow: none;
        }
        .nav-cta:hover { background: var(--btn-hover); }
        .nav-cta:active { transform: translateY(1px); }

        .navbar-icon-button {
          width: 38px; height: 38px;
          border: 0; background: transparent; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: var(--icon-color); position: relative;
        }
        .navbar-icon-button:hover { background: var(--hover-bg); color: var(--brand-primary); }

        .notification-dot {
          position: absolute; top: 9px; right: 10px;
          width: 7px; height: 7px; border-radius: 50%;
          background: #fb4778; border: 1.5px solid var(--white);
        }

        .navbar-notif { position: relative; }
        .notif-panel {
          position: absolute; top: calc(100% + 8px); right: 0; z-index: 80;
          width: min(360px, calc(100vw - 24px));
          max-height: min(420px, 70vh);
          display: flex; flex-direction: column;
          background: var(--white, #fff); border: 1px solid var(--gray-border, #e5e7eb);
          border-radius: 14px; box-shadow: 0 12px 40px rgba(15, 23, 42, 0.12);
          overflow: hidden;
        }
        .notif-panel-head {
          display: flex; align-items: center; justify-content: space-between;
          gap: 10px; padding: 12px 14px; border-bottom: 1px solid var(--gray-border, #e5e7eb);
          font-size: 14px;
        }
        .notif-list { list-style: none; margin: 0; padding: 0; overflow-y: auto; }
        .notif-item {
          width: 100%; display: flex; flex-direction: column; gap: 2px;
          padding: 12px 14px; border: 0; border-bottom: 1px solid var(--gray-border, #e5e7eb);
          background: transparent; text-align: left; cursor: pointer; font: inherit; color: inherit;
        }
        .notif-item:hover { background: var(--hover-bg, #f5f6fa); }
        .notif-item.unread { background: var(--primary-lightest, #f0f7ff); }
        .notif-item-title {
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; font-weight: 700; color: var(--dark, #111);
        }
        .notif-dot {
          width: 7px; height: 7px; border-radius: 50%; background: #fb4778; flex-shrink: 0;
        }
        .notif-item-body { font-size: 12.5px; color: var(--gray-dark, #4b5563); line-height: 1.35; }
        .notif-item-time { font-size: 11.5px; color: var(--gray, #9ca3af); }
        .notif-empty {
          margin: 0; padding: 28px 16px; text-align: center; color: var(--gray, #9ca3af); font-size: 13px;
        }

        .nav-item .nav-count {
          margin-left: auto;
          min-width: 20px; height: 18px; padding: 0 6px;
          display: inline-grid; place-items: center;
          border-radius: 999px; background: var(--warning-light, #fef3c7);
          color: var(--dx-warn-text, #9a6700);
          font-size: 11px; font-style: normal; font-weight: 700;
        }
        .sidebar.collapsed .nav-item .nav-count { display: none; }

        .navbar-divider { width: 1px; height: 28px; background: var(--border-subtle); margin: 0 6px; }

        .navbar-user {
          border: 0; background: transparent;
          display: flex; align-items: center; gap: 10px;
          padding: 4px 10px 4px 4px; border-radius: 999px;
          cursor: pointer; text-align: left; color: inherit;
        }
        .navbar-user:hover, .navbar-user[aria-expanded="true"] { background: var(--hover-bg); }

        .navbar-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          background: var(--brand-primary); color: var(--white, #fff);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700;
        }
        .navbar-user-info { display: flex; flex-direction: column; gap: 2px; line-height: 1.1; }
        .navbar-user-name { font-size: 13px; font-weight: 700; }
        .navbar-user-role { font-size: 11px; color: var(--text-sub, var(--gray)); }
        .navbar-user-chevron { color: var(--icon-color); flex-shrink: 0;}
        .navbar-user[aria-expanded="true"] .navbar-user-chevron { transform: rotate(180deg); }

        /* ---------- SIDEBAR ---------- */

        .d-sidebar {
          width: var(--sidebar-width);
          height: 100vh;
          background: var(--sidebar-bg);
          border-right: 1px solid var(--border-subtle);
          display: flex; flex-direction: column;
          position: fixed; top: 0; left: 0;
          z-index: 2000;
          transition: width .45s var(--spring);
        }
        .d-sidebar.collapsed { width: var(--sidebar-collapsed-width); }

        /* 64px = same height as the top navbar, so the border line runs straight across */
        .d-sidebar-header {
          height: var(--header-height-desktop);
          min-height: var(--header-height-desktop);
          display: flex; align-items: center;
          padding: 0 24px;
          border-bottom: 1px solid var(--border-subtle);
          flex-shrink: 0;
        }
        .d-sidebar.collapsed .d-sidebar-header { justify-content: center; padding: 0; }

        .brand-logo, .mini-logo { display: flex; align-items: center; text-decoration: none; }
        .brand-logo img, .mini-logo img {
          height: 36px; width: auto; display: block;
        }
        

        .sidebar-edge-toggle {
          position: absolute; top: 18px; right: -14px;
          width: 28px; height: 28px; border-radius: 50%;
          border: 1px solid var(--border-subtle);
          background: var(--white); color: var(--icon-color);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; z-index: 5;
          box-shadow: 0 2px 8px rgba(17, 12, 41, .12);
          opacity: 0; transform: scale(.85);
        }
        .d-sidebar:hover .sidebar-edge-toggle,
        .sidebar-edge-toggle:focus-visible { opacity: 1; transform: scale(1); }
        .sidebar-edge-toggle:hover { background: var(--btn-hover); border-color: var(--btn-hover); color: var(--white, #fff); }

        .d-scrim { position: absolute; inset: 0; background: rgba(23, 19, 38, .38); backdrop-filter: blur(2px); z-index: 1900;}
        .d-sidebar.as-overlay { box-shadow: 18px 0 48px -14px rgba(36, 20, 90, .3); }
        

        .d-sidebar-inner {
          flex: 1; padding: 8px 16px 16px;
          display: flex; flex-direction: column;
          overflow-y: auto; overflow-x: hidden;
          scrollbar-width: none;
        }
        .d-sidebar-inner::-webkit-scrollbar { display: none; }

        .d-nav { position: relative; }

        /* Group labels: caps-style, collapse into a hairline (height/padding animate) */
        .nav-section-label {
          height: 38px; padding: 18px 18px 0;
          font-size: 11px; font-weight: 600;
          letter-spacing: .06em; text-transform: uppercase;
          color: var(--gray); white-space: nowrap; overflow: hidden;
          transition: height .45s var(--spring), padding .45s var(--spring), margin .45s var(--spring), background .3s, color .2s;
        }
        nav > .nav-section-label:first-child { height: 30px; padding-top: 8px; }
        .d-sidebar.collapsed .nav-section-label {
          height: 1px; padding: 0; margin: 14px 14px 12px;
          background: var(--border-subtle); color: transparent;
        }
        .d-sidebar.collapsed nav > .nav-section-label:first-child { height: 0; margin: 0; background: transparent; }

        /* ---------- ACTIVE PILL ---------- */

        .nav-pill {
          position: absolute; top: 0; left: 0; z-index: 0;
          pointer-events: none; opacity: 0;
          border-radius: var(--radius-md);          background: var(--active-bg);
        }
        .nav-pill.show { opacity: 1; }
        /* the ONLY animation in the sidebar: slide to the clicked link */
        .nav-pill.anim { transition: transform .3s cubic-bezier(.2, 0, 0, 1), height .25s cubic-bezier(.2, 0, 0, 1); }
        .nav-pill.anim {
        }
        .nav-pill::before {
          content: ""; position: absolute; left: -16px; top: 12px; bottom: 12px;
          width: 3px; border-radius: 0 3px 3px 0; background: var(--brand-primary);
        }
        .nav-pill.sub { border-radius: 8px; }
        .nav-pill.sub::before { display: none; }

        /* ---------- NAV ITEMS ---------- */

        .nav-item {
          position: relative; z-index: 1;
          display: flex; align-items: center;
          width: 100%; height: var(--row-height);
          /* same left inset in both states so the icon never jumps when the width animates */
          padding: 0 18px; margin: 2px 0;
          border: 0; border-radius: var(--radius-md);
          background: transparent;
          gap: 0; cursor: pointer;
          color: var(--text-color); text-decoration: none;
          font-size: 15px; font-weight: 500; text-align: left;
          white-space: nowrap; user-select: none;
        }
        .nav-item:hover { background: color-mix(in srgb, var(--dark) 4.5%, transparent); }
        .nav-item:active { transform: none; }
        .nav-item.active { color: var(--brand-primary); font-weight: 600; }

        /* Active: soft brand background + left accent bar */
        .nav-item.active { background: var(--active-bg); color: var(--brand-primary); font-weight: 600; }
        .nav-item.active::before {
          content: ""; position: absolute; left: -16px; top: 12px; bottom: 12px;
          width: 3px; border-radius: 0 3px 3px 0; background: var(--brand-primary);
        }
        .m-drawer .nav-item.active::before { left: -12px; }

        /* desktop: the sliding pill carries the highlight and bar */
        .d-sidebar .nav-item.active, .d-sidebar .nav-item.active:hover { background: transparent; }
        .d-sidebar .nav-item.active::before { display: none; }

        /* Group open with an active child: let the child carry the highlight */
        .nav-item.active.dropdown-open { background: transparent; }
        .nav-item.active.dropdown-open::before { display: none; }
        .nav-item.active:hover { background: var(--active-bg); }
        .nav-item.active.dropdown-open:hover { background: color-mix(in srgb, var(--dark) 4.5%, transparent); }

        .menu-icon {
          width: 22px; height: 22px; min-width: 22px;
          display: flex; align-items: center; justify-content: center;
          color: var(--icon-color);
        }
        .menu-icon svg * {}
        .nav-item:hover .menu-icon { transform: none; }
        /* free Hugeicons has no solid set, so the active icon gets a heavier stroke */
        .nav-item.active .menu-icon svg *,
        .nav-submenu-item.active .menu-icon svg * { stroke-width: 1.9px; }
        .nav-item:hover .menu-icon,
        .nav-submenu-item:hover .menu-icon { color: var(--text-color); }
        .nav-item.active .menu-icon,
        .nav-submenu-item.active .menu-icon,
        .live-site:hover .menu-icon { color: var(--brand-primary); }

        /* labels fade/slide in with a stagger when the sidebar opens, and
           collapse smoothly (no pop) when it closes */
        .nav-label {
          margin-left: 14px; max-width: 190px; overflow: hidden;
          transition: max-width .45s var(--spring), margin .45s var(--spring), opacity .2s ease .1s;
        }
        .d-sidebar.expanded .nav-label {
        }
        
        .d-sidebar.collapsed .nav-label {
          max-width: 0; margin-left: 0; opacity: 0;
          transition: max-width .45s var(--spring), margin .45s var(--spring), opacity .12s ease;
        }

        .nav-chevron { margin-left: auto; flex-shrink: 0; color: var(--icon-color);}
        .nav-item.dropdown-open .nav-chevron { transform: rotate(90deg); }
        .nav-item:hover:not(.dropdown-open) .nav-chevron { transform: translateX(3px); }

        /* ---------- SUBMENU (animated) ---------- */

        .nav-submenu {
          display: grid;
          grid-template-rows: 0fr;
        }
        .nav-submenu.open { grid-template-rows: 1fr; }

        .nav-submenu-inner {
          position: relative;
          overflow: hidden; min-height: 0;
          margin-left: 22px; padding-left: 16px;
          display: flex; flex-direction: column;
          visibility: hidden;
        }
        .nav-submenu.open .nav-submenu-inner { visibility: visible; }

        /* tree connector that draws itself down when the group opens */
        .nav-submenu-inner::before {
          content: ""; position: absolute; left: 0; top: 2px; bottom: 22px; width: 1px;
          background: var(--border-subtle);
          transform: scaleY(0); transform-origin: top;
        }
        .nav-submenu.open .nav-submenu-inner::before { transform: scaleY(1); }

        .nav-submenu-item {
          position: relative; z-index: 1;
          display: flex; align-items: center;
          height: 42px; padding: 0 12px; margin: 1px 0;
          border-radius: 8px; gap: 12px; flex-shrink: 0;
          color: var(--text-color); text-decoration: none;
          font-size: 14px; font-weight: 500; white-space: nowrap;
        }
        .nav-submenu-item::before {
          content: ""; position: absolute; left: -16px; top: 50%;
          width: 10px; height: 1px; background: var(--border-subtle);
        }
        .nav-submenu-item:hover::before { background: var(--gray); }
        .nav-submenu-item.active::before { background: var(--brand-primary); }
        .nav-submenu-item:hover { background: color-mix(in srgb, var(--dark) 4.5%, transparent); color: var(--text-color); transform: none; }
        .nav-submenu-item.active { color: var(--brand-primary); font-weight: 600; }
        .nav-submenu-item.active, .nav-submenu-item.active:hover { background: var(--active-bg); }
        .d-sidebar .nav-submenu-item.active, .d-sidebar .nav-submenu-item.active:hover { background: transparent; }

        .nav-submenu.open .nav-submenu-item {
        }
        

        /* ---------- COLLAPSED ---------- */

        .d-sidebar.collapsed :is(.brand-logo, .nav-chevron, .nav-submenu) { display: none !important; }

        /* ---------- FOOTER ---------- */

        .d-footer { margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border-subtle); }

        .live-site {
          position: relative;
          display: flex; align-items: center;
          height: 50px; padding: 0 17px;
          border: 1px solid var(--border-subtle);
          border-radius: 10px;
          background: var(--white);
          color: var(--text-color); text-decoration: none;
          font-size: 14px; font-weight: 600; white-space: nowrap;
        }
        .live-site:hover {
          color: var(--text-color); background: color-mix(in srgb, var(--dark) 3%, var(--white));
          border-color: color-mix(in srgb, var(--dark) 22%, var(--border-subtle));
        }
        
        .live-dot {
          margin-left: auto; width: 8px; height: 8px; border-radius: 50%;
          background: #22c55e; flex-shrink: 0;
        }
        
        .live-arrow {
          position: absolute; right: 16px; opacity: 0; color: var(--text-color);
          transform: translate(-4px, 4px);
        }
        .live-site:hover .live-arrow { opacity: 1; transform: none; }
        .live-site:hover .live-dot { opacity: 0; }

        /* collapsed: the dot becomes a status badge on the icon */
        .d-sidebar.collapsed .live-dot {
          position: absolute; top: 10px; left: 33px; margin: 0;
          width: 10px; height: 10px; border: 2px solid var(--white);
        }
        .d-sidebar.collapsed .live-site:hover .live-dot { opacity: 1; }
        .d-sidebar.collapsed .live-arrow { display: none; }

        .powered { margin-top: 12px; text-align: center; font-size: 11px; letter-spacing: .02em; color: var(--gray); }
        .d-sidebar.collapsed .powered { display: none; }

        /* ---------- ACCOUNT (mobile drawer) ---------- */

        .account-card { display: flex; align-items: center; gap: 12px; }
        .account-button { width: 100%; padding: 0; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; border-radius: 12px; }
        .account-avatar {
          width: 44px; height: 44px; min-width: 44px; border-radius: 50%;
          border: 1px solid var(--border-subtle);
          background: var(--active-bg); color: var(--brand-primary);
          display: flex; align-items: center; justify-content: center;
          font-weight: 700;
        }
        .account-text { display: flex; flex-direction: column; overflow: hidden; }
        .account-name { font-size: 15px; font-weight: 700; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; }
        .account-email { font-size: 13px; color: var(--gray); white-space: nowrap; text-overflow: ellipsis; overflow: hidden; }

        /* ---------- MOBILE ---------- */

        .m-header {
          display: none; height: 72px;
          background: var(--white); border-bottom: 1px solid var(--border-subtle);
          align-items: center; justify-content: space-between;
          padding: 0 16px; position: fixed; top: 0; width: 100%; z-index: 1000;
        }

        .m-menu-btn, .m-drawer-close {
          width: 40px; height: 40px; border-radius: 10px;
          border: 1px solid var(--gray-border); background: var(--gray-light);
          display: flex; align-items: center; justify-content: center; cursor: pointer;
        }

        .m-profile-btn {
          width: 40px; height: 40px; border-radius: 50%;
          border: 1px solid var(--border-subtle);
          background: var(--active-bg); color: var(--brand-primary);
          font-size: 14px; font-weight: 700; cursor: pointer;
        }

        .m-menu-lines { width: 18px; height: 14px; position: relative; }
        .m-menu-lines::before, .m-menu-lines::after, .m-menu-lines span {
          content: ""; position: absolute; left: 0; right: 0;
          height: 2px; background: var(--dark); border-radius: 10px;
        }
        .m-menu-lines::before { top: 0; }
        .m-menu-lines span { top: 6px; }
        .m-menu-lines::after { bottom: 0; }

        .mobile-brand-logo { display: flex; align-items: center; }
        .mobile-brand-logo img { height: 36px; width: auto; display: block; }

        .m-overlay {
          position: fixed; inset: 0;
          background: rgba(15, 23, 42, .45);
          opacity: 0; pointer-events: none;
z-index: 4000;
        }
        .m-overlay.open { opacity: 1; pointer-events: auto; }

        .m-drawer {
          position: absolute; left: 0; top: 0;
          width: 300px; max-width: 85vw; height: 100%;
          background: var(--white);
          transform: translateX(-100%);          display: flex; flex-direction: column; overflow-y: auto;
        }
        .m-overlay.open .m-drawer { transform: translateX(0); }

        .m-drawer-header {
          height: 80px; padding: 0 20px;
          border-bottom: 1px solid var(--border-subtle);
          display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
        }

        .m-drawer-close-icon { width: 14px; height: 14px; position: relative; }
        .m-drawer-close-icon::before, .m-drawer-close-icon::after {
          content: ""; position: absolute; inset: 0; margin: auto;
          width: 14px; height: 2px; background: var(--dark);
        }
        .m-drawer-close-icon::before { transform: rotate(45deg); }
        .m-drawer-close-icon::after { transform: rotate(-45deg); }

        .m-drawer-nav { padding: 12px 12px 20px; flex: 1; }
        .m-drawer .nav-section-label { padding-left: 16px; }
        .m-account-section { padding: 20px; border-top: 1px solid var(--border-subtle); background: var(--white); }

        @media (max-width: 768px) {
          .d-sidebar, .d-scrim, .top-navbar { display: none !important; }
          .m-header { display: flex; }
        }

        @media (min-width: 769px) {
          .m-header, .m-overlay { display: none !important; }
        }

        @media (max-width: 1100px) {
          .navbar-user-info, .nav-search kbd { display: none; }
        }

        
      `}</style>
    </>
  );
}
