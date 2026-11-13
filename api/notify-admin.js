/**
 * POST /api/notify-admin
 *
 * Intended target for a Supabase Database Webhook on `public.change_requests` INSERT
 * (Track B, B3). Sends an email to ADMIN_EMAIL when a new pending change request appears.
 *
 * Security:
 *   - Optional shared secret: set WEBHOOK_SECRET (or NOTIFY_ADMIN_SECRET) in Vercel and
 *     the same value as the webhook "HTTP Header" / secret. If the secret is configured
 *     and the request does not match, the handler returns 401.
 *   - Never exposes service-role or mail keys to the browser.
 *   - Idempotent: the same request id is only emailed once per cold start (in-memory set).
 *     For stronger dedupe across instances, rely on the mail provider or a small table.
 *
 * Body: Supabase webhook payload (type, table, record, schema, ...) or a minimal
 *       { record: { id, invitation_id, client_email, status, changed_keys, ... } }.
 *
 * Env (Vercel server only, never VITE_):
 *   ADMIN_EMAIL                 required for actual delivery
 *   RESEND_API_KEY              optional; when present, email is sent via Resend
 *   WEBHOOK_SECRET              optional shared secret
 *   NOTIFY_ADMIN_SECRET         alias for WEBHOOK_SECRET
 *   SITE_URL                    used to build the review deep link
 *   FROM_EMAIL                  optional From address (defaults to onboarding@resend.dev style)
 *
 * Failure handling: if mail is not configured or the provider fails, the handler still
 * returns 200 after logging. In-app notifications (already written by the RPC) remain
 * the source of truth.
 */

import { resolveSiteUrl } from "./_siteUrl.js";

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

/** Simple process-local dedupe. Sufficient for a single warm instance; not a substitute for DB-level uniqueness. */
const seen = new Set();
const SEEN_MAX = 500;

function markSeen(id) {
  if (!id) return false;
  const key = String(id);
  if (seen.has(key)) return true;
  seen.add(key);
  if (seen.size > SEEN_MAX) {
    const first = seen.values().next().value;
    seen.delete(first);
  }
  return false;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function extractRecord(body) {
  if (!body || typeof body !== "object") return null;
  if (body.record && typeof body.record === "object") return body.record;
  if (body.new && typeof body.new === "object") return body.new;
  if (body.id || body.invitation_id) return body;
  return null;
}

export default async function handler(req, res, deps = {}) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "Method not allowed" });
  }

  const env = deps.env ?? process.env;
  const fetchFn = deps.fetch ?? globalThis.fetch;
  const secret = env.WEBHOOK_SECRET || env.NOTIFY_ADMIN_SECRET || "";
  const adminEmail = normalizeEmail(env.ADMIN_EMAIL);
  const resendKey = env.RESEND_API_KEY || "";
  const fromEmail = (env.FROM_EMAIL || "onboarding@resend.dev").trim();
  const site = resolveSiteUrl(env);

  /* Optional shared secret. Supabase webhooks can send it as a header. */
  if (secret) {
    const hdr =
      (typeof req.headers?.["x-webhook-secret"] === "string" && req.headers["x-webhook-secret"]) ||
      (typeof req.headers?.authorization === "string" && req.headers.authorization.replace(/^Bearer\s+/i, "")) ||
      (typeof req.headers?.["x-supabase-event-signature"] === "string" && req.headers["x-supabase-event-signature"]) ||
      "";
    if (hdr !== secret) {
      return send(res, 401, { error: "Unauthorized" });
    }
  }

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  } catch {
    return send(res, 400, { error: "Invalid JSON body" });
  }

  const record = extractRecord(body);
  if (!record) {
    return send(res, 400, { error: "Missing change_request record" });
  }

  const status = String(record.status || "").toLowerCase();
  /* Only notify on new pending requests. Status-change emails belong to notify-client. */
  if (status && status !== "pending") {
    return send(res, 200, { ok: true, skipped: "not_pending" });
  }

  const requestId = record.id || record.request_id || null;
  if (markSeen(requestId)) {
    return send(res, 200, { ok: true, skipped: "already_seen", requestId });
  }

  const clientEmail = normalizeEmail(record.client_email || record.email || "");
  const invitationId = record.invitation_id || record.invitationId || null;
  const changedKeys = Array.isArray(record.changed_keys)
    ? record.changed_keys
    : Array.isArray(record.changedKeys)
      ? record.changedKeys
      : [];

  const reviewPath = invitationId ? `/reviews?request=${encodeURIComponent(String(requestId || ""))}&invitation=${encodeURIComponent(String(invitationId))}` : "/reviews";
  const reviewUrl = site ? `${site}${reviewPath}` : reviewPath;

  const subject = `New change request${clientEmail ? ` from ${clientEmail}` : ""}`;
  const lines = [
    "A client submitted a change request that needs review.",
    "",
    clientEmail ? `Client: ${clientEmail}` : null,
    invitationId ? `Invitation: ${invitationId}` : null,
    requestId ? `Request id: ${requestId}` : null,
    changedKeys.length ? `Changed fields: ${changedKeys.join(", ")}` : null,
    "",
    `Review: ${reviewUrl}`,
  ].filter(Boolean);

  const textBody = lines.join("\n");

  /* No mail provider configured → succeed silently (in-app notification already exists). */
  if (!adminEmail || !resendKey) {
    return send(res, 200, {
      ok: true,
      emailed: false,
      reason: !adminEmail ? "ADMIN_EMAIL not set" : "RESEND_API_KEY not set",
      requestId,
    });
  }

  try {
    const mailRes = await fetchFn("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [adminEmail],
        subject,
        text: textBody,
      }),
    });

    if (!mailRes.ok) {
      const errText = await mailRes.text().catch(() => "");
      /* Soft failure: still 200 so the webhook does not retry forever. */
      return send(res, 200, {
        ok: true,
        emailed: false,
        providerStatus: mailRes.status,
        detail: errText.slice(0, 200),
        requestId,
      });
    }

    return send(res, 200, {
      ok: true,
      emailed: true,
      requestId,
      to: adminEmail,
    });
  } catch (e) {
    return send(res, 200, {
      ok: true,
      emailed: false,
      error: "mail_transport_failed",
      requestId,
    });
  }
}
