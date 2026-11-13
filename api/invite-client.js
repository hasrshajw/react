/**
 * POST /api/invite-client
 *
 * Admin-only: send a Supabase invite email to the client address on an invitation (Track B, B3 / D4).
 * The browser never sees the service-role key. The caller's access token is checked with `is_admin()`.
 *
 * Body JSON: { email: string, invitationId?: string, redirectTo?: string }
 * Auth: Authorization: Bearer <user access token>  (the signed-in admin)
 *
 * Env (Vercel server only, never VITE_):
 *   SUPABASE_SERVICE_ROLE_KEY
 *   VITE_SUPABASE_URL          (or SUPABASE_URL)
 *   VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY  (to call is_admin as the user)
 *   SITE_URL                   optional; used as invite redirect base
 */

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function serviceHeaders(key) {
  const h = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  /* New sb_secret_ keys are not JWTs; still send Authorization for admin Auth API compatibility. */
  if (String(key).startsWith("eyJ")) h.Authorization = `Bearer ${key}`;
  return h;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export default async function handler(req, res, deps = {}) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "Method not allowed" });
  }

  const env = deps.env ?? process.env;
  const fetchFn = deps.fetch ?? globalThis.fetch;
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const publishable = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const site = (env.SITE_URL || "").replace(/\/$/, "");

  if (!url || !publishable || !serviceKey) {
    return send(res, 503, { error: "Invite is not configured" });
  }

  const auth = typeof req.headers?.authorization === "string" ? req.headers.authorization : "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return send(res, 401, { error: "Sign in as an administrator to send invites" });

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  } catch {
    return send(res, 400, { error: "Invalid JSON body" });
  }

  const email = normalizeEmail(body.email);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return send(res, 400, { error: "A valid email address is required" });
  }

  /* 1) Confirm the caller is an admin using their own JWT (RLS / is_admin). */
  try {
    const adminRes = await fetchFn(`${url}/rest/v1/rpc/is_admin`, {
      method: "POST",
      headers: {
        apikey: publishable,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: "{}",
    });
    const adminJson = await adminRes.json().catch(() => null);
    if (!adminRes.ok || adminJson !== true) {
      return send(res, 403, { error: "Only an administrator can send client invites" });
    }
  } catch {
    return send(res, 502, { error: "Could not verify administrator access" });
  }

  const redirectTo = typeof body.redirectTo === "string" && body.redirectTo.startsWith("http")
    ? body.redirectTo
    : (site ? `${site}/my` : undefined);

  /* 2) Invite via Auth Admin API (service role stays on the server). */
  try {
    const inviteBody = { email };
    if (redirectTo) inviteBody.redirect_to = redirectTo;

    const invRes = await fetchFn(`${url}/auth/v1/invite`, {
      method: "POST",
      headers: serviceHeaders(serviceKey),
      body: JSON.stringify(inviteBody),
    });
    const invJson = await invRes.json().catch(() => ({}));

    if (!invRes.ok) {
      const msg = invJson?.msg || invJson?.error_description || invJson?.message || "Invite failed";
      /* Already registered is not a hard failure for our flow — they can sign in. */
      if (/already|registered|exists/i.test(String(msg))) {
        return send(res, 200, { ok: true, alreadyRegistered: true, email });
      }
      return send(res, invRes.status === 429 ? 429 : 502, { error: String(msg) });
    }

    return send(res, 200, {
      ok: true,
      email,
      invitationId: body.invitationId || null,
      userId: invJson?.id || invJson?.user?.id || null,
    });
  } catch {
    return send(res, 502, { error: "Could not reach the auth service" });
  }
}
