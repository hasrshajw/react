import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Menu,
  Search,
  Bell,
} from "lucide-react";

const menuItems = [
  {
    name: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Analytics",
    path: "/analytics",
    icon: BarChart3,
  },
];

export default function Sidebar({
  collapsed,
  setCollapsed,
}) {
  const [hovered, setHovered] = useState(false);

  const isExpanded = !collapsed || hovered;

  return (
    <>
      {/* ==================================================
          TOP NAVIGATION
      ================================================== */}

      <header className="top-nav">

        <div
          className={`top-nav-content ${
            isExpanded
              ? "nav-expanded"
              : "nav-collapsed"
          }`}
        >

          {/* LEFT */}

          <div className="top-nav-left">

            <div className="breadcrumb">

              <span className="breadcrumb-muted">
                Dashboard
              </span>

              <span className="breadcrumb-separator">
                /
              </span>

              <span className="breadcrumb-current">
                Overview
              </span>

            </div>

          </div>


          {/* RIGHT */}

          <div className="top-nav-right">

            {/* Search */}

            <button
              className="top-nav-button"
              aria-label="Search"
            >
              <Search size={19} />
            </button>


            {/* Notifications */}

            <button
              className="top-nav-button notification-button"
              aria-label="Notifications"
            >

              <Bell size={19} />

              <span className="notification-dot"></span>

            </button>


            {/* Divider */}

            <div className="top-nav-divider"></div>


            {/* User */}

            <button className="top-user">

              <div className="top-user-avatar">
                H
              </div>

              <div className="top-user-info">

                <span className="top-user-name">
                  Harsha
                </span>

                <span className="top-user-role">
                  Administrator
                </span>

              </div>

            </button>

          </div>

        </div>

      </header>


      {/* ==================================================
          MOBILE MENU BUTTON
      ================================================== */}

      <button
        className="sidebar-mobile-button"
        onClick={() => setCollapsed(false)}
        aria-label="Open sidebar"
      >
        <Menu size={22} />
      </button>


      {/* ==================================================
          SIDEBAR
      ================================================== */}

      <aside
        className={`sidebar ${
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

        {/* ==================================================
            SIDEBAR HEADER
        ================================================== */}

        <div className="sidebar-header">

          <div className="brand">

            <div className="brand-logo">
              S
            </div>

            {isExpanded && (
              <span className="brand-name">
                Dashboard
              </span>
            )}

          </div>


          {/* Collapse Button */}

          <button
            className="collapse-button"

            onClick={() => {
              setCollapsed(!collapsed);
              setHovered(false);
            }}

            aria-label={
              collapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
            }
          >

            {collapsed ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}

          </button>

        </div>


        {/* ==================================================
            SIDEBAR NAVIGATION
        ================================================== */}

        <nav className="sidebar-navigation">

          {isExpanded && (
            <div className="navigation-title">
              MENU
            </div>
          )}


          {menuItems.map((item) => {

            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}

                to={item.path}

                end={item.path === "/"}

                className={({ isActive }) =>
                  `sidebar-link ${
                    isActive
                      ? "active"
                      : ""
                  }`
                }
              >

                <Icon
                  className="sidebar-icon"
                  size={22}
                  strokeWidth={2}
                />


                {isExpanded && (
                  <span className="sidebar-link-text">
                    {item.name}
                  </span>
                )}


                {!isExpanded && (
                  <span className="sidebar-tooltip">
                    {item.name}
                  </span>
                )}

              </NavLink>
            );

          })}

        </nav>


        {/* ==================================================
            SIDEBAR BOTTOM
        ================================================== */}

        <div className="sidebar-bottom">

          <div className="sidebar-profile">

            <div className="profile-avatar">
              H
            </div>


            {isExpanded && (
              <div className="profile-info">

                <span className="profile-name">
                  Harsha
                </span>

                <span className="profile-role">
                  Administrator
                </span>

              </div>
            )}

          </div>

        </div>

      </aside>


      {/* ==================================================
          STYLES
      ================================================== */}

      <style>{`

        /* ==================================================
           COLORS
        ================================================== */

        :root {
          --primary: #643DE4;
          --active-background: #F5F0FA;
          --text: #686868;
          --dark-text: #222222;
          --border: #e8e8e8;
        }


        /* ==================================================
           FONT
        ================================================== */

        .sidebar,
        .top-nav,
        .sidebar-mobile-button {

          font-family:
            "DM Sans",
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;

        }


        /* ==================================================
           SIDEBAR
        ================================================== */

        .sidebar {

          position: fixed;

          top: 0;
          left: 0;

          width: 250px;
          height: 100vh;

          background: #ffffff;

          border-right: 1px solid var(--border);

          display: flex;
          flex-direction: column;

          z-index: 2000;

          overflow: visible;

          transition:
            width 0.25s ease;

        }


        .sidebar.expanded {
          width: 250px;
        }


        .sidebar.collapsed {
          width: 72px;
        }


        /* ==================================================
           SIDEBAR HEADER
        ================================================== */

        .sidebar-header {

          height: 72px;

          display: flex;

          align-items: center;

          justify-content: space-between;

          padding: 0 14px;

          border-bottom: none;

          background: #ffffff;

          flex-shrink: 0;

        }


        /* ==================================================
           BRAND
        ================================================== */

        .brand {

          display: flex;

          align-items: center;

          gap: 11px;

          min-width: 0;

        }


        .brand-logo {

          width: 40px;
          height: 40px;

          min-width: 40px;

          border-radius: 11px;

          background: #643DE4;

          color: #ffffff;

          display: flex;

          align-items: center;

          justify-content: center;

          font-size: 18px;

          font-weight: 700;

        }


        .brand-name {

          font-size: 16px;

          font-weight: 700;

          color: #171717;

          white-space: nowrap;

        }


        /* ==================================================
           COLLAPSE BUTTON
        ================================================== */

        .collapse-button {

          width: 30px;
          height: 30px;

          border: none;

          background: transparent;

          border-radius: 7px;

          display: flex;

          align-items: center;

          justify-content: center;

          cursor: pointer;

          color: #777777;

          transition:
            background 0.15s ease,
            color 0.15s ease;

        }


        .collapse-button:hover {

          background: #f2f2f2;

          color: #111111;

        }


        /* ==================================================
           SIDEBAR NAVIGATION
        ================================================== */

        .sidebar-navigation {

          flex: 1;

          /*
           * Increased spacing around the menu.
           */
          padding: 24px 8px;

          overflow-y: auto;

        }


        .navigation-title {

          font-size: 10px;

          font-weight: 700;

          color: #999999;

          letter-spacing: 0.08em;

          padding: 0 12px;

          margin-bottom: 12px;

        }


        /* ==================================================
           NORMAL SIDEBAR LINK
        ================================================== */

        .sidebar-link {

          position: relative;

          width: 100%;

          height: 44px;

          display: flex;

          align-items: center;

          gap: 12px;

          padding: 0 12px;

          /*
           * Increased gap between menu items.
           */
          margin: 0 0 12px 0;

          border-radius: 10px;

          color: var(--text);

          text-decoration: none;

          font-size: 14px;

          font-weight: 500;

          white-space: nowrap;

          transition:
            background 0.15s ease,
            color 0.15s ease;

        }


        /* Last item doesn't need extra bottom space */

        .sidebar-link:last-child {
          margin-bottom: 0;
        }


        /* ==================================================
           HOVER
        ================================================== */

        .sidebar-link:hover {

          background: #faf8fd;

          color: var(--primary);

        }


        /* ==================================================
           ACTIVE

           ICON + TEXT = #643DE4
           BACKGROUND = #F5F0FA
        ================================================== */

        .sidebar-link.active {

          background: var(--active-background);

          color: var(--primary);

        }


        .sidebar-link.active:hover {

          background: var(--active-background);

          color: var(--primary);

        }


        .sidebar-link.active .sidebar-icon {

          color: var(--primary);

        }


        .sidebar-icon {

          flex-shrink: 0;

          color: currentColor;

          transition:
            color 0.15s ease;

        }


        .sidebar-link-text {

          color: currentColor;

          transition:
            color 0.15s ease;

        }


        /* ==================================================
           COLLAPSED SIDEBAR
           
           ACTIVE SQUARE = 48 × 48 PX
        ================================================== */

        .sidebar.collapsed .sidebar-navigation {

          padding-left: 8px;

          padding-right: 8px;

        }


        .sidebar.collapsed .sidebar-link {

          width: 48px;

          height: 48px;

          min-width: 48px;

          padding: 0;

          /*
           * Increased vertical gap in collapsed mode.
           */
          margin: 0 auto 12px auto;

          border-radius: 11px;

          display: flex;

          align-items: center;

          justify-content: center;

          gap: 0;

        }


        .sidebar.collapsed .sidebar-link:last-child {

          margin-bottom: 0;

        }


        /* ==================================================
           COLLAPSED ACTIVE SQUARE
        ================================================== */

        .sidebar.collapsed .sidebar-link.active {

          width: 48px;

          height: 48px;

          min-width: 48px;

          padding: 0;

          margin-left: auto;

          margin-right: auto;

          background: var(--active-background);

          color: var(--primary);

        }


        .sidebar.collapsed .sidebar-link.active .sidebar-icon {

          color: var(--primary);

        }


        .sidebar.collapsed .sidebar-icon {

          width: 22px;

          height: 22px;

          margin: 0;

        }


        /* ==================================================
           EXPANDED SIDEBAR
        ================================================== */

        .sidebar.expanded .sidebar-link {

          width: 100%;

          height: 44px;

          padding: 0 12px;

          gap: 12px;

        }


        /* ==================================================
           TOOLTIP
        ================================================== */

        .sidebar-tooltip {

          position: absolute;

          left: calc(100% + 12px);

          top: 50%;

          transform: translateY(-50%);

          background: #111111;

          color: #ffffff;

          padding: 7px 10px;

          border-radius: 6px;

          font-size: 12px;

          white-space: nowrap;

          pointer-events: none;

          opacity: 0;

          visibility: hidden;

          transition:
            opacity 0.15s ease;

          z-index: 3000;

        }


        .sidebar-link:hover .sidebar-tooltip {

          opacity: 1;

          visibility: visible;

        }


        /* ==================================================
           SIDEBAR BOTTOM
        ================================================== */

        .sidebar-bottom {

          padding: 10px;

          border-top: 1px solid #eeeeee;

          flex-shrink: 0;

        }


        .sidebar-profile {

          height: 52px;

          display: flex;

          align-items: center;

          gap: 11px;

          padding: 5px 7px;

          border-radius: 9px;

        }


        .sidebar-profile:hover {

          background: #f7f7f7;

        }


        .profile-avatar {

          width: 36px;
          height: 36px;

          min-width: 36px;

          border-radius: 50%;

          background: #e9e9e9;

          color: #333333;

          display: flex;

          align-items: center;

          justify-content: center;

          font-size: 13px;

          font-weight: 700;

        }


        .profile-info {

          display: flex;

          flex-direction: column;

          min-width: 0;

        }


        .profile-name {

          font-size: 13px;

          font-weight: 600;

          color: #222222;

        }


        .profile-role {

          font-size: 11px;

          color: #999999;

          margin-top: 2px;

        }


        /* ==================================================
           TOP NAVIGATION
        ================================================== */

        .top-nav {

          position: fixed;

          top: 0;

          left: 0;

          right: 0;

          height: 72px;

          background: rgba(
            255,
            255,
            255,
            0.97
          );

          backdrop-filter: blur(12px);

          -webkit-backdrop-filter: blur(12px);

          border-bottom: 1px solid var(--border);

          z-index: 1000;

        }


        /* ==================================================
           NAV CONTENT
           
           250px EXPANDED
           72px COLLAPSED
        ================================================== */

        .top-nav-content {

          height: 72px;

          display: flex;

          align-items: center;

          justify-content: space-between;

          padding: 0 28px;

          transition:
            margin-left 0.25s ease;

        }


        .top-nav-content.nav-expanded {

          margin-left: 250px;

        }


        .top-nav-content.nav-collapsed {

          margin-left: 72px;

        }


        /* ==================================================
           TOP NAV LEFT
        ================================================== */

        .top-nav-left {

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

          color: #999999;

        }


        .breadcrumb-separator {

          color: #cccccc;

        }


        .breadcrumb-current {

          color: #222222;

          font-weight: 600;

        }


        /* ==================================================
           TOP NAV RIGHT
        ================================================== */

        .top-nav-right {

          display: flex;

          align-items: center;

          gap: 8px;

        }


        .top-nav-button {

          width: 38px;
          height: 38px;

          border: none;

          background: transparent;

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


        .top-nav-button:hover {

          background: #f3f3f3;

          color: var(--primary);

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

          background: var(--primary);

          border: 1px solid #ffffff;

        }


        .top-nav-divider {

          width: 1px;

          height: 30px;

          background: #e5e5e5;

          margin: 0 8px;

        }


        /* ==================================================
           TOP USER
        ================================================== */

        .top-user {

          border: none;

          background: transparent;

          display: flex;

          align-items: center;

          gap: 10px;

          padding: 4px 6px;

          border-radius: 9px;

          cursor: pointer;

          text-align: left;

        }


        .top-user:hover {

          background: #f6f6f6;

        }


        .top-user-avatar {

          width: 34px;
          height: 34px;

          border-radius: 50%;

          background: var(--primary);

          color: #ffffff;

          display: flex;

          align-items: center;

          justify-content: center;

          font-size: 12px;

          font-weight: 700;

        }


        .top-user-info {

          display: flex;

          flex-direction: column;

          gap: 2px;

        }


        .top-user-name {

          font-size: 13px;

          font-weight: 600;

          color: #222222;

        }


        .top-user-role {

          font-size: 11px;

          color: #999999;

        }


        /* ==================================================
           MOBILE MENU BUTTON
        ================================================== */

        .sidebar-mobile-button {

          display: none;

          position: fixed;

          top: 15px;

          left: 15px;

          width: 40px;

          height: 40px;

          border: 1px solid #e5e5e5;

          border-radius: 9px;

          background: #ffffff;

          align-items: center;

          justify-content: center;

          cursor: pointer;

          z-index: 3000;

          font-family:
            "DM Sans",
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;

        }


        /* ==================================================
           MOBILE
        ================================================== */

        @media (max-width: 768px) {

          .sidebar-mobile-button {

            display: flex;

          }


          .sidebar {

            transform: translateX(-100%);

          }


          .sidebar.expanded {

            width: 250px;

            transform: translateX(0);

          }


          .sidebar.collapsed {

            width: 250px;

            transform: translateX(-100%);

          }


          .top-nav-content.nav-expanded,
          .top-nav-content.nav-collapsed {

            margin-left: 0;

            padding-left: 70px;

          }


          .top-nav-left {

            display: none;

          }


          .top-user-info {

            display: none;

          }


          .top-nav-divider {

            display: none;

          }


          .sidebar.collapsed .sidebar-link {

            width: 100%;

            height: 44px;

            padding: 0 12px;

            margin: 0 0 12px 0;

            justify-content: flex-start;

            gap: 12px;

          }

        }


        /* ==================================================
           SMALL MOBILE
        ================================================== */

        @media (max-width: 480px) {

          .top-nav-content.nav-expanded,
          .top-nav-content.nav-collapsed {

            padding-left: 65px;

            padding-right: 12px;

          }


          .top-nav-right {

            gap: 2px;

          }


          .top-nav-button {

            width: 36px;

            height: 36px;

          }


          .top-user {

            padding: 3px;

          }

        }

      `}</style>
    </>
  );
}
