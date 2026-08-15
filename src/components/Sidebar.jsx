import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Search,
  Bell,
  ChevronRight,
} from "lucide-react";

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

function MenuIcon({
  type,
  active = false,
}) {
  const iconSet = icons[type];

  return (
    <span className="menu-icon">

      <img
        src={iconSet.normal}
        alt=""
        className={
          active
            ? "icon-hidden"
            : "icon-visible"
        }
      />

      <img
        src={iconSet.hover}
        alt=""
        className="icon-hover"
      />

      <img
        src={iconSet.active}
        alt=""
        className={
          active
            ? "icon-visible"
            : "icon-hidden"
        }
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


  /*
   * IMPORTANT:
   *
   * We intentionally DO NOT expand the sidebar
   * when the mouse enters.
   *
   * Collapsed = always collapsed.
   */

  const isExpanded = !collapsed;


  /* =======================================================
     TOGGLE SIDEBAR
  ======================================================= */

  const handleToggle = () => {

    setCollapsed(!collapsed);

  };


  /* =======================================================
     CUSTOMIZE SITE
  ======================================================= */

  const handleCustomizeClick = () => {

    if (collapsed) {

      /*
       * When collapsed, clicking Customize Site
       * expands the sidebar and opens the submenu.
       */

      setCollapsed(false);

      setSiteOpen(true);

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
              LEFT
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
              RIGHT
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
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="d-sidebar-header">

          {/* FULL LOGO */}

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


          {/* SMALL LOGO */}

          {!isExpanded && (

            <span className="mini-logo">

              <img
                src={logoSmall}
                alt="Logo"
              />

            </span>

          )}


          {/* TOGGLE */}

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

              onClick={
                handleCustomizeClick
              }
            >

              <MenuIcon
                type="site"
                active={siteOpen}
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

          --brand-primary: #643DE4;

          --active-bg: #F5F0FA;

          --hover-bg: #f3f4f6;

          --border: #e5e7eb;

        }


        /* =================================================
           FONT
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
            1px solid
            var(--border);

          z-index: 1500;

        }


        /* =================================================
           NAVBAR POSITION

           Expanded  = 260px
           Collapsed = 90px

           IMPORTANT:
           Uses actual collapsed state,
           NOT mouse hover.
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


        .navbar-expanded {

          margin-left:
            var(--sidebar-width);

        }


        .navbar-collapsed {

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
            #ffffff;

          border-right:
            1px solid
            var(--border);

          display: flex;

          flex-direction: column;

          position: fixed;

          top: 0;
          left: 0;

          z-index: 2000;

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


        .d-sidebar.collapsed {

          width:
            var(--sidebar-collapsed-width);

        }


        /* =================================================
           HEADER
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
           TOGGLE
        ================================================= */

        .sidebar-toggle {

          background:
            transparent;

          border: none;

          cursor: pointer;

          display: flex;

          align-items: center;

          justify-content: center;

          padding: 6px;

          border-radius: 8px;

        }


        .sidebar-toggle:hover {

          background:
            var(--hover-bg);

        }


        .sidebar-toggle img {

          display: block;

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
            #000000;

          text-decoration: none;

          transition:
            background 0.2s ease,
            color 0.2s ease;

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


        .nav-item.active
        .menu-icon .icon-active {

          opacity: 1;

        }


        .nav-item.active
        .menu-icon .icon-normal {

          opacity: 0;

        }


        /* =================================================
           CHEVRON
        ================================================= */

        .nav-chevron {

          margin-left: auto;

          transition:
            transform 0.25s ease;

        }


        .dropdown-open
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

          color:
            #000000;

          font-size: 15px;

          font-weight: 500;

          text-decoration: none;

          white-space: nowrap;

          transition:
            background 0.15s ease,
            color 0.15s ease;

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

           IMPORTANT:
           Sidebar stays collapsed on hover.
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

           Hovering DOES NOT expand sidebar.
           It only shows the label.
        ================================================= */

        .d-sidebar.collapsed
        .nav-item:hover
        .nav-label {

          display: block;

          position: absolute;

          left:
            calc(100% + 12px);

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


        /* Tooltip arrow */

        .d-sidebar.collapsed
        .nav-item:hover
        .nav-label::before {

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

          min-width: 44px;

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

        }


        .account-email {

          font-size: 13px;

          color: #6b7280;

          white-space: nowrap;

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


          .navbar-user {

            padding: 3px;

          }

        }

      `}</style>

    </>
  );
}
