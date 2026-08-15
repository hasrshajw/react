import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { Search, Bell, ChevronRight } from "lucide-react";

/* =========================================================
   LOGO ASSETS
========================================================= */

import logo from "../assets/logo.png";
import logoSmall from "../assets/logo-small.png";

import panelClose from "../assets/panel_close.svg";
import panelOpen from "../assets/panel_open.svg";

/* =========================================================
   DASHBOARD ICONS
========================================================= */

import dashboardIcon from "../assets/dashboard.svg";
import dashboardHover from "../assets/hover_dashboard.svg";
import dashboardActive from "../assets/fill_dashboard.svg";

/* =========================================================
   INVENTORY ICONS
========================================================= */

import inventoryIcon from "../assets/inventory.svg";
import inventoryHover from "../assets/hover_inventory.svg";
import inventoryActive from "../assets/fill_inventory.svg";

/* =========================================================
   COUPONS ICONS
========================================================= */

import couponsIcon from "../assets/coupons.svg";
import couponsHover from "../assets/hover_coupons.svg";
import couponsActive from "../assets/fill_coupons.svg";

/* =========================================================
   SITE ICONS
========================================================= */

import siteIcon from "../assets/site.svg";
import siteHover from "../assets/hover_site.svg";
import siteActive from "../assets/fill_site.svg";

/* =========================================================
   HERO SECTION ICONS
========================================================= */

import heroIcon from "../assets/herosection.svg";
import heroHover from "../assets/hover_herosection.svg";
import heroActive from "../assets/fill_herosection.svg";

/* =========================================================
   SECTIONS ICONS
========================================================= */

import sectionsIcon from "../assets/sections.svg";
import sectionsHover from "../assets/hover_sections.svg";
import sectionsActive from "../assets/fill_sections.svg";

/* =========================================================
   POPUP ICONS
========================================================= */

import popupIcon from "../assets/popup.svg";
import popupHover from "../assets/hover_popup.svg";
import popupActive from "../assets/fill_popup.svg";

/* =========================================================
   COMBO ICONS
========================================================= */

import comboIcon from "../assets/combo.svg";
import comboHover from "../assets/hover_combo.svg";
import comboActive from "../assets/fill_combo.svg";

/* =========================================================
   ICON MAP
========================================================= */

const icons = {
  dashboard: {
    normal: dashboardIcon,
    hover: dashboardHover,
    active: dashboardActive,
  },

  inventory: {
    normal: inventoryIcon,
    hover: inventoryHover,
    active: inventoryActive,
  },

  coupons: {
    normal: couponsIcon,
    hover: couponsHover,
    active: couponsActive,
  },

  site: {
    normal: siteIcon,
    hover: siteHover,
    active: siteActive,
  },

  herosection: {
    normal: heroIcon,
    hover: heroHover,
    active: heroActive,
  },

  sections: {
    normal: sectionsIcon,
    hover: sectionsHover,
    active: sectionsActive,
  },

  popup: {
    normal: popupIcon,
    hover: popupHover,
    active: popupActive,
  },

  combo: {
    normal: comboIcon,
    hover: comboHover,
    active: comboActive,
  },
};

/* =========================================================
   MAIN MENU
========================================================= */

const menuItems = [
  {
    name: "Dashboard",
    path: "/",
    icon: "dashboard",
  },
  {
    name: "Inventory",
    path: "/inventory",
    icon: "inventory",
  },
  {
    name: "Manage Coupons",
    path: "/coupons",
    icon: "coupons",
  },
];

/* =========================================================
   CUSTOMIZE SITE SUBMENU
========================================================= */

const submenuItems = [
  {
    name: "Hero Section",
    path: "/customize/hero-section",
    icon: "herosection",
  },
  {
    name: "Sections",
    path: "/customize/sections",
    icon: "sections",
  },
  {
    name: "Popup",
    path: "/customize/popup",
    icon: "popup",
  },
  {
    name: "Combo Offer",
    path: "/customize/combo",
    icon: "combo",
  },
];

