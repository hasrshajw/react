import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";

const menuItems = [
  {
    name: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Users",
    path: "/users",
    icon: Users,
  },
  {
    name: "Analytics",
    path: "/analytics",
    icon: BarChart3,
  },
  {
    name: "Reports",
    path: "/reports",
    icon: FileText,
  },
  {
    name: "Settings",
    path: "/settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState(false);

  const isExpanded = !collapsed || hovered;

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="sidebar-mobile-button"
        onClick={() => setCollapsed(false)}
        aria-label="Open sidebar"
      >
        <Menu size={22} />
      </button>

      <aside
        className={`sidebar ${isExpanded ? "expanded" : "collapsed"}`}
        onMouseEnter={() => collapsed && setHovered(true)}
        onMouseLeave={() => collapsed && setHovered(false)}
      >
        {/* Header / Logo */}
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-logo">S</div>

            {isExpanded && (
              <span className="brand-name">
                Dashboard
              </span>
            )}
          </div>

          {/* Collapse button */}
          <button
            className="collapse-button"
            onClick={() => {
              setCollapsed(!collapsed);
              setHovered(false);
            }}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-navigation">
          <div className="navigation-section">
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
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? "active" : ""}`
                  }
                >
                  <Icon
                    className="sidebar-icon"
                    size={20}
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
          </div>
        </nav>

        {/* Bottom section */}
        <div className="sidebar-bottom">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <Settings
              className="sidebar-icon"
              size={20}
              strokeWidth={2}
            />

            {isExpanded && (
              <span className="sidebar-link-text">
                Settings
              </span>
            )}

            {!isExpanded && (
              <span className="sidebar-tooltip">
                Settings
              </span>
            )}
          </NavLink>

          {/* User profile */}
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

      {/* Sidebar CSS */}
      <style>{`
        * {
          box-sizing: border-box;
        }

        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          background: #ffffff;
          border-right: 1px solid #e8e8e8;
          display: flex;
          flex-direction: column;
          z-index: 1000;
          transition:
            width 0.25s ease,
            box-shadow 0.25s ease;
          overflow: visible;
        }

        .sidebar.expanded {
          width: 250px;
        }

        .sidebar.collapsed {
          width: 72px;
        }

        /* Header */

        .sidebar-header {
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 14px;
          border-bottom: 1px solid #eeeeee;
        }

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
          background: #111111;
          color: white;
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

        /* Collapse */

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
          transition: background 0.15s ease, color 0.15s ease;
        }

        .collapse-button:hover {
          background: #f2f2f2;
          color: #111111;
        }

        /* Navigation */

        .sidebar-navigation {
          flex: 1;
          padding: 20px 10px;
          overflow-y: auto;
        }

        .navigation-title {
          font-size: 10px;
          font-weight: 700;
          color: #999999;
          letter-spacing: 0.08em;
          padding: 0 12px;
          margin-bottom: 8px;
        }

        .sidebar-link {
          position: relative;
          height: 44px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 12px;
          margin: 3px 0;
          border-radius: 9px;
          color: #686868;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
          transition:
            background 0.15s ease,
            color 0.15s ease;
        }

        .sidebar-link:hover {
          background: #f5f5f5;
          color: #111111;
        }

        .sidebar-link.active {
          background: #111111;
          color: #ffffff;
        }

        .sidebar-link.active:hover {
          background: #111111;
          color: #ffffff;
        }

        .sidebar-icon {
          flex-shrink: 0;
        }

        .sidebar-link-text {
          overflow: hidden;
        }

        /* Tooltip */

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
          transition: opacity 0.15s ease;
          z-index: 2000;
        }

        .sidebar-link:hover .sidebar-tooltip {
          opacity: 1;
          visibility: visible;
        }

        /* Bottom */

        .sidebar-bottom {
          padding: 10px;
          border-top: 1px solid #eeeeee;
        }

        /* Profile */

        .sidebar-profile {
          margin-top: 8px;
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

        /* Mobile */

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
          z-index: 1100;
        }

        @media (max-width: 768px) {
          .sidebar-mobile-button {
            display: flex;
          }

          .sidebar {
            transform: translateX(-100%);
            transition:
              transform 0.25s ease,
              width 0.25s ease;
          }

          .sidebar.expanded {
            width: 250px;
            transform: translateX(0);
          }

          .sidebar.collapsed {
            width: 250px;
            transform: translateX(-100%);
          }

          .collapse-button {
            display: flex;
          }
        }
      `}</style>
    </>
  );
}
