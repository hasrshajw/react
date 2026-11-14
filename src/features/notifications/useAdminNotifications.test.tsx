// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, flush, renderHook } from "../../test/renderHook";

/* Egress: the bell must not download the whole list again for every Realtime message, and "mark all read" must be ONE request. */
const h = vi.hoisted(() => ({
  fetchNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markNotificationsRead: vi.fn(),
  onMessage: null as null | ((m: unknown) => void),
}));

vi.mock("../../lib/api", () => ({
  fetchNotifications: (...a: unknown[]) => h.fetchNotifications(...a),
  markNotificationRead: (id: number) => h.markNotificationRead(id),
  markNotificationsRead: (ids: number[]) => h.markNotificationsRead(ids),
  toNotification: (r: Record<string, unknown> | null) =>
    r && typeof r.id === "number" && typeof r.type === "string"
      ? { id: r.id, audience: "admin", type: r.type, invitationId: null, requestId: null, payload: {}, readAt: (r.read_at ?? null) as string | null, createdAt: "t" }
      : null,
}));
vi.mock("../../lib/supabase", () => {
  const channel = { on: (_e: string, _f: unknown, cb: (m: unknown) => void) => { h.onMessage = cb; return channel; }, subscribe: () => channel };
  return { SUPABASE_CONFIGURED: true, db: () => ({ channel: () => channel, removeChannel: () => {} }) };
});

import { useAdminNotifications } from "./useAdminNotifications";

const n = (id: number, readAt: string | null = null) => ({ id, audience: "admin", type: "change_submitted", invitationId: null, requestId: null, payload: {}, readAt, createdAt: "t" });

beforeEach(() => { vi.clearAllMocks(); h.onMessage = null; h.fetchNotifications.mockResolvedValue([n(1), n(2)]); h.markNotificationsRead.mockResolvedValue(undefined); });

describe("notifications bell", () => {
  it("a new notification from Realtime is added to the list without reading the list again", async () => {
    const { result } = renderHook(() => useAdminNotifications());
    await flush(); await flush();
    expect(h.fetchNotifications).toHaveBeenCalledTimes(1);
    act(() => { h.onMessage?.({ eventType: "INSERT", new: { id: 3, type: "change_submitted", read_at: null } }); });
    expect(result.current.items.map((i) => i.id)).toEqual([3, 1, 2]);
    expect(result.current.unread).toBe(3);
    expect(h.fetchNotifications).toHaveBeenCalledTimes(1);
  });

  it("a read-mark from Realtime updates that row in place, with no new read", async () => {
    const { result } = renderHook(() => useAdminNotifications());
    await flush(); await flush();
    act(() => { h.onMessage?.({ eventType: "UPDATE", new: { id: 1, type: "change_submitted", read_at: "2026-01-01" } }); });
    expect(result.current.items.find((i) => i.id === 1)?.readAt).toBe("2026-01-01");
    expect(result.current.unread).toBe(1);
    expect(h.fetchNotifications).toHaveBeenCalledTimes(1);
  });

  it("Mark all read sends one request for all unread notifications", async () => {
    const { result } = renderHook(() => useAdminNotifications());
    await flush(); await flush();
    await act(async () => { await result.current.markAllRead(); });
    expect(h.markNotificationsRead).toHaveBeenCalledTimes(1);
    expect(h.markNotificationsRead).toHaveBeenCalledWith([1, 2]);
    expect(h.markNotificationRead).not.toHaveBeenCalled();
    expect(result.current.unread).toBe(0);
  });
});
