import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/* M-8: the public address of the site, used for the canonical link, the social-preview tags, robots.txt and sitemap.xml.
   Set SITE_URL (for example https://schedy.in) in the build environment: Vercel > Settings > Environment Variables,
   or .env.local for a local build. On Vercel, if SITE_URL is not set, the production domain that Vercel
   provides (VERCEL_PROJECT_PRODUCTION_URL) is used instead. Returns "" when neither is usable. */
function resolveSiteUrl(env: Record<string, string>): string {
  const raw = (env.SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : "")).trim();
  if (!raw) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    if (/(^|\.)example\.(com|org|net)$/i.test(u.hostname)) return ""; // the old placeholder is never a real address
    return u.origin; // scheme + host only, no path and no trailing slash, so it is safe inside an HTML attribute
  } catch {
    return "";
  }
}

/* Fills %SITE_URL% in index.html and writes robots.txt and sitemap.xml. Without a site URL the tags that need an
   absolute address are left out (a missing tag is better than a wrong one) and no sitemap is written. */
function siteUrl(site: string, production: boolean): Plugin {
  const robots = () => [
    "User-agent: *", "Allow: /", "Disallow: /login", "Disallow: /create", "Disallow: /dashboard", "Disallow: /invitations",
    ...(site ? [`Sitemap: ${site}/sitemap.xml`] : []), "",
  ].join("\n");
  const sitemap = () => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${site}/</loc>\n  </url>\n</urlset>\n`;
  return {
    name: "schedy-site-url",
    buildStart() {
      if (!site && production) this.warn("SITE_URL is not set: canonical, og:url, og:image, robots Sitemap line and sitemap.xml are left out. Set SITE_URL to your real domain.");
    },
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        if (site) return html.replaceAll("%SITE_URL%", site);
        return html.split("\n").filter((line) => !line.includes("%SITE_URL%")).join("\n");
      },
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "robots.txt", source: robots() });
      if (site) this.emitFile({ type: "asset", fileName: "sitemap.xml", source: sitemap() });
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url || "").split("?")[0];
        if (path === "/robots.txt") { res.setHeader("Content-Type", "text/plain"); res.end(robots()); }
        else if (path === "/sitemap.xml" && site) { res.setHeader("Content-Type", "application/xml"); res.end(sitemap()); }
        else next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...(process.env as Record<string, string>) };
  return {
    plugins: [react(), siteUrl(resolveSiteUrl(env), mode === "production")],
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
  };
});
