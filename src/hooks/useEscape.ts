import { useEffect, useRef, type RefObject } from "react";

const escStack: object[] = [];
export const useEscape = (active: boolean, fn: () => void) => {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!active) return;
    const token: object = {};
    escStack.push(token);
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && escStack[escStack.length - 1] === token) ref.current();
    };
    window.addEventListener("keydown", h);
    return () => {
      window.removeEventListener("keydown", h);
      const i = escStack.indexOf(token);
      if (i > -1) escStack.splice(i, 1);
    };
  }, [active]);
};

/* Keeps Tab inside a dialog and restores focus when it closes. */
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
export const useFocusTrap = (ref: RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const prev = document.activeElement as HTMLElement | null;
    const items = () => [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null);
    (items()[0] || root).focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const els = items();
      if (!els.length) { e.preventDefault(); return; }
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === root)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    root.addEventListener("keydown", onKey);
    return () => {
      root.removeEventListener("keydown", onKey);
      if (prev && prev !== document.body && prev.isConnected) prev.focus?.();
    };
  }, [ref]);
};

/* =========================================================
   SMALL COMPONENTS
   ========================================================= */
