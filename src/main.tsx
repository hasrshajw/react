import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./styles/skeleton.css";
import App from "./App";
import { SUPABASE_CONFIGURED } from "./lib/config";

/* The app only runs against Supabase. Without the environment variables there is nothing to show but how to fix it. */
function SetupNeeded() {
  return (
    <div style={{ maxWidth: 520, margin: "12vh auto", padding: 24, fontFamily: "system-ui, sans-serif", lineHeight: 1.5 }}>
      <h1 style={{ fontSize: 22 }}>Supabase is not configured</h1>
      <p>Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in <code>.env.local</code> (or in the Vercel project settings), then restart or redeploy.</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {SUPABASE_CONFIGURED ? <App /> : <SetupNeeded />}
  </React.StrictMode>
);
