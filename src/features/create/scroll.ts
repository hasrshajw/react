/* Section navigation: one place owns the animated scroll, and tells the nav
   (via an event) which tab was chosen, so the page itself never re-renders. */
const EVENT = "create:section";
const lock = { until: 0 };
let frame = 0;

export const isScrollLocked = () => Date.now() < lock.until;
export const getScrollRoot = () => document.querySelector<HTMLElement>(".main-content");

export function onSectionChosen(fn: (id: string) => void): () => void {
  const h = (e: Event) => fn((e as CustomEvent<string>).detail);
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}

export function scrollToSection(id: string): void {
  const el = document.getElementById(`sec-${id}`);
  const root = getScrollRoot();
  if (!el || !root) return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: id }));
  cancelAnimationFrame(frame);
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  const max = root.scrollHeight - root.clientHeight;
  const to = Math.max(0, Math.min(max, el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - margin));
  const from = root.scrollTop;
  const dist = to - from;
  if (reduce || Math.abs(dist) < 2) { lock.until = Date.now() + 150; root.scrollTop = to; return; }
  const dur = Math.min(650, 280 + Math.abs(dist) * 0.12);
  const t0 = performance.now();
  const stop = () => { cancelAnimationFrame(frame); lock.until = 0; };
  root.addEventListener("wheel", stop, { once: true, passive: true });
  root.addEventListener("touchstart", stop, { once: true, passive: true });
  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / dur);
    lock.until = Date.now() + 150;
    root.scrollTop = from + dist * (1 - Math.pow(1 - t, 3));
    if (t < 1) frame = requestAnimationFrame(step);
    else { root.removeEventListener("wheel", stop); root.removeEventListener("touchstart", stop); }
  };
  frame = requestAnimationFrame(step);
}
