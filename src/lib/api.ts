/* ==========================================================================
   Data access layer.
   Every page loads and saves server data through these async functions.

   Two backends, chosen once at start-up (see lib/supabase.ts):
   - Supabase (VITE_DATA_SOURCE=supabase): real database, real requests, no artificial delay.
   - Demo (default): browser localStorage, so the app still runs with no setup.
   Pages only see the functions below, so they do not care which one is active.
   ========================================================================== */
import { demoCategories, demoTemplates, deleteDemoInvitation, getDemoInvitations, saveDemoInvitation } from "./demoData";
import { DEMO_USER, getSession } from "./auth";
import { INITIAL_ENQUIRIES, LS_DEL, LS_PUB, normDeleted, readJSON } from "./dashboardData";
import { USE_SUPABASE, db } from "./supabase";
import type { DeletedMap, Enquiry, InvitationRow, PublishMap } from "../types/dashboard";
import type { Category, Template } from "../types/invitation";

export interface AccountUser { name: string; email: string; role: string }
export interface Plan { name: string; status: "trial" | "active" | "past_due"; trialDaysLeft?: number }
export interface Account { user: AccountUser; plan: Plan }

/** Thrown for problems the user can fix (for example a link ID that is already taken). */
export class ApiError extends Error {}

const local = async <T>(read: () => T): Promise<T> => read();
const fail = (e: { message: string } | null): never => { throw new Error(e?.message || "Request failed"); };
const DAY_MS = 24 * 3600000;

/* ---------- account ---------- */
export async function fetchAccount(): Promise<Account> {
  const session = getSession();
  const fallbackUser = { name: session?.name ?? DEMO_USER.name, email: session?.email ?? DEMO_USER.email, role: "Administrator" };
  if (!USE_SUPABASE) return { user: fallbackUser, plan: { name: "Pro", status: "trial", trialDaysLeft: 12 } };

  const { data: auth } = await db().auth.getUser();
  const uid = auth.user?.id;
  const { data: p } = uid ? await db().from("profiles").select("*").eq("id", uid).maybeSingle() : { data: null };
  const left = p?.trial_ends_at ? Math.max(0, Math.ceil((Date.parse(p.trial_ends_at) - Date.now()) / DAY_MS)) : undefined;
  return {
    user: { name: p?.name || fallbackUser.name, email: auth.user?.email || fallbackUser.email, role: p?.role || "Administrator" },
    plan: { name: p?.plan_name || "Pro", status: (p?.plan_status as Plan["status"]) || "active", trialDaysLeft: left },
  };
}

