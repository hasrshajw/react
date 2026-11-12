import { coupleName, dayDiff, getInviteLink, getViews, isPast, csvCell } from "../../lib/dashboardData";
import { downloadBlob } from "../../lib/download";
import type { InvitationRow } from "../../types/dashboard";
import { uid } from "../../lib/uid";

export type StatusFilter = "all" | "published" | "draft";
export type WhenFilter = "all" | "upcoming" | "week" | "past";

/* URL state: ?status=draft&when=week&sort=date&template=classic&q=name
   Default values are left out of the URL so it stays short. */
export const DEFAULTS = { status: "all", when: "all", sort: "recent", template: "all", q: "" } as const;
export type ParamKey = keyof typeof DEFAULTS;

export const oneOf = <T extends string>(v: string | null, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(v ?? "") ? (v as T) : fallback;

export const WHEN_FILTERS: [Exclude<WhenFilter, "all">, string, string][] = [
  ["upcoming", "Upcoming", "Events in the next 30 days"],
  ["week", "This week", "Events in the next 7 days"],
  ["past", "Past", "Events that have already happened"],
];

/* Invitations without an event date never match a date filter. */
export const dateMatch = (x: InvitationRow, w: WhenFilter) => {
  if (w === "all") return true;
  const d = dayDiff(x.event_date);
  if (d === null) return false;
  if (w === "upcoming") return d >= 0 && d <= 30;
  if (w === "week") return d >= 0 && d <= 7;
  if (w === "past") return d < 0;
  return true;
};

export const templateOf = (x: InvitationRow) => {
  const name = x.template_name || "Custom invitation";
  return { key: String(x.template_id || name), name };
};

export { uid };

const todayStamp = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Downloads the given invitations as a CSV (Excel-safe, with a BOM). */
export function exportInvitationsCsv(rows: InvitationRow[], isPub: (x: InvitationRow) => boolean) {
  const head = ["Couple", "Groom", "Bride", "Event date", "Status", "Template", "Views", "Link", "Created"];
  const body = rows.map((x) => {
    const live = isPub(x);
    const statusText = isPast(x) ? (live ? "Completed" : "Archived") : live ? "Published" : "Draft";
    return [
      coupleName(x), x.groom_name || "", x.bride_name || "", x.event_date || "", statusText, templateOf(x).name,
      getViews(x), live ? getInviteLink(x) : "", x.created_at || "",
    ];
  });
  const lines = [head, ...body].map((r) => r.map(csvCell).join(","));
  downloadBlob(new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), `invitations-${todayStamp()}.csv`);
}

export const plural = (n: number) => (n === 1 ? "invitation" : "invitations");
