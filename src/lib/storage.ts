/* Small, failure-safe wrappers around localStorage. */
export const readJSON = <T,>(key: string, fallback: T): T => {
  try { return (JSON.parse(localStorage.getItem(key) as string) as T) ?? fallback; } catch { return fallback; }
};
/** Returns false when the browser refuses the write (quota full, private mode). */
export const writeJSON = (key: string, value: unknown): boolean => {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
};
export const removeKey = (key: string): void => {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
};
/** Removes every key that starts with `prefix` (used when signing out, see lib/userData.ts). */
export const removeKeysWithPrefix = (prefix: string): void => {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
};
