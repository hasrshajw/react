import { describe, expect, it } from "vitest";
import { fieldLabel, formatDiffValue } from "./fieldLabels";

describe("fieldLabel", () => {
  it("maps known keys and falls back to the key", () => {
    expect(fieldLabel("groomEn")).toBe("Groom (EN)");
    expect(fieldLabel("unknownField")).toBe("unknownField");
    expect(fieldLabel("groomFatherStatus")).toBe("Groom's father status");
    expect(fieldLabel("brideMotherStatus")).toBe("Bride's mother status");
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
