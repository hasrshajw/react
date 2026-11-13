// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, advance, flush, renderHook } from "../../../test/renderHook";
import type { InvitationRow } from "../../../types/dashboard";

vi.mock("../../../lib/api", () => ({
  fetchInvitations: vi.fn(), savePublished: vi.fn(), saveDeleted: vi.fn(), fetchExpiredTrashIds: vi.fn(), deleteInvitation: vi.fn(),
}));
import { deleteInvitation, fetchExpiredTrashIds, fetchInvitations, saveDeleted, savePublished } from "../../../lib/api";
import { useInvitationStore } from "./useInvitationStore";

const list = vi.mocked(fetchInvitations);
const savePub = vi.mocked(savePublished);
const saveDel = vi.mocked(saveDeleted);
const expired = vi.mocked(fetchExpiredTrashIds);
const del = vi.mocked(deleteInvitation);
const DAY = 24 * 3600000;

const row = (id: string, extra: Partial<InvitationRow> = {}): InvitationRow => ({ id, groom_name: id, bride_name: "B", event_date: "2099-01-01", ...extra });
const answer = (rows: InvitationRow[], published: Record<string, boolean> = {}, deleted: Record<string, number> = {}, truncated?: boolean) => ({ rows, published, deleted, truncated });

async function setup(first = answer([row("a"), row("b")]), opts: { purgeExpired?: boolean } = {}) {
  list.mockResolvedValue(first);
  const notify = vi.fn();
  const h = renderHook(() => useInvitationStore({ notify, ...opts }));
  await flush();
  return { h, notify };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-12T10:00:00Z"));
  for (const m of [list, savePub, saveDel, expired, del]) m.mockReset();
  savePub.mockResolvedValue(undefined);
  saveDel.mockResolvedValue(undefined);
  expired.mockResolvedValue([]);
  del.mockResolvedValue(undefined);
});
afterEach(() => { vi.useRealTimers(); });

describe("loading", () => {
  it("is loading until the first answer, then holds rows and flags", async () => {
    let release!: (v: ReturnType<typeof answer>) => void;
    list.mockImplementation(() => new Promise((r) => { release = r; }));
    const notify = vi.fn();
    const h = renderHook(() => useInvitationStore({ notify }));
    await flush();
    expect(h.result.current.loading).toBe(true);
    await act(async () => { release(answer([row("a"), row("b")], { b: false })); });
    expect(h.result.current.loading).toBe(false);
    expect(h.result.current.rows.length).toBe(2);
    expect(h.result.current.isPub(row("a"))).toBe(true);
    expect(h.result.current.isPub(row("b"))).toBe(false);
    h.unmount();
  });

  it("a failed first load sets error", async () => {
    list.mockRejectedValue(new Error("x"));
    const notify = vi.fn();
    const h = renderHook(() => useInvitationStore({ notify }));
    await flush();
    expect(h.result.current.error).toBe(true);
    expect(h.result.current.loading).toBe(false);
    h.unmount();
  });

  it("a later failed reload tells the person and keeps the rows (no error screen)", async () => {
    const { h, notify } = await setup();
    list.mockRejectedValue(new Error("offline"));
    act(() => h.result.current.load());
    await flush();
    expect(h.result.current.error).toBe(false);
    expect(h.result.current.rows.length).toBe(2);
    expect(notify).toHaveBeenCalledWith(expect.stringContaining("Couldn’t refresh"));
    h.unmount();
  });

  it("a silent reload that fails says nothing", async () => {
    const { h, notify } = await setup();
    list.mockRejectedValue(new Error("offline"));
    act(() => h.result.current.load(true));
    await flush();
    expect(notify).not.toHaveBeenCalled();
    h.unmount();
  });

  it("a later reload shows `refreshing`, not `loading`", async () => {
    const { h } = await setup();
    let release!: (v: ReturnType<typeof answer>) => void;
    list.mockImplementation(() => new Promise((r) => { release = r; }));
    act(() => h.result.current.load());
    expect(h.result.current.refreshing).toBe(true);
    expect(h.result.current.loading).toBe(false);
    await act(async () => { release(answer([row("a")])); });
    expect(h.result.current.refreshing).toBe(false);
    h.unmount();
  });

  it("an answer after the page was left changes nothing and does not throw", async () => {
    let release!: (v: ReturnType<typeof answer>) => void;
    list.mockImplementation(() => new Promise((r) => { release = r; }));
    const notify = vi.fn();
    const h = renderHook(() => useInvitationStore({ notify }));
    await flush();
    h.unmount();
    await act(async () => { release(answer([row("a")])); });
  });
});

