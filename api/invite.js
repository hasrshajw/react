/**
 * Vercel serverless function: serves the normal React shell (index.html) with per-invitation
 * link-preview tags, so WhatsApp, Instagram and Facebook crawlers (which do not run JavaScript)
 * see the right title, description and image. Real visitors get the same HTML and the React app boots as usual.
 *
 * Reached through the rewrites in vercel.json:
 *   /i/<slug>  and  /<slug>  ->  /api/invite?slug=<slug>
 *
 * Env vars (Vercel > Settings > Environment Variables, same ones the app already uses):
 *   VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY  (or VITE_SUPABASE_ANON_KEY)
 * No service-role key is needed: get_invitation_meta() is granted to the anon role and does not count views.
 */

/* Keep in sync with src/lib/reserved.ts, the vercel.json rewrite and the invitations_slug_reserved constraint. */
const RESERVED = [
  "login", "invitations", "templates", "create", "inventory", "billing", "customize",
  "dashboard", "api", "assets", "i", "admin", "privacy", "terms", "pricing", "about", "contact",
  "favicon", "robots", "sitemap",
];

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SLUG_RE = /^[a-z0-9_-]{1,64}$/;
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

function originOf(req) {
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  return `${local ? "http" : "https"}://${host}`;
}

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
  if (!url || !key) return null;
  const headers = { apikey: key, "Content-Type": "application/json" };
  /* New "sb_publishable_..." keys are not JWTs and go in apikey only; legacy anon keys are JWTs. */
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  const r = await fetchWithTimeout(`${url}/rest/v1/rpc/get_invitation_meta`, {
    method: "POST",
    headers,
    body: JSON.stringify({ p_slug: slug }),
  });
  if (!r.ok) return null;
  const data = await r.json();
  return data && typeof data === "object" ? data : null;
}

function buildTags(meta, slug, origin) {
  const fb = fallbacks(meta);
  const title = clean(meta.seo_title) || fb.title;
  const description = clean(meta.seo_description) || fb.description;
  const own = clean(meta.seo_image);
  /* Crawlers need a public https URL. Anything else (for example an old base64 value) falls back to the site image. */
  const image = /^https:\/\/\S+$/.test(own) ? own : `${origin}/og-main.jpg`;
  const pageUrl = `${origin}/${slug}`;
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<meta name="robots" content="noindex" />`,
    `<link rel="canonical" href="${esc(pageUrl)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${esc(pageUrl)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
  ].join("\n    ");
}

/** Drops the shell's own title, description, canonical, robots, og:* and twitter:* tags, then adds ours before </head>. */
function inject(shell, tags) {
  const stripped = shell
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
    .replace(/<meta\b[^>]*\b(?:name|property)\s*=\s*["'](?:description|robots|og:[^"']*|twitter:[^"']*)["'][^>]*>/gi, "")
    .replace(/<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>/gi, "");
  return /<\/head>/i.test(stripped) ? stripped.replace(/<\/head>/i, `    ${tags}\n  </head>`) : stripped;
}

function send(res, status, body, cache) {
  res.statusCode = status;
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

  const origin = originOf(req);
  const raw = Array.isArray(req.query?.slug) ? req.query.slug[0] : req.query?.slug;
  const slug = clean(raw).toLowerCase();

  /* 1. The built SPA shell. Static files are not rewritten, so this does not loop back into this function. */
  let shell;
  try {
    const r = await fetchWithTimeout(`${origin}/index.html`, { headers: { Accept: "text/html" } });
    if (!r.ok) throw new Error(`index.html ${r.status}`);
    shell = await r.text();
  } catch {
    send(res, 502, "<!doctype html><title>Temporarily unavailable</title><p>Please refresh in a moment.</p>", "no-store");
    return;
  }

  /* 2. Not a possible invitation link: send the shell untouched (React decides what to show). */
  if (!SLUG_RE.test(slug) || RESERVED.includes(slug)) {
    send(res, 200, shell, "no-cache");
    return;
  }

  /* 3. Look the invitation up. Any failure falls back to the plain shell, so the page still loads. */
  let meta = null;
  try {
    meta = await loadMeta(slug);
  } catch {
    meta = null;
  }
  if (!meta) {
    send(res, 200, shell, "public, s-maxage=60, stale-while-revalidate=300");
    return;
  }

  send(res, 200, inject(shell, buildTags(meta, slug, origin)), "public, s-maxage=300, stale-while-revalidate=3600");
}
