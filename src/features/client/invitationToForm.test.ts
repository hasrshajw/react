import { describe, expect, it } from "vitest";
import type { MyInvitation } from "../../lib/api";
import { clientStatus, invitationToForm } from "./invitationToForm";

const base = (over: Partial<MyInvitation> = {}): MyInvitation => ({
  id: "i1",
  groomName: "Ravi",
  brideName: "Sita",
  eventDate: "2026-12-01",
  templateId: "t1",
  published: true,
  details: { venueEn: "Hall" },
  updatedAt: "2026-01-01T00:00:00Z",
  request: null,
  ...over,
});

describe("clientStatus", () => {
  it("maps request and published state", () => {
    expect(clientStatus(base())).toBe("live");
    expect(clientStatus(base({ published: false }))).toBe("up_to_date");
    expect(clientStatus(base({
      request: { id: "r", status: "pending", adminNote: "", createdAt: "", acknowledgedAt: null, proposedDetails: null },
    }))).toBe("pending");
    expect(clientStatus(base({
      request: { id: "r", status: "rejected", adminNote: "x", createdAt: "", acknowledgedAt: null, proposedDetails: null },
    }))).toBe("rejected");
    expect(clientStatus(base({
      request: { id: "r", status: "rejected", adminNote: "x", createdAt: "", acknowledgedAt: "2026-01-02", proposedDetails: null },
    }))).toBe("live");
  });
});

describe("invitationToForm", () => {
  it("prefers top-level couple and date columns", () => {
    const data = invitationToForm(base({ details: { groomEn: "Other", venueEn: "Hall" } }));
    expect(data.groomEn).toBe("Ravi");
    expect(data.brideEn).toBe("Sita");
    expect(data.weddingDate).toBe("2026-12-01");
    expect(data.venueEn).toBe("Hall");
    expect(data.clientEmail).toBe("");
  });

  it("uses proposedDetails when preferProposed and pending", () => {
    const data = invitationToForm(base({
      details: { venueEn: "Old" },
      request: {
        id: "r", status: "pending", adminNote: "", createdAt: "", acknowledgedAt: null,
        proposedDetails: { venueEn: "New Hall", groomEn: "Ravi" },
      },
    }), true);
    expect(data.venueEn).toBe("New Hall");
  });
});

describe("invitationToForm: closing block (T2)", () => {
  it("a record saved before T2 loads with the defaults (ఇట్లు, old control, no custom names)", () => {
    const f = invitationToForm(base({ details: { inviterMode: "both" } }));
    expect(f).toMatchObject({ closingTitleMode: "", closingTitleEn: "", closingTitleTe: "", inviterSources: "", inviterNames: [], inviterMode: "both" });
  });
  it("keeps saved names, and a damaged list becomes empty", () => {
    const names = [{ id: "n1", prefix: "sri", nameEn: "Rao", nameTe: "రావు", relationEn: "", relationTe: "" }];
    expect(invitationToForm(base({ details: { inviterNames: names, inviterSources: "groom", closingTitleMode: "none" } }))).toMatchObject({ inviterNames: names, inviterSources: "groom", closingTitleMode: "none" });
    expect(invitationToForm(base({ details: { inviterNames: "oops" as never } })).inviterNames).toEqual([]);
  });
});

describe("invitationToForm: house names (T3)", () => {
  it("a record saved before T3 loads with empty defaults, and saved values are kept", () => {
    expect(invitationToForm(base())).toMatchObject({ groomSurnameTe: "", brideGotramEn: "", coupleHonorific: "" });
    expect(invitationToForm(base({ details: { groomGotramTe: "భరద్వాజ", coupleHonorific: "chiranjeevi" } }))).toMatchObject({ groomGotramTe: "భరద్వాజ", coupleHonorific: "chiranjeevi" });
  });
});
