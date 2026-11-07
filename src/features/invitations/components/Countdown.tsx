import { dayDiff, whenText } from "../../../lib/dashboardData";
import type { InvitationRow } from "../../../types/dashboard";

export function Countdown({ x, live }: { x: InvitationRow; live: boolean }) {
  const d = dayDiff(x.event_date);
  if (d === null) return null;
  if (d < 0) return <small className="when">{whenText(d)}</small>;
  const tone = d <= 7 ? (live ? "warn" : "danger") : "info";
  const title = !live && d <= 7 ? `Still a draft with the event ${whenText(d).toLowerCase()}. Publish it so guests can open the link.` : undefined;
  return <span className={`cd ${tone}`} title={title}>{whenText(d)}</span>;
}
