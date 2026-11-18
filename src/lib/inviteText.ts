import type { InvitationData, InviterName, ParentStatus } from "../types/invitation";

/* The invitation of a template, in two editable parts: the message paragraph, and WHO invites, shown at the bottom after "ఇట్లు"
   (family surname, groom's family, bride's family, both, or a custom name). */

export type InviterMode = "surname" | "groom" | "bride" | "both" | "custom";

export const INVITER_OPTIONS: { id: InviterMode; label: string }[] = [
  { id: "surname", label: "Family surname" },
  { id: "groom", label: "Groom’s family" },
  { id: "bride", label: "Bride’s family" },
  { id: "both", label: "Both families" },
  { id: "custom", label: "Custom name" },
];

export const INVITE_MESSAGE_MAX = 600;
export const DEFAULT_INVITE_MESSAGE_TE =
  "శుభ వివాహ కార్యక్రమమునకు మీరు సకుటుంబ సపరివార సమేతంగా విచ్చేసి, నూతన వధూవరులను ఆశీర్వదించి మా ఆనందాన్ని రెట్టింపు చేయవలసినదిగా సవినయంగా ప్రార్థిస్తున్నాము.";
type Src = Partial<InvitationData>;
const t = (v?: string) => (v || "").trim();

export const inviterMode = (d: Src): InviterMode => (INVITER_OPTIONS.some((o) => o.id === d.inviterMode) ? (d.inviterMode as InviterMode) : "surname");

/** Telugu prefixes. Kept in one place so they are easy to change. */
export const PREFIX_FATHER_TE = "శ్రీ";
export const PREFIX_MOTHER_TE = "శ్రీమతి";
export const PREFIX_LATE_TE = "కీ.శే.";

/** Reads a stored status; anything unknown counts as alive, so old or damaged records still render. */
export const parentStatus = (v: unknown): ParentStatus => (v === "late" || v === "hidden" ? v : "");

/** The prefix printed before a parent's name: "కీ.శే." when late, otherwise the usual one. */
export const parentPrefixTe = (role: "father" | "mother", status: unknown): string =>
  parentStatus(status) === "late" ? PREFIX_LATE_TE : role === "father" ? PREFIX_FATHER_TE : PREFIX_MOTHER_TE;

/** Father and mother on their own lines ("శ్రీ <father>", "శ్రీమతి <mother>", or "కీ.శే. <name>" when late).
 *  A hidden parent is skipped. The person's own name is used when no parent line is left. */
const parents = (father: string, mother: string, own: string, fatherStatus: unknown, motherStatus: unknown): string[] => {
  const fs = parentStatus(fatherStatus), ms = parentStatus(motherStatus);
  const f = fs === "hidden" ? "" : t(father), m = ms === "hidden" ? "" : t(mother);
  if (!f && !m) return t(own) ? [t(own)] : [];
  return [f && `${parentPrefixTe("father", fs)} ${f}`, m && `${parentPrefixTe("mother", ms)} ${m}`].filter(Boolean) as string[];
};

/* ---------- Honorific before the couple's names (T3) ---------- */
export const HONORIFIC_GROOM_TE = "చి||";
export const HONORIFIC_BRIDE_TE = "చి.ల.సౌ||";
/** "" (none) or "chiranjeevi". Anything else counts as none. */
export const honorificOn = (v: unknown): boolean => v === "chiranjeevi";
export const okHonorific = (v: unknown): boolean => v === undefined || v === null || v === "" || v === "chiranjeevi";

/* ---------- Birth order and the "son / daughter of" line (T4) ---------- */
export type BirthOrder = "" | "only" | "eldest" | "second" | "third" | "fourth" | "youngest";
export const BIRTH_ORDERS: { id: BirthOrder; label: string; te: string }[] = [
  { id: "", label: "Not shown", te: "" },
  { id: "only", label: "Only child", te: "ఏకైక" },
  { id: "eldest", label: "Eldest", te: "పెద్ద" },
  { id: "second", label: "Second", te: "రెండవ" },
  { id: "third", label: "Third", te: "మూడవ" },
  { id: "fourth", label: "Fourth", te: "నాల్గవ" },
  { id: "youngest", label: "Youngest", te: "చిన్న" },
];
export const okBirthOrder = (v: unknown): boolean => v === undefined || v === null || BIRTH_ORDERS.some((o) => o.id === v);
export const birthOrder = (v: unknown): BirthOrder => (BIRTH_ORDERS.some((o) => o.id === v) ? (v as BirthOrder) : "");
export const parentageOn = (v: unknown): boolean => v === "1";

