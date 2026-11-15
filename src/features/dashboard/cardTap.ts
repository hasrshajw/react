import { useRef, type MouseEvent, type TouchEvent } from "react";

const INTERACTIVE = "button, a, input, label, select, textarea";

/** Phone cards open their menu (or toggle their selection) when the card itself is tapped.
 *  Taps on a button, link or checkbox inside the card keep doing their own job. */
export function onCardTap(e: MouseEvent<HTMLElement>, fn: () => void) {
  if ((e.target as HTMLElement).closest(INTERACTIVE)) return;
  fn();
}

/** Long-press on a phone card (about half a second, finger kept still). `bind(fn)` gives the touch props for one card;
 *  `consumed()` is true once right after a long press, so the click that follows it can be ignored. */
export function useLongPress(ms = 500) {
  const st = useRef({ timer: 0, x: 0, y: 0, fired: false });
  const cancel = () => window.clearTimeout(st.current.timer);
  return {
    bind: (fn: () => void) => ({
      onTouchStart: (e: TouchEvent<HTMLElement>) => {
        if ((e.target as HTMLElement).closest(INTERACTIVE)) return;
        const t = e.touches[0];
        st.current.x = t.clientX; st.current.y = t.clientY; st.current.fired = false;
        cancel();
        st.current.timer = window.setTimeout(() => { st.current.fired = true; fn(); }, ms);
      },
      onTouchMove: (e: TouchEvent<HTMLElement>) => {
        const t = e.touches[0];
        if (Math.hypot(t.clientX - st.current.x, t.clientY - st.current.y) > 10) cancel();
      },
      onTouchEnd: cancel,
      onTouchCancel: cancel,
      /* Android shows its own menu on a long press; the card has its own. */
      onContextMenu: (e: MouseEvent<HTMLElement>) => e.preventDefault(),
    }),
    consumed: () => { const f = st.current.fired; st.current.fired = false; return f; },
  };
}
