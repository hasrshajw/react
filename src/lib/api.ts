/* ==========================================================================
   Data access layer.
   Every page loads and saves server data through these async functions.

   Everything is read from and written to Supabase (see lib/supabase.ts). There is no local or demo data.
   ========================================================================== */
import { getSession } from "./auth";
import { LIST_LIMIT } from "./listLimit";
import { db } from "./supabase";
import { PREVIEW_BUCKET } from "./previewUrl";
import { onUserDataReset } from "./userData";
import type { DeletedMap, Enquiry, InvitationRow, PublishMap } from "../types/dashboard";
import type { Category, Template } from "../types/invitation";

export interface AccountUser { name: string; email: string; role: string }
export interface Plan { name: string; status: "trial" | "active" | "past_due"; trialDaysLeft?: number }
export interface Account { user: AccountUser; plan: Plan }

/** Thrown for problems the user can fix (for example a link ID that is already taken). */
export class ApiError extends Error {}

const fail = (e: { message: string } | null): never => { throw new Error(e?.message || "Request failed"); };
const DAY_MS = 24 * 3600000;

/* ---------- account ---------- */
export async function fetchAccount(): Promise<Account> {
  const session = getSession();
  /* M-13: a missing profile row must never read as a paid, administrator account. The role label is display-only
     (permissions come from RLS), and the plan falls back to an expired trial instead of "active". */
  const fallbackUser = { name: session?.name ?? "Account", email: session?.email ?? "", role: "Member" };

  const { data: auth } = await db().auth.getUser();
  const uid = auth.user?.id;
  const { data: p } = uid ? await db().from("profiles").select("*").eq("id", uid).maybeSingle() : { data: null };
  const left = p?.trial_ends_at ? Math.max(0, Math.ceil((Date.parse(p.trial_ends_at) - Date.now()) / DAY_MS)) : 0;
  return {
    user: { name: p?.name || fallbackUser.name, email: auth.user?.email || fallbackUser.email, role: p?.role || fallbackUser.role },
    plan: { name: p?.plan_name || "Pro", status: (p?.plan_status as Plan["status"]) || "trial", trialDaysLeft: left },
  };
}

/* ---------- templates ---------- */
/* Templates carry their full HTML and are only changed in the database, never from this app. They used to be downloaded again every time
   a preview panel, the Create page or Manage Templates opened. Now one read is shared for 10 minutes (and by readers that open together). */
const TEMPLATES_TTL = 10 * 60_000;
let templatesCache: { at: number; value: Promise<{ templates: Template[]; categories: Category[] }> } | null = null;
export function clearTemplatesCache(): void { templatesCache = null; }
onUserDataReset(() => { templatesCache = null; });

export function fetchTemplates(): Promise<{ templates: Template[]; categories: Category[] }> {
  if (templatesCache && Date.now() - templatesCache.at < TEMPLATES_TTL) return templatesCache.value;
  const value = readTemplates();
  templatesCache = { at: Date.now(), value };
  value.catch(() => { if (templatesCache?.value === value) templatesCache = null; });
  return value;
}

async function readTemplates(): Promise<{ templates: Template[]; categories: Category[] }> {
  const [t, c] = await Promise.all([
    db().from("templates").select("id, category_id, name, html_code").order("created_at", { ascending: true }),
    db().from("categories").select("id, name").order("name", { ascending: true }),
  ]);
  if (t.error) fail(t.error);
  if (c.error) fail(c.error);
  return { templates: (t.data ?? []) as Template[], categories: (c.data ?? []) as Category[] };
}

/* ---------- invitations ---------- */
/** `truncated`: the read stopped at `LIST_LIMIT` rows, so older invitations exist that this list does not hold (M-5). */
export interface InvitationList { rows: InvitationRow[]; published: PublishMap; deleted: DeletedMap; truncated?: boolean }

/* The flags as the server last had them. savePublished / saveDeleted compare against this to see what changed. */
let knownPub: PublishMap = {};
let knownDel: DeletedMap = {};
/* M-1: forget the flags when the person signs out, so the next login starts from the server's state. */
onUserDataReset(() => { knownPub = {}; knownDel = {}; });

/* H-6: list reads and flag writes run strictly one after another, in the order they were asked for.
   Without this, two quick toggles ran side by side and could reach the server in either order, and a
   list read could finish with a value from before a write and overwrite what `knownPub` / `knownDel` hold.
   A failed task does not block the ones behind it. */
let flagQueue: Promise<unknown> = Promise.resolve();
function inOrder<T>(task: () => Promise<T>): Promise<T> {
  const result = flagQueue.then(task);
  flagQueue = result.catch(() => undefined);
  return result;
}