/* ---------- templates ---------- */
export async function fetchTemplates(): Promise<{ templates: Template[]; categories: Category[] }> {
  if (!USE_SUPABASE) return { templates: demoTemplates, categories: demoCategories };
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

const slugOf = (x: InvitationRow) => (x.details?.customId || "").trim() || x.id;

/** Splits the database-only columns (published, deleted_at) out of a row. */
function splitRow(r: Record<string, any>): { row: InvitationRow; published: boolean; deletedAt: number | null } {
  const { published, deleted_at, slug, owner, ...row } = r;
  return { row: row as InvitationRow, published: published !== false, deletedAt: deleted_at ? Date.parse(deleted_at) : null };
}

export async function fetchInvitations(): Promise<InvitationList> {
  if (!USE_SUPABASE) {
    return local(() => ({
      rows: getDemoInvitations(),
      published: readJSON<PublishMap>(LS_PUB, {}),
      deleted: normDeleted(readJSON<unknown>(LS_DEL, {})),
    }));
  }
  const { data, error } = await db().from("invitations").select("*").order("created_at", { ascending: false });
  if (error) fail(error);
  const rows: InvitationRow[] = [];
  const published: PublishMap = {};
  const deleted: DeletedMap = {};
  for (const r of data ?? []) {
    const s = splitRow(r);
    rows.push(s.row);
    published[s.row.id] = s.published;
    if (s.deletedAt) deleted[s.row.id] = s.deletedAt;
  }
  knownPub = { ...published };
  knownDel = { ...deleted };
  return { rows, published, deleted };
}

export async function fetchInvitation(id: string): Promise<InvitationRow | null> {
  if (!USE_SUPABASE) return local(() => getDemoInvitations().find((x) => x.id === id) ?? null);
  const { data, error } = await db().from("invitations").select("*").eq("id", id).maybeSingle();
  if (error) fail(error);
  return data ? splitRow(data).row : null;
}

/** Creates or updates one invitation. The link ID (details.customId) must be unique. */
export async function saveInvitation(record: InvitationRow): Promise<InvitationRow> {
  if (!USE_SUPABASE) return local(() => saveDemoInvitation(record));
  const { data, error } = await db()
    .from("invitations")
    .upsert({
      id: record.id,
      slug: slugOf(record),
      groom_name: record.groom_name ?? null,
      bride_name: record.bride_name ?? null,
      event_date: record.event_date ?? null,
      template_id: record.template_id != null ? String(record.template_id) : null,
      template_name: record.template_name ?? null,
      details: record.details ?? {},
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") throw new ApiError("That link ID is already used by another invitation.");
    fail(error);
  }
  return splitRow(data!).row;
}

/** Permanently removes an invitation (used when the trash is emptied after 30 days). */
export async function deleteInvitation(id: string): Promise<void> {
  if (!USE_SUPABASE) return local(() => deleteDemoInvitation(id));
  const { error } = await db().from("invitations").delete().eq("id", id);
  if (error) fail(error);
}

/** Writes the "published" flags. Takes the whole map and saves only what changed. */
export async function savePublished(map: PublishMap): Promise<void> {
  if (!USE_SUPABASE) return local(() => void localStorage.setItem(LS_PUB, JSON.stringify(map)));
  const changed = Object.keys(map).filter((id) => (map[id] !== false) !== (knownPub[id] !== false));
  const results = await Promise.all(changed.map((id) => db().from("invitations").update({ published: map[id] !== false }).eq("id", id)));
  const bad = results.find((r) => r.error);
  if (bad) fail(bad.error);
  knownPub = { ...map };
}

/** Writes the trash flags. Takes the whole map and saves only what changed. */
export async function saveDeleted(map: DeletedMap): Promise<void> {
  if (!USE_SUPABASE) return local(() => void localStorage.setItem(LS_DEL, JSON.stringify(map)));
  const ids = new Set([...Object.keys(map), ...Object.keys(knownDel)]);
  const changed = [...ids].filter((id) => map[id] !== knownDel[id]);
  const results = await Promise.all(changed.map((id) =>
    db().from("invitations").update({ deleted_at: map[id] ? new Date(map[id]).toISOString() : null }).eq("id", id)));
  const bad = results.find((r) => r.error);
  if (bad) fail(bad.error);
  knownDel = { ...map };
}

/* ---------- public invitation (no login needed) ---------- */
export interface PublicInvitation { invitation: InvitationRow; html: string }

/** The page a customer opens from the shared link /i/<slug>. Only published, non-deleted invitations are returned. */
export async function fetchPublicInvitation(slug: string): Promise<PublicInvitation | null> {
  if (!USE_SUPABASE) {
    return local(() => {
      const lower = slug.toLowerCase();
      const pub = readJSON<PublishMap>(LS_PUB, {});
      const del = normDeleted(readJSON<unknown>(LS_DEL, {}));
      const row = getDemoInvitations().find((x) => slugOf(x).toLowerCase() === lower && pub[x.id] !== false && !(x.id in del));
      if (!row) return null;
      const tpl = demoTemplates.find((t) => t.id === String(row.template_id ?? row.details?.templateId));
      return tpl ? { invitation: row, html: tpl.html_code } : null;
    });
  }
  const { data, error } = await db().rpc("get_public_invitation", { p_slug: slug });
  if (error) fail(error);
  if (!data) return null;
  const { html_code, ...invitation } = data as Record<string, any>;
  return { invitation: invitation as InvitationRow, html: html_code || "" };
}

/* ---------- enquiries ---------- */
const toEnquiry = (r: Record<string, any>): Enquiry => ({
  id: r.id, name: r.name ?? "", phone: r.phone ?? "", email: r.email ?? "", message: r.message ?? "",
  createdAt: r.created_at, status: r.status ?? "new", note: r.note ?? "", followUpDate: r.follow_up_date ?? "",
  history: Array.isArray(r.history) ? r.history : [],
});

export async function fetchEnquiries(): Promise<Enquiry[]> {
  if (!USE_SUPABASE) return local(() => INITIAL_ENQUIRIES);
  const { data, error } = await db().from("enquiries").select("*").order("created_at", { ascending: false });
  if (error) fail(error);
  return (data ?? []).map(toEnquiry);
}

export async function saveEnquiry(e: Enquiry): Promise<void> {
  if (!USE_SUPABASE) return;
  const { error } = await db().from("enquiries")
    .update({ status: e.status, note: e.note, follow_up_date: e.followUpDate || null, history: e.history })
    .eq("id", e.id);
  if (error) fail(error);
}
