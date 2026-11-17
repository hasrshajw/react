import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/layers.css"; /* first: declares the Astryx cascade-layer order */
import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";
import { Theme } from "@astryxdesign/core/theme";
import { themes, defaultThemeSlug } from "./astryx-themes";
import "./index.css";
import "./styles/skeleton.css";
import "./styles/motion.css";
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
    {/* The app is light-only today, so the theme mode is pinned to light. */}
    <Theme theme={themes[defaultThemeSlug]} mode="light">
      {SUPABASE_CONFIGURED ? <App /> : <SetupNeeded />}
    </Theme>
  </React.StrictMode>
);
