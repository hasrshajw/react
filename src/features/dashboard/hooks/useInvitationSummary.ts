import { useEffect, useState } from "react";
import { fetchInvitationSummary, type InvitationSummary } from "../../../lib/api";

/** Counts for the stat cards and tabs, read from the database. It reads again when `refreshKey` changes (a refresh or a finished save).
 *  The last answer stays on screen meanwhile, and a failed read keeps it (the page then falls back to counting the loaded rows). */
export function useInvitationSummary(refreshKey: unknown, enabled = true): InvitationSummary | null {
  const [summary, setSummary] = useState<InvitationSummary | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    fetchInvitationSummary().then((s) => { if (live) setSummary(s); }, () => { /* keep what we have */ });
    return () => { live = false; };
  }, [refreshKey, enabled]);
  return summary;
}
