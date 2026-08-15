import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <BrowserRouter>
      <div className="app">

        <Sidebar
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />

        <main
          className={`main-content ${
            sidebarCollapsed
              ? "content-collapsed"
              : "content-expanded"
          }`}
        >
          <Routes>
            <Route
              path="/"
              element={<Dashboard />}
            />

            <Route
              path="/analytics"
              element={<Analytics />}
            />
          </Routes>
        </main>

      </div>

      <style>{`

        * {
          box-sizing: border-box;
        }

        html,
        body,
        #root {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100%;
        }

        body {
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;

          background: #f8f8f8;

          color: #171717;
        }

        .app {
          min-height: 100vh;
        }

        /* =========================================
           MAIN CONTENT
        ========================================== */

        .main-content {
          min-height: 100vh;

          padding-top: 104px;
          padding-right: 32px;
          padding-bottom: 32px;
          padding-left: 32px;

          transition:
            margin-left 0.25s ease;

          margin-left: 250px;
        }

        .main-content.content-expanded {
          margin-left: 250px;
        }

        .main-content.content-collapsed {
          margin-left: 72px;
        }

        /* =========================================
           MOBILE
        ========================================== */

        @media (max-width: 768px) {

          .main-content,
          .main-content.content-expanded,
          .main-content.content-collapsed {
            margin-left: 0;

            padding-top: 84px;
            padding-left: 20px;
            padding-right: 20px;
            padding-bottom: 20px;
          }

        }

      `}</style>
    </BrowserRouter>
  );
}

export default App;
