import { downloadBlob } from "./download";
import type {
  ActivityRange, DeletedMap, Enquiry, EnquiryStatus, InvitationRow, Notify, SortKey, TableFilter,
} from "../types/dashboard";

export const ACTIVITY: Record<ActivityRange, { label: string; views: number; rsvps: number; shares: number }> = {
  "7": { label: "7 days", views: 312, rsvps: 18, shares: 41 },
  "30": { label: "30 days", views: 1284, rsvps: 86, shares: 203 },
  all: { label: "All time", views: 5420, rsvps: 342, shares: 812 },
};

export const H = 3600000;
export const DAY = 24 * H;
export const ago = (h: number) => new Date(Date.now() - h * H).toISOString();
export const isoDay = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/* Enquiries submitted through the public website's "get a website" form.
   status: "new" | "followup" | "called" | "cancelled"
   createdAt is an ISO timestamp; history is [{ status, at }]. */
export const INITIAL_ENQUIRIES: Enquiry[] = [
  { id: "e1", name: "Ravi Kumar", phone: "+91 98765 43210", email: "ravi.kumar@example.com", message: "I run a wedding planning business and want a website with invitation templates and an enquiry form.", createdAt: ago(2), status: "new", note: "", followUpDate: "", history: [] },
  { id: "e2", name: "Lakshmi Devi", phone: "+91 91234 56780", email: "lakshmi.devi@example.com", message: "Need a Telugu and English website for my catering service. What is the price?", createdAt: ago(26), status: "new", note: "", followUpDate: "", history: [] },
  { id: "e3", name: "Sai Prasad", phone: "+91 99887 66554", email: "sai.prasad@example.com", message: "Interested in an online invitation website. Please call after 6 PM.", createdAt: ago(28), status: "followup", note: "Prefers evening calls.", followUpDate: isoDay(0), history: [{ status: "followup", at: ago(20) }] },
  { id: "e4", name: "Anitha Reddy", phone: "+91 90000 11223", email: "anitha.reddy@example.com", message: "Looking for a website for my photography studio with a gallery.", createdAt: ago(50), status: "called", note: "", followUpDate: "", history: [{ status: "called", at: ago(46) }] },
  { id: "e5", name: "Mahesh Babu", phone: "+91 98480 12345", email: "mahesh.babu@example.com", message: "Want to know the delivery time for a 5 page website.", createdAt: ago(74), status: "followup", note: "", followUpDate: isoDay(-1), history: [{ status: "followup", at: ago(70) }] },
  { id: "e6", name: "Priya Varma", phone: "+91 97012 34567", email: "priya.varma@example.com", message: "Need a website for my boutique with WhatsApp ordering.", createdAt: ago(122), status: "called", note: "", followUpDate: "", history: [{ status: "called", at: ago(118) }] },
];

/* =========================================================
   HELPERS
   ========================================================= */
export const LS_PUB = "schedy_published";
export const LS_DEL = "schedy_deleted_ids";
export const LS_NOTE = "schedy_hide_demo_note";
export const LS_AUTO = "schedy_auto_refresh";
export const readJSON = <T,>(k: string, f: T): T => { try { return JSON.parse(localStorage.getItem(k) ?? "null") ?? f; } catch { return f; } };
export const writeJSON = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };
/* Older versions stored deleted ids as an array; now it is { id: deletedAtMs }. */
export const normDeleted = (v: unknown): DeletedMap =>
  Array.isArray(v) ? Object.fromEntries(v.map((id: string) => [id, Date.now()])) : v && typeof v === "object" ? (v as DeletedMap) : {};

export const PAGE_SIZE = 8;
export const TRASH_DAYS = 30;

export const fmt = (n: number | string | null | undefined) => Number(n || 0).toLocaleString("en-IN");
export const fmtDate = (d: string | number | null | undefined) => {
  if (d === null || d === undefined || d === "") return "";
  const dt = typeof d === "number" ? new Date(d) : /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + "T00:00:00") : new Date(d);
  return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};
export const fmtDateTime = (iso: string | number) => {
  const dt = new Date(iso);
  return isNaN(dt.getTime()) ? "" : dt.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
};
export const timeAgo = (iso: string | number, now: number) => {
  const t = typeof iso === "number" ? iso : Date.parse(iso);
  if (isNaN(t)) return "";
  const m = Math.floor((now - t) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 30) return `${d}d ago`;
  return fmtDate(t);
};

export const initials = (x: InvitationRow) =>
  `${(x.groom_name || "G").trim().charAt(0)}${(x.bride_name || "B").trim().charAt(0)}`.toUpperCase();
