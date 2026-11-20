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
  it("T7: checks the phone of every contact, role length and the number of contacts per side", () => {
    const c = (id: string, phone = "9876543210", extra = {}) => ({ id, nameEn: "A", nameTe: "", phone, ...extra });
    const ok = validateInvitation(valid({ groomContacts: [c("g1"), c("g2"), c("g3")], brideContacts: [c("b1", "9876543210", { roleEn: "Coordinator", roleTe: "x" })] }));
    expect(Object.keys(ok).filter((k) => k.startsWith("contact-") || k.endsWith("Contacts"))).toEqual([]);
    const bad = validateInvitation(valid({ groomContacts: [c("g1", "12"), c("g2", "9876543210"), c("g3", "abc")], brideContacts: [c("b1", "9876543210", { roleEn: "x".repeat(61) })] }));
    expect(bad["contact-g1-phone"]?.section).toBe("groom");
    expect(bad["contact-g2-phone"]).toBeUndefined();
    expect(bad["contact-g3-phone"]?.section).toBe("groom");
    expect(bad["contact-b1-role"]?.section).toBe("bride");
    const many = (p: string) => [1, 2, 3, 4].map((n) => c(`${p}${n}`));
    expect(validateInvitation(valid({ groomContacts: many("g") })).groomContacts?.section).toBe("groom");
    expect(validateInvitation(valid({ brideContacts: many("b") })).brideContacts?.section).toBe("bride");
  });
  it("T8: checks the relatives (side, relation, title, at most 8 per side)", () => {
    const r = (id: string, over = {}) => ({ id, side: "groom" as const, relation: "brother", prefix: "", nameEn: "A", nameTe: "", late: "", spouseEn: "", spouseTe: "", show: "1", ...over });
    const keys = (d: ReturnType<typeof valid>) => Object.keys(validateInvitation(d)).filter((k) => k.startsWith("relative-") || k.endsWith("Relatives"));
    expect(keys(valid({ familyMembers: [] }))).toEqual([]);
    expect(keys(valid({ familyMembers: Array.from({ length: 8 }, (_, i) => r(`g${i}`)).concat(Array.from({ length: 8 }, (_, i) => r(`b${i}`, { side: "bride" }))) }))).toEqual([]);
    const nine = Array.from({ length: 9 }, (_, i) => r(`g${i}`));
    expect(validateInvitation(valid({ familyMembers: nine })).groomRelatives?.section).toBe("groom");
    expect(validateInvitation(valid({ familyMembers: nine.map((x) => ({ ...x, side: "bride" as const })) })).brideRelatives?.section).toBe("bride");
    const bad = validateInvitation(valid({ familyMembers: [r("x1", { relation: "cousin" }), r("x2", { side: "bride", prefix: "king" }), r("x3", { side: "both" as unknown as "groom" })] }));
    expect(bad["relative-x1-relation"]?.section).toBe("groom");
    expect(bad["relative-x2-prefix"]?.section).toBe("bride");
    expect(bad["relative-x3-side"]).toBeDefined();
  });
  it("T8: a record with no familyMembers key at all is valid", () => {
    const d = valid({}) as unknown as Record<string, unknown>;
    delete d.familyMembers;
    expect(() => validateInvitation(d as never)).not.toThrow();
  });
  it("T6: checks event type, end time, description length and the number of events", () => {
    const base = { id: "e1", name: "Sangeet", nameTe: "", date: "2027-02-01", time: "", venue: "", venueTe: "", maps: "" };
    expect(validateInvitation(valid({ events: [{ ...base, type: "sangeet", endTime: "21:30", descEn: "ok", descTe: "ok", dress: "x" }] }))["event-e1-type"]).toBeUndefined();
    expect(validateInvitation(valid({ events: [base] }))["event-e1-type"]).toBeUndefined();   // an old record has none of the new keys
    const e = validateInvitation(valid({ events: [{ ...base, type: "party", endTime: "25:99", descEn: "x".repeat(301), descTe: "y".repeat(301) }] }));
    expect(e["event-e1-type"]?.section).toBe("events");
    expect(e["event-e1-endTime"]?.section).toBe("events");
    expect(e["event-e1-descEn"]).toBeDefined();
    expect(e["event-e1-descTe"]).toBeDefined();
    expect(validateInvitation(valid({ events: Array.from({ length: 7 }, (_, i) => ({ ...base, id: `e${i}` })) })).events?.section).toBe("events");
    expect(validateInvitation(valid({ events: Array.from({ length: 6 }, (_, i) => ({ ...base, id: `e${i}` })) })).events).toBeUndefined();
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

describe("validateInvitation: parent status (T1)", () => {
  it("still checks the phone of a living parent", () => {
    expect(validateInvitation(valid({ groomFatherPhone: "123" })).groomFatherPhone?.section).toBe("groom");
    expect(validateInvitation(valid({ brideMotherPhone: "abc" })).brideMotherPhone?.section).toBe("bride");
  });
  it("does not check the phone of a late or hidden parent (it is not shown)", () => {
    expect(validateInvitation(valid({ groomFatherPhone: "123", groomFatherStatus: "late" })).groomFatherPhone).toBeUndefined();
    expect(validateInvitation(valid({ groomMotherPhone: "123", groomMotherStatus: "hidden" })).groomMotherPhone).toBeUndefined();
    expect(validateInvitation(valid({ brideFatherPhone: "123", brideFatherStatus: "late" })).brideFatherPhone).toBeUndefined();
    expect(validateInvitation(valid({ brideMotherPhone: "123", brideMotherStatus: "hidden" })).brideMotherPhone).toBeUndefined();
  });
  it("a late father does not excuse the mother's bad phone", () => {
    expect(validateInvitation(valid({ groomFatherStatus: "late", groomMotherPhone: "123" })).groomMotherPhone).toBeDefined();
  });
});

describe("validateInvitation: closing block (T2)", () => {
  const row = (o: object) => ({ id: "n1", prefix: "", nameEn: "", nameTe: "", relationEn: "", relationTe: "", ...o });
  it("accepts the defaults, a list of known people, \"none\" and rows with every known prefix", () => {
    expect(validateInvitation(valid()).inviterSources).toBeUndefined();
    for (const s of ["", "none", "groom", "groomFather,groomMother,bride"]) expect(validateInvitation(valid({ inviterSources: s })).inviterSources).toBeUndefined();
    for (const p of ["", "sri", "smt", "chi", "late", "dr"]) expect(validateInvitation(valid({ inviterNames: [row({ prefix: p })] }))["inviter-n1-prefix"]).toBeUndefined();
  });
  it("rejects an unknown person in the list, in the message section", () => {
    const e = validateInvitation(valid({ inviterSources: "groom,uncle" }));
    expect(e.inviterSources).toEqual({ section: "message", msg: "Choose who is inviting from the list" });
    expect(validateInvitation(valid({ inviterSources: "groom," })).inviterSources).toBeDefined();
  });
  it("rejects an unknown prefix and more than 8 custom names", () => {
    expect(validateInvitation(valid({ inviterNames: [row({ prefix: "king" })] }))["inviter-n1-prefix"]?.section).toBe("message");
    const nine = Array.from({ length: 9 }, (_, i) => row({ id: `n${i}` }));
    expect(validateInvitation(valid({ inviterNames: nine })).inviterNames?.msg).toBe("Use at most 8 custom names");
    expect(validateInvitation(valid({ inviterNames: nine.slice(0, 8) })).inviterNames).toBeUndefined();
  });
});

describe("validateInvitation: honorific (T3)", () => {
  it("accepts empty and chiranjeevi, rejects anything else in the family section", () => {
    expect(validateInvitation(valid()).coupleHonorific).toBeUndefined();
    expect(validateInvitation(valid({ coupleHonorific: "chiranjeevi" })).coupleHonorific).toBeUndefined();
    expect(validateInvitation(valid({ coupleHonorific: "king" })).coupleHonorific?.section).toBe("family");
  });
});

describe("birth order (T4)", () => {
  it("accepts the list and empty; an unknown value is an error in the groom or bride section", () => {
    expect(validateInvitation(valid({ groomOrder: "second", brideOrder: "" })).groomOrder).toBeUndefined();
    expect(validateInvitation(valid({ groomOrder: "fifth" })).groomOrder?.section).toBe("groom");
    expect(validateInvitation(valid({ brideOrder: "fifth" })).brideOrder?.section).toBe("bride");
  });
});

describe("reception venue link (T5)", () => {
  it("an empty or https link is fine; a javascript: link is an error in the venue section", () => {
    expect(validateInvitation(valid({ receptionVenueMaps: "" })).receptionVenueMaps).toBeUndefined();
    expect(validateInvitation(valid({ receptionVenueMaps: "https://maps.google.com/?q=x" })).receptionVenueMaps).toBeUndefined();
    expect(validateInvitation(valid({ receptionVenueMaps: "javascript:alert(1)" })).receptionVenueMaps?.section).toBe("venue");
  });
  it("is checked even while 'same venue' is ticked, because the database checks every link field", () => {
    const e = validateInvitation(valid({ receptionEnabled: true, receptionDate: "2027-02-02", receptionSameVenue: true, receptionVenueMaps: "javascript:alert(1)" }));
    expect(e.receptionVenueMaps).toBeDefined();
  });
  it("an old record without the T5 keys has no new errors", () => {
    const { receptionSameVenue: _a, receptionVenueMaps: _b, ...old } = valid();
    expect(validateInvitation(old as unknown as InvitationData)).toEqual(validateInvitation(valid()));
  });
});


describe("validateInvitation: cross-field (T9)", () => {
  it("warns when reception date is before the wedding date", () => {
    const e = validateInvitation(valid({ weddingDate: "2027-02-10", receptionDate: "2027-02-01" }));
    expect(e.receptionDate?.severity).toBe("warning");
    expect(e.receptionDate?.section).toBe("venue");
    expect(e.receptionDate?.msg).toMatch(/before the wedding/i);
  });
  it("does not warn when reception is on or after the wedding", () => {
    expect(validateInvitation(valid({ weddingDate: "2027-02-10", receptionDate: "2027-02-10" })).receptionDate).toBeUndefined();
    expect(validateInvitation(valid({ weddingDate: "2027-02-10", receptionDate: "2027-02-11" })).receptionDate).toBeUndefined();
  });
  it("warns when a separate reception venue is empty", () => {
    const e = validateInvitation(valid({
      receptionEnabled: true,
      receptionDate: "2027-02-11",
      receptionSameVenue: false,
      receptionVenueEn: "",
      receptionVenueTe: "",
      receptionVenueAddress: "",
    }));
    expect(e.receptionVenueEn?.severity).toBe("warning");
    expect(e.receptionVenueEn?.section).toBe("venue");
  });
  it("does not warn about reception venue when same-venue is ticked or reception is off", () => {
    expect(validateInvitation(valid({ receptionEnabled: true, receptionDate: "2027-02-11", receptionSameVenue: true })).receptionVenueEn).toBeUndefined();
    expect(validateInvitation(valid({ receptionEnabled: false, receptionSameVenue: false })).receptionVenueEn).toBeUndefined();
  });
  it("warns when an event end time is before its start time", () => {
    const e = validateInvitation(valid({
      events: [{ id: "e1", name: "Mehendi", nameTe: "", date: "2027-02-09", time: "18:00", venue: "", venueTe: "", maps: "", type: "", endTime: "16:00", descEn: "", descTe: "", dress: "" }],
    }));
    expect(e["event-e1-endTime"]?.severity).toBe("warning");
    expect(e["event-e1-endTime"]?.section).toBe("events");
  });
  it("warns when an event date is after the wedding date", () => {
    const e = validateInvitation(valid({
      weddingDate: "2027-02-10",
      events: [{ id: "e1", name: "Party", nameTe: "", date: "2027-02-12", time: "", venue: "", venueTe: "", maps: "", type: "", endTime: "", descEn: "", descTe: "", dress: "" }],
    }));
    expect(e["event-e1-date"]?.severity).toBe("warning");
    expect(e["event-e1-date"]?.section).toBe("events");
  });
  it("still blocks save on hard errors; warnings alone leave the map non-empty but severity is warning", () => {
    const onlyWarn = validateInvitation(valid({ weddingDate: "2027-02-10", receptionDate: "2027-02-01" }));
    expect(Object.values(onlyWarn).every((v) => v.severity === "warning")).toBe(true);
    const hard = validateInvitation(valid({ groomEn: "" }));
    expect(hard.groomEn?.severity).toBeUndefined();
  });
});