/* PostgREST puts the ids in the URL, so very large groups are split. */
const CHUNK = 100;
function chunks<T>(list: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += CHUNK) out.push(list.slice(i, i + CHUNK));
  return out;
}

/* M-5: PostgREST answers a plain `select` with at most 1,000 rows (the Supabase default) and says nothing when it
   cuts the list, so a long list would silently lose its oldest rows. Lists are therefore read in pages with `.range()`.
   Every ordered read adds `id` as a tie-break so two rows with the same `created_at` never swap places between pages,
   and rows that arrive twice (something was inserted while paging) are dropped by id. */
const PAGE_SIZE = 500;
/* Hard stop so a runaway table cannot freeze the browser. Reaching it is logged and the list says so on screen (`truncated`); the "Load more" button raises the limit by `LIST_LIMIT` at a time (`fetchInvitations(limit)`). */
const MAX_ROWS = LIST_LIMIT;
/** A raw database row: column names are known, values are checked where they are used. */
type DbRow = Record<string, unknown>;
type PageResult = { data: DbRow[] | null; error: { message: string } | null };
export async function readAllPages(page: (from: number, to: number) => PromiseLike<PageResult>, maxRows: number = MAX_ROWS): Promise<DbRow[]> {
  const seen = new Set<string>();
  const out: DbRow[] = [];
  for (let from = 0; from < maxRows; from += PAGE_SIZE) {
    /* A small limit (the Dashboard asks for 5) reads only that many rows, not a whole page of 500. */
    const size = Math.min(PAGE_SIZE, maxRows - from);
    const { data, error } = await page(from, from + size - 1);
    if (error) fail(error);
    const got = data ?? [];
    for (const r of got) { const key = String(r.id); if (!seen.has(key)) { seen.add(key); out.push(r); } }
    if (got.length < size) return out;
  }
  if (maxRows >= MAX_ROWS) console.warn(`List stopped at ${maxRows} rows.`);
  return out;
}

/* Columns the admin lists read. `slug` and `owner` stay on the server (splitRow dropped them anyway), and a column added later
   (for example the Track B client email) does not reach the list until it is added here on purpose. */
const INVITATION_COLUMNS = "id, groom_name, bride_name, event_date, template_id, template_name, details, views, published, deleted_at, created_at, updated_at, client_email";
/* Lists (Dashboard, All invitations, Review queue names) do not need the whole `details` (it holds every field, event and contact of the invitation).
   They read only the link ID out of it (`customId`, used for links, QR and the duplicate-link check). Preview, Duplicate, Edit link and the editor read the full row. */
const INVITATION_LIST_COLUMNS = "id, groom_name, bride_name, event_date, template_id, template_name, customId:details->>customId, views, published, deleted_at, created_at, updated_at, client_email";
const ENQUIRY_COLUMNS = "id, name, phone, email, message, status, note, follow_up_date, history, created_at";

const slugOf = (x: InvitationRow) => (x.details?.customId || "").trim() || x.id;

/** Splits the database-only columns (published, deleted_at) out of a row. */
function splitRow(r: DbRow): { row: InvitationRow; published: boolean; deletedAt: number | null } {
  const { published, deleted_at, slug: _slug, owner: _owner, ...row } = r;
  /* A list row has `customId` instead of `details` (INVITATION_LIST_COLUMNS): rebuild the small `details` the list code reads, and mark the row. */
  if ("customId" in row) {
    const { customId, ...rest } = row;
    const slim = { ...rest, details: typeof customId === "string" && customId ? { customId } : {}, listOnly: true };
    return { row: slim as unknown as InvitationRow, published: published !== false, deletedAt: typeof deleted_at === "string" && deleted_at ? Date.parse(deleted_at) : null };
  }
  return { row: row as unknown as InvitationRow, published: published !== false, deletedAt: typeof deleted_at === "string" && deleted_at ? Date.parse(deleted_at) : null };
}

/** Reads run after any flag writes that were already sent, so the list always includes them (H-6). */
export function fetchInvitations(limit: number = LIST_LIMIT): Promise<InvitationList> {
  return inOrder(async () => {
    const data = await readAllPages((from, to) => db().from("invitations").select(INVITATION_LIST_COLUMNS)
      .order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to), limit);
    const rows: InvitationRow[] = [];
    const published: PublishMap = {};
    const deleted: DeletedMap = {};
    for (const r of data) {
      const s = splitRow(r);
      rows.push(s.row);
      published[s.row.id] = s.published;
      if (s.deletedAt) deleted[s.row.id] = s.deletedAt;
    }
    knownPub = { ...published };
    knownDel = { ...deleted };
    return { rows, published, deleted, truncated: rows.length >= limit };
  });
}

