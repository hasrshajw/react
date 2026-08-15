import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Create from "./pages/Create";

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
            sidebarCollapsed ? "content-collapsed" : "content-expanded"
          }`}
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/create" element={<Create />} />
          </Routes>
        </main>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { margin: 0; padding: 0; width: 100%; min-height: 100%; }
        body {
          font-family: "DM Sans", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: #f8f8f8;
          color: #18181a;
        }
        button, input, select, textarea { font: inherit; }
        .app { min-height: 100vh; }
        .main-content {
          min-height: 100vh;
          padding: 102px 32px 32px;
          transition: margin-left .3s cubic-bezier(.4,0,.2,1);
        }
        .main-content.content-expanded { margin-left: 260px; }
        .main-content.content-collapsed { margin-left: 90px; }
        @media (max-width: 768px) {
          .main-content,
          .main-content.content-expanded,
          .main-content.content-collapsed {
            margin-left: 0;
            padding: 88px 20px 20px;
          }
        }
      `}</style>
    </BrowserRouter>
  );
}

export default App;
