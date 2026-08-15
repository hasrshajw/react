import React, { useState } from "react";
import { NavLink } from "react-router-dom";

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

function CustomIcon({ type, state = "normal" }) {
  return (
    <span className={`icon icon-custom icon-${type}`}>
      <span
        className={`icon-state icon-${state}`}
      />
    </span>
  );
}

export default function Sidebar({
  collapsed,
  setCollapsed,
}) {
  const [siteOpen, setSiteOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  /*
   * When the sidebar is collapsed:
   * hovering over it temporarily expands it.
   */
  const isExpanded = !collapsed || hovered;

  const handleToggle = () => {
    setCollapsed(!collapsed);
    setHovered(false);
  };

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

  return (
    <>
      {/* ==================================================
          SIDEBAR
      ================================================== */}

      <aside
        className={`d-sidebar ${
          isExpanded ? "" : "collapsed"
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

        {/* ==================================================
            SIDEBAR HEADER
        ================================================== */}

        <div className="d-sidebar-header">

          {/* Full Logo */}

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


          {/* Small Logo */}

          {!isExpanded && (
            <span className="mini-logo">
              <img
                src="/assets/logo-small.png"
                alt="Logo"
              />
            </span>
          )}


          {/* Toggle */}

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
                className="btn-close-svg"
                src="/assets/panel_close.svg"
                alt="Close sidebar"
                width="24"
                height="24"
              />
            ) : (
              <img
                className="btn-open-svg"
                src="/assets/panel_open.svg"
                alt="Open sidebar"
                width="24"
                height="24"
              />
            )}

          </button>

        </div>


        {/* ==================================================
            SIDEBAR CONTENT
        ================================================== */}

        <div className="d-sidebar-inner">

          <nav>

            {/* ==================================================
                MAIN MENU
            ================================================== */}

            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `nav-item ${
                    isActive ? "active" : ""
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


            {/* ==================================================
                CUSTOMIZE SITE
            ================================================== */}

            <div
              className={`nav-item ${
                siteOpen ? "dropdown-open" : ""
              } ${
                siteOpen ? "active" : ""
              }`}
              onClick={handleCustomizeClick}
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


              {/* Chevron */}

              {isExpanded && (
                <svg
                  className="nav-chevron"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              )}

            </div>


            {/* ==================================================
                SUBMENU
            ================================================== */}

            {isExpanded && (
              <div
                className={`nav-submenu ${
                  siteOpen ? "open" : ""
                }`}
              >

                {submenuItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `nav-submenu-item ${
                        isActive ? "active" : ""
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


          {/* ==================================================
              ACCOUNT
          ================================================== */}

          <div className="d-account-section">

            <div className="account-card">

              <img
                className="account-avatar"
                src="/assets/profile.png"
                alt="User"
                onError={(e) => {
                  e.currentTarget.style.display =
                    "none";
                }}
              />

              <div className="account-avatar-fallback">
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


      {/* ==================================================
          STYLES
      ================================================== */}

      <style>{`

        /* ==================================================
           VARIABLES
        ================================================== */

        :root {

          --text-sub: #6b7280;

          --sidebar-width: 260px;

          --sidebar-collapsed-width: 90px;

          --row-height: 52px;

          --sidebar-bg: #ffffff;

          --text-color: rgb(24, 24, 26);

          --icon-color: #6b7280;

          --brand-primary: #673DE6;

          --active-bg: #f4f0fa;

          --hover-bg: #f3f4f6;

          --border-subtle: #e5e7eb;

          --radius-md: 10px;

          --tooltip-bg: #1f2937;

        }


        /* ==================================================
           SIDEBAR
        ================================================== */

        .d-sidebar {

          width: var(--sidebar-width);

          height: 100vh;

          background: var(--sidebar-bg);

          border-right:
            1px solid var(--border-subtle);

          display: flex;

          flex-direction: column;

          flex-shrink: 0;

          transition:
            width 0.3s
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

          font-family:
            "DM Sans",
            Roboto,
            sans-serif;

        }


        /* ==================================================
           COLLAPSED
        ================================================== */

        .d-sidebar.collapsed {

          width:
            var(--sidebar-collapsed-width);

        }


        /* ==================================================
           HEADER
        ================================================== */

        .d-sidebar-header {

          min-height: 70px;

          display: flex;

          align-items: center;

          justify-content: space-between;

          padding:
            30px 24px;

          transition:
            all 0.3s;

          flex-shrink: 0;

        }


        /* ==================================================
           LOGO
        ================================================== */

        .brand-logo {

          display: flex;

          align-items: center;

          text-decoration: none;

          transition:
            all 0.3s;

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


        /* ==================================================
           TOGGLE
        ================================================== */

        .sidebar-toggle {

          background: none;

          border: none;

          cursor: pointer;

          color: var(--icon-color);

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


        .btn-close-svg,
        .btn-open-svg {

          display: block;

        }


        /* ==================================================
           COLLAPSED HEADER
        ================================================== */

        .d-sidebar.collapsed
        .d-sidebar-header {

          flex-direction: column;

          height: auto;

          padding:
            30px 0 20px;

          gap: 30px;

        }


        /* ==================================================
           INNER
        ================================================== */

        .d-sidebar-inner {

          flex: 1;

          padding:
            10px 16px;

          display: flex;

          flex-direction: column;

          overflow-y: auto;

          overflow-x: hidden;

        }


        /* ==================================================
           NAV ITEM
        ================================================== */

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

          font-size: 15px;

          font-weight: 500;

        }


        /* ==================================================
           HOVER
        ================================================== */

        .nav-item:hover {

          background:
            var(--hover-bg);

        }


        /* ==================================================
           ACTIVE
        ================================================== */

        .nav-item.active {

          background:
            var(--active-bg);

          color:
            var(--brand-primary);

          font-weight: 700;

        }


        /* ==================================================
           ICON
        ================================================== */

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


        /* ==================================================
           ICON STATES
        ================================================== */

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


        /* ==================================================
           ICON MAPPINGS
        ================================================== */

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


        /* ==================================================
           SUBMENU ICONS
        ================================================== */

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


        /* ==================================================
           CHEVRON
        ================================================== */

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


        /* ==================================================
           SUBMENU
        ================================================== */

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


        /* ==================================================
           COLLAPSED MENU
        ================================================== */

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


        /* ==================================================
           COLLAPSED TOOLTIP
        ================================================== */

        .d-sidebar.collapsed
        .nav-item:hover
        .nav-label {

          display: block;

          position: absolute;

          left: 100%;

          top: 50%;

          transform:
            translateY(-50%);

          background-color:
            var(--tooltip-bg);

          color: #ffffff;

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


        .d-sidebar.collapsed
        .nav-item:hover
        .nav-label::before {

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


        /* ==================================================
           ACCOUNT
        ================================================== */

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

          border-radius: 50%;

          border:
            1px solid
            var(--border-subtle);

          object-fit: cover;

          flex-shrink: 0;

        }


        .account-avatar-fallback {

          width: 44px;

          height: 44px;

          border-radius: 50%;

          border:
            1px solid
            var(--border-subtle);

          display: flex;

          align-items: center;

          justify-content: center;

          background:
            var(--active-bg);

          color:
            var(--brand-primary);

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
            var(--text-sub);

          white-space: nowrap;

          text-overflow: ellipsis;

          overflow: hidden;

        }


        /* ==================================================
           COLLAPSED ACCOUNT
        ================================================== */

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


        /* ==================================================
           RESPONSIVE
        ================================================== */

        @media (max-width: 768px) {

          .d-sidebar {

            display: none;

          }

        }

      `}</style>
    </>
  );
}
