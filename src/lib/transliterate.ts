import { transliterateOffline } from "./telugu";

/* English -> Telugu script for the Telugu name and venue fields.

   Service (decision for M-2): the Google Input Tools endpoint that Google's own Telugu typing uses. It is NOT a
   documented, supported API: there is no key, no quota statement and no promise it keeps working, so the offline
   rules in ./telugu stay as the fallback and the Telugu field is never left empty. Words the person types are sent to
   Google, one request per word, so the privacy policy has to say so. Set VITE_TRANSLITERATION=offline to turn the
   online lookup off (the offline rules alone are then used and nothing is sent). See README, "Telugu typing".

   Failures are told apart (M-2):
   - "No suggestion" (the service answered, but had no candidate for this word) is a normal answer. It does not mark the
     service as down, and the offline result for that word is remembered.
   - A real failure (network error, timeout, HTTP error, a body that is not the expected shape) pauses online lookups for
     RETRY_MS so typing does not wait on the timeout for every keystroke. The offline result is used for that word but is
     not remembered, so the word is looked up online again once the service is back. */
const ENDPOINT = "https://inputtools.google.com/request";
const TIMEOUT_MS = 3500;
const RETRY_MS = 60_000;
const CACHE_MAX = 1000;
const ONLINE_ENABLED = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_TRANSLITERATION !== "offline";

const cache = new Map<string, string>();
let online = true;
let retryAt = 0;

function remember(word: string, result: string): void {
  cache.set(word, result);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string); /* oldest first */
}

/** The best suggestion, or null when the service answered without one. Throws on any real failure. */
async function fetchWord(w: string, signal: AbortSignal): Promise<string | null> {
  const url = `${ENDPOINT}?text=${encodeURIComponent(w)}&itc=te-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8&app=schedy`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as unknown;
  if (!Array.isArray(json) || json[0] !== "SUCCESS") throw new Error("Unexpected answer");
  const best = (json[1] as Array<[string, string[]]> | undefined)?.[0]?.[1]?.[0];
  return typeof best === "string" && best ? best : null;
}

async function oneWord(w: string): Promise<string> {
  if (!/[A-Za-z]/.test(w)) return w;
  const hit = cache.get(w);
  if (hit !== undefined) return hit;

  let answered = false;
  let suggestion: string | null = null;
  if (ONLINE_ENABLED && (online || Date.now() >= retryAt)) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      suggestion = await fetchWord(w, ctrl.signal);
      answered = true;
      online = true;
    } catch {
      online = false;
      retryAt = Date.now() + RETRY_MS;
    } finally {
      clearTimeout(timer);
    }
  }
  if (suggestion) { remember(w, suggestion); return suggestion; }
  const offline = transliterateOffline(w);
  if (answered) remember(w, offline); /* a real "no suggestion"; after an outage the word is tried online again later */
  return offline;
}

/** English text -> Telugu script. Never rejects; always resolves with the best available result. */
export async function transliterate(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/(\s+)/);
  const out = await Promise.all(parts.map((p) => (/^\s+$/.test(p) ? p : oneWord(p))));
  return out.join("");
}
