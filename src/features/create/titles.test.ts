import { describe, expect, it } from "vitest";
import { initial } from "./constants";
import { customValue, detectTitleMode, presetPatch, sidesOf, titlePatch, titleSummary } from "./titles";
import type { InvitationData } from "../../types/invitation";

const apply = (d: InvitationData, p: Partial<InvitationData>): InvitationData => ({ ...d, ...p });

describe("compliment titles", () => {
  it("sidesOf maps the choice to people", () => {
    expect(sidesOf("groom")).toEqual(["groom"]);
    expect(sidesOf("bride")).toEqual(["bride"]);
    expect(sidesOf("all")).toEqual(["groom", "bride"]);
  });

  it("the traditional preset gives the groom Chi. and the bride Chi. Sow. when both are chosen", () => {
    const d = apply(initial, presetPatch("all", "chi"));
    expect([d.groomTitleEn, d.brideTitleEn]).toEqual(["Chi.", "Chi. Sow."]);
    expect([d.groomTitleTe, d.brideTitleTe]).toEqual(["చి.", "చి.సౌ."]);
    expect(detectTitleMode(d, "all")).toBe("chi");
  });

  it("choosing only the bride leaves the groom alone", () => {
    const d = apply(apply(initial, presetPatch("groom", "dr")), presetPatch("bride", "mr-ms"));
    expect([d.groomTitleEn, d.brideTitleEn]).toEqual(["Dr.", "Ms."]);
    expect(detectTitleMode(d, "groom")).toBe("dr");
    expect(detectTitleMode(d, "bride")).toBe("mr-ms");
    expect(detectTitleMode(d, "all")).toBe("custom"); // mixed
  });

  it("a custom title is written to every chosen person and read back from the first", () => {
    const d = apply(initial, titlePatch("all", () => ({ en: "Er.", te: "ఇంజ." })));
    expect([d.groomTitleEn, d.brideTitleEn, d.groomTitleTe, d.brideTitleTe]).toEqual(["Er.", "Er.", "ఇంజ.", "ఇంజ."]);
    expect(customValue(d, "bride")).toEqual({ en: "Er.", te: "ఇంజ." });
    expect(detectTitleMode(d, "all")).toBe("custom");
  });

  it("no title: presetPatch with an unknown id clears the chosen people", () => {
    const d = apply(apply(initial, presetPatch("all", "chi")), presetPatch("groom", ""));
    expect(d.groomTitleEn).toBe("");
    expect(d.brideTitleEn).toBe("Chi. Sow.");
    expect(detectTitleMode(apply(initial, presetPatch("all", "")), "all")).toBe("none");
  });

  it("titleSummary says who has what", () => {
    expect(titleSummary(initial)).toBe("No titles are shown.");
    expect(titleSummary(apply(initial, presetPatch("all", "chi")))).toContain("Groom: Chi.");
    expect(titleSummary(apply(initial, presetPatch("bride", "dr")))).toBe("Bride: Dr.");
  });
});
