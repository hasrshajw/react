import { describe, expect, it } from "vitest";
import { initial } from "../features/create/constants";
import {
  CLOSING_TITLES, DEFAULT_INVITE_MESSAGE_TE, INVITER_PREFIXES, INVITER_SOURCES, MAX_CLOSING_LINES, SOURCES_NONE, closingTitleEn, closingTitleMode, closingTitleTe,
  effectiveSources, inviteMessageTe, inviterLinesTe, okSources, parentPrefixTe, parentStatus, serializeSources,
} from "./inviteText";
import type { InvitationData } from "../types/invitation";

const d = (o: Partial<InvitationData>): InvitationData => ({ ...initial, surnameTe: "హర్ష వర్ధన్", groomTe: "రవి", brideTe: "ప్రియ", groomFatherTe: "రామారావు", groomMotherTe: "సీత", brideFatherTe: "కృష్ణ", brideMotherTe: "లక్ష్మి", ...o });

describe("invitation text", () => {
  it("the message is the standard text unless edited", () => {
    expect(inviteMessageTe(d({}))).toBe(DEFAULT_INVITE_MESSAGE_TE);
    expect(inviteMessageTe(d({ inviteMessageTe: " మా పెళ్ళికి రండి. " }))).toBe("మా పెళ్ళికి రండి.");
  });
  it("by default ఇట్లు shows the family surname", () => {
    expect(inviterLinesTe(d({}))).toEqual(["హర్ష వర్ధన్ కుటుంబము"]);
    expect(inviterLinesTe(d({ surnameTe: "" }))).toEqual([]);
  });
  it("groom's / bride's family show the parents, or the person's name when there are none", () => {
    expect(inviterLinesTe(d({ inviterMode: "groom" }))).toEqual(["శ్రీ రామారావు", "శ్రీమతి సీత"]);
    expect(inviterLinesTe(d({ inviterMode: "bride", brideFatherTe: "", brideMotherTe: "" }))).toEqual(["ప్రియ"]);
  });
  it("both families give four lines, groom's parents first", () => {
    expect(inviterLinesTe(d({ inviterMode: "both" }))).toEqual(["శ్రీ రామారావు", "శ్రీమతి సీత", "శ్రీ కృష్ణ", "శ్రీమతి లక్ష్మి"]);
  });
  it("a custom name is used as typed (Telugu first, English as a fallback)", () => {
    expect(inviterLinesTe(d({ inviterMode: "custom", inviterTe: "మిత్రులు" }))).toEqual(["మిత్రులు"]);
    expect(inviterLinesTe(d({ inviterMode: "custom", inviterEn: "Rao" }))).toEqual(["Rao"]);
  });
  it("an unknown mode falls back to the surname", () => {
    expect(inviterLinesTe(d({ inviterMode: "nonsense" }))).toEqual(["హర్ష వర్ధన్ కుటుంబము"]);
  });
});

