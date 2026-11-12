/* ==========================================================================
   Data access layer.
   Every page loads and saves server data through these async functions.

   Everything is read from and written to Supabase (see lib/supabase.ts). There is no local or demo data.
   ========================================================================== */
import { getSession } from "./auth";
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
export async function fetchTemplates(): Promise<{ templates: Template[]; categories: Category[] }> {
  const [t, c] = await Promise.all([
    db().from("templates").select("id, category_id, name, html_code").order("created_at", { ascending: true }),
    db().from("categories").select("id, name").order("name", { ascending: true }),
  ]);
  if (t.error) fail(t.error);
  if (c.error) fail(c.error);
  return { templates: (t.data ?? []) as Template[], categories: (c.data ?? []) as Category[] };
}

/* ---------- invitations ---------- */
export interface InvitationList { rows: InvitationRow[]; published: PublishMap; deleted: DeletedMap }

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
/* Hard stop so a runaway table cannot freeze the browser. Reaching it is logged; real UI pagination (load more) is still open in M-5. */
const MAX_ROWS = 10000;
type PageResult = { data: Record<string, any>[] | null; error: { message: string } | null };
export async function readAllPages(page: (from: number, to: number) => PromiseLike<PageResult>): Promise<Record<string, any>[]> {
  const seen = new Set<string>();
  const out: Record<string, any>[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) fail(error);
    const got = data ?? [];
    for (const r of got) { const key = String(r.id); if (!seen.has(key)) { seen.add(key); out.push(r); } }
    if (got.length < PAGE_SIZE) return out;
  }
  console.warn(`List stopped at ${MAX_ROWS} rows.`);
  return out;
}

/* Columns the admin lists read. `slug` and `owner` stay on the server (splitRow dropped them anyway), and a column added later
   (for example the Track B client email) does not reach the list until it is added here on purpose. */
const INVITATION_COLUMNS = "id, groom_name, bride_name, event_date, template_id, template_name, details, views, published, deleted_at, created_at, updated_at";
const ENQUIRY_COLUMNS = "id, name, phone, email, message, status, note, follow_up_date, history, created_at";

const slugOf = (x: InvitationRow) => (x.details?.customId || "").trim() || x.id;

/** Splits the database-only columns (published, deleted_at) out of a row. */
function splitRow(r: Record<string, any>): { row: InvitationRow; published: boolean; deletedAt: number | null } {
  const { published, deleted_at, slug, owner, ...row } = r;
  return { row: row as InvitationRow, published: published !== false, deletedAt: deleted_at ? Date.parse(deleted_at) : null };
}

/** Reads run after any flag writes that were already sent, so the list always includes them (H-6). */
export function fetchInvitations(): Promise<InvitationList> {
  return inOrder(async () => {
    const data = await readAllPages((from, to) => db().from("invitations").select(INVITATION_COLUMNS)
      .order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to));
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
    return { rows, published, deleted };
  });
}

export async function fetchInvitation(id: string): Promise<InvitationRow | null> {
  const { data, error } = await db().from("invitations").select(INVITATION_COLUMNS).eq("id", id).maybeSingle();
  if (error) fail(error);
  return data ? splitRow(data).row : null;
}

/** Creates or updates one invitation. The link ID (details.customId) must be unique. */
export async function saveInvitation(record: InvitationRow, opts: { published?: boolean } = {}): Promise<InvitationRow> {
  /* `published` is written only when the caller says so (a new copy that must never be public, task H-6 gap). Left out,
     a new row takes the column default (true) and an existing row keeps its value. */
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
      details: record.details ?? {},
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

/* The bucket (PREVIEW_BUCKET, lib/previewUrl.ts) is created by supabase/schema.sql: public read, owner write, JPEG only, 300 KB at most. */

/** Uploads the link-preview image to `<userId>/<invitationId>.jpg` and returns its public https URL.
 *  The path is reused (upsert), so a `?v=` stamp is added to make crawlers and browsers fetch the new file. */
export async function uploadPreviewImage(image: Blob, invitationId: string): Promise<string> {
  const { data: auth, error: authError } = await db().auth.getUser();
  if (authError || !auth.user) throw new ApiError("Please sign in again to upload an image.");
  const path = `${auth.user.id}/${invitationId}.jpg`;
  const { error } = await db().storage.from(PREVIEW_BUCKET).upload(path, image, {
    upsert: true, contentType: "image/jpeg", cacheControl: "3600",
  });
  if (error) {
    if (/bucket not found/i.test(error.message)) throw new ApiError("Preview storage is not set up. Run supabase/migrations/001_seo_previews.sql first.");
    fail(error);
  }
  const { data } = db().storage.from(PREVIEW_BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
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

/** Writes the trash flags. Takes the whole map and saves only what changed (same rules as savePublished). */
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
const toEnquiry = (r: Record<string, any>): Enquiry => ({
  id: r.id, name: r.name ?? "", phone: r.phone ?? "", email: r.email ?? "", message: r.message ?? "",
  createdAt: r.created_at, status: r.status ?? "new", note: r.note ?? "", followUpDate: r.follow_up_date ?? "",
  history: Array.isArray(r.history) ? r.history : [],
});

export async function fetchEnquiries(): Promise<Enquiry[]> {
  const data = await readAllPages((from, to) => db().from("enquiries").select(ENQUIRY_COLUMNS)
    .order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to));
  return data.map(toEnquiry);
}

/** M-6: number of enquiries still marked "new", for the navbar badge. Counts on the server, so no rows are downloaded. */
export async function fetchNewEnquiryCount(): Promise<number> {
  const { count, error } = await db().from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new");
  if (error) fail(error);
  return count ?? 0;
}

export async function saveEnquiry(e: Enquiry): Promise<void> {
  const { error } = await db().from("enquiries")
    .update({ status: e.status, note: e.note, follow_up_date: e.followUpDate || null, history: e.history })
    .eq("id", e.id);
  if (error) fail(error);
}
