import { useEffect, useState } from "react";
import { readJSON, writeJSON } from "../lib/dashboardData";

/** How many skeleton rows to draw. Remembers the row count of the last visit, so the skeleton
 *  is about the same height as the real list and nothing jumps when the data arrives.
 *  `fallback` is used on the very first visit, before there is anything to remember.
 *  `min` keeps the skeleton from collapsing to a single row when the last visit had a short
 *  (or empty, or failed) list: a skeleton with one row looks broken, not "loading". */
export function useRowHint(key: string, count: number, loading: boolean, max: number, fallback = max, min = 3): number {
  const storeKey = `schedy-rows:${key}`;
  const floor = Math.min(min, max);
  const clamp = (n: number) => Math.min(max, Math.max(floor, Math.round(n)));
  const [hint] = useState(() => {
    const n = Number(readJSON<number>(storeKey, fallback));
    return Number.isFinite(n) ? clamp(n) : clamp(fallback);
  });
  useEffect(() => {
    /* An empty list (or a failed load) says nothing about how long the list usually is. */
    if (!loading && count > 0) writeJSON(storeKey, clamp(count));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, count, max, floor, storeKey]);
  return hint;
}