describe("truncated list (M-5)", () => {
  it("is false for a normal list and true when the read was cut at the limit", async () => {
    const a = await setup();
    expect(a.h.result.current.truncated).toBe(false);
    a.h.unmount();
    const b = await setup(answer([row("a")], {}, {}, true));
    expect(b.h.result.current.truncated).toBe(true);
    b.h.unmount();
  });

  it("follows a refresh: the note goes away once the list fits again", async () => {
    const { h } = await setup(answer([row("a")], {}, {}, true));
    expect(h.result.current.truncated).toBe(true);
    list.mockResolvedValue(answer([row("a")]));
    await act(async () => { h.result.current.load(true); });
    await flush();
    expect(h.result.current.truncated).toBe(false);
    h.unmount();
  });
});

describe("load more (M-5)", () => {
  it("asks for the next 10,000, keeps the raised limit on refresh, and clears the note when everything is read", async () => {
    const { h } = await setup(answer([row("a")], {}, {}, true));
    expect(list).toHaveBeenLastCalledWith(10000);
    list.mockResolvedValue(answer([row("a"), row("old")], {}, {}, false));
    await act(async () => { h.result.current.loadMore(); });
    await flush();
    expect(list).toHaveBeenLastCalledWith(20000);
    expect(h.result.current.rows.map((r) => r.id)).toEqual(["a", "old"]);
    expect(h.result.current.truncated).toBe(false);
    await act(async () => { h.result.current.load(true); });
    await flush();
    expect(list).toHaveBeenLastCalledWith(20000);
    h.unmount();
  });

  it("goes back to the old limit and tells the person when the read fails", async () => {
    const { h, notify } = await setup(answer([row("a")], {}, {}, true));
    list.mockRejectedValueOnce(new Error("x"));
    await act(async () => { h.result.current.loadMore(); });
    await flush();
    expect(notify).toHaveBeenCalledWith("Couldn’t load more invitations.");
    expect(h.result.current.rows.map((r) => r.id)).toEqual(["a"]);
    list.mockResolvedValue(answer([row("a")], {}, {}, true));
    await act(async () => { h.result.current.load(true); });
    await flush();
    expect(list).toHaveBeenLastCalledWith(10000);
    h.unmount();
  });
});

describe("publish / draft (H-6)", () => {
  it("toggles at once, saves the whole map, and offers undo", async () => {
    const { h, notify } = await setup();
    act(() => h.result.current.togglePublish(row("a")));
    expect(h.result.current.isPub(row("a"))).toBe(false);
    expect(savePub).toHaveBeenCalledWith({ a: false });
    expect(notify).toHaveBeenCalledWith("Invitation moved to draft", expect.any(Function));
    act(() => (notify.mock.calls[0][1] as () => void)());
    expect(h.result.current.isPub(row("a"))).toBe(true);
    expect(savePub).toHaveBeenLastCalledWith({ a: true });
    h.unmount();
  });

  it("the message says archived for a past event and published when going live", async () => {
    const past = row("p", { event_date: "2020-01-01" });
    const { h, notify } = await setup(answer([past, row("d")], { d: false }));
    act(() => h.result.current.togglePublish(past));
    expect(notify).toHaveBeenLastCalledWith("Invitation archived", expect.any(Function));
    act(() => h.result.current.togglePublish(row("d")));
    expect(notify).toHaveBeenLastCalledWith("Invitation published", expect.any(Function));
    h.unmount();
  });

  it("a failed save goes back to the saved state, says so, and re-reads the list", async () => {
    const { h, notify } = await setup();
    savePub.mockRejectedValue(new Error("rls"));
    list.mockClear();
    list.mockResolvedValue(answer([row("a"), row("b")]));
    act(() => h.result.current.togglePublish(row("a")));
    expect(h.result.current.isPub(row("a"))).toBe(false);
    await flush();
    expect(h.result.current.isPub(row("a"))).toBe(true);
    expect(notify).toHaveBeenCalledWith(expect.stringContaining("undone"));
    expect(list).toHaveBeenCalledTimes(1);
    h.unmount();
  });

  it("two quick changes: the later one wins, and one failure of the earlier does not undo it", async () => {
    const { h } = await setup();
    let failFirst!: (e: Error) => void;
    savePub.mockImplementationOnce(() => new Promise((_, rej) => { failFirst = rej; })).mockResolvedValueOnce(undefined);
    act(() => h.result.current.togglePublish(row("a")));
    act(() => h.result.current.togglePublish(row("b")));
    await act(async () => { failFirst(new Error("x")); });
    expect(h.result.current.isPub(row("a"))).toBe(false);
    expect(h.result.current.isPub(row("b"))).toBe(false);
    expect(savePub).toHaveBeenLastCalledWith({ a: false, b: false });
    h.unmount();
  });

  it("a refresh that arrives while a save is pending does not overwrite the screen", async () => {
    const { h } = await setup();
    let done!: () => void;
    savePub.mockImplementation(() => new Promise<void>((r) => { done = r; }));
    act(() => h.result.current.togglePublish(row("a")));
    list.mockResolvedValue(answer([row("a"), row("b")], { a: true }));
    act(() => h.result.current.load(true));
    await flush();
    expect(h.result.current.isPub(row("a"))).toBe(false);
    await act(async () => { done(); });
    h.unmount();
  });

  it("a refresh that started before a change is thrown away, one that started after is taken", async () => {
    const { h } = await setup();
    let release!: (v: ReturnType<typeof answer>) => void;
    list.mockImplementation(() => new Promise((r) => { release = r; }));
    act(() => h.result.current.load(true));
    act(() => h.result.current.togglePublish(row("a")));
    await flush();
    await act(async () => { release(answer([row("a"), row("b")], { a: true })); });
    expect(h.result.current.isPub(row("a"))).toBe(false);
    list.mockResolvedValue(answer([row("a"), row("b")], { a: false, b: false }));
    act(() => h.result.current.load(true));
    await flush();
    expect(h.result.current.isPub(row("b"))).toBe(false);
    h.unmount();
  });

  it("with nothing waiting, a refresh replaces the flags (another admin's change shows)", async () => {
    const { h } = await setup();
    list.mockResolvedValue(answer([row("a"), row("b")], { b: false }));
    act(() => h.result.current.load(true));
    await flush();
    expect(h.result.current.isPub(row("b"))).toBe(false);
    h.unmount();
  });
});

