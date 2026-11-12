import { downloadBlob } from "./download";
import { readJSON, writeJSON } from "./storage";
import { invitationUrl } from "./links";
import type {
  Enquiry, EnquiryStatus, InvitationRow, Notify, SortKey, TableFilter,
} from "../types/dashboard";

export const H = 3600000;
export const DAY = 24 * H;
export const isoDay = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/* =========================================================
   HELPERS
   ========================================================= */
export const LS_AUTO = "schedy_auto_refresh";
/* One implementation of these two lives in lib/storage.ts (task L-6); re-exported so existing imports keep working. */
export { readJSON, writeJSON };

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

/* The real view counter kept in the database (the public page bumps it on each open). */
export const getViews = (x: InvitationRow) => (typeof x.views === "number" ? x.views : 0);

/* Public link of an invitation. Change this if your live route is different. */
export const getInviteLink = (x: InvitationRow) => invitationUrl(String(x.details?.customId || x.id));

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
/** Phone number for wa.me: digits only, with India's country code (91) added to a local number (task L-4).
 *  Local forms handled: `9876543210`, `09876543210` (trunk 0) and `0091 98765 43210` / `00` + country code. */
export const waNumber = (phone: string): string => {
  let n = phone.replace(/\D/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  else if (n.length === 11 && n.startsWith("0")) n = n.slice(1);
  if (n.length === 10) n = "91" + n;
  return n;
};
export const waLink = (e: Enquiry) => {
  const first = (e.name || "").trim().split(/\s+/)[0] || "";
  const text = `${first ? `Hi ${first}` : "Hi"}, thanks for your enquiry about a website with Schedy. When is a good time to talk?`;
  return `https://wa.me/${waNumber(e.phone || "")}?text=${encodeURIComponent(text)}`;
};
/** True when a spreadsheet could read the text as a formula (task L-3). Excel and Sheets treat a cell that starts with
 *  `=`, `+`, `-`, `@`, a tab or a carriage return that way. Left alone because they are harmless and common:
 *  a phone number written with a plus (`+91 98765-43210`), a plain number (`-5`, `-2.5`) and a dash used as a bullet
 *  (`- call me`) that has none of the characters a formula needs (`= + @ | ( )`). */
export const looksLikeFormula = (s: string): boolean => {
  const c = s[0];
  if (c === "=" || c === "@" || c === "\t" || c === "\r") return true;
  if (c === "+") return !/^\+[\d ()-]+$/.test(s);
  if (c === "-") return !(/^-\d+([.,]\d+)?$/.test(s) || /^- [^=+@|()\t\r\n]*$/.test(s));
  return false;
};
export const csvCell = (v: unknown) => {
  let s = String(v ?? "");
  if (looksLikeFormula(s)) s = "'" + s; // avoid spreadsheet formula injection
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
