// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { compile, isSafeUrl } from "./compileInvitation";

const out = (src: string, data: Record<string, unknown> = {}) => new DOMParser().parseFromString(compile(src, data), "text/html");

describe("isSafeUrl (H-2)", () => {
  it.each(["https://maps.google.com/?q=hall", "HTTPS://maps.google.com", "tel:+919876543210", "mailto:a@b.co", "#top", "/about", "//cdn.x/y.png", ""])(
    "allows %j", (v) => expect(isSafeUrl(v)).toBe(true));
  it.each(["javascript:alert(1)", " Java\tScript:alert(1)", "vbscript:x", "data:text/html,<b>", "ftp://x"])(
    "blocks %j", (v) => expect(isSafeUrl(v)).toBe(false));
  it("allows inline raster images on src only", () => {
    expect(isSafeUrl("data:image/png;base64,AAAA", "src")).toBe(true);
    expect(isSafeUrl("data:image/png;base64,AAAA", "href")).toBe(false);
    expect(isSafeUrl("data:image/svg+xml,<svg/>", "src")).toBe(false);
  });
});

describe("compile (H-2, M-10)", () => {
  it("fills text placeholders and unknown keys become empty", () => {
    expect(out("<p id=a>{{groom-en}} & {{bride_en}} {{nope}}</p>", { groomEn: "Ravi", brideEn: "Priya" }).getElementById("a")?.textContent).toBe("Ravi & Priya ");
  });
  it("keeps a hostile name as inert text, in text and in an attribute", () => {
    const d = out("<h1 id=a title=\"{{groom-en}}\">{{groom-en}}</h1>", { groomEn: "\"><script>alert(1)</script>" });
    expect(d.querySelector("script")).toBeNull();
    expect(d.getElementById("a")?.textContent).toBe("\"><script>alert(1)</script>");
    expect(d.getElementById("a")?.getAttribute("title")).toBe("\"><script>alert(1)</script>");
  });
  it("removes javascript: links (also obfuscated) and event handlers, keeps safe ones", () => {
    const d = out("<a id=a href=\"{{venue-maps}}\">x</a><a id=b href=\"https://x.test\" onclick=\"x()\">y</a><img id=c src=\"https://x.test/a.png\" onerror=\"alert(1)\">", { venueMaps: " Java\tScript:alert(1)" });
    expect(d.getElementById("a")?.hasAttribute("href")).toBe(false);
    expect(d.getElementById("b")?.getAttribute("href")).toBe("https://x.test");
    expect(d.getElementById("b")?.hasAttribute("onclick")).toBe(false);
    expect(d.getElementById("c")?.hasAttribute("onerror")).toBe(false);
    expect(d.getElementById("c")?.getAttribute("src")).toBe("https://x.test/a.png");
  });
  it("does not print Object.prototype members and hides {{#if constructor}}", () => {
    const d = out("<p id=a>{{constructor}}|{{toString}}|{{__proto__}}|{{hasOwnProperty}}</p><p id=b>{{#if constructor}}SHOWN{{/if}}</p><i id=c title=\"{{constructor}}\"></i>");
    expect(d.getElementById("a")?.textContent).toBe("|||");
    expect(d.getElementById("b")?.textContent).toBe("");
    expect(d.getElementById("c")?.getAttribute("title")).toBe("");
  });
  it("{{#if}} follows the value", () => {
    expect(out("<p id=a>{{#if groom-en}}yes{{/if}}</p>", { groomEn: "R" }).getElementById("a")?.textContent).toBe("yes");
    expect(out("<p id=a>{{#if groom-en}}yes{{/if}}</p>", { groomEn: "" }).getElementById("a")?.textContent).toBe("");
  });
  it("keeps braces a person typed and braces inside template CSS and script", () => {
    const d = out("<style>@media (min-width:1px){a{color:red}}</style><p id=a>{{groom-en}}</p><script>var o={a:{b:1}};</script>", { groomEn: "{{secret}} {{#if x}} {x}" });
    expect(d.getElementById("a")?.textContent).toBe("{{secret}} {{#if x}} {x}");
    expect(d.querySelector("style")?.textContent).toContain("@media (min-width:1px){a{color:red}}");
    expect(d.querySelector("script")?.textContent).toBe("var o={a:{b:1}};");
  });
  it("removes leftover placeholders in <head> and stray control tags", () => {
    const d = out("<html><head><title>{{groom-en}}</title></head><body><p id=a>{{/if}}x{{#if zz}}</p></body></html>");
    expect(d.title).toBe("");
    expect(d.getElementById("a")?.textContent).toBe("x");
  });
});

describe("compile: closing block placeholders (T2)", () => {
  const out = (data: object, tpl: string) => compile(tpl, data as never);
  const names = [{ id: "a", prefix: "sri", nameEn: "", nameTe: "రావు", relationEn: "", relationTe: "మామ" }];
  it("title, visibility flag and lines 1 to 10 are filled", () => {
    const html = out({ inviterSources: "none", inviterNames: names, closingTitleMode: "compliments", closingTitleEn: "" },
      "<b>{{inviter-title-te}}</b><i>{{inviter-title-en}}</i>{{#if inviter-title-visible}}<u>shown</u>{{/if}}<p>{{inviter-line-1-te}}</p><p>{{inviter-line-10-te}}</p>");
    expect(html).toContain("శుభాకాంక్షలతో");
    expect(html).toContain("With Best Compliments");
    expect(html).toContain("shown");
    expect(html).toContain("శ్రీ రావు (మామ)");
  });
  it("Hide makes the visibility flag empty, and default records print ఇట్లు", () => {
    expect(out({ closingTitleMode: "none" }, "{{#if inviter-title-visible}}<u>shown</u>{{/if}}")).not.toContain("shown");
    expect(out({}, "{{#if inviter-title-visible}}<u>shown</u>{{/if}}<b>{{inviter-title-te}}</b>")).toContain("shown");
    expect(out({}, "<b>{{inviter-title-te}}</b>")).toContain("ఇట్లు");
  });
  it("{{inviter-te}} joins every line", () => {
    expect(out({ inviterSources: "none", inviterNames: [{ ...names[0], relationTe: "" }, { ...names[0], id: "b", nameTe: "కృష్ణ", prefix: "" }] }, "{{inviter-te}}")).toContain("శ్రీ రావు &amp; కృష్ణ");
  });
});