describe("parent status (T1)", () => {
  it("unknown or missing values count as alive", () => {
    expect(parentStatus(undefined)).toBe("");
    expect(parentStatus("dead")).toBe("");
    expect(parentStatus("late")).toBe("late");
    expect(parentStatus("hidden")).toBe("hidden");
    expect(parentPrefixTe("father", "")).toBe("శ్రీ");
    expect(parentPrefixTe("mother", "")).toBe("శ్రీమతి");
    expect(parentPrefixTe("mother", "late")).toBe("కీ.శే.");
  });
  it("a record without any status gives exactly the old lines", () => {
    expect(inviterLinesTe(d({ inviterMode: "both" }))).toEqual(["శ్రీ రామారావు", "శ్రీమతి సీత", "శ్రీ కృష్ణ", "శ్రీమతి లక్ష్మి"]);
  });
  it("a late parent is printed with కీ.శే. instead of శ్రీ / శ్రీమతి", () => {
    expect(inviterLinesTe(d({ inviterMode: "groom", groomFatherStatus: "late" }))).toEqual(["కీ.శే. రామారావు", "శ్రీమతి సీత"]);
    expect(inviterLinesTe(d({ inviterMode: "bride", brideMotherStatus: "late" }))).toEqual(["శ్రీ కృష్ణ", "కీ.శే. లక్ష్మి"]);
    expect(inviterLinesTe(d({ inviterMode: "both", groomFatherStatus: "late", brideMotherStatus: "late" }))).toEqual(["కీ.శే. రామారావు", "శ్రీమతి సీత", "శ్రీ కృష్ణ", "కీ.శే. లక్ష్మి"]);
  });
  it("a hidden parent is skipped", () => {
    expect(inviterLinesTe(d({ inviterMode: "groom", groomFatherStatus: "hidden" }))).toEqual(["శ్రీమతి సీత"]);
    expect(inviterLinesTe(d({ inviterMode: "both", groomMotherStatus: "hidden", brideFatherStatus: "hidden" }))).toEqual(["శ్రీ రామారావు", "శ్రీమతి లక్ష్మి"]);
  });
  it("when no parent line is left the person's own name is used", () => {
    expect(inviterLinesTe(d({ inviterMode: "groom", groomFatherStatus: "hidden", groomMotherStatus: "hidden" }))).toEqual(["రవి"]);
    expect(inviterLinesTe(d({ inviterMode: "bride", brideFatherStatus: "hidden", brideMotherTe: "" }))).toEqual(["ప్రియ"]);
    expect(inviterLinesTe(d({ inviterMode: "groom", groomFatherStatus: "hidden", groomMotherStatus: "hidden", groomTe: "" }))).toEqual([]);
  });
  it("a late parent with no name typed adds no line", () => {
    expect(inviterLinesTe(d({ inviterMode: "groom", groomFatherTe: "", groomFatherStatus: "late" }))).toEqual(["శ్రీమతి సీత"]);
  });
});

/* The closing block before T2, copied here as the reference: a record saved before T2 must give exactly these lines. */
const oldLines = (x: InvitationData): string[] => {
  const par = (f: string, m: string, own: string, fs: string, ms: string) => {
    const F = fs === "hidden" ? "" : f.trim(), M = ms === "hidden" ? "" : m.trim();
    if (!F && !M) return own.trim() ? [own.trim()] : [];
    return [F && `${fs === "late" ? "కీ.శే." : "శ్రీ"} ${F}`, M && `${ms === "late" ? "కీ.శే." : "శ్రీమతి"} ${M}`].filter(Boolean) as string[];
  };
  const g = par(x.groomFatherTe, x.groomMotherTe, x.groomTe, x.groomFatherStatus, x.groomMotherStatus);
  const b = par(x.brideFatherTe, x.brideMotherTe, x.brideTe, x.brideFatherStatus, x.brideMotherStatus);
  switch (x.inviterMode) {
    case "groom": return g;
    case "bride": return b;
    case "both": return [...g, ...b];
    case "custom": return [(x.inviterTe || x.inviterEn).trim()].filter(Boolean);
    default: return x.surnameTe.trim() ? [`${x.surnameTe.trim()} కుటుంబము`] : [];
  }
};

describe("closing block (T2): records saved before T2 are unchanged", () => {
  const records: Partial<InvitationData>[] = [
    {}, { surnameTe: "" }, { inviterMode: "nonsense" },
    ...(["surname", "groom", "bride", "both"] as const).flatMap((m) => [
      { inviterMode: m },
      { inviterMode: m, groomFatherStatus: "late" as const, brideMotherStatus: "hidden" as const },
      { inviterMode: m, groomFatherStatus: "hidden" as const, groomMotherStatus: "hidden" as const, brideFatherTe: "", brideMotherTe: "" },
    ]),
    { inviterMode: "custom", inviterTe: "మిత్రులు" }, { inviterMode: "custom", inviterEn: "Rao" }, { inviterMode: "custom" },
  ];
  it.each(records.map((r, i) => [i, r] as const))("old record #%i gives the same lines as before", (_i, r) => {
    expect(inviterLinesTe(d(r))).toEqual(oldLines(d(r)));
  });
  it("the title is ఇట్లు and nothing else changes without the new keys", () => {
    expect(closingTitleTe(d({}))).toBe("ఇట్లు");
    expect(closingTitleMode(d({}))).toBe("");
    expect(effectiveSources(d({ inviterMode: "both" }))).toEqual(["groomFamily", "brideFamily"]);
  });
});