/* =========================================================
   ICON COMPONENT
========================================================= */

function MenuIcon({ type, active = false }) {
  const iconSet = icons[type];

  return (
    <span className="menu-icon">

      <img
        src={iconSet.normal}
        alt=""
        className={active ? "icon-hidden" : "icon-visible"}
      />

      <img
        src={iconSet.hover}
        alt=""
        className="icon-hover"
      />

      <img
        src={iconSet.active}
        alt=""
        className={active ? "icon-visible" : "icon-hidden"}
      />

    </span>
  );
}

/* =========================================================
   SIDEBAR
========================================================= */

export default function Sidebar({
  collapsed,
  setCollapsed,
}) {

  const [siteOpen, setSiteOpen] = useState(false);

  const [mobileOpen, setMobileOpen] = useState(false);

  const isExpanded = !collapsed;

  /* =======================================================
     DESKTOP TOGGLE
  ======================================================= */

  const handleToggle = () => {
    setCollapsed(!collapsed);
  };

  /* =======================================================
     DESKTOP CUSTOMIZE SITE
  ======================================================= */

  const handleCustomizeClick = () => {

    if (collapsed) {

      setCollapsed(false);

      setTimeout(() => {
        setSiteOpen(true);
      }, 300);

      return;
    }

    setSiteOpen(!siteOpen);
  };

  /* =======================================================
     MOBILE CUSTOMIZE SITE
  ======================================================= */

  const handleMobileCustomize = () => {
    setSiteOpen(!siteOpen);
  };

  /* =======================================================
     CLOSE MOBILE
  ======================================================= */

  const closeMobileDrawer = () => {
    setMobileOpen(false);
  };

  /* =======================================================
     MOBILE NAVIGATION
  ======================================================= */

  const handleMobileNavigation = () => {
    setMobileOpen(false);
  };

  return (
    <>

      {/* ===================================================
          DESKTOP TOP NAVBAR
      =================================================== */}

      <header className="top-navbar">

        <div
          className={`top-navbar-inner ${
            isExpanded
              ? "navbar-expanded"
              : "navbar-collapsed"
          }`}
        >

          <div className="navbar-left">

            <div className="breadcrumb">

              <span className="breadcrumb-muted">
                Dashboard
              </span>

              <span className="breadcrumb-divider">
                /
              </span>

              <span className="breadcrumb-current">
                Overview
              </span>

            </div>

          </div>

          <div className="navbar-right">

            <button
              className="navbar-icon-button"
              aria-label="Search"
            >
              <Search
                size={19}
                strokeWidth={2}
              />
            </button>

            <button
              className="navbar-icon-button notification-button"
              aria-label="Notifications"
            >

              <Bell
                size={19}
                strokeWidth={2}
              />

              <span className="notification-dot" />

            </button>

            <div className="navbar-divider" />

            <button className="navbar-user">

              <div className="navbar-avatar">
                H
              </div>

              <div className="navbar-user-info">

                <span className="navbar-user-name">
                  Harsha
                </span>

                <span className="navbar-user-role">
                  Administrator
                </span>

              </div>

            </button>

          </div>

        </div>

      </header>

      {/* ===================================================
          DESKTOP SIDEBAR
      =================================================== */}

      <aside
        className={`d-sidebar ${
          isExpanded
            ? "expanded"
            : "collapsed"
        }`}
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="d-sidebar-header">

          {isExpanded && (

            <NavLink
              to="/"
              className="brand-logo"
            >

              <img
                src={logo}
                alt="Logo"
              />

            </NavLink>

          )}

          {!isExpanded && (

            <span className="mini-logo">

              <img
                src={logoSmall}
                alt="Logo"
              />

            </span>

          )}

          <button
            className="sidebar-toggle"
            onClick={handleToggle}
            aria-label={
              collapsed
                ? "Open sidebar"
                : "Close sidebar"
            }
          >

            <img
              src={
                isExpanded
                  ? panelClose
                  : panelOpen
              }
              alt=""
              width="24"
              height="24"
            />

          </button>

        </div>

        {/* =================================================
            SIDEBAR CONTENT
        ================================================= */}

        <div className="d-sidebar-inner">

          <nav>

            {/* =============================================
                MAIN MENU
            ============================================= */}

            {menuItems.map((item) => (

              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `nav-item ${
                    isActive
                      ? "active"
                      : ""
                  }`
                }
              >

                {({ isActive }) => (
                  <>

                    <MenuIcon
                      type={item.icon}
                      active={isActive}
                    />

                    <span className="nav-label">
                      {item.name}
                    </span>

                    <span className="collapsed-tooltip">
                      {item.name}
                    </span>

                  </>
                )}

              </NavLink>

            ))}

            {/* =============================================
                CUSTOMIZE SITE
            ============================================= */}

            <div
              className={`nav-item ${
                siteOpen
                  ? "dropdown-open active"
                  : ""
              }`}
              onClick={handleCustomizeClick}
            >

              <MenuIcon
                type="site"
                active={siteOpen}
              />

              <span className="nav-label">
                Customize Site
              </span>

              <span className="collapsed-tooltip">
                Customize Site
              </span>

              {isExpanded && (

                <ChevronRight
                  className="nav-chevron"
                  size={16}
                  strokeWidth={2}
                />

              )}

            </div>

            {/* =============================================
                DESKTOP SUBMENU
            ============================================= */}

            {isExpanded && (

              <div
                className={`nav-submenu ${
                  siteOpen
                    ? "open"
                    : ""
                }`}
              >

                {submenuItems.map((item) => (

                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `nav-submenu-item ${
                        isActive
                          ? "active"
                          : ""
                      }`
                    }
                  >

                    {({ isActive }) => (
                      <>

                        <MenuIcon
                          type={item.icon}
                          active={isActive}
                        />

                        <span>
                          {item.name}
                        </span>

                      </>
                    )}

                  </NavLink>

                ))}

              </div>

            )}

          </nav>

          {/* =================================================
              ACCOUNT
          ================================================= */}

          <div className="d-account-section">

            <div className="account-card">

              <div className="account-avatar">
                H
              </div>

              {isExpanded && (

                <div className="account-text">

                  <div className="account-name">
                    Harsha
                  </div>

                  <div className="account-email">
                    Administrator
                  </div>

                </div>

              )}

            </div>

          </div>

        </div>

      </aside>

      {/* ===================================================
          MOBILE HEADER
      =================================================== */}

      <header className="m-header">

        <button
          className="m-menu-btn"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >

          <div className="m-menu-lines">
            <span />
          </div>

        </button>

        <NavLink
          to="/"
          className="mobile-brand-logo"
        >

          <img
            src={logo}
            alt="Logo"
          />

        </NavLink>

        <div className="mobile-header-spacer" />

      </header>

      {/* ===================================================
          MOBILE OVERLAY
      =================================================== */}

      <div
        className={`m-overlay ${
          mobileOpen
            ? "open"
            : ""
        }`}
        onClick={(e) => {

          if (
            e.target === e.currentTarget
          ) {
            closeMobileDrawer();
          }

        }}
      >

        {/* =================================================
            MOBILE DRAWER
        ================================================= */}

        <div className="m-drawer">

          {/* ===============================================
              DRAWER HEADER
          =============================================== */}

          <div className="m-drawer-header">

            <NavLink
              to="/"
              className="brand-logo"
              onClick={
                closeMobileDrawer
              }
            >

              <img
                src={logo}
                alt="Logo"
              />

            </NavLink>

            <button
              className="m-drawer-close"
              onClick={
                closeMobileDrawer
              }
              aria-label="Close menu"
            >

              <div className="m-drawer-close-icon" />

            </button>

          </div>

          {/* ===============================================
              MOBILE NAVIGATION
          =============================================== */}

          <nav className="m-drawer-nav">

            {menuItems.map((item) => (

              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                onClick={
                  handleMobileNavigation
                }
                className={({ isActive }) =>
                  `nav-item ${
                    isActive
                      ? "active"
                      : ""
                  }`
                }
              >

                {({ isActive }) => (
                  <>

                    <MenuIcon
                      type={item.icon}
                      active={isActive}
                    />

                    <span className="nav-label">
                      {item.name}
                    </span>

                  </>
                )}

              </NavLink>

            ))}

            {/* =============================================
                MOBILE CUSTOMIZE SITE
            ============================================= */}

            <div
              className={`nav-item ${
                siteOpen
                  ? "dropdown-open active"
                  : ""
              }`}
              onClick={
                handleMobileCustomize
              }
            >

              <MenuIcon
                type="site"
                active={siteOpen}
              />

              <span className="nav-label">
                Customize Site
              </span>

              <ChevronRight
                className="nav-chevron"
                size={16}
                strokeWidth={2}
              />

            </div>

            {/* =============================================
                MOBILE SUBMENU
            ============================================= */}

            <div
              className={`nav-submenu ${
                siteOpen
                  ? "open"
                  : ""
              }`}
            >

              {submenuItems.map((item) => (

                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={
                    handleMobileNavigation
                  }
                  className={({ isActive }) =>
                    `nav-submenu-item ${
                      isActive
                        ? "active"
                        : ""
                    }`
                  }
                >

                  {({ isActive }) => (
                    <>

                      <MenuIcon
                        type={item.icon}
                        active={isActive}
                      />

                      <span>
                        {item.name}
                      </span>

                    </>
                  )}

                </NavLink>

              ))}

            </div>

          </nav>

          {/* ===============================================
              MOBILE ACCOUNT
          =============================================== */}

          <div className="m-account-section">

            <div className="account-card">

              <div className="account-avatar">
                H
              </div>

              <div className="account-text">

                <div className="account-name">
                  Harsha
                </div>

                <div className="account-email">
                  Administrator
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* ===================================================
          STYLES
      =================================================== */}

      <style>{`

        /* =================================================
           EXACT REFERENCE VARIABLES
        ================================================= */

        :root {

          --header-height-desktop: 70px;

          --sidebar-width: 260px;

          --sidebar-collapsed-width: 90px;

          --row-height: 52px;

          --sidebar-bg: #ffffff;

          --header-bg: #ffffff;

          --page-bg: #f4f5f7;

          --text-color: rgb(24, 24, 26);

          --icon-color: #6b7280;

          --brand-primary: #673DE6;

          --active-bg: #f4f0fa;

          --hover-bg: #f3f4f6;

          --border-subtle: #e5e7eb;

          --radius-md: 10px;

          --radius-lg: 14px;

          --tooltip-bg: #1f2937;

        }


        /* =================================================
           GLOBAL FONT
           
           EXACTLY LIKE REFERENCE:
           DM Sans, Roboto, sans-serif
           font-weight: 500
        ================================================= */

        .d-sidebar,
        .top-navbar,
        .m-header,
        .m-drawer {

          font-family:
            "DM Sans",
            Roboto,
            sans-serif;

          font-weight: 500;

          color:
            var(--text-color);

        }


        /* =================================================
           DESKTOP TOP NAVBAR
        ================================================= */

        .top-navbar {

          position: fixed;

          top: 0;
          left: 0;
          right: 0;

          height:
            var(--header-height-desktop);

          background:
            var(--header-bg);

          border-bottom:
            1px solid
            var(--border-subtle);

          z-index: 1500;

        }


        .top-navbar-inner {

          height:
            var(--header-height-desktop);

          display: flex;

          align-items: center;

          justify-content:
            space-between;

          padding:
            0 28px;

          transition:
            margin-left 0.3s
            cubic-bezier(
              0.4,
              0,
              0.2,
              1
            );

        }


        .navbar-expanded {

          margin-left:
            var(--sidebar-width);

        }


        .navbar-collapsed {

          margin-left:
            var(--sidebar-collapsed-width);

        }


        .navbar-left {

          display: flex;

          align-items: center;

        }


        .breadcrumb {

          display: flex;

          align-items: center;

          gap: 9px;

        }


        .breadcrumb-muted {

          color: #9ca3af;

        }


        .breadcrumb-divider {

          color: #d1d5db;

        }


        .breadcrumb-current {

          color:
            var(--text-color);

          font-weight: 700;

        }


        .navbar-right {

          display: flex;

          align-items: center;

          gap: 8px;

        }


        .navbar-icon-button {

          width: 38px;

          height: 38px;

          border: none;

          background:
            transparent;

          border-radius: 9px;

          display: flex;

          align-items: center;

          justify-content: center;

          cursor: pointer;

          color:
            var(--icon-color);

          position: relative;

          transition:
            background 0.15s,
            color 0.15s;

        }


        .navbar-icon-button:hover {

          background:
            var(--hover-bg);

          color:
            var(--brand-primary);

        }


        .notification-dot {

          position: absolute;

          top: 8px;
          right: 8px;

          width: 6px;
          height: 6px;

          border-radius: 50%;

          background:
            var(--brand-primary);

          border:
            1px solid #ffffff;

        }


        .navbar-divider {

          width: 1px;

          height: 30px;

          background:
            var(--border-subtle);

          margin:
            0 8px;

        }


        .navbar-user {

          border: none;

          background:
            transparent;

          display: flex;

          align-items: center;

          gap: 10px;

          padding:
            4px 6px;

          border-radius: 9px;

          cursor: pointer;

          text-align: left;

        }


        .navbar-user:hover {

          background:
            var(--hover-bg);

        }


        .navbar-avatar {

          width: 34px;

          height: 34px;

          border-radius: 50%;

          background:
            var(--brand-primary);

          color:
            #ffffff;

          display: flex;

          align-items: center;

          justify-content: center;

          font-size: 12px;

          font-weight: 700;

        }


        .navbar-user-info {

          display: flex;

          flex-direction: column;

          gap: 2px;

        }


        .navbar-user-name {

          font-size: 13px;

          font-weight: 700;

        }


        .navbar-user-role {

          font-size: 11px;

          color:
            var(--text-sub);

        }


        /* =================================================
           DESKTOP SIDEBAR
        ================================================= */

        .d-sidebar {

          width:
            var(--sidebar-width);

          height: 100vh;

          background:
            var(--sidebar-bg);

          border-right:
            1px solid
            var(--border-subtle);

          display: flex;

          flex-direction: column;

          position: fixed;

          top: 0;
          left: 0;

          z-index: 2000;

          transition:
            width 0.3s
            cubic-bezier(
              0.4,
              0,
              0.2,
              1
            );

        }


        .d-sidebar.collapsed {

          width:
            var(--sidebar-collapsed-width);

        }


        /* =================================================
           SIDEBAR HEADER
        ================================================= */

        .d-sidebar-header {

          min-height:
            var(--header-height-desktop);

          display: flex;

          align-items: center;

          justify-content:
            space-between;

          padding:
            30px 24px;

          flex-shrink: 0;

        }


        .brand-logo {

          display: flex;

          align-items: center;

          text-decoration: none;

        }


        .brand-logo img {

          height: 45px;

          width: auto;

          display: block;

        }


        .mini-logo {

          display: flex;

          align-items: center;

          justify-content: center;

        }


        .mini-logo img {

          height: 45px;

          width: auto;

          display: block;

        }


        /* =================================================
           SIDEBAR TOGGLE
        ================================================= */

        .sidebar-toggle {

          background: none;

          border: none;

          cursor: pointer;

          color:
            var(--icon-color);

          display: flex;

          align-items: center;

          justify-content: center;

          padding: 6px;

          border-radius: 8px;

          transition:
            0.2s;

        }


        .sidebar-toggle:hover {

          background:
            var(--hover-bg);

          color:
            var(--text-color);

        }


        /* =================================================
           COLLAPSED HEADER
        ================================================= */

        .d-sidebar.collapsed
        .d-sidebar-header {

          flex-direction: column;

          height: auto;

          padding:
            30px 0 20px;

          gap: 30px;

        }


        /* =================================================
           SIDEBAR INNER
        ================================================= */

        .d-sidebar-inner {

          flex: 1;

          padding:
            10px 16px;

          display: flex;

          flex-direction: column;

          overflow-y: auto;

          overflow-x: visible;

        }


        /* =================================================
           NAV ITEMS

           NO EXPLICIT FONT-SIZE.
           Reference inherits body DM Sans 500.
        ================================================= */

        .nav-item {

          position: relative;

          display: flex;

          align-items: center;

          height:
            var(--row-height);

          padding:
            0 16px;

          margin:
            2px 0;

          border-radius:
            var(--radius-md);

          gap: 14px;

          cursor: pointer;

          color:
            var(--text-color);

          text-decoration: none;

          transition:
            background 0.2s,
            color 0.2s;

          white-space: nowrap;

          user-select: none;

        }


        .nav-item:hover {

          background:
            var(--hover-bg);

        }


        .nav-item.active {

          background:
            var(--active-bg);

          color:
            var(--brand-primary);

          font-weight: 700;

        }


        /* =================================================
           ICON
        ================================================= */

        .menu-icon {

          position: relative;

          width: 24px;

          height: 24px;

          min-width: 24px;

          display: flex;

          align-items: center;

          justify-content: center;

        }


        .menu-icon img {

          position: absolute;

          width: 24px;

          height: 24px;

          object-fit: contain;

        }


        .icon-visible {

          opacity: 1;

        }


        .icon-hidden {

          opacity: 0;

        }


        .menu-icon .icon-hover {

          opacity: 0;

        }


        .nav-item:hover:not(.active)
        .menu-icon .icon-hover {

          opacity: 1;

        }


        .nav-item:hover:not(.active)
        .menu-icon .icon-visible {

          opacity: 0;

        }


        /* =================================================
           CHEVRON
        ================================================= */

        .nav-chevron {

          margin-left: auto;

          width: 16px;

          height: 16px;

          stroke:
            currentColor;

          flex-shrink: 0;

          transition:
            transform 0.25s ease;

        }


        .nav-item.dropdown-open
        .nav-chevron {

          transform:
            rotate(90deg);

        }


        /* =================================================
           SUBMENU
        ================================================= */

        .nav-submenu {

          display: none;

          margin:
            2px 0 4px 20px;

          padding-left: 16px;

          border-left:
            2px solid
            var(--border-subtle);

          flex-direction: column;

        }


        .nav-submenu.open {

          display: flex;

        }


        /* EXACT REFERENCE:
           font-size 15px
           font-weight 600
        */

        .nav-submenu-item {

          display: flex;

          align-items: center;

          height: 50px;

          padding:
            0 14px;

          border-radius: 8px;

          margin:
            1px 0;

          gap: 12px;

          cursor: pointer;

          color:
            var(--text-color);

          font-size: 15px;

          font-weight: 600;

          text-decoration: none;

          transition:
            background 0.15s,
            color 0.15s;

          white-space: nowrap;

        }


        .nav-submenu-item:hover {

          background:
            var(--hover-bg);

          color:
            var(--brand-primary);

        }


        .nav-submenu-item.active {

          background:
            var(--active-bg);

          color:
            var(--brand-primary);

          font-weight: 700;

        }


        /* =================================================
           COLLAPSED SIDEBAR
        ================================================= */

        .d-sidebar.collapsed
        .brand-logo,

        .d-sidebar.collapsed
        .nav-label,

        .d-sidebar.collapsed
        .nav-chevron,

        .d-sidebar.collapsed
        .nav-submenu {

          display: none !important;

        }


        .d-sidebar.collapsed
        .d-sidebar-inner {

          overflow: visible;

        }


        .d-sidebar.collapsed
        .nav-item {

          justify-content: center;

          padding: 0;

        }


        /* =================================================
           COLLAPSED TOOLTIP

           Same values as reference.
        ================================================= */

        .collapsed-tooltip {

          display: none;

          position: absolute;

          left: 100%;

          top: 50%;

          transform:
            translateY(-50%);

          background-color:
            var(--tooltip-bg);

          color:
            #ffffff;

          padding:
            8px 12px;

          border-radius: 6px;

          font-size: 13px;

          font-weight: 500;

          white-space: nowrap;

          z-index: 1000;

          margin-left: 12px;

          box-shadow:
            0 4px 12px
            rgba(
              0,
              0,
              0,
              0.15
            );

          pointer-events: none;

        }


        .d-sidebar.collapsed
        .nav-item:hover
        .collapsed-tooltip {

          display: block;

        }


        .collapsed-tooltip::before {

          content: "";

          position: absolute;

          left: -6px;

          top: 50%;

          transform:
            translateY(-50%);

          border-width:
            6px 6px 6px 0;

          border-style: solid;

          border-color:
            transparent
            var(--tooltip-bg)
            transparent
            transparent;

        }


        /* =================================================
           ACCOUNT
        ================================================= */

        .d-account-section {

          margin-top: auto;

          padding:
            24px 16px;

          border-top:
            1px solid
            var(--border-subtle);

          cursor: pointer;

        }


        .account-card {

          display: flex;

          align-items: center;

          gap: 12px;

        }


        .account-avatar {

          width: 44px;

          height: 44px;

          min-width: 44px;

          border-radius: 50%;

          border:
            1px solid
            var(--border-subtle);

          background:
            var(--active-bg);

          color:
            var(--brand-primary);

          display: flex;

          align-items: center;

          justify-content: center;

          font-weight: 700;

          flex-shrink: 0;

        }


        .account-text {

          display: flex;

          flex-direction: column;

          overflow: hidden;

        }


        .account-name {

          font-size: 15px;

          font-weight: 700;

          white-space: nowrap;

          text-overflow: ellipsis;

          overflow: hidden;

        }


        .account-email {

          font-size: 13px;

          color:
            #6b7280;

          white-space: nowrap;

          text-overflow: ellipsis;

          overflow: hidden;

        }


        .d-sidebar.collapsed
        .account-text {

          display: none;

        }


        .d-sidebar.collapsed
        .d-account-section {

          display: flex;

          justify-content: center;

          padding:
            24px 0;

        }


        /* =================================================
           MOBILE HEADER
           EXACT REFERENCE VALUES
        ================================================= */

        .m-header {

          display: none;

          height: 72px;

          background:
            #ffffff;

          border-bottom:
            1px solid
            var(--border-subtle);

          align-items: center;

          justify-content:
            space-between;

          padding:
            0 16px;

          position: fixed;

          top: 0;

          width: 100%;

          z-index: 1000;

        }


        .m-menu-btn {

          width: 40px;

          height: 40px;

          border-radius: 10px;

          border:
            1px solid #e5e7eb;

          background:
            #f9fafb;

          display: flex;

          align-items: center;

          justify-content: center;

          cursor: pointer;

        }


        .m-menu-lines {

          width: 18px;

          height: 14px;

          position: relative;

        }


        .m-menu-lines::before,
        .m-menu-lines::after,
        .m-menu-lines span {

          content: "";

          position: absolute;

          left: 0;
          right: 0;

          height: 2px;

          background:
            #111827;

          border-radius: 10px;

        }


        .m-menu-lines::before {

          top: 0;

        }


        .m-menu-lines span {

          top: 6px;

        }


        .m-menu-lines::after {

          bottom: 0;

        }


        .mobile-brand-logo {

          display: flex;

          align-items: center;

        }


        .mobile-brand-logo img {

          height: 45px;

          width: auto;

          display: block;

        }


        .mobile-header-spacer {

          width: 40px;

        }


        /* =================================================
           MOBILE OVERLAY
        ================================================= */

        .m-overlay {

          position: fixed;

          inset: 0;

          background:
            rgba(
              15,
              23,
              42,
              0.45
            );

          opacity: 0;

          pointer-events: none;

          transition:
            0.25s;

          z-index: 4000;

        }


        .m-overlay.open {

          opacity: 1;

          pointer-events: auto;

        }


        /* =================================================
           MOBILE DRAWER
           EXACT REFERENCE:
           width 300px
           max-width 85vw
        ================================================= */

        .m-drawer {

          position: absolute;

          left: 0;

          top: 0;

          width: 300px;

          max-width: 85vw;

          height: 100%;

          background:
            #ffffff;

          transform:
            translateX(-100%);

          transition:
            0.25s;

          display: flex;

          flex-direction: column;

          overflow-y: auto;

        }


        .m-overlay.open
        .m-drawer {

          transform:
            translateX(0);

        }


        /* =================================================
           MOBILE DRAWER HEADER
           EXACT REFERENCE
        ================================================= */

        .m-drawer-header {

          height: 80px;

          padding:
            0 20px;

          border-bottom:
            1px solid
            var(--border-subtle);

          display: flex;

          align-items: center;

          justify-content:
            space-between;

          flex-shrink: 0;

        }


        .m-drawer-close {

          width: 40px;

          height: 40px;

          border-radius: 10px;

          border:
            1px solid #e5e7eb;

          display: flex;

          align-items: center;

          justify-content: center;

          background:
            #f9fafb;

          cursor: pointer;

        }


        .m-drawer-close-icon {

          width: 14px;

          height: 14px;

          position: relative;

        }


        .m-drawer-close-icon::before,
        .m-drawer-close-icon::after {

          content: "";

          position: absolute;

          inset: 0;

          margin: auto;

          width: 14px;

          height: 2px;

          background:
            #111827;

        }


        .m-drawer-close-icon::before {

          transform:
            rotate(45deg);

        }


        .m-drawer-close-icon::after {

          transform:
            rotate(-45deg);

        }


        /* =================================================
           MOBILE NAV
           EXACT REFERENCE:
           padding 20px 12px
        ================================================= */

        .m-drawer-nav {

          padding:
            20px 12px;

          flex: 1;

        }


        /* =================================================
           MOBILE ACCOUNT
           EXACT REFERENCE:
           padding 20px
        ================================================= */

        .m-account-section {

          padding:
            20px;

          border-top:
            1px solid
            var(--border-subtle);

          background:
            #ffffff;

        }


        /* =================================================
           MOBILE SUBMENU
        ================================================= */

        .m-drawer
        .nav-submenu {

          margin:
            2px 0 4px 20px;

        }


        /* =================================================
           MOBILE
        ================================================= */

        @media (max-width: 768px) {

          .d-sidebar {

            display: none;

          }


          .top-navbar {

            display: none;

          }


          .m-header {

            display: flex;

          }

        }


        /* =================================================
           DESKTOP
        ================================================= */

        @media (min-width: 769px) {

          .m-header,
          .m-overlay {

            display: none !important;

          }

        }

      `}</style>
    </>
  );
}
