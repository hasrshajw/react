/**
 * POST /api/notify-client
 *
 * Intended target for a Supabase Database Webhook on `public.change_requests` UPDATE
 * (Track B, B3). Emails the client when a request is approved or rejected.
 *
 * Security:
 *   - Optional shared secret: set WEBHOOK_SECRET (or NOTIFY_CLIENT_SECRET) in Vercel and
 *     the same value as the webhook "HTTP Header" / secret. If the secret is configured
 *     and the request does not match, the handler returns 401.
 *   - Never exposes service-role or mail keys to the browser.
 *   - Idempotent: the same request id + status is only emailed once per cold start
 *     (in-memory set). For stronger dedupe across instances, rely on the mail provider.
 *
 * Body: Supabase webhook payload (type, table, record, old_record, ...) or a minimal
 *       { record: { id, invitation_id, client_email, status, admin_note, ... } }.
 *
 * Env (Vercel server only, never VITE_):
 *   RESEND_API_KEY              optional; when present, email is sent via Resend
 *   WEBHOOK_SECRET              optional shared secret
 *   NOTIFY_CLIENT_SECRET        alias for WEBHOOK_SECRET
 *   SITE_URL                    used to build the client deep link
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

function markSeen(key) {
  if (!key) return false;
  const k = String(key);
  if (seen.has(k)) return true;
  seen.add(k);
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

function extractOldRecord(body) {
  if (!body || typeof body !== "object") return null;
  if (body.old_record && typeof body.old_record === "object") return body.old_record;
  if (body.old && typeof body.old === "object") return body.old;
  return null;
}

export default async function handler(req, res, deps = {}) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "Method not allowed" });
  }

  const env = deps.env ?? process.env;
  const fetchFn = deps.fetch ?? globalThis.fetch;
  const secret = env.WEBHOOK_SECRET || env.NOTIFY_CLIENT_SECRET || "";
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
  /* Only notify the client on a decision. New pending requests are handled by notify-admin. */
  if (status !== "approved" && status !== "rejected") {
    return send(res, 200, { ok: true, skipped: "not_decision" });
  }

  const old = extractOldRecord(body);
  if (old) {
    const oldStatus = String(old.status || "").toLowerCase();
    if (oldStatus === status) {
      return send(res, 200, { ok: true, skipped: "status_unchanged" });
    }
    /* Prefer transitions from pending; still allow if old status is missing. */
    if (oldStatus && oldStatus !== "pending") {
      return send(res, 200, { ok: true, skipped: "not_from_pending" });
    }
  }

  const requestId = record.id || record.request_id || null;
  const dedupeKey = requestId ? `${requestId}:${status}` : null;
  if (markSeen(dedupeKey)) {
    return send(res, 200, { ok: true, skipped: "already_seen", requestId, status });
  }

  const clientEmail = normalizeEmail(record.client_email || record.email || "");
  if (!clientEmail) {
    return send(res, 200, { ok: true, emailed: false, reason: "no_client_email", requestId, status });
  }

  const invitationId = record.invitation_id || record.invitationId || null;
  const adminNote = String(record.admin_note || record.adminNote || record.note || "").trim();
  const myPath = invitationId ? `/my/${encodeURIComponent(String(invitationId))}` : "/my";
  const myUrl = site ? `${site}${myPath}` : myPath;

  const isApproved = status === "approved";
  const subject = isApproved
    ? "Your invitation changes were approved"
    : "Your invitation changes were not approved";

  const lines = [
    isApproved
      ? "An administrator approved the changes you submitted for review."
      : "An administrator did not approve the changes you submitted for review.",
    "",
    invitationId ? `Invitation: ${invitationId}` : null,
    requestId ? `Request id: ${requestId}` : null,
    adminNote ? `Note from the administrator:\n${adminNote}` : null,
    "",
    `Open your invitation: ${myUrl}`,
    "",
    "If you did not expect this message, you can ignore it.",
  ].filter((line) => line !== null);

  const textBody = lines.join("\n");

  /* No mail provider configured → succeed silently (in-app notification already exists). */
  if (!resendKey) {
    return send(res, 200, {
      ok: true,
      emailed: false,
      reason: "RESEND_API_KEY not set",
      requestId,
      status,
      to: clientEmail,
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
        to: [clientEmail],
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
        status,
      });
    }

    return send(res, 200, {
      ok: true,
      emailed: true,
      requestId,
      status,
      to: clientEmail,
    });
  } catch (e) {
    return send(res, 200, {
      ok: true,
      emailed: false,
      error: "mail_transport_failed",
      requestId,
      status,
    });
  }
}
