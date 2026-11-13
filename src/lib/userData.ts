/* M-1: everything the app keeps for the signed-in person (create-form drafts in localStorage, and in-memory
   caches such as the publish/trash flags in lib/api.ts) is dropped when the person signs out, when Supabase ends
   the login, or when a different account signs in. Otherwise the next person on the same browser would see
   the previous person's unsaved invitation, and the old flag maps could be compared against the wrong rows.
   Modules with in-memory state register a reset function; resetUserData() runs them all and clears the drafts.
   It is safe to call more than once. */
import { removeKeysWithPrefix } from "./storage";
import { LS_CLIENT_DRAFT, LS_DRAFT } from "./storageKeys";

const resetters = new Set<() => void>();

/** Registers a function that clears one module's per-user memory. Returns a function that unregisters it. */
export function onUserDataReset(fn: () => void): () => void {
  resetters.add(fn);
  return () => { resetters.delete(fn); };
}

export function resetUserData(): void {
  removeKeysWithPrefix(LS_DRAFT);
  removeKeysWithPrefix(LS_CLIENT_DRAFT);
  for (const fn of resetters) {
    try { fn(); } catch { /* one failing reset must not stop the others */ }
  }
}
