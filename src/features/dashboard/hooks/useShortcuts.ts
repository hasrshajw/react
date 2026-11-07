import { useEffect, useRef } from "react";

/** Single-key page shortcuts ("/" to search, "N" for new...). Ignored while typing or while `blocked`. */
export function useShortcuts(keys: Record<string, () => void>, blocked: boolean) {
  const ref = useRef(keys);
  ref.current = keys;
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      if ((e.target as Element | null)?.closest?.("input, textarea, select, [contenteditable='true']")) return;
      if (blocked) return;
      const fn = ref.current[e.key.toLowerCase()];
      if (fn) { e.preventDefault(); fn(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [blocked]);
}
