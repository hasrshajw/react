// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { compile, waNumber } from "./compileInvitation";
import { initial } from "../features/create/constants";
import type { InvitationData } from "../types/invitation";

/* docs/templates/telugu-traditional.html is the Telugu "Traditional" wedding template (paste it as a template's HTML in Admin > Templates,
   or run supabase/04_seed_telugu_traditional.sql). These tests make sure it keeps working with the compiler. */
const src = readFileSync(resolve(process.cwd(), "docs/templates/telugu-traditional.html"), "utf8");
const doc = (data: Partial<InvitationData>) => new DOMParser().parseFromString(compile(src, { ...initial, ...data }), "text/html");
const text = (d: Document, sel: string) => d.querySelector(sel)?.textContent?.replace(/\s+/g, " ").trim() ?? null;

const full: Partial<InvitationData> = {
  surnameTe: "కొమ్మినేని", groomTe: "రవి", brideTe: "ప్రియ", weddingDate: "2027-02-14", muhurthamTime: "10:30",
  groomFatherTe: "రామారావు", groomMotherTe: "సీత", groomFatherPhone: "+91 98765 43210", groomMotherPhone: "9123456789",
  brideFatherTe: "కృష్ణ", brideMotherTe: "లక్ష్మి", brideFatherPhone: "9000000001",
  receptionEnabled: true, receptionDate: "2027-02-15", receptionTime: "19:00",
  venueTe: "శుభం కళ్యాణ మండపం", venueAddress: "హైదరాబాద్", venueMaps: "https://maps.google.com/?q=hall",
  events: [{ id: "e1", name: "Sangeet", nameTe: "సంగీత్", date: "2027-02-13", time: "18:00", venue: "", venueTe: "ఇంటి వద్ద", maps: "https://maps.google.com/?q=home" }],
  groomContacts: [{ id: "c1", nameEn: "Ravi's friend", nameTe: "మిత్రుడు", phone: "9111111111" }],
};

