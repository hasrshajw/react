import { useCallback, useEffect, useRef } from "react";
import { transliterate } from "../../../lib/transliterate";

/* Debounced English -> Telugu. A newer request for the same field cancels the
   older one, and a late answer never overwrites what the user typed since. */
export function useTransliteration() {
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const latest = useRef(new Map<string, number>());
  const seq = useRef(0);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach((x) => clearTimeout(x));
  }, []);

  return useCallback((key: string, value: string, apply: (telugu: string) => void) => {
    const old = timers.current.get(key);
    if (old) clearTimeout(old);
    const my = ++seq.current;
    latest.current.set(key, my);
    if (!value.trim()) { apply(""); return; }
    timers.current.set(key, setTimeout(async () => {
      const result = await transliterate(value);
      if (latest.current.get(key) === my && result) apply(result);
    }, 450));
  }, []);
}
