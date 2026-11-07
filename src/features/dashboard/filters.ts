import { dayDiff, getViews } from "../../lib/dashboardData";
import type { InvitationRow, TableFilter } from "../../types/dashboard";

/** Does an invitation belong in the table for a Dashboard filter? `live` = published. */
export function matchesFilter(x: InvitationRow, f: TableFilter, live: boolean): boolean {
  if (f === "all") return true;
  const d = dayDiff(x.event_date);
  if (f === "published") return live;
  if (f === "draft") return !live;
  if (f === "draftSoon") return !live && d !== null && d >= 0 && d <= 7;
  if (f === "noViews") return live && (d === null || d >= 0) && getViews(x) === 0;
  return true;
}