describe("closing title (T2)", () => {
  it("every preset prints its own Telugu and English title", () => {
    for (const o of CLOSING_TITLES) {
      expect(closingTitleTe(d({ closingTitleMode: o.id }))).toBe(o.te);
      expect(closingTitleEn(d({ closingTitleMode: o.id }))).toBe(o.en);
    }
    expect(closingTitleTe(d({ closingTitleMode: "aahvaninchuvaaru" }))).toBe("ఆహ్వానించువారు");
    expect(closingTitleEn(d({ closingTitleMode: "compliments" }))).toBe("With Best Compliments");
  });
  it("a custom title is used as typed; an empty custom title falls back to ఇట్లు", () => {
    expect(closingTitleTe(d({ closingTitleMode: "custom", closingTitleTe: " శుభాకాంక్షలు " }))).toBe("శుభాకాంక్షలు");
    expect(closingTitleTe(d({ closingTitleMode: "custom", closingTitleEn: "Warm wishes" }))).toBe("Warm wishes");
    expect(closingTitleEn(d({ closingTitleMode: "custom", closingTitleEn: "Warm wishes", closingTitleTe: "శుభాకాంక్షలు" }))).toBe("Warm wishes");
    expect(closingTitleTe(d({ closingTitleMode: "custom" }))).toBe("ఇట్లు");
  });
  it("Hide gives no title, and an unknown mode counts as the default", () => {
    expect(closingTitleTe(d({ closingTitleMode: "none" }))).toBe("");
    expect(closingTitleEn(d({ closingTitleMode: "none" }))).toBe("");
    expect(closingTitleTe(d({ closingTitleMode: "weird" }))).toBe("ఇట్లు");
  });
});

describe("who appears (T2)", () => {
  const src = (s: string, o: Partial<InvitationData> = {}) => inviterLinesTe(d({ inviterSources: s, ...o }));
  it("each person on their own", () => {
    expect(src("groom")).toEqual(["రవి"]);
    expect(src("bride")).toEqual(["ప్రియ"]);
    expect(src("groomFather")).toEqual(["శ్రీ రామారావు"]);
    expect(src("groomMother")).toEqual(["శ్రీమతి సీత"]);
    expect(src("brideFather")).toEqual(["శ్రీ కృష్ణ"]);
    expect(src("brideMother")).toEqual(["శ్రీమతి లక్ష్మి"]);
    expect(src("surname")).toEqual(["హర్ష వర్ధన్ కుటుంబము"]);
    expect(src("groomFamily")).toEqual(["శ్రీ రామారావు", "శ్రీమతి సీత"]);
    expect(src("brideFamily")).toEqual(["శ్రీ కృష్ణ", "శ్రీమతి లక్ష్మి"]);
  });
  it("a side is printed parents first, then the person; the groom's side comes before the bride's", () => {
    expect(src("groom,groomFather,groomMother")).toEqual(["శ్రీ రామారావు", "శ్రీమతి సీత", "రవి"]);
    expect(src("brideMother,groomFather,bride")).toEqual(["శ్రీ రామారావు", "శ్రీమతి లక్ష్మి", "ప్రియ"]);
    expect(src("groomFather,groomMother,groom,brideFather,brideMother,bride")).toHaveLength(6);
    expect(src("surname,groom")).toEqual(["హర్ష వర్ధన్ కుటుంబము", "రవి"]);
  });
  it("the family and a single parent together do not repeat the parent", () => {
    expect(src("groomFamily,groomFather")).toEqual(["శ్రీ రామారావు", "శ్రీమతి సీత"]);
  });
  it("it uses the T1 status of each parent", () => {
    expect(src("groomFather,groomMother", { groomFatherStatus: "late" })).toEqual(["కీ.శే. రామారావు", "శ్రీమతి సీత"]);
    expect(src("groomFather,groomMother", { groomFatherStatus: "hidden" })).toEqual(["శ్రీమతి సీత"]);
    expect(src("brideFather", { brideFatherStatus: "hidden" })).toEqual([]);
    expect(src("groomFamily", { groomFatherStatus: "hidden", groomMotherStatus: "hidden" })).toEqual(["రవి"]);
  });
  it("unknown ids are ignored; \"none\" shows nobody; empty falls back to the old control", () => {
    expect(src("groom,uncle")).toEqual(["రవి"]);
    expect(src(SOURCES_NONE)).toEqual([]);
    expect(src("", { inviterMode: "bride" })).toEqual(["శ్రీ కృష్ణ", "శ్రీమతి లక్ష్మి"]);
    expect(src("nobody")).toEqual([]);
  });
  it("the new list wins over the old control", () => {
    expect(src("groom", { inviterMode: "both" })).toEqual(["రవి"]);
  });
  it("okSources accepts empty, none and known ids only, and serializeSources round-trips in a fixed order", () => {
    expect(okSources("")).toBe(true);
    expect(okSources("none")).toBe(true);
    expect(okSources("groom,brideMother")).toBe(true);
    expect(okSources("groom,")).toBe(false);
    expect(okSources("groom,uncle")).toBe(false);
    expect(serializeSources(["brideMother", "groom"])).toBe("groom,brideMother");
    expect(serializeSources([])).toBe("none");
    expect(INVITER_SOURCES).toHaveLength(9);
  });
});

