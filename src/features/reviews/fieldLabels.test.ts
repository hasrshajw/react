import { describe, expect, it } from "vitest";
import { diffKind, diffLines, fieldLabel, formatDiffValue } from "./fieldLabels";

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

describe("diffLines", () => {
  it("returns no lines for empty values and one line for scalars", () => {
    expect(diffLines(undefined)).toEqual([]);
    expect(diffLines("  ")).toEqual([]);
    expect(diffLines([])).toEqual([]);
    expect(diffLines("Ravi")).toEqual(["Ravi"]);
    expect(diffLines(false)).toEqual(["No"]);
  });
  it("turns lists of objects into readable lines, skipping empty parts", () => {
    expect(diffLines([{ venueEn: "Hall", venueAddress: "" }, { venueEn: "Lawn" }])).toEqual(["Venue (EN): Hall", "Venue (EN): Lawn"]);
  });
});

describe("diffKind", () => {
  it("tells added, removed and changed apart", () => {
    expect(diffKind("", "x")).toBe("added");
    expect(diffKind("x", undefined)).toBe("removed");
    expect(diffKind("x", "y")).toBe("changed");
  });
});
