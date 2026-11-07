/* Offline Latin -> Telugu transliteration (rule based, ITRANS-like).
   It is the fallback when the online service is unreachable, so the Telugu
   fields always fill in. It is approximate for long or unusual names. */
const VOWELS: Record<string, [string, string]> = {
  aa: ["ఆ", "ా"], ai: ["ఐ", "ై"], au: ["ఔ", "ౌ"], ee: ["ఈ", "ీ"], ii: ["ఈ", "ీ"], oo: ["ఊ", "ూ"], uu: ["ఊ", "ూ"],
  a: ["అ", ""], i: ["ఇ", "ి"], u: ["ఉ", "ు"], e: ["ఎ", "ె"], o: ["ఒ", "ొ"],
  A: ["ఆ", "ా"], I: ["ఈ", "ీ"], U: ["ఊ", "ూ"], E: ["ఏ", "ే"], O: ["ఓ", "ో"],
};
const CONSONANTS: Record<string, string> = {
  ksh: "క్ష", chh: "ఛ", kh: "ఖ", gh: "ఘ", ch: "చ", jh: "ఝ", Th: "ఠ", Dh: "ఢ", th: "థ", dh: "ధ", ph: "ఫ", bh: "భ", sh: "ష", ny: "ఞ", ng: "ంగ",
  k: "క", g: "గ", c: "చ", j: "జ", T: "ట", D: "డ", N: "ణ", t: "త", d: "ద", n: "న", p: "ప", b: "బ", m: "మ",
  y: "య", r: "ర", l: "ల", L: "ళ", v: "వ", w: "వ", S: "శ", s: "స", h: "హ", f: "ఫ", z: "జ", q: "క", x: "క్స",
};
const VIRAMA = "్";
const VOWEL_KEYS = Object.keys(VOWELS).sort((a, b) => b.length - a.length);
const CONS_KEYS = Object.keys(CONSONANTS).sort((a, b) => b.length - a.length);
const matchKey = (s: string, i: number, keys: string[]) => keys.find((k) => s.startsWith(k, i));

function word(raw: string): string {
  /* Names are typed with a capital first letter; that must not select a retroflex sound. */
  const w = (raw.charAt(0).toLowerCase() + raw.slice(1)).replace(/shn/g, "shN");
  let out = "";
  let i = 0;
  let pendingCons = false; /* last emitted a consonant with no vowel yet */
  while (i < w.length) {
    /* n / m before another consonant is written as the anusvara: Venkatesh, Anjali */
    if (/[nm]/.test(w[i]) && !w.startsWith("nn", i) && !w.startsWith("ny", i) && !w.startsWith("ng", i) && i > 0 && !pendingCons && /[kgcjtdpbsSTDNshlrvy]/.test(w[i + 1] ?? "") ) {
      out += "ం";
      i += 1;
      continue;
    }
    const c = matchKey(w, i, CONS_KEYS);
    if (c) {
      if (pendingCons) out += VIRAMA;
      out += CONSONANTS[c];
      pendingCons = true;
      i += c.length;
      continue;
    }
    const v = matchKey(w, i, VOWEL_KEYS);
    if (v) {
      let [full, sign] = VOWELS[v];
      /* A lone "e" is the long vowel in most names (Suresh, Teja); it stays short before n + consonant (Venkat). */
      if (v === "e" && !/^n[bcdfghjklmnpqrstvwxyz]/.test(w.slice(i + 1))) { full = "ఏ"; sign = "ే"; }
      out += pendingCons ? sign : full;
      pendingCons = false;
      i += v.length;
      continue;
    }
    if (pendingCons) { out += VIRAMA; pendingCons = false; }
    out += w[i];
    i += 1;
  }
  if (pendingCons) out += VIRAMA;
  return out;
}

export function transliterateOffline(text: string): string {
  return text.replace(/[A-Za-z]+/g, (m) => word(m));
}