describe("custom names (T2)", () => {
  const nm = (o: object) => ({ id: "n", prefix: "", nameEn: "", nameTe: "", relationEn: "", relationTe: "", ...o });
  const lines = (names: object[], o: Partial<InvitationData> = {}) => inviterLinesTe(d({ inviterSources: SOURCES_NONE, inviterNames: names.map(nm), ...o }));
  it("each prefix is printed before the name", () => {
    const te: Record<string, string> = { "": "రావు", sri: "శ్రీ రావు", smt: "శ్రీమతి రావు", chi: "చి|| రావు", late: "కీ.శే. రావు", dr: "డాక్టర్ రావు" };
    for (const p of INVITER_PREFIXES) expect(lines([{ prefix: p.id, nameTe: "రావు" }])).toEqual([te[p.id]]);
  });
  it("the relation is added on the same line (Telugu first, English as a fallback)", () => {
    expect(lines([{ prefix: "sri", nameTe: "రావు", relationTe: "మేనమామ" }])).toEqual(["శ్రీ రావు (మేనమామ)"]);
    expect(lines([{ nameEn: "Rao", relationEn: "Uncle" }])).toEqual(["Rao (Uncle)"]);
  });
  it("a row with no name is skipped, names keep their order, and a name with only a prefix is skipped", () => {
    expect(lines([{ nameTe: "ఒకటి" }, { prefix: "sri" }, { relationTe: "x" }, { nameTe: "రెండు" }])).toEqual(["ఒకటి", "రెండు"]);
  });
  it("custom names come after the family lines, and work in the old control too", () => {
    expect(lines([{ nameTe: "రావు" }], { inviterSources: "groomFamily" })).toEqual(["శ్రీ రామారావు", "శ్రీమతి సీత", "రావు"]);
    expect(inviterLinesTe(d({ inviterMode: "both", inviterNames: [nm({ nameTe: "రావు" })] }))).toHaveLength(5);
    expect(inviterLinesTe(d({ inviterMode: "custom", inviterTe: "మిత్రులు", inviterNames: [nm({ nameTe: "రావు" })] }))).toEqual(["మిత్రులు", "రావు"]);
  });
  it("a late parent and custom names together", () => {
    expect(lines([{ prefix: "late", nameTe: "రాజు", relationTe: "తాత" }], { inviterSources: "groomFather,groomMother", groomFatherStatus: "late" }))
      .toEqual(["కీ.శే. రామారావు", "శ్రీమతి సీత", "కీ.శే. రాజు (తాత)"]);
  });
  it("an old record whose inviterNames is missing or damaged does not break", () => {
    expect(inviterLinesTe(d({ inviterNames: undefined as never }))).toEqual(["హర్ష వర్ధన్ కుటుంబము"]);
  });
  it("at most 10 lines, and the same line is not printed twice", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ nameTe: `పేరు${i}` }));
    expect(lines(many)).toHaveLength(MAX_CLOSING_LINES);
    expect(lines([{ nameTe: "రావు" }, { nameTe: "రావు" }])).toEqual(["రావు"]);
  });
});
