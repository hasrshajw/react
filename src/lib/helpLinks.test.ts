import { describe, expect, it } from "vitest";
import { helpLink } from "./helpLinks";

describe("helpLink (L-1)", () => {
  it.each([
    ["https://example.org", "https://example.org/"],
    ["https://docs.example.org/help?a=1", "https://docs.example.org/help?a=1"],
    ["  https://example.org/x  ", "https://example.org/x"],
    ["mailto:you@your-domain.com", "mailto:you@your-domain.com"],
    ["mailto:you@your-domain.com?subject=Hi", "mailto:you@your-domain.com?subject=Hi"],
  ])("accepts %j", (input, out) => expect(helpLink(input)).toBe(out));

  it.each([
    "", "   ", "undefined", "null", "#", "/docs", "http://example.org", "javascript:alert(1)", " JavaScript:alert(1)", "data:text/html,x",
    "https://user:pw@example.org", "https:///x", "mailto:", "mailto:you@localhost", "ftp://example.org", "https://example.org/" + "a".repeat(300), "//evil.test",
  ])("rejects %j", (input) => expect(helpLink(input)).toBeNull());

  it("gives null for undefined and null", () => {
    expect(helpLink(undefined)).toBeNull();
    expect(helpLink(null)).toBeNull();
  });
});
