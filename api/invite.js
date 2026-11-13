/**
 * Vercel serverless function: returns a tiny HTML page with per-invitation link-preview tags, so
 * WhatsApp, Instagram, Facebook, Telegram etc. crawlers (which do not run JavaScript) see the right
 * title, description and image.
 *
 * Only link-preview crawlers are routed here (rewrites with a user-agent "has" rule in vercel.json).
 * Real visitors are NEVER sent to this function: they get the normal SPA (/index.html), exactly as before.
 * The function does not fetch or read index.html, so Vercel Deployment Protection cannot leak its login page into the app.
 *
 *   /i/<slug>  and  /<slug>  (crawlers only)  ->  /api/invite?slug=<slug>
 *
 * Env vars (Vercel > Settings > Environment Variables, same ones the app already uses):
 *   VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY  (or VITE_SUPABASE_ANON_KEY)
 *   SITE_URL  (your real domain, for example https://your-domain.com). Also used by the build (vite.config.ts).
 *             On Vercel, if it is missing, the production domain (VERCEL_PROJECT_PRODUCTION_URL) is used.
 *             The Host / X-Forwarded-Host headers are never trusted. With no usable address, the tags that
 *             need an absolute URL (canonical, og:url and the fallback og:image) are left out.
 * No service-role key is needed: get_invitation_meta() is granted to the anon role and does not count views.
 */

import { resolveSiteUrl } from "./_siteUrl.js";

/* Keep in sync with src/lib/reserved.ts, the vercel.json rewrite and the invitations_slug_reserved constraint. */
const RESERVED = [
  "login", "invitations", "templates", "create", "inventory", "billing", "customize",
  "dashboard", "api", "assets", "i", "admin", "privacy", "terms", "pricing", "about", "contact",
  "favicon", "robots", "sitemap", "my", "reviews",
];

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/* Same rule as the database (invitations_slug_format) and validate.ts: 3 to 30 letters, numbers, - or _, or the
   invitation's own uuid id, which is used as the link when no custom link was chosen. The lookup is lower-cased first. */
const SLUG_RE = /^[a-z0-9_-]{3,30}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const isValidSlug = (s) => SLUG_RE.test(s) || UUID_RE.test(s);
const TIMEOUT_MS = 4000;

const esc = (v) =>
  String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const clean = (v) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");

/** "2026-11-10" -> "10 November 2026" (same wording as prettyDate in SeoSection.tsx, without needing ICU). */
function prettyDate(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(clean(v));
  if (!m) return "";
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month} ${m[1]}` : "";
}

/** Same wording as seoFallbacks() in src/features/create/components/SeoSection.tsx. */
function fallbacks(meta) {
  const groom = clean(meta.groom_name) || "Groom";
  const bride = clean(meta.bride_name) || "Bride";
  const head = [prettyDate(meta.event_date), clean(meta.venue)].filter(Boolean).join(", ");
  return {
    title: `${groom} & ${bride} Wedding Invitation`,
    description: `${head ? `${head}. ` : ""}Tap to view the invitation.`,
  };
}

/* The site address comes from configuration, never from request headers (M-9). "" when not configured. */
const originOf = () => resolveSiteUrl(process.env);

/* M-4: same shape as isOwnPreviewImage() in src/lib/previewUrl.ts and the database rule: https, the preview bucket, <user>/<file>.jpg, optional ?v=digits.
   The host is not compared here (the function already trusts the database it reads from); the bucket path is what keeps other sites out. */
const PREVIEW_URL = /^https:\/\/[^/?#\s@]+\/storage\/v1\/object\/public\/invitation-previews\/[^/?#\s]+\/[^/?#\s]+\.jpg(\?v=\d+)?$/;

async function fetchWithTimeout(url, init) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function loadMeta(slug) {
  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const key =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
  if (!url || !key) return { meta: null, why: "env-missing" };
  const headers = { apikey: key, "Content-Type": "application/json" };
  /* New "sb_publishable_..." keys are not JWTs and go in apikey only; legacy anon keys are JWTs. */
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  const r = await fetchWithTimeout(`${url}/rest/v1/rpc/get_invitation_meta`, {
    method: "POST",
    headers,
    body: JSON.stringify({ p_slug: slug }),
  });
  if (!r.ok) return { meta: null, why: `rpc-http-${r.status}` };
  const data = await r.json();
  return data && typeof data === "object" ? { meta: data, why: "found" } : { meta: null, why: "not-found-or-unpublished" };
}

function buildTags(meta, slug, origin) {
  const fb = fallbacks(meta);
  const title = clean(meta.seo_title) || fb.title;
  const description = clean(meta.seo_description) || fb.description;
  const own = clean(meta.seo_image);
  /* Only a file from the app\u2019s own preview bucket is used (M-4). Anything else (an old base64 value, a link to another site) falls back to the site image. */
  /* Without a configured site address there is no safe fallback image, so the image tags are left out. */
  const image = PREVIEW_URL.test(own) ? own : origin ? `${origin}/og-main.jpg` : "";
  const pageUrl = origin ? `${origin}/${slug}` : "";
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<meta name="robots" content="noindex" />`,
    pageUrl && `<link rel="canonical" href="${esc(pageUrl)}" />`,
    `<meta property="og:type" content="website" />`,
    pageUrl && `<meta property="og:url" content="${esc(pageUrl)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    image && `<meta property="og:image" content="${esc(image)}" />`,
    image && `<meta property="og:image:width" content="1200" />`,
    image && `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    image && `<meta name="twitter:image" content="${esc(image)}" />`,
  ].filter(Boolean).join("\n    ");
}

/** Minimal HTML document for crawlers. Humans never get this page (see vercel.json).
 *  The "Open the invitation" link is written only for a valid slug (pass "" for none). */
function page(tags, slug) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${tags || "<title>Wedding Invitation</title>"}
  </head>
  <body>
    ${slug ? `<p><a href="/${esc(slug)}">Open the invitation</a></p>` : ""}
  </body>
</html>`;
}

function send(res, status, body, cache, why) {
  res.statusCode = status;
  /* Debug aid: check with  curl -I https://your-domain/<slug>  (header x-invite-status). */
  res.setHeader("X-Invite-Status", why);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", cache);
  res.end(body);
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET, HEAD");
    res.end();
    return;
  }

  const origin = originOf();
  const raw = Array.isArray(req.query?.slug) ? req.query.slug[0] : req.query?.slug;
  const slug = clean(raw).toLowerCase();

  /* Not a possible invitation link: plain page, no preview tags. */
  if (!isValidSlug(slug) || RESERVED.includes(slug)) {
    send(res, 200, page("", ""), "no-cache", "reserved-or-invalid-slug");
    return;
  }

  /* Look the invitation up. Any failure falls back to a plain page, so crawlers still get a 200. */
  let meta = null;
  let why = "rpc-error";
  try {
    ({ meta, why } = await loadMeta(slug));
  } catch {
    meta = null;
    why = "rpc-timeout-or-network";
  }
  if (!meta) {
    send(res, 200, page("", slug), "public, s-maxage=60, stale-while-revalidate=300", why);
    return;
  }

  send(res, 200, page(buildTags(meta, slug, origin), slug), "public, s-maxage=300, stale-while-revalidate=3600", "found");
}