export async function fetchInvitation(id: string): Promise<InvitationRow | null> {
  const { data, error } = await db().from("invitations").select(INVITATION_COLUMNS).eq("id", id).maybeSingle();
  if (error) fail(error);
  return data ? splitRow(data).row : null;
}

/** Creates or updates one invitation. The link ID (details.customId) must be unique. */
export async function saveInvitation(record: InvitationRow, opts: { published?: boolean } = {}): Promise<InvitationRow> {
  /* A list row only holds the link ID. Saving it would replace the invitation's real data with that, so it is refused: read the full row first. */
  if (record.listOnly) throw new ApiError("This invitation was read for a list and is incomplete. Load the full invitation before saving it.");
  /* `published` is written only when the caller says so (a new copy that must never be public, task H-6 gap). Left out,
     a new row takes the column default (true) and an existing row keeps its value.
     `client_email` is a top-level column (Track B); it is never stored inside details. Empty string clears the link. */
  const rawDetails = (record.details ?? {}) as Record<string, unknown>;
  const { clientEmail: _dropClientEmail, ...detailsWithoutClient } = rawDetails;
  /* B7: normalise case and surrounding spaces only. +tag addresses stay exact (no stripping). DB constraint also lower+btrim. */
  const clientEmail =
    record.client_email === undefined
      ? undefined
      : (record.client_email == null || String(record.client_email).trim() === ""
          ? null
          : String(record.client_email).trim().toLowerCase());
  const { data, error } = await db()
    .from("invitations")
    .upsert({
      ...(opts.published === undefined ? {} : { published: opts.published }),
      id: record.id,
      slug: slugOf(record),
      groom_name: record.groom_name ?? null,
      bride_name: record.bride_name ?? null,
      event_date: record.event_date ?? null,
      template_id: record.template_id != null ? String(record.template_id) : null,
      template_name: record.template_name ?? null,
      details: detailsWithoutClient,
      ...(clientEmail === undefined ? {} : { client_email: clientEmail }),
    })
    .select(INVITATION_COLUMNS)
    .single();
  if (error) {
    if (error.code === "23505") throw new ApiError("That link ID is already used by another invitation.");
    fail(error);
  }
  if (opts.published !== undefined) knownPub = { ...knownPub, [record.id]: opts.published };
  return splitRow(data!).row;
}

/* The bucket (PREVIEW_BUCKET, lib/previewUrl.ts) is created by supabase/01_schema.sql: public read, owner write, JPEG only, 300 KB at most. */

/** How long browsers and the CDN may keep a preview file. The returned URL carries a new `?v=` stamp on every upload, so a changed image
 *  is a different URL and a long time is safe: each device and crawler downloads a given picture once (one year, the usual maximum). */
export const PREVIEW_CACHE_SECONDS = "31536000";

/** Uploads the link-preview image to `<userId>/<invitationId>.jpg` and returns its public https URL.
 *  The path is reused (upsert), so a `?v=` stamp is added to make crawlers and browsers fetch the new file. */
