import type { InvitationData } from "../../types/invitation";

/* Compliment titles: the short word shown before a name, for example "Chi." before the groom and "Chi. Sow." before the bride.
   The form stores one title per person (groomTitleEn/Te, brideTitleEn/Te); the picker only decides WHO gets the title being edited. */

export type TitleTarget = "groom" | "bride" | "all";
export type TitleSide = "groom" | "bride";
export type TitleValue = { en: string; te: string };

export const TITLE_MAX = 30;

export const TITLE_TARGETS: { id: TitleTarget; label: string }[] = [
  { id: "groom", label: "Groom" },
  { id: "bride", label: "Bride" },
  { id: "all", label: "Both names" },
];

export interface TitlePreset { id: string; label: string; groom: TitleValue; bride: TitleValue }

export const TITLE_PRESETS: TitlePreset[] = [
  { id: "chi", label: "Chi. / Chi. Sow. (traditional)", groom: { en: "Chi.", te: "చి." }, bride: { en: "Chi. Sow.", te: "చి.సౌ." } },
  { id: "mr-ms", label: "Mr. / Ms.", groom: { en: "Mr.", te: "శ్రీ" }, bride: { en: "Ms.", te: "కుమారి" } },
  { id: "dr", label: "Dr.", groom: { en: "Dr.", te: "డా." }, bride: { en: "Dr.", te: "డా." } },
];

export const TITLE_NONE = "none";
export const TITLE_CUSTOM = "custom";

export const KEYS = {
  groom: { en: "groomTitleEn", te: "groomTitleTe" },
  bride: { en: "brideTitleEn", te: "brideTitleTe" },
} as const;

export const sidesOf = (target: TitleTarget): TitleSide[] => (target === "all" ? ["groom", "bride"] : [target]);

const read = (data: InvitationData, side: TitleSide): TitleValue => ({ en: data[KEYS[side].en] || "", te: data[KEYS[side].te] || "" });
const same = (a: TitleValue, b: TitleValue) => a.en === b.en && a.te === b.te;
const empty = (v: TitleValue) => v.en.trim() === "" && v.te.trim() === "";

/** Which choice the selected people currently show: a preset, no title, or something custom. */
export function detectTitleMode(data: InvitationData, target: TitleTarget): string {
  const sides = sidesOf(target);
  if (sides.every((s) => empty(read(data, s)))) return TITLE_NONE;
  const preset = TITLE_PRESETS.find((p) => sides.every((s) => same(read(data, s), p[s])));
  return preset ? preset.id : TITLE_CUSTOM;
}

/** The fields to write so that every person in `target` gets this title. `pick` returns the value for one person. */
export function titlePatch(target: TitleTarget, pick: (side: TitleSide) => TitleValue): Partial<InvitationData> {
  const patch: Partial<InvitationData> = {};
  sidesOf(target).forEach((side) => { const v = pick(side); patch[KEYS[side].en] = v.en; patch[KEYS[side].te] = v.te; });
  return patch;
}

export const presetPatch = (target: TitleTarget, presetId: string) => {
  const preset = TITLE_PRESETS.find((p) => p.id === presetId);
  return titlePatch(target, (side) => (preset ? preset[side] : { en: "", te: "" }));
};

/** What to show in the two custom boxes: the first selected person's title. */
export const customValue = (data: InvitationData, target: TitleTarget): TitleValue => read(data, sidesOf(target)[0]);

/** One short line that says who has which title, shown under the picker. */
export function titleSummary(data: InvitationData): string {
  const g = read(data, "groom").en || read(data, "groom").te, b = read(data, "bride").en || read(data, "bride").te;
  if (!g && !b) return "No titles are shown.";
  return [g ? `Groom: ${g}` : "", b ? `Bride: ${b}` : ""].filter(Boolean).join("  ·  ");
}
