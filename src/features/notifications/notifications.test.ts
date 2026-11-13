import { describe, expect, it } from "vitest";
import type { AppNotification } from "../../lib/api";
import { notificationBody, notificationHref, notificationTitle } from "./useAdminNotifications";

const base = (over: Partial<AppNotification> = {}): AppNotification => ({
  id: 1,
  audience: "admin",
  type: "change_submitted",
  invitationId: "inv-1",
  requestId: "req-1",
  payload: { client_email: "a@b.com", changed_keys: ["groomEn", "venueEn"] },
  readAt: null,
  createdAt: "2026-11-13T10:00:00Z",
  ...over,
});

describe("notification helpers", () => {
  it("titles known types", () => {
    expect(notificationTitle(base())).toBe("Change request submitted");
    expect(notificationTitle(base({ type: "change_approved" }))).toBe("Changes approved");
    expect(notificationTitle(base({ type: "weird_type" }))).toBe("weird type");
  });

  it("deep-links change submissions to the review queue", () => {
    expect(notificationHref(base())).toBe("/reviews");
    expect(notificationHref(base({ type: "other", requestId: null, invitationId: "abc" }))).toBe("/create?edit=abc");
    expect(notificationHref(base({ type: "other", requestId: null, invitationId: null }))).toBeNull();
  });

  it("summarises change_submitted body from payload", () => {
    expect(notificationBody(base())).toMatch(/a@b\.com/);
    expect(notificationBody(base())).toMatch(/groomEn/);
  });
});