describe("telugu-traditional template", () => {
  it("compiles with no leftover {{ placeholder or {{#if syntax", () => {
    const html = compile(src, { ...initial, ...full });
    expect(html).not.toMatch(/\{\{/);
  });

  it("fills the couple, venue and event details", () => {
    const d = doc(full);
    expect(text(d, ".groom-card h2")).toBe("రవి");
    expect(text(d, ".bride-card h2")).toBe("ప్రియ");
    expect(text(d, ".venue-name")).toBe("శుభం కళ్యాణ మండపం");
    expect(d.querySelector(".venue-btn")?.getAttribute("href")).toBe("https://maps.google.com/?q=hall");
    expect(d.querySelectorAll(".event-card").length).toBe(3); // wedding + reception + 1 extra event
    expect(text(d, ".invite-names")).toContain("కొమ్మినేని");
  });

  it("the paragraph is the message, and the chosen inviter comes after ఇట్లు at the bottom", () => {
    const d1 = doc(full);
    expect(text(d1, "#typeText")).toMatch(/^శుభ వివాహ కార్యక్రమమునకు/);
    expect(text(d1, ".invite-from")).toBe("ఇట్లు");
    expect(text(d1, ".invite-names")).toBe("ఇట్లు కొమ్మినేని కుటుంబము");
    const d2 = doc({ ...full, inviterMode: "both", inviteMessageTe: "మా పెళ్ళికి రండి." });
    expect(text(d2, "#typeText")).toBe("మా పెళ్ళికి రండి.");
    expect([...d2.querySelectorAll(".inv-line")].map((e) => e.textContent)).toEqual(["శ్రీ రామారావు", "శ్రీమతి సీత", "శ్రీ కృష్ణ", "శ్రీమతి లక్ష్మి"]);
  });

  it("builds clean call and WhatsApp links from messy phone numbers", () => {
    const d = doc(full);
    const wa = [...d.querySelectorAll<HTMLAnchorElement>("a[href^='https://wa.me/']")].map((a) => a.getAttribute("href"));
    expect(wa).toContain("https://wa.me/919876543210?text=నమస్కారం");
    expect(wa).toContain("https://wa.me/919123456789?text=నమస్కారం");
    expect(waNumber("+91 98765-43210")).toBe("919876543210");
    expect(waNumber("")).toBe("");
  });

  it("hides what is empty: reception, extra events, venue, contacts", () => {
    const d = doc({ groomTe: "రవి", brideTe: "ప్రియ", weddingDate: "2027-02-14" });
    expect(d.querySelectorAll(".event-card").length).toBe(1);
    expect(d.querySelector(".venue-wrapper")).toBeNull();
    expect(d.querySelector(".contact-card")).toBeNull();
    expect(d.querySelector(".hero-sub")).toBeNull();
    expect(text(d, ".inv-line")).toBe("");
  });

  it("only uses scroll targets the form can reach, and every one exists in the compiled page", () => {
    const d = doc(full);
    const targets = [...d.querySelectorAll("[data-scroll-target]")].map((e) => e.getAttribute("data-scroll-target")!);
    ["surname-te", "groom-te", "bride-te", "venue-te", "event-wedding-date", "event-wedding-time", "event-reception-date", "groom-father-phone", "event-1-name-te"].forEach((t) => expect(targets).toContain(t));
  });

  it("keeps all page content visible without its script (the editor preview never runs scripts)", () => {
    const html = compile(src, { ...initial, ...full });
    expect(html).not.toMatch(/class="[^"]*\bis-hidden\b[^"]*"/);
  });
  it("parent status (T1): an old record shows శ్రీ / శ్రీమతి and the phone cards as before", () => {
    const d = doc(full);
    expect(text(d, '.list-item[data-scroll-target="groom-father-te"]')).toBe("శ్రీ రామారావు గారి ఆత్మీయ కుమారుడు");
    expect(text(d, '.list-item[data-scroll-target="groom-mother-te"]')).toBe("శ్రీమతి సీత గారి ఆత్మీయ కుమారుడు");
    expect(d.querySelector('.contact-card[data-scroll-target="groom-father-phone"]')).not.toBeNull();
  });

  it("parent status (T1): a late parent has కీ.శే., keeps the name line and loses the phone card", () => {
    const d = doc({ ...full, groomFatherStatus: "late" });
    expect(text(d, '.list-item[data-scroll-target="groom-father-te"]')).toBe("కీ.శే. రామారావు గారి ఆత్మీయ కుమారుడు");
    expect(d.querySelector('.contact-card[data-scroll-target="groom-father-phone"]')).toBeNull();
    expect(d.querySelector('.contact-card[data-scroll-target="groom-mother-phone"]')).not.toBeNull();
    expect(compile(src, { ...initial, ...full, groomFatherStatus: "late" })).not.toContain("98765 43210");
  });

  it("parent status (T1): a hidden parent has no line and no phone card, and the other parent stays", () => {
    const d = doc({ ...full, brideFatherStatus: "hidden" });
    expect(d.querySelector('.list-item[data-scroll-target="bride-father-te"]')).toBeNull();
    expect(d.querySelector('.contact-card[data-scroll-target="bride-father-phone"]')).toBeNull();
    expect(text(d, '.list-item[data-scroll-target="bride-mother-te"]')).toBe("శ్రీమతి లక్ష్మి గారి ఆత్మీయ కుమార్తె");
    expect(compile(src, { ...initial, ...full, brideFatherStatus: "hidden" })).not.toContain("కృష్ణ");
  });

  it("parent status (T1): the closing lines follow the status too", () => {
    const d = doc({ ...full, inviterMode: "both", groomFatherStatus: "late", brideMotherStatus: "hidden" });
    expect([...d.querySelectorAll(".inv-line")].map((e) => e.textContent).filter(Boolean)).toEqual(["కీ.శే. రామారావు", "శ్రీమతి సీత", "శ్రీ కృష్ణ"]);
  });
});

describe("telugu-traditional template: closing block (T2)", () => {
  const lines = (d: Document) => [...d.querySelectorAll(".inv-line")].map((e) => e.textContent).filter(Boolean);
  it("a record saved before T2 looks the same: ఇట్లు and the same lines", () => {
    const d1 = doc(full);
    expect(text(d1, ".invite-from")).toBe("ఇట్లు");
    expect(lines(d1)).toEqual(["కొమ్మినేని కుటుంబము"]);
    const d2 = doc({ ...full, inviterMode: "both" });
    expect(text(d2, ".invite-from")).toBe("ఇట్లు");
    expect(lines(d2)).toEqual(["శ్రీ రామారావు", "శ్రీమతి సీత", "శ్రీ కృష్ణ", "శ్రీమతి లక్ష్మి"]);
    expect(d2.querySelectorAll(".inv-line").length).toBe(4);
  });
  it("prints the chosen title, the chosen people and the custom names with their relations", () => {
    const d = doc({
      ...full, closingTitleMode: "compliments", inviterSources: "groom,groomFather,groomMother",
      inviterNames: [
        { id: "a", prefix: "sri", nameEn: "", nameTe: "వెంకట్", relationEn: "", relationTe: "మేనమామ" },
        { id: "b", prefix: "", nameEn: "", nameTe: "మిత్రులు", relationEn: "", relationTe: "" },
      ],
    });
    expect(text(d, ".invite-from")).toBe("శుభాకాంక్షలతో");
    expect(lines(d)).toEqual(["శ్రీ రామారావు", "శ్రీమతి సీత", "రవి", "శ్రీ వెంకట్ (మేనమామ)", "మిత్రులు"]);
  });
  it("a custom title is used, and Hide removes the title but keeps the names", () => {
    expect(text(doc({ ...full, closingTitleMode: "custom", closingTitleTe: "మీ ఆత్మీయులు" }), ".invite-from")).toBe("మీ ఆత్మీయులు");
    const d = doc({ ...full, closingTitleMode: "none", inviterMode: "groom" });
    expect(d.querySelector(".invite-from")).toBeNull();
    expect(lines(d)).toEqual(["శ్రీ రామారావు", "శ్రీమతి సీత"]);
  });
  it("lines 5 to 10 appear only when there are that many names, and nothing is left unfilled", () => {
    const names = Array.from({ length: 8 }, (_, i) => ({ id: `n${i}`, prefix: "", nameEn: "", nameTe: `పేరు${i + 1}`, relationEn: "", relationTe: "" }));
    const d = doc({ ...full, inviterSources: "none", inviterNames: names });
    expect(d.querySelectorAll(".inv-line").length).toBe(8);
    expect(lines(d)[7]).toBe("పేరు8");
    expect(doc({ ...full, inviterSources: "none", inviterNames: names }).documentElement.outerHTML).not.toMatch(/\{\{/);
    expect(doc(full).querySelectorAll(".inv-line").length).toBe(4);
  });
  it("the old template (fixed ఇట్లు and four lines) still works with the new keys", () => {
    const oldBlock = '<div class="invite-from">ఇట్లు</div><div class="inv-line">{{inviter-line-1-te}}</div><div class="inv-line">{{inviter-line-4-te}}</div>';
    const html = compile(oldBlock, { ...initial, ...full, closingTitleMode: "none", inviterSources: "groom,bride", inviterNames: [] });
    expect(html).toContain("ఇట్లు");
    expect(html).toContain("రవి");
  });
});

describe("telugu-traditional template: house names, gotram, honorific (T3)", () => {
  const items = (d: Document, sel: string) => [...d.querySelectorAll(`${sel} .list-item`)].map((e) => e.textContent?.replace(/\s+/g, " ").trim());
  it("a record saved before T3 is unchanged: plain names, no house-name or gotram line (even with a shared surname)", () => {
    const d = doc(full);
    expect(text(d, ".groom-card h2")).toBe("రవి");
    expect(text(d, ".bride-card h2")).toBe("ప్రియ");
    expect(compile(src, { ...initial, ...full })).not.toContain("ఇంటి పేరు");
    expect(compile(src, { ...initial, ...full })).not.toContain("గోత్రం");
    expect(compile(src, { ...initial, ...full })).not.toMatch(/\{\{/);
  });
  it("prints each person's own house name and gotram on their own card", () => {
    const d = doc({ ...full, groomSurnameTe: "కొమ్మినేని", brideSurnameTe: "పాటిబండ్ల", groomGotramTe: "భరద్వాజ", brideGotramTe: "కశ్యప" });
    expect(items(d, ".groom-card")).toContain("ఇంటి పేరు: కొమ్మినేని");
    expect(items(d, ".groom-card")).toContain("గోత్రం: భరద్వాజ");
    expect(items(d, ".bride-card")).toContain("ఇంటి పేరు: పాటిబండ్ల");
    expect(items(d, ".bride-card")).toContain("గోత్రం: కశ్యప");
    expect(items(d, ".groom-card").join()).not.toContain("పాటిబండ్ల");
  });
  it("gotram renders only when set, per side", () => {
    const d = doc({ ...full, groomGotramTe: "భరద్వాజ" });
    expect(items(d, ".groom-card").join()).toContain("గోత్రం");
    expect(items(d, ".bride-card").join()).not.toContain("గోత్రం");
  });
  it("the honorific is printed before the names when on, with the right form for each", () => {
    const d = doc({ ...full, coupleHonorific: "chiranjeevi" });
    expect(text(d, ".groom-card h2")).toBe("చి|| రవి");
    expect(text(d, ".bride-card h2")).toBe("చి.ల.సౌ|| ప్రియ");
    expect(text(doc({ ...full, coupleHonorific: "" }), ".groom-card h2")).toBe("రవి");
    expect(text(doc({ ...full, coupleHonorific: "other" }), ".groom-card h2")).toBe("రవి");
  });
  it("the existing {{surname-te}} placeholder keeps working", () => {
    expect(text(doc({ ...full, groomSurnameTe: "కొమ్మినేని" }), ".hero-sub")).toBe("కొమ్మినేని వారి");
  });
});
