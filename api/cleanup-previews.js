/**
 * Vercel serverless function (task M-4, last part): removes preview pictures that no invitation uses any more.
 * The rules live in api/_orphans.js.
 *
 *   GET /api/cleanup-previews            -> dry run: lists what WOULD be deleted, deletes nothing
 *   GET /api/cleanup-previews?delete=1   -> deletes (at most 200 files per call)
 *
 * Needs the Authorization header `Bearer <CRON_SECRET>` (Vercel Cron sends it automatically when CRON_SECRET is set).
 * Env vars (Vercel > Settings > Environment Variables; server only, none of them starts with VITE_):
 *   CRON_SECRET                a long random string
 *   SUPABASE_SERVICE_ROLE_KEY  Supabase > Project Settings > API (secret key). NEVER put it in a VITE_ variable or in the repo.
 *   VITE_SUPABASE_URL          already set for the app
 * With any of them missing the function answers 503 and does nothing. No schedule is set in vercel.json on purpose
 * (see README, "Preview images"): run it by hand first, read the dry-run list, then add a cron entry if you want one.
 */

import { createHash, timingSafeEqual } from "node:crypto";
import { cleanup } from "./_orphans.js";

const digest = (s) => createHash("sha256").update(String(s)).digest();

/** Constant-time comparison of the Authorization header with `Bearer <secret>`. */
export function isAuthorized(header, secret) {
  if (!secret || typeof header !== "string") return false;
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

export default async function handler(req, res, deps = {}) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return send(res, 405, { error: "Method not allowed" });
  }
  const env = deps.env ?? process.env;
  const url = String(env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env.CRON_SECRET || !key || !/^https:\/\//.test(url)) return send(res, 503, { error: "Cleanup is not configured" });
  if (!isAuthorized(req.headers?.authorization, env.CRON_SECRET)) return send(res, 401, { error: "Unauthorized" });

  let doDelete = false;
  try { doDelete = new URL(req.url || "/", "http://x").searchParams.get("delete") === "1"; } catch { /* dry run */ }
  try {
    const summary = await (deps.cleanup ?? cleanup)({ url, key, dryRun: !doDelete });
    return send(res, 200, summary);
  } catch (e) {
    /* The message names what failed (for example "Reading invitations failed (HTTP 401)"); it never contains the key. */
    return send(res, 502, { error: e instanceof Error ? e.message : "Cleanup failed" });
  }
}
