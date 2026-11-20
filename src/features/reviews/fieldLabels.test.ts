import { describe, expect, it } from "vitest";
import { fieldLabel, formatDiffValue } from "./fieldLabels";

describe("fieldLabel", () => {
  it("maps known keys and falls back to the key", () => {
    expect(fieldLabel("groomEn")).toBe("Groom (EN)");
    expect(fieldLabel("unknownField")).toBe("unknownField");
    expect(fieldLabel("groomFatherStatus")).toBe("Groom's father status");
    expect(fieldLabel("brideMotherStatus")).toBe("Bride's mother status");
    expect(fieldLabel("familyMembers")).toBe("Relatives (siblings, grandparents, uncles)");
  });
});

describe("formatDiffValue", () => {
  it("formats empty, boolean, string and objects", () => {
    expect(formatDiffValue(null)).toBe("—");
    expect(formatDiffValue("")).toBe("—");
    expect(formatDiffValue("  ")).toBe("—");
    expect(formatDiffValue("Ravi")).toBe("Ravi");
    expect(formatDiffValue(true)).toBe("Yes");
    expect(formatDiffValue(false)).toBe("No");
    expect(formatDiffValue({ a: 1 })).toBe('{"a":1}');
  });
});

describe("fieldLabel: closing block (T2)", () => {
  it("has a label for each new key", () => {
    expect(fieldLabel("closingTitleMode")).toBe("Closing title");
    expect(fieldLabel("closingTitleEn")).toBe("Closing title (EN)");
    expect(fieldLabel("closingTitleTe")).toBe("Closing title (TE)");
    expect(fieldLabel("inviterSources")).toBe("Who is inviting");
    expect(fieldLabel("inviterNames")).toBe("Custom inviter names");
  });
});

describe("fieldLabel: house names (T3)", () => {
  it("has a label for each new key", () => {
    for (const k of ["groomSurnameEn", "groomSurnameTe", "brideSurnameEn", "brideSurnameTe", "groomGotramEn", "groomGotramTe", "brideGotramEn", "brideGotramTe", "coupleHonorific"]) expect(fieldLabel(k)).not.toBe(k);
    expect(fieldLabel("groomGotramTe")).toBe("Groom's gotram (TE)");
    expect(fieldLabel("coupleHonorific")).toBe("Honorific before names");
  });
});

describe("fieldLabel: birth order (T4)", () => {
  it("has a label for each new key", () => {
    expect(fieldLabel("groomOrder")).toBe("Groom's position among children");
    expect(fieldLabel("brideOrder")).toBe("Bride's position among children");
    expect(fieldLabel("showParentage")).toBe("Show 'son / daughter of' line");
  });
});

describe("fieldLabel: reception venue (T5)", () => {
  it("has a label for each new key", () => {
    expect(fieldLabel("receptionSameVenue")).toBe("Reception at the wedding venue");
    expect(fieldLabel("receptionVenueEn")).toBe("Reception venue (EN)");
    expect(fieldLabel("receptionVenueTe")).toBe("Reception venue (TE)");
    expect(fieldLabel("receptionVenueAddress")).toBe("Reception venue address");
    expect(fieldLabel("receptionVenueMaps")).toBe("Reception maps link");
  });
});

