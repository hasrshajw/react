import { useCallback, useEffect, useRef, useState } from "react";
import { fetchPendingReviewCount } from "../../../lib/api";

/** Pending change-request count for the sidebar badge on every admin page (B5).
 *  Same shape as `useEnquiryBadge`: poll while the tab is visible, and `report(n)` lets
 *  the Reviews page set the number immediately after a load or a decision. */
export function useReviewBadge(intervalMs = 60000) {
  const [count, setCount] = useState(0);
  const seq = useRef(0);

  const report = useCallback((n: number) => { seq.current++; setCount(n); }, []);

  useEffect(() => {
    let live = true;
    let inflight = false;
    const load = () => {
      if (inflight || document.hidden) return;
      inflight = true;
      const started = seq.current;
      fetchPendingReviewCount().then(
        (n) => { if (live && seq.current === started) setCount(n); },
        () => { /* keep the last number; the next poll tries again */ },
      ).finally(() => { inflight = false; });
    };
    const onVisible = () => { if (!document.hidden) load(); };
    load();
    const t = setInterval(load, intervalMs);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", load);
    return () => {
      live = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", load);
    };
  }, [intervalMs]);

  return { count, report };
}
