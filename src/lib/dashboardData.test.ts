import { describe, expect, it } from "vitest";
import { csvCell, looksLikeFormula, waLink, waNumber } from "./dashboardData";
import type { Enquiry } from "../types/dashboard";

describe("looksLikeFormula (L-3)", () => {
  it.each(["=1+1", "=HYPERLINK(\"x\")", "@SUM(A1)", "+cmd|' /C calc'!A0", "-2+3+cmd|' /C calc'!A0", "-cmd", "\t=1", "\r=1", "+1+1", "+91 98765 43210 x", "- =cmd", "- a|b", "- (x)", "-@x", "+"])(
    "guards %j", (s) => expect(looksLikeFormula(s)).toBe(true));
  it.each(["+91 98765-43210", "+91 (98765) 43210", "-5", "-2.5", "- call me", "- thanks, see you", "hello", "", "9876543210", "a=b", "x+y", "Hi -there"])(
    "leaves %j alone", (s) => expect(looksLikeFormula(s)).toBe(false));
});

describe("csvCell", () => {
  it("prefixes a formula with an apostrophe and quotes the cell", () => expect(csvCell("=1+1")).toBe("\"'=1+1\""));
  it("doubles quotes, also together with the guard", () => {
    expect(csvCell("say \"hi\"")).toBe("\"say \"\"hi\"\"\"");
    expect(csvCell("=\"x\"")).toBe("\"'=\"\"x\"\"\"");
  });
  it("turns null, undefined and numbers into text", () => {
    expect(csvCell(null)).toBe("\"\"");
    expect(csvCell(undefined)).toBe("\"\"");
    expect(csvCell(42)).toBe("\"42\"");
  });
});

describe("waNumber / waLink (L-4)", () => {
  it.each([
    ["9876543210", "919876543210"],
    ["+91 98765 43210", "919876543210"],
    ["09876543210", "919876543210"],
    ["0091 98765 43210", "919876543210"],
    ["+1 (415) 555-0100", "14155550100"],
    ["", ""],
  ])("%j -> %j", (input, out) => expect(waNumber(input)).toBe(out));

  const enquiry = (o: Partial<Enquiry>) => ({ name: "", phone: "9876543210", ...o }) as Enquiry;
  const text = (url: string) => decodeURIComponent(url.split("?text=")[1]);
  it("greets with the first word of the name", () => expect(text(waLink(enquiry({ name: "  Ravi Kumar " })))).toMatch(/^Hi Ravi, thanks/));
  it("has no stray space before the comma when the name is empty or blank", () => {
    expect(text(waLink(enquiry({ name: "" })))).toMatch(/^Hi, thanks/);
    expect(text(waLink(enquiry({ name: "   " })))).toMatch(/^Hi, thanks/);
  });
  it("does not throw without a phone", () => expect(waLink(enquiry({ phone: undefined as unknown as string }))).toMatch(/^https:\/\/wa\.me\/\?text=/));
});
