import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, MailPlus, Mails, Ticket, Palette, Image as ImageIcon, LayoutGrid,
  PanelTop, Layers, ChevronRight, ChevronLeft, ChevronDown, ExternalLink, Search, Bell, Plus,
} from "lucide-react";

import logo from "../assets/logo.png";
import logoSmall from "../assets/logo-small.png";

/* =========================================================
   NAV DATA  (icons are lucide: one set, follows currentColor,
   so hover / active states need no extra image files)
========================================================= */

const menuItems = [
  { name: "Dashboard", path: "/", Icon: LayoutDashboard },
  { name: "Create Invitation", path: "/create", Icon: MailPlus },
  { name: "All Invitations", path: "/invitations", Icon: Mails },
  { name: "Manage Coupons", path: "/coupons", Icon: Ticket },
];

const submenuItems = [
  { name: "Hero Section", path: "/customize/hero-section", Icon: ImageIcon },
  { name: "Sections", path: "/customize/sections", Icon: LayoutGrid },
  { name: "Popup", path: "/customize/popup", Icon: PanelTop },
  { name: "Combo Offer", path: "/customize/combo", Icon: Layers },
];

/* Breadcrumb comes from the route instead of being hardcoded */
const CRUMBS = {
  "/": ["Dashboard", "Overview"],
  "/analytics": ["Dashboard", "Analytics"],
  "/create": ["Manage", "Create invitation"],
  "/invitations": ["Manage", "All invitations"],
  "/coupons": ["Manage", "Coupons"],
  "/customize/hero-section": ["Customize site", "Hero section"],
  "/customize/sections": ["Customize site", "Sections"],
  "/customize/popup": ["Customize site", "Popup"],
  "/customize/combo": ["Customize site", "Combo offer"],
};

function getCrumbs(pathname) {
  const clean = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  if (CRUMBS[clean]) return CRUMBS[clean];
  const last = clean.split("/").filter(Boolean).pop() || "Overview";
  return ["Dashboard", last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, " ")];
}

function MenuIcon({ Icon, size = 20 }) {
  return (
    <span className="menu-icon" aria-hidden="true">
      <Icon size={size} strokeWidth={1.8} />
    </span>
  );
}

