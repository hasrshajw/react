import { describe, expect, it } from "vitest";
import { okPhone, okSlug, okUrl, validateInvitation } from "./validate";
import { isReserved, RESERVED } from "./reserved";
import { initial } from "../features/create/constants";
import type { InvitationData } from "../types/invitation";

const valid = (o: Partial<InvitationData> = {}): InvitationData => ({ ...initial, templateId: "t1", weddingDate: "2027-02-01", groomEn: "Ravi", brideEn: "Priya", ...o });

describe("okPhone", () => {
  it.each(["9876543210", "+91 98765 43210", "+91 (98765) 43210", "098765-43210", "+1 415 555 0100"])("accepts %j", (v) => expect(okPhone(v)).toBe(true));
  it.each(["12345", "abc9876543210", "98765432101234", "9876543210x", "", "+"])("rejects %j", (v) => expect(okPhone(v)).toBe(false));
});

describe("okUrl", () => {
  it.each(["https://maps.google.com/?q=hall", "http://x.test", "  https://x.test  "])("accepts %j", (v) => expect(okUrl(v)).toBe(true));
  it.each(["javascript:alert(1)", "tel:+919876543210", "x.test", "", "ftp://x.test", "data:text/html,x"])("rejects %j", (v) => expect(okUrl(v)).toBe(false));
});

describe("okSlug / isReserved", () => {
  it.each(["abc", "Ravi-Weds_Priya", "a".repeat(30)])("accepts %j", (v) => expect(okSlug(v)).toBe(true));
  it.each(["ab", "a".repeat(31), "bad slug", "x.y", "a/b", ""])("rejects %j", (v) => expect(okSlug(v)).toBe(false));
  it("matches reserved words ignoring case and spaces", () => {
    expect(isReserved("login")).toBe(true);
    expect(isReserved(" DASHBOARD ")).toBe(true);
    expect(isReserved("ravi-weds-priya")).toBe(false);
  });
  it("keeps the routes the app really has reserved", () => {
    for (const w of ["login", "invitations", "templates", "create", "dashboard", "api", "assets", "admin", "my", "reviews"]) expect(RESERVED).toContain(w);
  });
});

describe("validateInvitation", () => {
  it("accepts a minimal valid form", () => expect(validateInvitation(valid())).toEqual({}));
  it("asks for template, date and both names", () => {
    const e = validateInvitation({ ...initial });
    expect(Object.keys(e).sort()).toEqual(["brideEn", "groomEn", "templateId", "weddingDate"]);
  });
  it("checks the link name: format first, then reserved", () => {
    expect(validateInvitation(valid({ customId: "ab" })).customId?.msg).toMatch(/3 to 30/);
    expect(validateInvitation(valid({ customId: "login" })).customId?.msg).toMatch(/reserved/);
    expect(validateInvitation(valid({ customId: "ravi-priya" })).customId).toBeUndefined();
    expect(validateInvitation(valid({ customId: "   " })).customId).toBeUndefined();
  });
  it("checks phones and map links, but only when filled in", () => {
    const e = validateInvitation(valid({ groomFatherPhone: "123", brideMotherPhone: "9876543210", venueMaps: "javascript:alert(1)" }));
    expect(e.groomFatherPhone?.section).toBe("groom");
    expect(e.brideMotherPhone).toBeUndefined();
    expect(e.venueMaps?.section).toBe("venue");
    expect(validateInvitation(valid({ venueMaps: "" })).venueMaps).toBeUndefined();
  });
  it("checks contacts and events by their ids", () => {
    const e = validateInvitation(valid({
      groomContacts: [{ id: "g1", nameEn: "A", nameTe: "", phone: "12" }],
      events: [{ id: "e1", name: "Muhurtham", nameTe: "", date: "", time: "", venue: "", venueTe: "", maps: "ftp://x" }],
    }));
    expect(e["contact-g1-phone"]).toBeDefined();
    expect(e["event-e1-date"]).toBeDefined();
    expect(e["event-e1-maps"]).toBeDefined();
  });
  it("needs a reception date only when the reception is on", () => {
    expect(validateInvitation(valid({ receptionEnabled: true, receptionDate: "" })).receptionDate).toBeDefined();
    expect(validateInvitation(valid({ receptionEnabled: false, receptionDate: "" })).receptionDate).toBeUndefined();
  });
  it("warns about long SEO text and a foreign preview image", () => {
    const e = validateInvitation(valid({ seoTitle: "t".repeat(61), seoDescription: "d".repeat(161), seoImage: "https://evil.test/p.jpg" }));
    expect(e.seoTitle).toBeDefined();
    expect(e.seoDescription).toBeDefined();
    expect(e.seoImage).toBeDefined();
    expect(validateInvitation(valid({ seoTitle: "t".repeat(60), seoDescription: "d".repeat(160) })).seoTitle).toBeUndefined();
  });
  it("accepts an empty client email and rejects a bad one", () => {
    expect(validateInvitation(valid({ clientEmail: "" })).clientEmail).toBeUndefined();
    expect(validateInvitation(valid({ clientEmail: "  " })).clientEmail).toBeUndefined();
    expect(validateInvitation(valid({ clientEmail: "client@example.com" })).clientEmail).toBeUndefined();
    const bad = validateInvitation(valid({ clientEmail: "not-an-email" }));
    expect(bad.clientEmail?.section).toBe("client");
    expect(bad.clientEmail?.msg).toMatch(/valid email/i);
  });
});
