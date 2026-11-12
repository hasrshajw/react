import { useCallback, useEffect, useRef, useState } from "react";
import { fetchNewEnquiryCount } from "../../../lib/api";

/** M-6: the number of "new" enquiries for the navbar badge and the tab title, kept fresh on every admin page.
 *  It asks the server for a count (no rows) every `intervalMs` while the tab is visible, and again when the tab
 *  becomes visible or gets focus. `report(n)` lets a page that already knows the number (the Dashboard, after a
 *  status change) set it at once; a poll that started before that is ignored, so an older answer cannot overwrite it. */
export function useEnquiryBadge(intervalMs = 60000) {
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
      fetchNewEnquiryCount().then(
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

  /* Tab title: "(3) Schedy Admin". The count prefix is taken off first, so it never stacks. */
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s/, "");
    document.title = count > 0 ? `(${count}) ${base}` : base;
    return () => { document.title = base; };
  }, [count]);

  return { count, report };
}
