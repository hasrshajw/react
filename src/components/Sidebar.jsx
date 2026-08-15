import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Search,
  Bell,
  ChevronRight,
  LayoutDashboard,
  Package,
  TicketPercent,
  Palette,
  Image,
  Layers,
  MessageSquare,
  Gift,
} from "lucide-react";

const menuItems = [
  {
    name: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Inventory",
    path: "/inventory",
    icon: Package,
  },
  {
    name: "Manage Coupons",
    path: "/coupons",
    icon: TicketPercent,
  },
];

const submenuItems = [
  {
    name: "Hero Section",
    path: "/customize/hero-section",
    icon: Image,
  },
  {
    name: "Sections",
    path: "/customize/sections",
    icon: Layers,
  },
  {
    name: "Popup",
    path: "/customize/popup",
    icon: MessageSquare,
  },
  {
    name: "Combo Offer",
    path: "/customize/combo",
    icon: Gift,
  },
];

export default function Sidebar({
  collapsed,
  setCollapsed,
}) {
  const [siteOpen, setSiteOpen] = useState(false);

  /*
   * IMPORTANT:
   *
   * The sidebar NEVER expands on hover.
   *
   * collapsed = true  -> 90px
   * collapsed = false -> 260px
   */

  const isExpanded = !collapsed;


  /* ========================================================
     TOGGLE SIDEBAR
  ======================================================== */

  const handleToggle = () => {
    setCollapsed(!collapsed);
  };


  /* ========================================================
     CUSTOMIZE SITE
  ======================================================== */

  const handleCustomizeClick = () => {
    if (collapsed) {
      /*
       * When collapsed, clicking Customize Site
       * expands the sidebar first.
       */
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
      {/* ====================================================
          TOP NAVBAR
      ==================================================== */}

      <header className="top-navbar">

        <div
          className={`top-navbar-inner ${
            isExpanded
              ? "navbar-expanded"
              : "navbar-collapsed"
          }`}
        >

          {/* LEFT */}

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


          {/* RIGHT */}

          <div className="navbar-right">

            {/* Search */}

            <button
              className="navbar-icon-button"
              aria-label="Search"
            >
              <Search
                size={19}
                strokeWidth={2}
              />
            </button>


            {/* Notifications */}

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


            {/* Divider */}

            <div className="navbar-divider" />


            {/* User */}

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


      {/* ====================================================
          SIDEBAR
      ==================================================== */}

      <aside
        className={`sidebar ${
          isExpanded
            ? "expanded"
            : "collapsed"
        }`}
      >

        {/* ==================================================
            SIDEBAR HEADER
        ================================================== */}

        <div className="sidebar-header">

          {/* Expanded Logo */}

          {isExpanded && (
            <div className="brand">

              <div className="brand-logo">
                D
              </div>

              <span className="brand-name">
                Dashboard
              </span>

            </div>
          )}


          {/* Collapsed Logo */}

          {!isExpanded && (
            <div className="brand-logo collapsed-logo">
              D
            </div>
          )}


          {/* Toggle */}

          <button
            className="sidebar-toggle"
            onClick={handleToggle}
            aria-label={
              collapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
            }
          >

            {isExpanded ? (
              <ChevronRight
                size={19}
                style={{
                  transform:
                    "rotate(180deg)",
                }}
              />
            ) : (
              <ChevronRight size={19} />
            )}

          </button>

        </div>


        {/* ==================================================
            SIDEBAR MENU
        ================================================== */}

        <div className="sidebar-inner">

          <nav>

            {/* =================================================
                MAIN MENU
            ================================================= */}

            {menuItems.map((item) => {

              const Icon = item.icon;

              return (
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
                      <Icon
                        className="menu-icon"
                        size={22}
                        strokeWidth={
                          isActive
                            ? 2.2
                            : 2
                        }
                      />

                      {isExpanded && (
                        <span className="nav-label">
                          {item.name}
                        </span>
                      )}

                      {/* Tooltip */}

                      {!isExpanded && (
                        <span className="tooltip">
                          {item.name}
                        </span>
                      )}
                    </>
                  )}

                </NavLink>
              );

            })}


            {/* =================================================
                CUSTOMIZE SITE
            ================================================= */}

            <div
              className={`nav-item ${
                siteOpen
                  ? "active"
                  : ""
              }`}
              onClick={
                handleCustomizeClick
              }
            >

              <Palette
                className="menu-icon"
                size={22}
                strokeWidth={
                  siteOpen
                    ? 2.2
                    : 2
                }
              />

              {isExpanded && (
                <span className="nav-label">
                  Customize Site
                </span>
              )}


              {isExpanded && (
                <ChevronRight
                  className={`nav-chevron ${
                    siteOpen
                      ? "rotate"
                      : ""
                  }`}
                  size={17}
                />
              )}


              {/* Collapsed Tooltip */}

              {!isExpanded && (
                <span className="tooltip">
                  Customize Site
                </span>
              )}

            </div>


            {/* =================================================
                SUBMENU
            ================================================= */}

            {isExpanded && siteOpen && (

              <div className="submenu">

                {submenuItems.map((item) => {

                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `submenu-item ${
                          isActive
                            ? "active"
                            : ""
                        }`
                      }
                    >

                      {({ isActive }) => (
                        <>
                          <Icon
                            size={19}
                            strokeWidth={
                              isActive
                                ? 2.2
                                : 2
                            }
                          />

                          <span>
                            {item.name}
                          </span>
                        </>
                      )}

                    </NavLink>
                  );

                })}

              </div>

            )}

          </nav>


          {/* =================================================
              ACCOUNT
          ================================================= */}

          <div className="account-section">

            <div className="account">

              <div className="account-avatar">
                H
              </div>

              {isExpanded && (

                <div className="account-info">

                  <span className="account-name">
                    Harsha
                  </span>

                  <span className="account-role">
                    Administrator
                  </span>

                </div>

              )}

              {!isExpanded && (
                <span className="tooltip account-tooltip">
                  Harsha
                </span>
              )}

            </div>

          </div>

        </div>

      </aside>


      {/* ====================================================
          STYLES
      ==================================================== */}

      <style>{`

        /* ==================================================
           VARIABLES
        ================================================== */

        :root {

          --sidebar-width: 260px;

          --sidebar-collapsed-width: 90px;

          --navbar-height: 72px;

          --primary: #643DE4;

          --active-bg: #F5F0FA;

          --hover-bg: #f3f4f6;

          --border: #e5e7eb;

        }


        /* ==================================================
           FONT
        ================================================== */

        .sidebar,
        .top-navbar {

          font-family:
            "DM Sans",
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;

        }


        /* ==================================================
           TOP NAVBAR
        ================================================== */

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
            1px solid
            var(--border);

          z-index: 1000;

        }


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


        /* EXPANDED */

        .navbar-expanded {

          margin-left:
            var(--sidebar-width);

        }


        /* COLLAPSED */

        .navbar-collapsed {

          margin-left:
            var(--sidebar-collapsed-width);

        }


        /* ==================================================
           NAVBAR LEFT
        ================================================== */

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


        /* ==================================================
           NAVBAR RIGHT
        ================================================== */

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

          color: #555;

          position: relative;

          transition:
            background 0.15s ease,
            color 0.15s ease;

        }


        .navbar-icon-button:hover {

          background:
            var(--hover-bg);

          color:
            var(--primary);

        }


        .notification-dot {

          position: absolute;

          top: 8px;

          right: 8px;

          width: 6px;

          height: 6px;

          border-radius: 50%;

          background:
            var(--primary);

          border:
            1px solid white;

        }


        .navbar-divider {

          width: 1px;

          height: 30px;

          background:
            var(--border);

          margin:
            0 8px;

        }


        /* ==================================================
           USER
        ================================================== */

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
            var(--primary);

          color: white;

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

          text-align: left;

        }


        .navbar-user-name {

          font-size: 13px;

          font-weight: 600;

          color: #222;

        }


        .navbar-user-role {

          font-size: 11px;

          color: #999;

        }


        /* ==================================================
           SIDEBAR
        ================================================== */

        .sidebar {

          position: fixed;

          top: 0;

          left: 0;

          width:
            var(--sidebar-width);

          height: 100vh;

          background: #fff;

          border-right:
            1px solid
            var(--border);

          z-index: 2000;

          display: flex;

          flex-direction: column;

          overflow: visible;

          transition:
            width
            0.3s
            cubic-bezier(
              0.4,
              0,
              0.2,
              1
            );

        }


        .sidebar.collapsed {

          width:
            var(--sidebar-collapsed-width);

        }


        /* ==================================================
           HEADER
        ================================================== */

        .sidebar-header {

          height: 92px;

          padding:
            22px 18px;

          display: flex;

          align-items: center;

          justify-content:
            space-between;

          flex-shrink: 0;

        }


        .brand {

          display: flex;

          align-items: center;

          gap: 10px;

        }


        .brand-logo {

          width: 42px;

          height: 42px;

          border-radius: 11px;

          background:
            var(--primary);

          color: white;

          display: flex;

          align-items: center;

          justify-content: center;

          font-size: 18px;

          font-weight: 700;

          flex-shrink: 0;

        }


        .brand-name {

          font-size: 16px;

          font-weight: 700;

          color: #111;

          white-space: nowrap;

        }


        .collapsed-logo {

          margin:
            0 auto;

          width: 42px;

          height: 42px;

        }


        /* ==================================================
           SIDEBAR TOGGLE
        ================================================== */

        .sidebar-toggle {

          width: 32px;

          height: 32px;

          border: none;

          background:
            transparent;

          border-radius: 8px;

          display: flex;

          align-items: center;

          justify-content: center;

          cursor: pointer;

          color: #6b7280;

          flex-shrink: 0;

          transition:
            background 0.15s ease,
            color 0.15s ease;

        }


        .sidebar-toggle:hover {

          background:
            var(--hover-bg);

          color:
            #000;

        }


        /* ==================================================
           COLLAPSED HEADER
        ================================================== */

        .sidebar.collapsed
        .sidebar-header {

          height: 92px;

          padding:
            20px 0;

          flex-direction: column;

          gap: 10px;

        }


        /* ==================================================
           SIDEBAR INNER
        ================================================== */

        .sidebar-inner {

          flex: 1;

          padding:
            12px 16px;

          display: flex;

          flex-direction: column;

          overflow-y: auto;

          overflow-x: visible;

        }


        /* ==================================================
           NAV ITEM
        ================================================== */

        .nav-item {

          position: relative;

          height: 52px;

          display: flex;

          align-items: center;

          gap: 14px;

          padding:
            0 16px;

          margin:
            3px 0;

          border-radius: 10px;

          color: #000;

          text-decoration: none;

          cursor: pointer;

          font-size: 15px;

          font-weight: 500;

          white-space: nowrap;

          transition:
            background 0.15s ease,
            color 0.15s ease;

        }


        /* ==================================================
           INACTIVE HOVER
        ================================================== */

        .nav-item:hover {

          background:
            var(--hover-bg);

          color: #000;

        }


        /* ==================================================
           ACTIVE
        ================================================== */

        .nav-item.active {

          background:
            var(--active-bg);

          color:
            var(--primary);

          font-weight: 600;

        }


        .nav-item.active:hover {

          background:
            var(--active-bg);

          color:
            var(--primary);

        }


        /* ==================================================
           ICON
        ================================================== */

        .menu-icon {

          flex-shrink: 0;

          color:
            currentColor;

        }


        /* ==================================================
           CHEVRON
        ================================================== */

        .nav-chevron {

          margin-left: auto;

          transition:
            transform 0.2s ease;

        }


        .nav-chevron.rotate {

          transform:
            rotate(90deg);

        }


        /* ==================================================
           SUBMENU
        ================================================== */

        .submenu {

          margin:
            2px 0 5px 20px;

          padding-left:
            14px;

          border-left:
            2px solid
            var(--border);

        }


        .submenu-item {

          height: 46px;

          display: flex;

          align-items: center;

          gap: 12px;

          padding:
            0 14px;

          border-radius: 8px;

          color: #000;

          text-decoration: none;

          font-size: 14px;

          font-weight: 500;

          transition:
            background 0.15s ease,
            color 0.15s ease;

        }


        .submenu-item:hover {

          background:
            var(--hover-bg);

          color:
            var(--primary);

        }


        .submenu-item.active {

          background:
            var(--active-bg);

          color:
            var(--primary);

          font-weight: 600;

        }


        /* ==================================================
           COLLAPSED MENU
           
           IMPORTANT:
           It STAYS collapsed on hover.
        ================================================== */

        .sidebar.collapsed
        .nav-item {

          width: 52px;

          height: 52px;

          padding: 0;

          margin:
            4px auto;

          justify-content: center;

          border-radius: 11px;

        }


        .sidebar.collapsed
        .nav-item.active {

          width: 52px;

          height: 52px;

          background:
            var(--active-bg);

          color:
            var(--primary);

        }


        .sidebar.collapsed
        .nav-item:hover {

          background:
            var(--hover-bg);

        }


        .sidebar.collapsed
        .nav-item.active:hover {

          background:
            var(--active-bg);

        }


        /* ==================================================
           HIDE TEXT WHEN COLLAPSED
        ================================================== */

        .sidebar.collapsed
        .nav-label {

          display: none;

        }


        .sidebar.collapsed
        .nav-chevron {

          display: none;

        }


        /* ==================================================
           TOOLTIP
           
           Hover = label only.
           
           Sidebar DOES NOT expand.
        ================================================== */

        .tooltip {

          position: absolute;

          left:
            calc(100% + 12px);

          top: 50%;

          transform:
            translateY(-50%);

          background:
            #1f2937;

          color: white;

          padding:
            8px 12px;

          border-radius: 7px;

          font-size: 13px;

          font-weight: 500;

          line-height: 1;

          white-space: nowrap;

          opacity: 0;

          visibility: hidden;

          pointer-events: none;

          z-index: 9999;

          box-shadow:
            0 4px 12px
            rgba(
              0,
              0,
              0,
              0.15
            );

          transition:
            opacity 0.12s ease;

        }


        .sidebar.collapsed
        .nav-item:hover
        .tooltip {

          opacity: 1;

          visibility: visible;

        }


        /* ==================================================
           TOOLTIP ARROW
        ================================================== */

        .tooltip::before {

          content: "";

          position: absolute;

          left: -6px;

          top: 50%;

          transform:
            translateY(-50%);

          border-top:
            6px solid transparent;

          border-bottom:
            6px solid transparent;

          border-right:
            6px solid #1f2937;

        }


        /* ==================================================
           ACCOUNT
        ================================================== */

        .account-section {

          margin-top: auto;

          padding:
            20px 16px;

          border-top:
            1px solid
            var(--border);

        }


        .account {

          position: relative;

          display: flex;

          align-items: center;

          gap: 11px;

        }


        .account-avatar {

          width: 42px;

          height: 42px;

          min-width: 42px;

          border-radius: 50%;

          background:
            var(--active-bg);

          color:
            var(--primary);

          display: flex;

          align-items: center;

          justify-content: center;

          font-size: 14px;

          font-weight: 700;

        }


        .account-info {

          display: flex;

          flex-direction: column;

          gap: 2px;

        }


        .account-name {

          font-size: 14px;

          font-weight: 600;

          color: #111;

        }


        .account-role {

          font-size: 11px;

          color: #6b7280;

        }


        /* ==================================================
           COLLAPSED ACCOUNT
        ================================================== */

        .sidebar.collapsed
        .account-section {

          padding:
            20px 0;

          display: flex;

          justify-content: center;

        }


        .sidebar.collapsed
        .account-info {

          display: none;

        }


        .account-tooltip {

          left:
            calc(100% + 12px);

        }


        .sidebar.collapsed
        .account:hover
        .account-tooltip {

          opacity: 1;

          visibility: visible;

        }


        /* ==================================================
           MOBILE
        ================================================== */

        @media (max-width: 768px) {

          .sidebar {

            transform:
              translateX(-100%);

          }


          .sidebar.expanded {

            transform:
              translateX(0);

            width:
              var(--sidebar-width);

          }


          .sidebar.collapsed {

            transform:
              translateX(-100%);

          }


          .top-navbar-inner {

            margin-left:
              0 !important;

            height: 64px;

            padding:
              0 16px;

          }


          .top-navbar {

            height: 64px;

          }


          .navbar-left {

            display: none;

          }


          .navbar-user-info {

            display: none;

          }


          .navbar-divider {

            display: none;

          }

        }


        @media (max-width: 480px) {

          .navbar-right {

            gap: 2px;

          }


          .navbar-icon-button {

            width: 36px;

            height: 36px;

          }

        }

      `}</style>
    </>
  );
}