/** "శ్రీ X, శ్రీమతి Y ల రెండవ కుమారుడు" (daughter: కుమార్తె). One parent alone: "శ్రీ X గారి ...". Late parents print with "కీ.శే.".
 *  Returns "" when the line is switched off or no parent name is left to show. */
export function parentageLineTe(side: "groom" | "bride", data: object): string {
  const d = data as Record<string, unknown>;
  if (!parentageOn(d.showParentage)) return "";
  const s = (k: string) => (typeof d[k] === "string" ? (d[k] as string).trim() : "");
  const fs = parentStatus(d[`${side}FatherStatus`]), ms = parentStatus(d[`${side}MotherStatus`]);
  const f = fs === "hidden" ? "" : s(`${side}FatherTe`), m = ms === "hidden" ? "" : s(`${side}MotherTe`);
  if (!f && !m) return "";
  const child = side === "groom" ? "కుమారుడు" : "కుమార్తె";
  const word = BIRTH_ORDERS.find((o) => o.id === birthOrder(d[`${side}Order`]))?.te ?? "";
  const tail = [word, child].filter(Boolean).join(" ");
  const fl = f && `${parentPrefixTe("father", fs)} ${f}`, ml = m && `${parentPrefixTe("mother", ms)} ${m}`;
  return fl && ml ? `${fl}, ${ml} ల ${tail}` : `${fl || ml} గారి ${tail}`;
}

/* ---------- Closing block (T2): title, who appears, custom names ---------- */

export type ClosingTitleMode = "" | "itlu" | "aahvaninchuvaaru" | "compliments" | "invitedBy" | "regards" | "custom" | "none";
/** Title presets. The Telugu / English wording lives here only, so it is easy to change. "" and "itlu" are the same ("ఇట్లు", as before). */
export const CLOSING_TITLES: { id: ClosingTitleMode; label: string; te: string; en: string }[] = [
  { id: "itlu", label: "ఇట్లు", te: "ఇట్లు", en: "Yours" },
  { id: "aahvaninchuvaaru", label: "ఆహ్వానించువారు", te: "ఆహ్వానించువారు", en: "Invited by" },
  { id: "compliments", label: "With Best Compliments", te: "శుభాకాంక్షలతో", en: "With Best Compliments" },
  { id: "invitedBy", label: "Invited by (సాదర ఆహ్వానంతో)", te: "సాదర ఆహ్వానంతో", en: "Invited by" },
  { id: "regards", label: "With Regards", te: "శుభాభినందనలతో", en: "With Regards" },
];
const DEFAULT_TITLE = CLOSING_TITLES[0];
export const closingTitleMode = (d: Src): ClosingTitleMode =>
  d.closingTitleMode === "custom" || d.closingTitleMode === "none" || CLOSING_TITLES.some((o) => o.id === d.closingTitleMode) ? (d.closingTitleMode as ClosingTitleMode) : "";
/** The title above the names. "" only when the title is hidden. A custom title that is empty falls back to "ఇట్లు". */
export function closingTitleTe(d: Src): string {
  const m = closingTitleMode(d);
  if (m === "none") return "";
  if (m === "custom") return t(d.closingTitleTe) || t(d.closingTitleEn) || DEFAULT_TITLE.te;
  return (CLOSING_TITLES.find((o) => o.id === m) || DEFAULT_TITLE).te;
}
export function closingTitleEn(d: Src): string {
  const m = closingTitleMode(d);
  if (m === "none") return "";
  if (m === "custom") return t(d.closingTitleEn) || t(d.closingTitleTe) || DEFAULT_TITLE.en;
  return (CLOSING_TITLES.find((o) => o.id === m) || DEFAULT_TITLE).en;
}

