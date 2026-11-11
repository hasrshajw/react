import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        /* Name the SDK chunk so it is easy to spot in the network tab. It is only requested by /login and the
           admin app, never by the landing page or public invitations. */
        manualChunks(id) {
          if (id.includes("node_modules/@supabase") || id.includes("node_modules/iceberg-js")) return "supabase";
        },
      },
    },
  },
});
