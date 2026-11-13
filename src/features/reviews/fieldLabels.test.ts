import { describe, expect, it } from "vitest";
import { fieldLabel, formatDiffValue } from "./fieldLabels";

describe("fieldLabel", () => {
  it("maps known keys and falls back to the key", () => {
    expect(fieldLabel("groomEn")).toBe("Groom (EN)");
    expect(fieldLabel("unknownField")).toBe("unknownField");
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