/** The people who can appear after the title, in the order they are printed within a side. */
export const INVITER_SOURCES = ["groom", "groomFather", "groomMother", "bride", "brideFather", "brideMother", "groomFamily", "brideFamily", "surname"] as const;
export type InviterSource = (typeof INVITER_SOURCES)[number];
export const INVITER_SOURCE_LABELS: Record<InviterSource, string> = {
  groom: "Groom", groomFather: "Groom’s father", groomMother: "Groom’s mother", groomFamily: "Groom’s family (parents)",
  bride: "Bride", brideFather: "Bride’s father", brideMother: "Bride’s mother", brideFamily: "Bride’s family (parents)",
  surname: "Family surname",
};
/** The value of `inviterSources` that means "nobody from the list" (so it is different from "" = use inviterMode). */
export const SOURCES_NONE = "none";
const isSource = (v: string): v is InviterSource => (INVITER_SOURCES as readonly string[]).includes(v);
/** True for "", "none" or a comma-separated list of known ids. Used by the validator (the database has the same rule). */
export const okSources = (v: string): boolean => { const x = v.trim(); return x === "" || x === SOURCES_NONE || x.split(",").every((p) => isSource(p.trim())); };
const parseSources = (v: unknown): InviterSource[] => [...new Set(String(v ?? "").split(",").map((x) => x.trim()).filter(isSource))];
export const serializeSources = (list: InviterSource[]): string => (list.length ? INVITER_SOURCES.filter((x) => list.includes(x)).join(",") : SOURCES_NONE);
/** What the old "Who is inviting" buttons mean, as sources. A custom name has no source: it is the single line of the old control. */
const legacySources = (mode: InviterMode): InviterSource[] =>
  mode === "groom" ? ["groomFamily"] : mode === "bride" ? ["brideFamily"] : mode === "both" ? ["groomFamily", "brideFamily"] : mode === "custom" ? [] : ["surname"];
/** The sources in force: the new list when it was set, otherwise whatever the old control says. */
export const effectiveSources = (d: Src): InviterSource[] => (t(d.inviterSources) ? parseSources(d.inviterSources) : legacySources(inviterMode(d)));

export const INVITER_PREFIXES: { id: string; label: string; te: string }[] = [
  { id: "", label: "No prefix", te: "" },
  { id: "sri", label: "శ్రీ", te: PREFIX_FATHER_TE },
  { id: "smt", label: "శ్రీమతి", te: PREFIX_MOTHER_TE },
  { id: "chi", label: "చి||", te: "చి||" },
  { id: "late", label: "కీ.శే.", te: PREFIX_LATE_TE },
  { id: "dr", label: "డాక్టర్", te: "డాక్టర్" },
];
export const INVITER_PREFIX_IDS = INVITER_PREFIXES.map((p) => p.id);
export const MAX_CLOSING_LINES = 10;
export const MAX_INVITER_NAMES = 8;

/** One custom name as a line: "<prefix> <name> (<relation>)". A row with no name is skipped. */
const customLine = (n: Partial<InviterName>): string => {
  const name = t(n.nameTe) || t(n.nameEn);
  if (!name) return "";
  const prefix = INVITER_PREFIXES.find((p) => p.id === n.prefix)?.te || "";
  const relation = t(n.relationTe) || t(n.relationEn);
  return `${prefix ? `${prefix} ` : ""}${name}${relation ? ` (${relation})` : ""}`;
};

/** The lines printed under the title, at most MAX_CLOSING_LINES: the family surname, then the groom's side, then the bride's side, then the custom names.
 *  Inside a side: the family (both parents), father, mother, then the person. Late and hidden parents follow T1. Repeated lines are printed once. */
export function inviterLinesTe(d: Src): string[] {
  const src = new Set(effectiveSources(d));
  const side = (p: "groom" | "bride") => {
    const father = t(d[`${p}FatherTe`]), mother = t(d[`${p}MotherTe`]), own = t(d[`${p}Te`]);
    const fs = d[`${p}FatherStatus`], ms = d[`${p}MotherStatus`];
    const out: string[] = [];
    if (src.has(`${p}Family`)) out.push(...parents(father, mother, own, fs, ms));
    else {
      if (src.has(`${p}Father`) && parentStatus(fs) !== "hidden" && father) out.push(`${parentPrefixTe("father", fs)} ${father}`);
      if (src.has(`${p}Mother`) && parentStatus(ms) !== "hidden" && mother) out.push(`${parentPrefixTe("mother", ms)} ${mother}`);
    }
    if (src.has(p) && own) out.push(own);
    return out;
  };
  const legacyCustom = !t(d.inviterSources) && inviterMode(d) === "custom" ? [t(d.inviterTe) || t(d.inviterEn)] : [];
  const lines = [
    ...(src.has("surname") && t(d.surnameTe) ? [`${t(d.surnameTe)} కుటుంబము`] : []),
    ...side("groom"), ...side("bride"), ...legacyCustom,
    ...(d.inviterNames || []).map(customLine),
  ].filter(Boolean);
  return [...new Set(lines)].slice(0, MAX_CLOSING_LINES);
}

/** The message paragraph (the standard text when none was written). */
export const inviteMessageTe = (d: Src) => t(d.inviteMessageTe) || DEFAULT_INVITE_MESSAGE_TE;
