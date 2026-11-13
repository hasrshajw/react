/**
 * M-4: finds and removes preview pictures nobody uses any more (an upload for an invitation that was never saved, or a file whose
 * deletion failed, or a row removed by the daily pg_cron purge, which cannot delete files). Used by api/cleanup-previews.js.
 * The leading underscore keeps Vercel from turning this file into a function of its own.
 *
 * A file `<user id>/<invitation id>.jpg` is an orphan only when ALL of these hold:
 *   1. its name has exactly that shape (anything else is left alone),
 *   2. no invitation row has that id (trashed rows still exist, so their pictures are kept until the row is purged),
 *   3. no invitation's `details.seoImage` points at the file (a Duplicate shares the original's file),
 *   4. it was last written at least `graceMs` ago (an upload made just before the first save must not be taken away).
 *
 * Safety: nothing is deleted if any list could not be read completely; a run deletes at most MAX_DELETE files; and when there are
 * files but the invitation list came back empty the run refuses (a wrong key or project would otherwise look like "everything is an orphan").
 * The code only talks to Supabase through `fetch`, so tests can pass a fake one. No dependency, no SDK.
 */

export const BUCKET = "invitation-previews";
export const GRACE_MS = 24 * 60 * 60 * 1000;
export const MAX_DELETE = 200;
const PAGE = 1000;
const MAX_ROWS = 200000;
const FILE_RE = /^([^/]+)\/([^/]+)\.jpg$/;
const PUBLIC_PREFIX = `/storage/v1/object/public/${BUCKET}/`;

/** `<user>/<file>.jpg` taken from a stored `seoImage` link, or "" when the value is not a link to this bucket. */
export function pathFromSeoImage(value) {
  if (typeof value !== "string" || !value) return "";
  try {
    const u = new URL(value);
    if (!u.pathname.startsWith(PUBLIC_PREFIX)) return "";
    const rest = decodeURIComponent(u.pathname.slice(PUBLIC_PREFIX.length));
    return FILE_RE.test(rest) ? rest : "";
  } catch {
    return "";
  }
}

/**
 * @param {{ files: {path: string, updatedAt: string|null}[], invitationIds: Set<string>, referenced: Set<string>, now: number, graceMs?: number }} input
 * @returns {string[]} paths that are safe to delete
 */
export function findOrphans({ files, invitationIds, referenced, now, graceMs = GRACE_MS }) {
  const out = [];
  for (const f of files) {
    const m = FILE_RE.exec(f.path);
    if (!m) continue;
    if (invitationIds.has(m[2]) || referenced.has(f.path)) continue;
    const t = Date.parse(f.updatedAt ?? "");
    if (!Number.isFinite(t) || now - t < graceMs) continue; /* unknown or recent age: keep */
    out.push(f.path);
  }
  return out.sort();
}

/* A legacy service_role key is a JWT and also goes in Authorization. The new sb_secret_ keys are not JWTs and must
   only be sent as apikey (same rule as the publishable key in src/lib/publicInvitation.ts). */
export function headers(key, extra = {}) {
  const h = { apikey: key, ...extra };
  if (String(key).startsWith("eyJ")) h.Authorization = `Bearer ${key}`;
  return h;
}

async function json(res, what) {
  if (!res.ok) throw new Error(`${what} failed (HTTP ${res.status})`);
  return res.json();
}

/** All files of the bucket, one folder (user) at a time. Throws if any page fails, so a partial list is never used. */
export async function listFiles({ url, key, fetchFn = fetch }) {
  const list = async (prefix, offset) => {
    const res = await fetchFn(`${url}/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: headers(key, { "Content-Type": "application/json" }),
      body: JSON.stringify({ prefix, limit: 100, offset, sortBy: { column: "name", order: "asc" } }),
    });
    const rows = await json(res, "Listing the bucket");
    if (!Array.isArray(rows)) throw new Error("Listing the bucket gave an unexpected answer");
    return rows;
  };
  const all = async (prefix) => {
    const rows = [];
    for (let offset = 0; ; offset += 100) {
      const page = await list(prefix, offset);
      rows.push(...page);
      if (page.length < 100) return rows;
      if (rows.length > MAX_ROWS) throw new Error("Too many files to list");
    }
  };
  const files = [];
  for (const top of await all("")) {
    if (!top || typeof top.name !== "string") continue;
    if (top.id !== null && top.id !== undefined) continue; /* a file at the root has no owner folder: not ours, leave it */
    if (top.name.includes("/")) continue;
    for (const f of await all(top.name)) {
      if (!f || typeof f.name !== "string" || f.id === null || f.id === undefined) continue;
      files.push({ path: `${top.name}/${f.name}`, updatedAt: f.updated_at ?? f.created_at ?? null });
    }
  }
  return files;
}

/** Every invitation id, trashed ones included, and the picture each one points at. Throws if any page fails. */
export async function readInvitations({ url, key, fetchFn = fetch }) {
  const ids = new Set();
  const referenced = new Set();
  for (let from = 0; ; from += PAGE) {
    const res = await fetchFn(`${url}/rest/v1/invitations?select=id,seo:details->>seoImage&order=id.asc`, {
      headers: headers(key, { Range: `${from}-${from + PAGE - 1}`, "Range-Unit": "items" }),
    });
    const rows = await json(res, "Reading invitations");
    if (!Array.isArray(rows)) throw new Error("Reading invitations gave an unexpected answer");
    for (const r of rows) {
      if (r && typeof r.id === "string") ids.add(r.id);
      const p = pathFromSeoImage(r?.seo);
      if (p) referenced.add(p);
    }
    if (rows.length < PAGE) break;
    if (ids.size > MAX_ROWS) throw new Error("Too many invitations to read");
  }
  return { ids, referenced };
}

async function removeFiles({ url, key, fetchFn = fetch }, paths) {
  let done = 0;
  for (let i = 0; i < paths.length; i += 100) {
    const batch = paths.slice(i, i + 100);
    const res = await fetchFn(`${url}/storage/v1/object/${BUCKET}`, {
      method: "DELETE",
      headers: headers(key, { "Content-Type": "application/json" }),
      body: JSON.stringify({ prefixes: batch }),
    });
    await json(res, "Deleting files");
    done += batch.length;
  }
  return done;
}

/**
 * One cleanup run. `dryRun` (the default) only reports. Returns a summary and never throws for "nothing to do";
 * a failed read throws before anything is deleted.
 */
export async function cleanup({ url, key, fetchFn = fetch, now = Date.now(), dryRun = true, graceMs = GRACE_MS }) {
  const files = await listFiles({ url, key, fetchFn });
  const { ids, referenced } = await readInvitations({ url, key, fetchFn });
  const summary = { dryRun, files: files.length, invitations: ids.size, orphans: 0, deleted: 0, skipped: "", sample: [] };
  if (files.length > 0 && ids.size === 0) {
    summary.skipped = "no invitations were read, so nothing was deleted (check the Supabase URL and service key)";
    return summary;
  }
  const orphans = findOrphans({ files, invitationIds: ids, referenced, now, graceMs });
  summary.orphans = orphans.length;
  const batch = orphans.slice(0, MAX_DELETE);
  summary.sample = batch.slice(0, 20);
  if (orphans.length > MAX_DELETE) summary.skipped = `only the first ${MAX_DELETE} orphans are handled per run`;
  if (!dryRun && batch.length) summary.deleted = await removeFiles({ url, key, fetchFn }, batch);
  return summary;
}