export async function uploadPreviewImage(image: Blob, invitationId: string): Promise<string> {
  const { data: auth, error: authError } = await db().auth.getUser();
  if (authError || !auth.user) throw new ApiError("Please sign in again to upload an image.");
  const path = `${auth.user.id}/${invitationId}.jpg`;
  const { error } = await db().storage.from(PREVIEW_BUCKET).upload(path, image, {
    upsert: true, contentType: "image/jpeg", cacheControl: PREVIEW_CACHE_SECONDS,
  });
  if (error) {
    if (/bucket not found/i.test(error.message)) throw new ApiError("Preview storage is not set up. Run supabase/migrations/001_seo_previews.sql first.");
    fail(error);
  }
  const { data } = db().storage.from(PREVIEW_BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

/** L-8: ids of this person's invitations whose time in the trash is over. The server compares its own clock with the date it
 *  stamped itself (see `expired_trash_ids()` in supabase/01_schema.sql), so a wrong clock on this device cannot empty the trash early
 *  or keep things for ever. If the function is missing (migration 009 not run yet) or fails, this rejects and nothing is purged. */
export async function fetchExpiredTrashIds(): Promise<string[]> {
  const { data, error } = await db().rpc("expired_trash_ids");
  if (error) fail(error);
  return Array.isArray(data) ? data.filter((x): x is string => typeof x === "string") : [];
}

/** Permanently removes an invitation (used when the trash is emptied after 30 days), then its link-preview file. */
export async function deleteInvitation(id: string): Promise<void> {
  const { error } = await db().from("invitations").delete().eq("id", id);
  if (error) fail(error);
  await removePreviewImage(id);
}

/** M-4: deletes `<user id>/<invitation id>.jpg` after its invitation is gone. Best effort: the invitation is already deleted, so a problem
 *  here must not fail the purge (and make it retry); a file left behind is for the orphan cleanup job (still open in M-4).
 *  "Duplicate" copies `details`, so a copy can point at the original's file. If any remaining invitation still uses the file, or the
 *  check itself fails, the file is kept. */
async function removePreviewImage(id: string): Promise<void> {
  try {
    const { data } = await db().auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    const path = `${uid}/${id}.jpg`;
    const { count, error } = await db().from("invitations").select("id", { count: "exact", head: true }).like("details->>seoImage", `%/${path}%`);
    if (error || (count ?? 0) > 0) return;
    const { error: removeError } = await db().storage.from(PREVIEW_BUCKET).remove([path]);
    if (removeError) console.warn("Could not delete the preview image:", removeError.message);
  } catch (e) {
    console.warn("Could not delete the preview image:", e);
  }
}

/** Writes the "published" flags. Takes the whole map and saves only what changed.
 *  Runs in order with other flag writes and list reads. Ids that go to the same value are sent in one
 *  statement, so a bulk change is all-or-nothing for each value. `knownPub` moves forward only for what the
 *  server accepted, so after a failure the next call tries the rest again. */
export function savePublished(map: PublishMap): Promise<void> {
  return inOrder(async () => {
    const groups = new Map<boolean, string[]>();
    for (const id of Object.keys(map)) {
      const want = map[id] !== false;
      if (want === (knownPub[id] !== false)) continue;
      groups.set(want, [...(groups.get(want) ?? []), id]);
    }
    for (const [want, ids] of groups) {
      for (const part of chunks(ids)) {
        const { error } = await db().from("invitations").update({ published: want }).in("id", part);
        if (error) fail(error);
        knownPub = { ...knownPub, ...Object.fromEntries(part.map((id) => [id, want])) };
      }
    }
  });
}

/** Writes the trash flags. Takes the whole map and saves only what changed (same rules as savePublished).
 *  L-8: the time sent here is only a hint. The database stamps `deleted_at` with its own clock when an invitation is trashed
 *  (a time sent for one that is already in the trash is ignored too), and the next list read brings the real value back. */
export function saveDeleted(map: DeletedMap): Promise<void> {
  return inOrder(async () => {
    const ids = new Set([...Object.keys(map), ...Object.keys(knownDel)]);
    const groups = new Map<number | null, string[]>();
    for (const id of ids) {
      if (map[id] === knownDel[id]) continue;
      const at = map[id] ?? null;
      groups.set(at, [...(groups.get(at) ?? []), id]);
    }
    for (const [at, list] of groups) {
      for (const part of chunks(list)) {
        const { error } = await db().from("invitations")
          .update({ deleted_at: at ? new Date(at).toISOString() : null }).in("id", part);
        if (error) fail(error);
        const next = { ...knownDel };
        for (const id of part) { if (at) next[id] = at; else delete next[id]; }
        knownDel = next;
      }
    }
  });
}

/* ---------- public invitation (no login needed) ---------- */
/* fetchPublicInvitation lives in lib/publicInvitation.ts (no SDK), so public pages stay light. */
export { fetchPublicInvitation } from "./publicInvitation";
export type { PublicInvitation } from "./publicInvitation";

/* ---------- enquiries ---------- */
const toEnquiry = (r: DbRow): Enquiry => ({
  id: r.id as Enquiry["id"], name: (r.name ?? "") as string, phone: (r.phone ?? "") as string, email: (r.email ?? "") as string, message: (r.message ?? "") as string,
  createdAt: r.created_at as Enquiry["createdAt"], status: (r.status ?? "new") as Enquiry["status"], note: (r.note ?? "") as string, followUpDate: (r.follow_up_date ?? "") as string,
  history: Array.isArray(r.history) ? (r.history as Enquiry["history"]) : [],
});

/** Every enquiry. Only the CSV export uses this (on click); the panel reads pages (`fetchEnquiryPage`). */
export async function fetchEnquiries(): Promise<Enquiry[]> {
  const data = await readAllPages((from, to) => db().from("enquiries").select(ENQUIRY_COLUMNS)
    .order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to));
  return data.map(toEnquiry);
}

/** Counts for the card, the "Needs attention" strip and the panel tabs. `newestId` changes when something arrives, so the background
 *  check compares whole summaries and reads rows only if the panel is open. */
export interface EnquirySummary {
  total: number; new: number; followup: number; called: number; cancelled: number; staleNew: number; dueFollow: number; newestId: string;
}

/** One small answer from the database (migration 018) instead of the whole list. Before 018 is run it falls back to a few count-only
 *  requests (no rows are downloaded either way). */
export async function fetchEnquirySummary(): Promise<EnquirySummary> {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const { data, error } = await db().rpc("enquiry_summary", { p_today: today });
  if (!error && data && typeof data === "object") {
    const r = data as Record<string, unknown>;
    return {
      total: num(r.total), new: num(r.new), followup: num(r.followup), called: num(r.called), cancelled: num(r.cancelled),
      staleNew: num(r.stale_new), dueFollow: num(r.due_follow), newestId: typeof r.newest_id === "string" ? r.newest_id : "",
    };
  }
  /* Function not installed yet (or not allowed): count with head requests. A real permission error fails the same way on these. */
  const base = () => db().from("enquiries").select("id", { count: "exact", head: true });
  const count = async (f: (q: ReturnType<typeof base>) => PromiseLike<{ count: number | null; error: { message: string } | null }>): Promise<number> => {
    const res = await f(base());
    if (res.error) fail(res.error);
    return res.count ?? 0;
  };
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const [total, nw, followup, called, cancelled, staleNew, dueFollow, newest] = await Promise.all([
    count((q) => q), count((q) => q.eq("status", "new")), count((q) => q.eq("status", "followup")),
    count((q) => q.eq("status", "called")), count((q) => q.eq("status", "cancelled")),
    count((q) => q.eq("status", "new").lt("created_at", dayAgo)),
    count((q) => q.eq("status", "followup").not("follow_up_date", "is", null).lte("follow_up_date", today)),
    db().from("enquiries").select("id").order("created_at", { ascending: false }).order("id", { ascending: false }).limit(1),
  ]);
  if (newest.error) fail(newest.error);
  const first = Array.isArray(newest.data) && newest.data[0] ? String((newest.data[0] as DbRow).id) : "";
  return { total, new: nw, followup, called, cancelled, staleNew, dueFollow, newestId: first };
}

export const ENQUIRY_PAGE = 10;
/** Characters that would break a PostgREST `or()` filter or act as wildcards are dropped from a search term. */
const cleanTerm = (t: string) => t.trim().replace(/[,()%*_\\"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);

/** A page of enquiries, newest first, for the panel. `offset` rows are skipped; one extra row is read to know whether "More" has anything. */
export async function fetchEnquiryPage(opts: { tab: "all" | Enquiry["status"]; search?: string; offset?: number; limit?: number }): Promise<{ items: Enquiry[]; hasMore: boolean }> {
  const limit = opts.limit ?? ENQUIRY_PAGE;
  const offset = opts.offset ?? 0;
  let q = db().from("enquiries").select(ENQUIRY_COLUMNS);
  if (opts.tab !== "all") q = q.eq("status", opts.tab);
  const term = cleanTerm(opts.search ?? "");
  if (term) q = q.or(["name", "phone", "email", "message", "note"].map((c) => `${c}.ilike.%${term}%`).join(","));
  const { data, error } = await q.order("created_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + limit);
  if (error) fail(error);
  const rows = Array.isArray(data) ? (data as DbRow[]) : [];
  return { items: rows.slice(0, limit).map(toEnquiry), hasMore: rows.length > limit };
}

/** M-6: number of enquiries still marked "new", for the navbar badge. Counts on the server, so no rows are downloaded. */
export async function fetchNewEnquiryCount(): Promise<number> {
  const { count, error } = await db().from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new");
  if (error) fail(error);
  return count ?? 0;
}

/** Saves status, note and follow-up date. `history` is not sent: the database appends an entry (with the server time)
 *  when the status changes (migration 008, task L-7). Returns the history as the server now holds it. */
export async function saveEnquiry(e: Enquiry): Promise<Enquiry["history"]> {
  const { data, error } = await db().from("enquiries")
    .update({ status: e.status, note: e.note, follow_up_date: e.followUpDate || null })
    .eq("id", e.id)
    .select("history")
    .single();
  if (error) fail(error);
  return Array.isArray(data?.history) ? data!.history : e.history;
}

/* ---------- Track B (B4): client self-service editing ---------- */
/* Every call below is an RPC or a read that the database already restricts (migrations 010 to 012). Row level security is the
   real lock; these functions only shape the data. Clients never read `invitations` directly: they use `my_invitations()`. */

export type RequestStatus = "pending" | "approved" | "rejected" | "withdrawn" | "superseded";
export type ReviewDecision = "approve" | "reject";

/** One invitation linked to the signed-in client's verified email, with the state of its latest change request. */
export interface MyInvitation {
  id: string; groomName: string; brideName: string; eventDate: string | null; templateId: string; published: boolean;
  details: InvitationRow["details"]; updatedAt: string;
  /** Times the public page was opened. `null` until migration 016 is applied. */
  views?: number | null; createdAt?: string | null;
  /** Read for a list: `details` holds only the link ID and `request.proposedDetails` is empty. Read the one invitation (fetchMyInvitation) before using it as a form. */
  listOnly?: boolean;
  request: null | {
    id: string; status: RequestStatus; adminNote: string; createdAt: string; acknowledgedAt: string | null;
    /** Full proposed details when the latest request still matters (pending / unacked rejected). From migration 015. */
    proposedDetails: InvitationRow["details"] | null;
  };
}

/** A change request as the admin sees it in the review queue. */
export interface ReviewItem {
  id: string; invitationId: string; clientEmail: string; baseUpdatedAt: string; createdAt: string;
  status: RequestStatus;
  changedKeys: string[]; proposedDetails: InvitationRow["details"];
}

export interface AppNotification {
  id: number; audience: "admin" | "user"; type: string; invitationId: string | null; requestId: string | null;
  payload: Record<string, unknown>; readAt: string | null; createdAt: string;
}

/** The invitation was edited after the client started (decision D7, SQLSTATE 40001). Approve again with `force = true` to accept it. */
export class ChangeConflictError extends ApiError {}

const rpcFail = (e: { message: string; code?: string }): never => {
  if (e.code === "40001") throw new ChangeConflictError(e.message);
  /* The database's own messages are written for people ("No changes to submit", "You already have a pending request"), so they are kept. */
  throw new ApiError(e.message || "Request failed");
};

const toMyInvitation = (r: DbRow): MyInvitation => ({
  id: r.id as string, groomName: (r.groom_name ?? "") as string, brideName: (r.bride_name ?? "") as string,
  eventDate: (r.event_date ?? null) as string | null, templateId: String(r.template_id ?? ""), published: r.published !== false,
  details: (r.details && typeof r.details === "object" ? r.details : (typeof r.custom_id === "string" && r.custom_id ? { customId: r.custom_id } : {})) as MyInvitation["details"], updatedAt: r.updated_at as string,
  ...("custom_id" in r ? { listOnly: true } : {}),
  views: typeof r.views === "number" ? r.views : null, createdAt: (r.created_at ?? null) as string | null,
  request: r.request_id ? {
    id: r.request_id as string, status: r.request_status as RequestStatus, adminNote: (r.request_admin_note ?? "") as string,
    createdAt: r.request_created_at as string, acknowledgedAt: (r.request_acknowledged_at ?? null) as string | null,
    proposedDetails: (r.request_proposed_details && typeof r.request_proposed_details === "object"
      ? r.request_proposed_details : null) as MyInvitation["details"] | null,
  } : null,
});

/** The signed-in person's invitations (verified email only, newest first, at most 500). An empty list means "none linked". */
export async function fetchMyInvitations(): Promise<MyInvitation[]> {
  const { data, error } = await db().rpc("my_invitations");
  if (error) fail(error);
  return Array.isArray(data) ? (data as DbRow[]).map(toMyInvitation) : [];
}

/** The list for the client shell: no `details` and no proposed details (rows are marked `listOnly`). `complete` is true when the rows are full
 *  (the light function is not installed yet, so the old full read was used); the caller then has nothing more to read. */
export async function fetchMyInvitationList(): Promise<{ items: MyInvitation[]; complete: boolean }> {
  const { data, error } = await db().rpc("my_invitations_list");
  if (error) return { items: await fetchMyInvitations(), complete: true };
  return { items: Array.isArray(data) ? (data as DbRow[]).map(toMyInvitation) : [], complete: false };
}

/** One of the signed-in person's invitations with everything (details, proposed details). `null` when it is not theirs or not there any more. */
export async function fetchMyInvitation(id: string): Promise<MyInvitation | null> {
  const { data, error } = await db().rpc("my_invitation", { p_id: id });
  if (error) fail(error);
  const row = Array.isArray(data) ? data[0] : data;
  return row ? toMyInvitation(row as DbRow) : null;
}

/** Sends the client's edited form for review. `details` is the whole form; the database keeps only the allowed keys and the changed ones.
 *  `baseUpdatedAt` is the `updatedAt` of the invitation the client started from. Resolves with the new request id. */
export async function submitChangeRequest(invitationId: string, details: InvitationRow["details"], baseUpdatedAt: string): Promise<string> {
  const { data, error } = await db().rpc("submit_change_request", { p_invitation_id: invitationId, p_details: details, p_base_updated_at: baseUpdatedAt });
  if (error) rpcFail(error);
  return String(data);
}

export async function withdrawChangeRequest(requestId: string): Promise<void> {
  const { error } = await db().rpc("withdraw_change_request", { p_id: requestId });
  if (error) rpcFail(error);
}

/** The client dismisses a decision ("Got it"). Works for a rejected or an approved request, once. */
export async function acknowledgeRejection(requestId: string): Promise<void> {
  const { error } = await db().rpc("acknowledge_rejection", { p_id: requestId });
  if (error) rpcFail(error);
}

/** The template HTML for the client editor's preview. Clients cannot read `templates`, so this goes through the database function. */
export async function fetchClientTemplateHtml(invitationId: string): Promise<string> {
  const { data, error } = await db().rpc("client_template_html", { p_invitation_id: invitationId });
  if (error) rpcFail(error);
  return typeof data === "string" ? data : "";
}

/** Whether the signed-in person is an administrator. Used for the screen to show; RLS and the RPCs enforce the real rule. */
export async function fetchIsAdmin(): Promise<boolean> {
  const { data, error } = await db().rpc("is_admin");
  if (error) fail(error);
  return data === true;
}

const REVIEW_COLUMNS = "id, invitation_id, client_email, base_updated_at, created_at, status, changed_keys, proposed_details";
/* The list does not need the proposed invitation data (it can be large); the detail view reads it for the one request that is open. */
const REVIEW_LIST_COLUMNS = "id, invitation_id, client_email, base_updated_at, created_at, status, changed_keys";
const REVIEW_STATUSES: readonly RequestStatus[] = ["pending", "approved", "rejected", "withdrawn", "superseded"];

const toReviewItem = (r: DbRow): ReviewItem => ({
  id: r.id as string, invitationId: r.invitation_id as string, clientEmail: (r.client_email ?? "") as string,
  baseUpdatedAt: r.base_updated_at as string, createdAt: r.created_at as string,
  status: (REVIEW_STATUSES.includes(r.status as RequestStatus) ? r.status : "pending") as RequestStatus,
  changedKeys: Array.isArray(r.changed_keys) ? (r.changed_keys as unknown[]).filter((k): k is string => typeof k === "string") : [],
  proposedDetails: (r.proposed_details && typeof r.proposed_details === "object" ? r.proposed_details : {}) as ReviewItem["proposedDetails"],
});

/** Change requests for the admin review queue (admin only: RLS returns nothing for anyone else).
 *  Default status is `pending`, oldest first. Pass another status or `"all"` for the history tabs. At most 200 until paging (B7). */
export async function fetchReviewQueue(status: RequestStatus | "all" = "pending"): Promise<ReviewItem[]> {
  let q = db().from("change_requests").select(REVIEW_COLUMNS);
  if (status !== "all") q = q.eq("status", status);
  const ascending = status === "pending";
  const { data, error } = await q.order("created_at", { ascending }).order("id", { ascending }).limit(200);
  if (error) fail(error);
  return (Array.isArray(data) ? (data as DbRow[]) : []).map(toReviewItem);
}

/* ---------- list summary + review paging (admin) ---------- */
export interface InvitationSummary {
  total: number; published: number; drafts: number; upcoming: number; week: number; past: number;
  views: number; viewed: number; draftSoon: number; noViews: number; trashed: number; topId: string | null;
  templates: { key: string; name: string; n: number }[];
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Counts for the stat cards and tab counts, computed by the database so the page does not have to download every invitation. */
export async function fetchInvitationSummary(): Promise<InvitationSummary> {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const { data, error } = await db().rpc("invitation_summary", { p_today: today });
  if (error) rpcFail(error);
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    total: num(r.total), published: num(r.published), drafts: num(r.drafts), upcoming: num(r.upcoming), week: num(r.week), past: num(r.past),
    views: num(r.views), viewed: num(r.viewed), draftSoon: num(r.draft_soon), noViews: num(r.no_views), trashed: num(r.trashed),
    topId: typeof r.top_id === "string" ? r.top_id : null,
    templates: Array.isArray(r.templates) ? (r.templates as { key: string; name: string; n: number }[]) : [],
  };
}

/** One short text that changes whenever an invitation is added, edited, published, trashed or viewed. The Dashboard's Auto refresh compares it
 *  with the last one and re-reads the list only when it differs. Returns null when it cannot be read (function not installed yet, offline),
 *  and the caller then reads the list as it did before. */
export async function fetchInvitationFingerprint(): Promise<string | null> {
  try {
    const { data, error } = await db().rpc("invitation_fingerprint");
    if (error || typeof data !== "string") return null;
    return data;
  } catch {
    return null;
  }
}

/** Only the invitations with these ids (the Review queue needs names for the 10 requests on screen, not the whole list). */
export async function fetchInvitationsByIds(ids: string[]): Promise<InvitationRow[]> {
  const unique = [...new Set(ids)].slice(0, 200);
  if (!unique.length) return [];
  const { data, error } = await db().from("invitations").select(INVITATION_LIST_COLUMNS).in("id", unique);
  if (error) fail(error);
  return (Array.isArray(data) ? (data as DbRow[]) : []).map((r) => splitRow(r).row);
}

/** One page of the review queue, newest first. Reads one extra row to know whether "View more" has anything to show. */
export async function fetchReviewPage(status: RequestStatus | "all" = "pending", limit = 10): Promise<{ items: ReviewItem[]; hasMore: boolean }> {
  let q = db().from("change_requests").select(REVIEW_LIST_COLUMNS);
  if (status !== "all") q = q.eq("status", status);
  const { data, error } = await q.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(limit + 1);
  if (error) fail(error);
  const rows = Array.isArray(data) ? (data as DbRow[]) : [];
  return { items: rows.slice(0, limit).map(toReviewItem), hasMore: rows.length > limit };
}

/** The proposed invitation data of one change request (read when the admin opens it). */
export async function fetchReviewProposed(id: string): Promise<ReviewItem["proposedDetails"]> {
  const { data, error } = await db().from("change_requests").select("proposed_details").eq("id", id).maybeSingle();
  if (error) fail(error);
  const d = (data as DbRow | null)?.proposed_details;
  return (d && typeof d === "object" ? d : {}) as ReviewItem["proposedDetails"];
}

/** Ids of invitations that have a pending change request: one column, no request data (the "Pending review" chip). */
export async function fetchPendingInvitationIds(): Promise<string[]> {
  const { data, error } = await db().from("change_requests").select("invitation_id").eq("status", "pending").limit(1000);
  if (error) fail(error);
  return (Array.isArray(data) ? (data as DbRow[]) : []).map((r) => String(r.invitation_id));
}

/** How many change requests are still pending (admin badge). Count only — no rows downloaded. */
export async function fetchPendingReviewCount(): Promise<number> {
  const { count, error } = await db().from("change_requests").select("id", { count: "exact", head: true }).eq("status", "pending");
  if (error) fail(error);
  return count ?? 0;
}

/** Approve or reject (admin only). Rejecting needs a note (the database refuses an empty one). If the invitation changed after the client
 *  started, approving throws `ChangeConflictError`; call again with `force = true` once the admin has chosen to go ahead. */
export async function reviewChangeRequest(requestId: string, decision: ReviewDecision, note = "", force = false): Promise<void> {
  const { error } = await db().rpc("review_change_request", { p_id: requestId, p_decision: decision, p_note: note.trim() || null, p_force: force });
  if (error) rpcFail(error);
}

const NOTIFICATION_COLUMNS = "id, audience, type, invitation_id, request_id, payload, read_at, created_at";

/** Turns a notifications row (from a read or from a Realtime message) into an app value. Returns null when the row is not usable. */
export function toNotification(r: DbRow | null | undefined): AppNotification | null {
  if (!r || typeof r.id !== "number" || typeof r.type !== "string") return null;
  return {
    id: r.id, audience: r.audience as AppNotification["audience"], type: r.type,
    invitationId: (r.invitation_id ?? null) as string | null, requestId: (r.request_id ?? null) as string | null,
    payload: (r.payload && typeof r.payload === "object" ? r.payload : {}) as Record<string, unknown>,
    readAt: (r.read_at ?? null) as string | null, createdAt: (r.created_at ?? "") as string,
  };
}

/** Notifications the person may see (RLS: their own, plus the shared admin ones for an admin), newest first. */
export async function fetchNotifications(limit = 50): Promise<AppNotification[]> {
  const { data, error } = await db().from("notifications").select(NOTIFICATION_COLUMNS).order("created_at", { ascending: false }).order("id", { ascending: false })
    .limit(Math.min(Math.max(1, Math.floor(limit) || 50), 200));
  if (error) fail(error);
  return (Array.isArray(data) ? (data as DbRow[]) : []).map(toNotification).filter((n): n is AppNotification => !!n);
}

/** Marks one notification read. Only `read_at` can be written (column grant); an admin notification is shared, so this marks it for every admin. */
export async function markNotificationRead(id: number): Promise<void> {
  const { error } = await db().from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
  if (error) fail(error);
}

/** Marks several notifications read in ONE request (marking each one separately sent N requests and caused N Realtime refreshes). */
export async function markNotificationsRead(ids: number[]): Promise<void> {
  if (!ids.length) return;
  const { error } = await db().from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids).is("read_at", null);
  if (error) fail(error);
}
