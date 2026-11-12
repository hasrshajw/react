/**
 * The public address of the site (scheme + host, no path, no trailing slash), or "" when none is usable.
 * Shared by vite.config.ts (build time: canonical, og tags, robots.txt, sitemap.xml) and api/invite.js (runtime:
 * link-preview tags). The leading underscore keeps Vercel from turning this file into a function of its own.
 *
 * Order: SITE_URL, then (on Vercel) VERCEL_PROJECT_PRODUCTION_URL, the production domain Vercel exposes.
 * The request's Host header is never used: anyone can send any Host value.
 * Reduced to `new URL(...).origin`, so a path, query or quote cannot reach an HTML attribute.
 * `javascript:` values and the old example.com placeholder are rejected.
 */
export function resolveSiteUrl(env) {
  const raw = String(env.SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : "")).trim();
  if (!raw) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    if (/(^|\.)example\.(com|org|net)$/i.test(u.hostname)) return "";
    return u.origin;
  } catch {
    return "";
  }
}
