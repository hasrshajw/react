import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Search,
  Bell,
  ChevronRight,
} from "lucide-react";


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

function CustomIcon({
  type,
  state = "normal",
}) {
  return (
    <span
      className={`icon icon-${type}`}
    >
      <span
        className={`icon-state icon-${state}`}
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

  const [siteOpen, setSiteOpen] =
    useState(false);

  const [hovered, setHovered] =
    useState(false);


  /*
   * Sidebar temporarily expands when
   * the mouse enters while collapsed.
   */

  const isExpanded =
    !collapsed || hovered;


  /* =======================================================
     TOGGLE SIDEBAR
  ======================================================= */

  const handleToggle = () => {

    setCollapsed(!collapsed);

    setHovered(false);

  };


  /* =======================================================
     CUSTOMIZE SITE
  ======================================================= */

  const handleCustomizeClick = () => {

    if (collapsed) {

      setCollapsed(false);

      setTimeout(() => {
        setSiteOpen(true);
      }, 250);

      return;

    }

    setSiteOpen(!siteOpen);

  };


  return (
    <>

      {/* ===================================================
          TOP NAVBAR
      =================================================== */}

      <header className="top-navbar">

        <div
          className={`top-navbar-inner ${
            isExpanded
              ? "navbar-expanded"
              : "navbar-collapsed"
          }`}
        >

          {/* ===============================================
              LEFT SIDE
          =============================================== */}

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


          {/* ===============================================
              RIGHT SIDE
          =============================================== */}

          <div className="navbar-right">

            {/* SEARCH */}

            <button
              className="navbar-icon-button"
              aria-label="Search"
            >

              <Search
                size={19}
                strokeWidth={2}
              />

            </button>


            {/* NOTIFICATION */}

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


            {/* DIVIDER */}

            <div className="navbar-divider" />


            {/* USER */}

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
          SIDEBAR
      =================================================== */}

      <aside
        className={`d-sidebar ${
          isExpanded
            ? "expanded"
            : "collapsed"
        }`}

        onMouseEnter={() => {

          if (collapsed) {
            setHovered(true);
          }

        }}

        onMouseLeave={() => {

          if (collapsed) {
            setHovered(false);
          }

        }}
      >

        {/* =================================================
            SIDEBAR HEADER
        ================================================= */}

        <div className="d-sidebar-header">

          {/* FULL LOGO */}

          {isExpanded && (

            <NavLink
              to="/"
              className="brand-logo"
            >

              <img
                src="/assets/logo.png"
                alt="Logo"
              />

            </NavLink>

          )}


          {/* SMALL LOGO */}

          {!isExpanded && (

            <span className="mini-logo">

              <img
                src="/assets/logo-small.png"
                alt="Logo"
              />

            </span>

          )}


          {/* TOGGLE BUTTON */}

          <button
            className="sidebar-toggle"
            onClick={handleToggle}
            aria-label={
              collapsed
                ? "Open sidebar"
                : "Close sidebar"
            }
          >

            {isExpanded ? (

              <img
                src="/assets/panel_close.svg"
                alt="Close sidebar"
                width="24"
                height="24"
              />

            ) : (

              <img
                src="/assets/panel_open.svg"
                alt="Open sidebar"
                width="24"
                height="24"
              />

            )}

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

                    <CustomIcon
                      type={item.icon}
                      state={
                        isActive
                          ? "active"
                          : "normal"
                      }
                    />

                    <span className="nav-label">
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
                  ? "dropdown-open"
                  : ""
              } ${
                siteOpen
                  ? "active"
                  : ""
              }`}

              onClick={
                handleCustomizeClick
              }
            >

              <CustomIcon
                type="site"
                state={
                  siteOpen
                    ? "active"
                    : "normal"
                }
              />

              <span className="nav-label">
                Customize Site
              </span>


              {isExpanded && (

                <ChevronRight
                  className="nav-chevron"
                  size={17}
                  strokeWidth={2}
                />

              )}

            </div>


            {/* =============================================
                SUBMENU
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

                        <CustomIcon
                          type={item.icon}
                          state={
                            isActive
                              ? "active"
                              : "normal"
                          }
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
          STYLES
      =================================================== */}

      <style>{`

        /* =================================================
           VARIABLES
        ================================================= */

        :root {

          --sidebar-width: 260px;

          --sidebar-collapsed-width: 90px;

          --navbar-height: 72px;

          --row-height: 52px;

          --sidebar-bg: #ffffff;

          --text-color: #000000;

          --icon-color: #6b7280;

          --brand-primary: #643DE4;

          --active-bg: #F5F0FA;

          --hover-bg: #f3f4f6;

          --border: #e5e7eb;

        }


        /* =================================================
           GLOBAL FONT
        ================================================= */

        .d-sidebar,
        .top-navbar {

          font-family:
            "DM Sans",
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;

        }


        /* =================================================
           TOP NAVBAR
        ================================================= */

        .top-navbar {

          position: fixed;

          top: 0;

          left: 0;

          right: 0;

          height:
            var(--navbar-height);

          background:
            rgba(
              255,
              255,
              255,
              0.97
            );

          backdrop-filter:
            blur(12px);

          -webkit-backdrop-filter:
            blur(12px);

          border-bottom:
            1px solid var(--border);

          z-index: 1500;

        }


        /* =================================================
           NAVBAR INNER

           260px expanded
           90px collapsed
        ================================================= */

        .top-navbar-inner {

          height:
            var(--navbar-height);

          display: flex;

          align-items: center;

          justify-content:
            space-between;

          padding:
            0 28px;

          transition:
            margin-left
            0.3s
            cubic-bezier(
              0.4,
              0,
              0.2,
              1
            );

        }


        .top-navbar-inner.navbar-expanded {

          margin-left:
            var(--sidebar-width);

        }


        .top-navbar-inner.navbar-collapsed {

          margin-left:
            var(--sidebar-collapsed-width);

        }


        /* =================================================
           NAVBAR LEFT
        ================================================= */

        .navbar-left {

          display: flex;

          align-items: center;

        }


        .breadcrumb {

          display: flex;

          align-items: center;

          gap: 9px;

          font-size: 13px;

        }


        .breadcrumb-muted {

          color: #9ca3af;

        }


        .breadcrumb-divider {

          color: #d1d5db;

        }


        .breadcrumb-current {

          color: #111827;

          font-weight: 600;

        }


        /* =================================================
           NAVBAR RIGHT
        ================================================= */

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

          color: #555555;

          position: relative;

          transition:
            background 0.15s ease,
            color 0.15s ease;

        }


        .navbar-icon-button:hover {

          background:
            var(--hover-bg);

          color:
            var(--brand-primary);

        }


        .notification-button {

          position: relative;

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
            var(--border);

          margin:
            0 8px;

        }


        /* =================================================
           NAVBAR USER
        ================================================= */

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

          font-weight: 600;

          color: #222222;

        }


        .navbar-user-role {

          font-size: 11px;

          color: #999999;

        }


        /* =================================================
           SIDEBAR
        ================================================= */

        .d-sidebar {

          width:
            var(--sidebar-width);

          height: 100vh;

          background:
            var(--sidebar-bg);

          border-right:
            1px solid var(--border);

          display: flex;

          flex-direction: column;

          flex-shrink: 0;

          transition:
            width
            0.3s
            cubic-bezier(
              0.4,
              0,
              0.2,
              1
            );

          z-index: 2000;

          position: fixed;

          top: 0;

          left: 0;

          overflow: visible;

        }


        .d-sidebar.collapsed {

          width:
            var(--sidebar-collapsed-width);

        }


        /* =================================================
           SIDEBAR HEADER
        ================================================= */

        .d-sidebar-header {

          min-height: 70px;

          display: flex;

          align-items: center;

          justify-content:
            space-between;

          padding:
            30px 24px;

          flex-shrink: 0;

        }


        /* =================================================
           LOGO
        ================================================= */

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
            background 0.2s,
            color 0.2s;

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

          overflow-x: hidden;

        }


        /* =================================================
           NAV ITEM
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
            10px;

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

          font-size: 15px;

          font-weight: 500;

        }


        /* =================================================
           HOVER
        ================================================= */

        .nav-item:hover {

          background:
            var(--hover-bg);

        }


        /* =================================================
           ACTIVE
        ================================================= */

        .nav-item.active {

          background:
            var(--active-bg);

          color:
            var(--brand-primary);

          font-weight: 600;

        }


        /* =================================================
           ICON
        ================================================= */

        .icon {

          display: flex;

          align-items: center;

          justify-content: center;

          width: 24px;

          height: 24px;

          flex-shrink: 0;

        }


        .icon-custom {

          position: relative;

          width: 24px;

          height: 24px;

        }


        .icon-custom > span {

          position: absolute;

          top: 0;

          left: 0;

          width: 100%;

          height: 100%;

          background-size: contain;

          background-repeat: no-repeat;

          background-position: center;

        }


        /* =================================================
           ICON STATES
        ================================================= */

        .icon-normal {

          display: block;

        }


        .icon-hover,
        .icon-active {

          display: none;

        }


        .nav-item:hover:not(.active)
        .icon-hover {

          display: block;

        }


        .nav-item:hover:not(.active)
        .icon-normal {

          display: none;

        }


        .nav-item.active
        .icon-normal,
        .nav-item.active
        .icon-hover {

          display: none;

        }


        .nav-item.active
        .icon-active {

          display: block;

        }


        /* =================================================
           ICON MAPPINGS
        ================================================= */

        .icon-dashboard
        .icon-normal {

          background-image:
            url("/assets/dashboard.svg");

        }


        .icon-dashboard
        .icon-hover {

          background-image:
            url("/assets/hover_dashboard.svg");

        }


        .icon-dashboard
        .icon-active {

          background-image:
            url("/assets/fill_dashboard.svg");

        }


        .icon-inventory
        .icon-normal {

          background-image:
            url("/assets/inventory.svg");

        }


        .icon-inventory
        .icon-hover {

          background-image:
            url("/assets/hover_inventory.svg");

        }


        .icon-inventory
        .icon-active {

          background-image:
            url("/assets/fill_inventory.svg");

        }


        .icon-coupons
        .icon-normal {

          background-image:
            url("/assets/coupons.svg");

        }


        .icon-coupons
        .icon-hover {

          background-image:
            url("/assets/hover_coupons.svg");

        }


        .icon-coupons
        .icon-active {

          background-image:
            url("/assets/fill_coupons.svg");

        }


        .icon-site
        .icon-normal {

          background-image:
            url("/assets/site.svg");

        }


        .icon-site
        .icon-hover {

          background-image:
            url("/assets/hover_site.svg");

        }


        .icon-site
        .icon-active {

          background-image:
            url("/assets/fill_site.svg");

        }


        .icon-herosection
        .icon-normal {

          background-image:
            url("/assets/herosection.svg");

        }


        .icon-herosection
        .icon-hover {

          background-image:
            url("/assets/hover_herosection.svg");

        }


        .icon-herosection
        .icon-active {

          background-image:
            url("/assets/fill_herosection.svg");

        }


        .icon-sections
        .icon-normal {

          background-image:
            url("/assets/sections.svg");

        }


        .icon-sections
        .icon-hover {

          background-image:
            url("/assets/hover_sections.svg");

        }


        .icon-sections
        .icon-active {

          background-image:
            url("/assets/fill_sections.svg");

        }


        .icon-popup
        .icon-normal {

          background-image:
            url("/assets/popup.svg");

        }


        .icon-popup
        .icon-hover {

          background-image:
            url("/assets/hover_popup.svg");

        }


        .icon-popup
        .icon-active {

          background-image:
            url("/assets/fill_popup.svg");

        }


        .icon-combo
        .icon-normal {

          background-image:
            url("/assets/combo.svg");

        }


        .icon-combo
        .icon-hover {

          background-image:
            url("/assets/hover_combo.svg");

        }


        .icon-combo
        .icon-active {

          background-image:
            url("/assets/fill_combo.svg");

        }


        /* =================================================
           CHEVRON
        ================================================= */

        .nav-chevron {

          margin-left: auto;

          color:
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
            var(--border);

          flex-direction: column;

        }


        .nav-submenu.open {

          display: flex;

        }


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

          font-weight: 500;

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

          font-weight: 600;

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
        ================================================= */

        .d-sidebar.collapsed
        .nav-item:hover
        .nav-label {

          display: block;

          position: absolute;

          left: 100%;

          top: 50%;

          transform:
            translateY(-50%);

          background:
            #1f2937;

          color:
            #ffffff;

          padding:
            8px 12px;

          border-radius: 6px;

          font-size: 13px;

          font-weight: 500;

          white-space: nowrap;

          z-index: 5000;

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


        /* =================================================
           ACCOUNT
        ================================================= */

        .d-account-section {

          margin-top: auto;

          padding:
            24px 16px;

          border-top:
            1px solid
            var(--border);

        }


        .account-card {

          display: flex;

          align-items: center;

          gap: 12px;

        }


        .account-avatar {

          width: 44px;

          height: 44px;

          border-radius: 50%;

          background:
            var(--active-bg);

          color:
            var(--brand-primary);

          display: flex;

          align-items: center;

          justify-content: center;

          font-size: 15px;

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

          font-weight: 600;

          white-space: nowrap;

          overflow: hidden;

          text-overflow: ellipsis;

        }


        .account-email {

          font-size: 13px;

          color:
            var(--text-sub);

          white-space: nowrap;

          overflow: hidden;

          text-overflow: ellipsis;

        }


        /* =================================================
           COLLAPSED ACCOUNT
        ================================================= */

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
           MOBILE
        ================================================= */

        @media (max-width: 768px) {

          .d-sidebar {

            display: none;

          }


          .top-navbar {

            height: 64px;

          }


          .top-navbar-inner {

            margin-left: 0 !important;

            height: 64px;

            padding:
              0 16px;

          }


          .breadcrumb {

            display: none;

          }


          .navbar-user-info {

            display: none;

          }


          .navbar-divider {

            display: none;

          }

        }


        /* =================================================
           SMALL MOBILE
        ================================================= */

        @media (max-width: 480px) {

          .navbar-right {

            gap: 2px;

          }


          .navbar-icon-button {

            width: 36px;

            height: 36px;

          }


          .navbar-user {

            padding: 3px;

          }

        }

      `}</style>

    </>
  );
}
