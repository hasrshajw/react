import { useEffect, useState } from "react";
import { readJSON, writeJSON } from "../lib/dashboardData";

/** How many skeleton rows to draw. Remembers the row count of the last visit, so the skeleton
 *  is the same height as the real list and nothing jumps when the data arrives.
 *  `fallback` is used on the very first visit, before there is anything to remember. */
export function useRowHint(key: string, count: number, loading: boolean, max: number, fallback = max): number {
  const storeKey = `schedy-rows:${key}`;
  const [hint] = useState(() => {
    const n = Number(readJSON<number>(storeKey, fallback));
    return Number.isFinite(n) ? Math.min(max, Math.max(1, Math.round(n))) : fallback;
  });
  useEffect(() => {
    if (!loading) writeJSON(storeKey, Math.min(max, Math.max(1, count)));
  }, [loading, count, max, storeKey]);
  return hint;
}