describe("trash", () => {
  it("moveToTrash hides the row, saves the time, and undo restores it", async () => {
    const { h, notify } = await setup();
    act(() => h.result.current.moveToTrash(row("a")));
    expect(h.result.current.visible.map((r) => r.id)).toEqual(["b"]);
    expect(h.result.current.trashed.map((t) => t.row.id)).toEqual(["a"]);
    expect(saveDel).toHaveBeenCalledWith({ a: Date.now() });
    expect(notify).toHaveBeenCalledWith("Moved to trash", expect.any(Function));
    act(() => (notify.mock.calls[0][1] as () => void)());
    expect(h.result.current.visible.length).toBe(2);
    expect(saveDel).toHaveBeenLastCalledWith({});
    h.unmount();
  });

  it("the trash list is newest first and leaves out anything older than 30 days", async () => {
    const now = Date.now();
    const { h } = await setup(answer([row("a"), row("b"), row("c"), row("d")], {}, { a: now - 2 * DAY, b: now - 31 * DAY, c: now - 1 * DAY }));
    expect(h.result.current.trashed.map((t) => t.row.id)).toEqual(["c", "a"]);
    expect(h.result.current.visible.map((r) => r.id)).toEqual(["d"]);
    h.unmount();
  });

  it("a failed trash save goes back, says so, and re-reads", async () => {
    const { h, notify } = await setup();
    saveDel.mockRejectedValue(new Error("x"));
    act(() => h.result.current.moveToTrash(row("a")));
    await flush();
    expect(h.result.current.visible.length).toBe(2);
    expect(notify).toHaveBeenCalledWith(expect.stringContaining("undone"));
    h.unmount();
  });
});

describe("purge of expired trash (L-8)", () => {
  it("does nothing unless asked", async () => {
    const { h } = await setup();
    expect(expired).not.toHaveBeenCalled();
    h.unmount();
  });

  it("asks the server once, deletes only ids it knows, then reloads quietly", async () => {
    expired.mockResolvedValue(["a", "ghost"]);
    list.mockResolvedValue(answer([row("a"), row("b")]));
    const notify = vi.fn();
    const h = renderHook(() => useInvitationStore({ notify, purgeExpired: true }));
    await flush();
    await flush();
    expect(expired).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledWith("a");
    expect(list).toHaveBeenCalledTimes(2);
    act(() => h.result.current.load(true));
    await flush();
    expect(expired).toHaveBeenCalledTimes(1);
    h.unmount();
  });

  it("with nothing expired no row is deleted", async () => {
    await setup(answer([row("a")]), { purgeExpired: true });
    await flush();
    expect(expired).toHaveBeenCalledTimes(1);
    expect(del).not.toHaveBeenCalled();
  });

  it("a server error means nothing is purged and nothing is shown", async () => {
    expired.mockRejectedValue(new Error("function missing"));
    const { h, notify } = await setup(answer([row("a")]), { purgeExpired: true });
    await flush();
    expect(del).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
    h.unmount();
  });

  it("does not run on an empty list", async () => {
    const { h } = await setup(answer([]), { purgeExpired: true });
    await flush();
    expect(expired).not.toHaveBeenCalled();
    h.unmount();
  });
});

describe("clock", () => {
  it("`now` moves forward every 30 s", async () => {
    const { h } = await setup();
    const t0 = h.result.current.now;
    await advance(30000);
    expect(h.result.current.now).toBeGreaterThan(t0);
    h.unmount();
  });
});
