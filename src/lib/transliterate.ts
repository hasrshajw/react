import { transliterateOffline } from "./telugu";

/* Google Input Tools endpoint (the one behind Google's own Telugu typing).
   One request per word, results cached. On any failure we fall back to the
   offline rules so the Telugu field is never left empty. */
const ENDPOINT = "https://inputtools.google.com/request";
const TIMEOUT_MS = 3500;
const cache = new Map<string, string>();
let online = true; /* flips to false after a failure so we stop paying the timeout on every keystroke */
let retryAt = 0;

async function fetchWord(w: string, signal: AbortSignal): Promise<string> {
  const url = `${ENDPOINT}?text=${encodeURIComponent(w)}&itc=te-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8&app=schedy`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as [string, Array<[string, string[]]>?];
  const best = json?.[0] === "SUCCESS" ? json[1]?.[0]?.[1]?.[0] : undefined;
  if (!best) throw new Error("No suggestion");
  return best;
}

async function oneWord(w: string): Promise<string> {
  if (!/[A-Za-z]/.test(w)) return w;
  const hit = cache.get(w);
  if (hit) return hit;
  let result = "";
  if (online || Date.now() > retryAt) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      result = await fetchWord(w, ctrl.signal);
      online = true;
    } catch {
      online = false;
      retryAt = Date.now() + 60_000;
    } finally {
      clearTimeout(timer);
    }
  }
  if (!result) result = transliterateOffline(w);
  cache.set(w, result);
  return result;
}

/** English text -> Telugu script. Never rejects; always resolves with the best available result. */
export async function transliterate(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/(\s+)/);
  const out = await Promise.all(parts.map((p) => (/^\s+$/.test(p) ? p : oneWord(p))));
  return out.join("");
}
