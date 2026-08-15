import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Sidebar />

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
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
        }

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
