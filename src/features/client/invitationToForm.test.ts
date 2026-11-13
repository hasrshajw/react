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
