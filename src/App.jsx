import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        {/* Common Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<Users />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
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

        .main-content {
          min-height: 100vh;
          margin-left: 250px;
          padding: 32px;
          transition: margin-left 0.25s ease;
        }

        /*
         * The sidebar can collapse to 72px.
         *
         * Because Sidebar manages its own state, the easiest
         * initial approach is to keep the content at 250px.
         *
         * We can later make the main content automatically
         * follow the sidebar's collapsed/expanded state.
         */

        @media (max-width: 768px) {
          .main-content {
            margin-left: 0;
            padding: 20px;
            padding-top: 72px;
          }
        }
      `}</style>
    </BrowserRouter>
  );
}

export default App;
