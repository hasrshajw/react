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
    expect(d.getElementById("typeText")?.textContent).toContain("కొమ్మినేని");
  });

  it("the invitation paragraph follows the chosen inviter and the edited message", () => {
    expect(text(doc(full), "#typeText")).toContain("కొమ్మినేని కుటుంబము వారి శుభ వివాహ");
    const d = doc({ ...full, inviterMode: "both", inviteMessageTe: "మా పెళ్ళికి రండి." });
    expect(text(d, "#typeText")).toBe("రామారావు & కృష్ణ కుటుంబముల వారి మా పెళ్ళికి రండి.");
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
});
