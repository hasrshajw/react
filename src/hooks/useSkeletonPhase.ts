import { useEffect, useRef, useState } from "react";

/** "idle": real content. "hold": loading, but not for long enough to show a skeleton yet (reserve the space,
 *  draw nothing). "show": skeleton visible. */
export type SkPhase = "idle" | "hold" | "show";

/** Stops skeletons from flashing or flickering.
 *  - A load that finishes within `delay` ms never shows a skeleton at all.
 *  - Once a skeleton is on screen it stays for at least `minShow` ms, so it never blinks away.
 *  Render the skeleton while the phase is not "idle", and hide it while the phase is "hold" (class `sk-hold`),
 *  so the layout does not move when it appears. */
export function useSkeletonPhase(loading: boolean, delay = 150, minShow = 300): SkPhase {
  const [phase, setPhase] = useState<SkPhase>(loading ? "hold" : "idle");
  const shownAt = useRef<number | null>(null);

  useEffect(() => {
    if (loading) {
      setPhase((p) => (p === "idle" ? "hold" : p));
      if (shownAt.current !== null) return; // already visible: just keep it
      const t = setTimeout(() => { shownAt.current = Date.now(); setPhase("show"); }, delay);
      return () => clearTimeout(t);
    }
    if (shownAt.current === null) { setPhase("idle"); return; } // finished before it ever showed: no flash
    const left = Math.max(0, minShow - (Date.now() - shownAt.current));
    const t = setTimeout(() => { shownAt.current = null; setPhase("idle"); }, left);
    return () => clearTimeout(t);
  }, [loading, delay, minShow]);

  return phase;
}