/* Always rendered so it can animate; hidden links are not focusable */
function Submenu({ id, open, onNavigate }) {
  return (
    <div id={id} className={`nav-submenu ${open ? "open" : ""}`}>
      <div className="nav-submenu-inner">
        {submenuItems.map(({ name, path, Icon }) => (
          <NavLink
            key={path}
            to={path}
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

export default function Sidebar({
  collapsed,
  setCollapsed,
  panelOpen = false,
  onHoverExpand,
  onProfileClick,
  profileOpen = false,
  onSearch, // optional: pass a handler to show the search button + ⌘K shortcut
  liveSiteUrl = "/",
}) {
  const { pathname } = useLocation();
  const customizeActive = pathname.startsWith("/customize");

  const [siteOpen, setSiteOpen] = useState(customizeActive);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [hoverLock, setHoverLock] = useState(false);

  const overlayMode = panelOpen;

  /* Landing on (or reloading) a /customize page opens its group */
  useEffect(() => {
    if (customizeActive) setSiteOpen(true);
  }, [customizeActive]);

  const handleIconEnter = () => {
    if (!hoverLock) setHovering(true);
  };

  const handleMouseLeave = () => {
    setHovering(false);
    setHoverLock(false);
  };

  const isExpanded = overlayMode ? overlayOpen || hovering : !collapsed || hovering;
  const floating = isExpanded && overlayMode;
  const narrowLayout = overlayMode || (collapsed && !hovering);
  const sidebarOpen = overlayMode ? overlayOpen : !collapsed;

  useEffect(() => {
    onHoverExpand?.(!overlayMode && collapsed && hovering);
  }, [overlayMode, collapsed, hovering]);
  useEffect(() => () => onHoverExpand?.(false), []);

  useEffect(() => {
    if (!overlayMode) setOverlayOpen(false);
  }, [overlayMode]);

  useEffect(() => {
    if (!overlayOpen) return;
    const onKey = (e) => e.key === "Escape" && setOverlayOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlayOpen]);

  useEffect(() => {
    if (!onSearch) return;
    const onKey = (e) => {
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

  /* Collapse right away and ignore hover until the pointer leaves the sidebar,
     otherwise the mouse still resting on the link would re-expand it */
  const collapseNow = () => {
    setHovering(false);
    setHoverLock(true);
    if (overlayMode) setOverlayOpen(false);
    else setCollapsed(true);
  };

  const handleToggle = () => {
    if (overlayMode) {
      if (overlayOpen) {
        setOverlayOpen(false);
        setHovering(false);
        setHoverLock(true);
      } else {
        setOverlayOpen(true);
      }
      return;
    }
    if (!collapsed) {
      setHovering(false);
      setHoverLock(true);
    }
    setCollapsed(!collapsed);
  };

  const handleCustomizeClick = () => {
    if (!isExpanded) {
      if (overlayMode) setOverlayOpen(true);
      else setCollapsed(false);
      setTimeout(() => setSiteOpen(true), 300);
      return;
    }
    setSiteOpen(!siteOpen);
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

            <button type="button" className="navbar-icon-button" aria-label="Notifications">
              <Bell size={19} strokeWidth={1.8} />
              <i className="notification-dot" />
            </button>

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
              <span className="navbar-avatar">H</span>
              <span className="navbar-user-info">
                <span className="navbar-user-name">Harsha Vardhan</span>
                <span className="navbar-user-role">Administrator</span>
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
        onMouseLeave={handleMouseLeave}
      >
        <div className="d-sidebar-header">
          {isExpanded ? (
            <NavLink to="/" className="brand-logo" onClick={closeOverlay}>
              <img src={logo} alt="Logo" />
            </NavLink>
          ) : (
            <span className="mini-logo" onMouseEnter={handleIconEnter}>
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
          <nav aria-label="Main">
            <div className="nav-section-label">Manage</div>

            {menuItems.map(({ name, path, Icon }) => (
              <NavLink
                key={path}
                to={path}
                end={path === "/"}
                onClick={path === "/create" ? collapseNow : closeOverlay}
                onMouseEnter={handleIconEnter}
                className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              >
                <MenuIcon Icon={Icon} />
                <span className="nav-label">{name}</span>
                <span className="collapsed-tooltip">{name}</span>
              </NavLink>
            ))}

            <div className="nav-section-label">Storefront</div>

            <button
              type="button"
              className={`nav-item${siteOpen && isExpanded ? " dropdown-open" : ""}${customizeActive ? " active" : ""}`}
              onClick={handleCustomizeClick}
              onMouseEnter={handleIconEnter}
              aria-expanded={isExpanded && siteOpen}
              aria-controls="site-submenu"
            >
              <MenuIcon Icon={Palette} />
              <span className="nav-label">Customize Site</span>
              <span className="collapsed-tooltip">Customize Site</span>
              {isExpanded && <ChevronRight className="nav-chevron" size={16} strokeWidth={2} />}
            </button>

            {isExpanded && <Submenu id="site-submenu" open={siteOpen} onNavigate={closeOverlay} />}
          </nav>

          {/* Footer: a useful action instead of a duplicate of the profile */}
          <div className="d-footer" onMouseEnter={handleIconEnter}>
            <a className="live-site" href={liveSiteUrl} target="_blank" rel="noreferrer">
              <MenuIcon Icon={ExternalLink} size={18} />
              <span className="nav-label">View live site</span>
              <span className="live-dot" aria-label="Store is live" title="Store is live" />
              <span className="collapsed-tooltip">View live site</span>
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

        <NavLink to="/" className="mobile-brand-logo">
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
            <NavLink to="/" className="brand-logo" onClick={closeMobileDrawer}>
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
                end={path === "/"}
                onClick={closeMobileDrawer}
                className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              >
                <MenuIcon Icon={Icon} />
                <span className="nav-label">{name}</span>
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
              <span className="account-avatar">H</span>
              <span className="account-text">
                <span className="account-name">Harsha Vardhan</span>
                <span className="account-email">Administrator</span>
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
          transition: margin-left .3s cubic-bezier(.4, 0, .2, 1);
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
          transition: border-color .15s, color .15s;
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
          background: var(--brand-primary);
          color: var(--white, #fff);
          font-size: 14px; font-weight: 600;
          text-decoration: none;
          box-shadow: 0 4px 12px color-mix(in srgb, var(--brand-primary) 28%, transparent);
          transition: filter .15s, transform .15s;
        }
        .nav-cta:hover { filter: brightness(1.1); }
        .nav-cta:active { transform: translateY(1px); }

        .navbar-icon-button {
          width: 38px; height: 38px;
          border: 0; background: transparent; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: var(--icon-color); position: relative;
          transition: background .15s, color .15s;
        }
        .navbar-icon-button:hover { background: var(--hover-bg); color: var(--brand-primary); }

        .notification-dot {
          position: absolute; top: 9px; right: 10px;
          width: 7px; height: 7px; border-radius: 50%;
          background: #fb4778; border: 1.5px solid var(--white);
          animation: dot-pulse 2.4s ease-out infinite;
        }
        @keyframes dot-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(251, 71, 120, .5); }
          70%  { box-shadow: 0 0 0 7px rgba(251, 71, 120, 0); }
          100% { box-shadow: 0 0 0 0 rgba(251, 71, 120, 0); }
        }

        .navbar-divider { width: 1px; height: 28px; background: var(--border-subtle); margin: 0 6px; }

        .navbar-user {
          border: 0; background: transparent;
          display: flex; align-items: center; gap: 10px;
          padding: 4px 10px 4px 4px; border-radius: 999px;
          cursor: pointer; text-align: left; color: inherit;
          transition: background .15s;
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
        .navbar-user-chevron { color: var(--icon-color); flex-shrink: 0; transition: transform .2s ease; }
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
          transition: width .3s cubic-bezier(.4, 0, .2, 1);
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
        .brand-logo img, .mini-logo img { height: 36px; width: auto; display: block; }

        .sidebar-edge-toggle {
          position: absolute; top: 18px; right: -14px;
          width: 28px; height: 28px; border-radius: 50%;
          border: 1px solid var(--border-subtle);
          background: var(--white); color: var(--icon-color);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; z-index: 5;
          box-shadow: 0 2px 8px rgba(17, 12, 41, .12);
          opacity: 0;
          transition: opacity .2s, background .15s, color .15s, border-color .15s;
        }
        .d-sidebar:hover .sidebar-edge-toggle,
        .sidebar-edge-toggle:focus-visible { opacity: 1; }
        .sidebar-edge-toggle:hover { background: var(--brand-primary); border-color: var(--brand-primary); color: var(--white, #fff); }

        .d-scrim { position: absolute; inset: 0; background: rgba(23, 19, 38, .38); z-index: 1900; animation: d-scrim-in .2s ease; }
        .d-sidebar.as-overlay { box-shadow: 8px 0 40px rgba(0, 0, 0, .22); }
        @keyframes d-scrim-in { from { opacity: 0; } to { opacity: 1; } }

        .d-sidebar-inner {
          flex: 1; padding: 8px 16px 16px;
          display: flex; flex-direction: column;
          overflow-y: auto; overflow-x: visible;
        }

        /* Group labels: small caps-style, become a hairline when collapsed */
        .nav-section-label {
          padding: 18px 14px 6px;
          font-size: 11px; font-weight: 600;
          letter-spacing: .06em; text-transform: uppercase;
          color: var(--gray); white-space: nowrap;
        }
        nav > .nav-section-label:first-child { padding-top: 8px; }
        .d-sidebar.collapsed .nav-section-label {
          height: 1px; padding: 0; margin: 14px 14px 12px;
          background: var(--border-subtle); font-size: 0; overflow: hidden;
        }
        .d-sidebar.collapsed nav > .nav-section-label:first-child { display: none; }

        /* ---------- NAV ITEMS ---------- */

        .nav-item {
          position: relative;
          display: flex; align-items: center;
          width: 100%; height: var(--row-height);
          padding: 0 14px; margin: 2px 0;
          border: 0; border-radius: var(--radius-md);
          background: transparent;
          gap: 14px; cursor: pointer;
          color: var(--text-color); text-decoration: none;
          font-size: 15px; font-weight: 500; text-align: left;
          white-space: nowrap; user-select: none;
          transition: background .2s, color .2s;
        }
        .nav-item:hover { background: var(--hover-bg); }
        .nav-item.active { background: var(--active-bg); color: var(--brand-primary); font-weight: 600; }

        /* Active indicator bar */
        .nav-item.active::before {
          content: ""; position: absolute; left: -16px; top: 12px; bottom: 12px;
          width: 3px; border-radius: 0 3px 3px 0; background: var(--brand-primary);
        }

        /* Group open with an active child: let the child carry the highlight */
        .nav-item.active.dropdown-open { background: transparent; }
        .nav-item.active.dropdown-open:hover { background: var(--hover-bg); }
        .nav-item.active.dropdown-open::before { display: none; }

        .menu-icon {
          width: 22px; height: 22px; min-width: 22px;
          display: flex; align-items: center; justify-content: center;
          color: var(--icon-color);
          transition: color .2s;
        }
        .nav-item:hover .menu-icon,
        .nav-item.active .menu-icon,
        .nav-submenu-item:hover .menu-icon,
        .nav-submenu-item.active .menu-icon,
        .live-site:hover .menu-icon { color: var(--brand-primary); }

        .nav-chevron { margin-left: auto; flex-shrink: 0; color: var(--icon-color); transition: transform .25s ease; }
        .nav-item.dropdown-open .nav-chevron { transform: rotate(90deg); }

        /* ---------- SUBMENU (animated) ---------- */

        .nav-submenu {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows .25s ease;
        }
        .nav-submenu.open { grid-template-rows: 1fr; }

        .nav-submenu-inner {
          overflow: hidden; min-height: 0;
          margin-left: 22px; padding-left: 14px;
          border-left: 1px solid var(--border-subtle);
          display: flex; flex-direction: column;
          visibility: hidden;
          transition: visibility .25s;
        }
        .nav-submenu.open .nav-submenu-inner { visibility: visible; }

        .nav-submenu-item {
          display: flex; align-items: center;
          height: 42px; padding: 0 12px; margin: 1px 0;
          border-radius: 8px; gap: 12px; flex-shrink: 0;
          color: var(--text-color); text-decoration: none;
          font-size: 14px; font-weight: 500; white-space: nowrap;
          transition: background .15s, color .15s;
        }
        .nav-submenu-item:hover { background: var(--hover-bg); color: var(--brand-primary); }
        .nav-submenu-item.active { background: var(--active-bg); color: var(--brand-primary); font-weight: 600; }

        /* ---------- COLLAPSED ---------- */

        .d-sidebar.collapsed :is(.brand-logo, .nav-label, .nav-chevron, .nav-submenu) { display: none !important; }
        .d-sidebar.collapsed .d-sidebar-inner { overflow: visible; }
        .d-sidebar.collapsed .nav-item { justify-content: center; padding: 0; }

        .collapsed-tooltip {
          display: none;
          position: absolute; left: 100%; top: 50%;
          transform: translateY(-50%);
          margin-left: 12px; padding: 8px 12px;
          background-color: var(--tooltip-bg); color: var(--white, #fff);
          border-radius: 6px; font-size: 13px; font-weight: 500;
          white-space: nowrap; z-index: 1000;
          box-shadow: 0 4px 12px rgba(0, 0, 0, .15);
          pointer-events: none;
        }
        .d-sidebar.collapsed :is(.nav-item, .live-site):is(:hover, :focus-visible) .collapsed-tooltip { display: block; }
        .collapsed-tooltip::before {
          content: ""; position: absolute; left: -6px; top: 50%;
          transform: translateY(-50%);
          border-width: 6px 6px 6px 0; border-style: solid;
          border-color: transparent var(--tooltip-bg) transparent transparent;
        }

        /* ---------- FOOTER ---------- */

        .d-footer { margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border-subtle); }

        .live-site {
          position: relative;
          display: flex; align-items: center; gap: 12px;
          height: 46px; padding: 0 14px;
          border: 1px solid transparent; border-radius: 12px;
          color: var(--text-color); text-decoration: none;
          font-size: 14px; font-weight: 600; white-space: nowrap;
          transition: background .15s, color .15s, border-color .15s;
        }
        .live-site:hover { background: var(--hover-bg); color: var(--brand-primary); border-color: transparent; }
        .d-sidebar.collapsed .live-site { justify-content: center; padding: 0; }

        .live-dot {
          margin-left: auto; width: 8px; height: 8px; border-radius: 50%;
          background: #22c55e; flex-shrink: 0;
          box-shadow: 0 0 0 3px rgba(34, 197, 94, .18);
        }
        .d-sidebar.collapsed .live-dot { display: none; }

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
          transition: .25s; z-index: 4000;
        }
        .m-overlay.open { opacity: 1; pointer-events: auto; }

        .m-drawer {
          position: absolute; left: 0; top: 0;
          width: 300px; max-width: 85vw; height: 100%;
          background: var(--white);
          transform: translateX(-100%); transition: .25s;
          display: flex; flex-direction: column; overflow-y: auto;
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
        .m-drawer .nav-item.active::before { left: -12px; }
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

        @media (prefers-reduced-motion: reduce) {
          .d-sidebar, .top-navbar-inner, .nav-submenu, .nav-chevron, .m-drawer, .m-overlay, .d-scrim {
            transition: none !important; animation: none !important;
          }
          .notification-dot { animation: none !important; }
        }
      `}</style>
    </>
  );
}