export const coupleName = (x: InvitationRow) => `${x.groom_name || "Groom"} & ${x.bride_name || "Bride"}`;

/* Uses x.views when present, otherwise a stable fake number per invitation. */
export const getViews = (x: InvitationRow) => {
  if (typeof x.views === "number") return x.views;
  const s = String(x.id ?? "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return 40 + h;
};

/* Public link of an invitation. Change this if your live route is different. */
export const getInviteLink = (x: InvitationRow) => `${window.location.origin}/i/${x.details?.customId || x.id}`;

export const dayDiff = (d?: string | null): number | null => {
  if (!d) return null;
  const a = new Date(d + "T00:00:00");
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((a.getTime() - t.getTime()) / 86400000);
};
export const whenText = (n: number | null) =>
  n === null ? "" : n === 0 ? "Today" : n === 1 ? "Tomorrow" : n === -1 ? "Yesterday" : n > 0 ? `In ${n} days` : `${-n} days ago`;
export const isPast = (x: InvitationRow) => { const d = dayDiff(x.event_date); return d !== null && d < 0; };

/* Table filters (set by the KPI cards and the "Needs attention" strip). */
export const FILTER_LABEL: Record<Exclude<TableFilter, "all">, string> = {
  published: "Published",
  draft: "Drafts",
  draftSoon: "Drafts with an event in the next 7 days",
  noViews: "Published with no views",
};

/* Enquiry helpers */
export const ENQ_LABEL: Record<EnquiryStatus, string> = { new: "New", followup: "Follow-up", called: "Called", cancelled: "Cancelled" };
export const followDue = (e: Enquiry): "overdue" | "today" | "upcoming" | null => {
  if (e.status !== "followup" || !e.followUpDate) return null;
  const today = isoDay(0);
  return e.followUpDate < today ? "overdue" : e.followUpDate === today ? "today" : "upcoming";
};
export const waLink = (e: Enquiry) => {
  let n = e.phone.replace(/\D/g, "");
  if (n.length === 10) n = "91" + n;
  const first = e.name.split(" ")[0];
  const text = `Hi ${first}, thanks for your enquiry about a website with Schedy. When is a good time to talk?`;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
};
export const csvCell = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@]/.test(s) && !/^\+?[\d\s]+$/.test(s)) s = "'" + s; // avoid spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};
export const exportCsv = (rows: Enquiry[], notify: Notify) => {
  const head = ["Name", "Phone", "Email", "Status", "Received", "Follow-up date", "Message", "Note"];
  const lines = [head, ...rows.map((e) => [e.name, e.phone, e.email, ENQ_LABEL[e.status], e.createdAt, e.followUpDate || "", e.message, e.note || ""])]
    .map((r) => r.map(csvCell).join(","));
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `site-enquiries-${isoDay(0)}.csv`);
  notify(`Exported ${rows.length} enquiries`);
};
export const copyText = async (text: string, okMsg: string, notify: Notify) => {
  try { await navigator.clipboard.writeText(text); }
  catch { window.prompt("Copy", text); }
  notify(okMsg);
};

/* Escape closes only the top-most layer (modal > panel). */

/* Opens WhatsApp with the invitation link prefilled. */
export const shareOnWhatsApp = (x: InvitationRow) => {
  const text = `You are invited! ${coupleName(x)}\n${getInviteLink(x)}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
};

/* Status chip shown next to a couple's name: [css class, label]. */
export const statusChip = (x: InvitationRow, live: boolean): [string, string] => {
  const past = isPast(x);
  return past ? (live ? ["done", "Completed"] : ["draft", "Archived"]) : live ? ["ok", "Published"] : ["draft", "Draft"];
};

/* Sorts a copy of the rows: newest first, soonest event first, or most viewed first. */
export const sortInvitations = (rows: InvitationRow[], sort: SortKey): InvitationRow[] => {
  const r = [...rows];
  if (sort === "recent") {
    const t = (x: InvitationRow) => Date.parse(x.created_at || x.createdAt || "") || 0;
    r.sort((a, b) => t(b) - t(a));
  }
  if (sort === "date") r.sort((a, b) => (a.event_date || "9999").localeCompare(b.event_date || "9999"));
  if (sort === "views") r.sort((a, b) => getViews(b) - getViews(a));
  return r;
};

/* Id of the most viewed invitation (gets the "Top" badge), or null with fewer than two. */
export const topViewedId = (rows: InvitationRow[]): string | null =>
  rows.length < 2 ? null : rows.reduce((best, x) => (getViews(x) > getViews(best) ? x : best), rows[0]).id;
