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

describe("compile: house names, gotram, honorific placeholders (T3)", () => {
  const out = (data: object, tpl: string) => new DOMParser().parseFromString(compile(tpl, data as never), "text/html").body.textContent ?? "";
  it("the house name falls back to the shared surname; -surname-set says whether the person's own was typed", () => {
    const tpl = "{{groom-surname-te}}|{{groom-surname-en}}|{{#if groom-surname-set}}own{{/if}}|{{bride-surname-te}}";
    expect(out({ surnameTe: "కుటుంబ", surnameEn: "Fam" }, tpl)).toContain("కుటుంబ|Fam||కుటుంబ");
    const own = out({ surnameTe: "కుటుంబ", surnameEn: "Fam", groomSurnameTe: "వరుడు", groomSurnameEn: "Groomhouse" }, tpl);
    expect(own).toContain("వరుడు|Groomhouse|own|కుటుంబ");
  });
  it("gotram has no fallback and is empty by default", () => {
    expect(out({ groomGotramTe: "భరద్వాజ", groomGotramEn: "Bharadwaja" }, "{{groom-gotram-te}}|{{groom-gotram-en}}|{{bride-gotram-te}}|")).toContain("భరద్వాజ|Bharadwaja||");
  });
  it("the honorific placeholders", () => {
    const tpl = "{{groom-honorific-te}}|{{bride-honorific-te}}|{{#if couple-honorific}}on{{/if}}";
    expect(out({ coupleHonorific: "chiranjeevi" }, tpl)).toContain("చి|||చి.ల.సౌ||");
    expect(out({ coupleHonorific: "chiranjeevi" }, tpl)).toContain("on");
    expect(out({}, tpl)).not.toContain("on");
    expect(out({ coupleHonorific: "x" }, tpl)).not.toContain("చి");
  });
});

describe("birth order and parentage placeholders (T4)", () => {
  const out2 = (data: object, tpl: string) => new DOMParser().parseFromString(compile(tpl, data as never), "text/html").body.textContent ?? "";
  const tpl = "{{groom-parentage-te}}|{{bride-parentage-te}}|{{#if groom-plain-lines}}plain{{/if}}";
  const parents = { groomFatherTe: "రామారావు", groomMotherTe: "సీత", brideFatherTe: "కృష్ణ" };
  it("an old record (no new keys) has empty lines and keeps the plain lines", () => {
    expect(out2(parents, tpl)).toBe("||plain");
  });
  it("the switch gives the line and removes the plain lines flag", () => {
    const r = out2({ ...parents, showParentage: "1", groomOrder: "second" }, tpl);
    expect(r).toContain("శ్రీ రామారావు, శ్రీమతి సీత ల రెండవ కుమారుడు");
    expect(r).toContain("శ్రీ కృష్ణ గారి కుమార్తె");
    expect(r).not.toContain("plain");
  });
  it("the switch on with no parent left keeps the plain lines flag", () => {
    expect(out2({ showParentage: "1" }, tpl)).toBe("||plain");
  });
});

describe("reception venue placeholders (T5)", () => {
  const tpl = "{{reception-venue-te}}|{{reception-venue-en}}|{{reception-venue-address}}|{{reception-venue-maps}}|{{reception-venue-target}}|{{#if reception-own-venue}}own{{/if}}|{{#if same-venue}}same{{/if}}";
  const wedding = { receptionEnabled: true, venueTe: "హాల్ ఎ", venueEn: "Hall A", venueAddress: "Guntur", venueMaps: "https://maps.example/a" };
  const sep = { receptionSameVenue: false, receptionVenueTe: "హాల్ బి", receptionVenueEn: "Hall B", receptionVenueAddress: "Vijayawada", receptionVenueMaps: "https://maps.example/b" };
  const run = (d: Record<string, unknown>) => new DOMParser().parseFromString(compile(tpl, d as never), "text/html").body.textContent ?? "";

  it("an old record (no T5 keys) uses the wedding venue and the old scroll target", () => {
    expect(run(wedding)).toBe("హాల్ ఎ|Hall A|Guntur|https://maps.example/a|venue-te||same");
  });
  it("receptionSameVenue true is the same as the old record, even with reception fields typed", () => {
    expect(run({ ...wedding, ...sep, receptionSameVenue: true })).toBe(run(wedding));
  });
  it("a separate venue uses its own fields, turns on the own-venue flag and turns off same-venue", () => {
    expect(run({ ...wedding, ...sep })).toBe("హాల్ బి|Hall B|Vijayawada|https://maps.example/b|reception-venue-te|own|");
  });
  it("a separate venue with nothing typed is empty (the wedding venue is not borrowed) and has no own-venue flag", () => {
    expect(run({ ...wedding, receptionSameVenue: false })).toBe("||||reception-venue-te||");
  });
  it("a separate venue with the reception off has no own-venue flag", () => {
    expect(run({ ...wedding, ...sep, receptionEnabled: false })).toBe("హాల్ బి|Hall B|Vijayawada|https://maps.example/b|reception-venue-te||");
  });
  it("same-venue stays \"\" when there is no wedding venue name", () => {
    expect(run({ receptionEnabled: true })).toBe("||||venue-te||");
  });
});
