// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, advance, flush, renderHook } from "../../../test/renderHook";
import type { Enquiry } from "../../../types/dashboard";
import type { EnquirySummary } from "../../../lib/api";

vi.mock("../../../lib/api", () => ({ fetchEnquiryPage: vi.fn(), fetchEnquirySummary: vi.fn(), saveEnquiry: vi.fn() }));
import { fetchEnquiryPage, fetchEnquirySummary, saveEnquiry } from "../../../lib/api";
import { useEnquiries, type EnquiryView } from "./useEnquiries";

const pageMock = vi.mocked(fetchEnquiryPage);
const sumMock = vi.mocked(fetchEnquirySummary);
const saveMock = vi.mocked(saveEnquiry);
let hidden = false;

const enq = (id: string, extra: Partial<Enquiry> = {}): Enquiry => ({
  id, name: id, phone: "", email: "", message: "", createdAt: "2026-11-01T00:00:00Z", status: "new", note: "", followUpDate: "", history: [], ...extra,
});
const summary = (extra: Partial<EnquirySummary> = {}): EnquirySummary => ({ total: 2, new: 1, followup: 1, called: 0, cancelled: 0, staleNew: 1, dueFollow: 0, newestId: "b", ...extra });
const CLOSED: EnquiryView = { open: false, tab: "new", search: "" };
const OPEN: EnquiryView = { open: true, tab: "all", search: "" };

/** `view` open by default so the rows are read; pass CLOSED to test the Dashboard before the panel is opened. */
async function setup(list = [enq("a"), enq("b", { status: "followup" })], view: EnquiryView = OPEN) {
  pageMock.mockResolvedValue({ items: list, hasMore: false });
  sumMock.mockResolvedValue(summary());
  const notify = vi.fn();
  const onCount = vi.fn();
  const h = renderHook((p: { v: EnquiryView }) => useEnquiries(notify, onCount, p.v), { v: view });
  await flush();
  return { h, notify, onCount };
}

beforeEach(() => {
  vi.useFakeTimers();
  hidden = false;
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  pageMock.mockReset();
  sumMock.mockReset();
  saveMock.mockReset();
  saveMock.mockResolvedValue([]);
});
afterEach(() => { vi.useRealTimers(); });

describe("loading", () => {
  it("the first load is one small summary request: no rows are read until the panel is opened (egress)", async () => {
    const { h, onCount } = await setup([], CLOSED);
    expect(sumMock).toHaveBeenCalledTimes(1);
    expect(pageMock).not.toHaveBeenCalled();
    expect(h.result.current.loading).toBe(false);
    expect(h.result.current.enqNew).toBe(1);
    expect(h.result.current.enqFollow).toBe(1);
    expect(h.result.current.enqTotal).toBe(2);
    expect(h.result.current.staleNew).toBe(1);
    expect(onCount).toHaveBeenCalledWith(1);
    h.unmount();
  });

  it("opening the panel reads the first page of the open tab and search", async () => {
    const { h } = await setup([], CLOSED);
    pageMock.mockResolvedValue({ items: [enq("a")], hasMore: true });
    h.rerender({ v: { open: true, tab: "followup", search: "" } });
    await flush();
    expect(pageMock).toHaveBeenCalledTimes(1);
    expect(pageMock).toHaveBeenCalledWith({ tab: "followup", search: "" });
    expect(h.result.current.enquiries.map((e) => e.id)).toEqual(["a"]);
    expect(h.result.current.hasMore).toBe(true);
    h.unmount();
  });

  it("changing the tab reads that tab again; a search waits a moment so typing does not send a request per letter", async () => {
    const { h } = await setup();
    pageMock.mockClear();
    h.rerender({ v: { open: true, tab: "cancelled", search: "" } });
    await flush();
    expect(pageMock).toHaveBeenCalledTimes(1);
    pageMock.mockClear();
    h.rerender({ v: { open: true, tab: "cancelled", search: "a" } });
    h.rerender({ v: { open: true, tab: "cancelled", search: "ab" } });
    await advance(400);
    expect(pageMock).toHaveBeenCalledTimes(1);
    expect(pageMock).toHaveBeenCalledWith({ tab: "cancelled", search: "ab" });
    h.unmount();
  });

  it("More adds the next page after the rows on screen, skipping rows already shown", async () => {
    const { h } = await setup([enq("a"), enq("b")]);
    pageMock.mockResolvedValue({ items: [enq("b"), enq("c")], hasMore: false });
    act(() => h.result.current.loadMore());
    await flush();
    expect(pageMock).toHaveBeenLastCalledWith({ tab: "all", search: "", offset: 2 });
    expect(h.result.current.enquiries.map((e) => e.id)).toEqual(["a", "b", "c"]);
    expect(h.result.current.hasMore).toBe(false);
    h.unmount();
  });

  it("does not report 0 before the summary arrives (it would wipe the shell's number)", async () => {
    let release!: (s: EnquirySummary) => void;
    sumMock.mockImplementation(() => new Promise((r) => { release = r; }));
    const onCount = vi.fn();
    const h = renderHook(() => useEnquiries(vi.fn(), onCount, CLOSED));
    await flush();
    expect(h.result.current.loading).toBe(true);
    expect(onCount).not.toHaveBeenCalled();
    await act(async () => { release(summary()); });
    expect(onCount).toHaveBeenCalledWith(1);
    h.unmount();
  });

  it("a failed summary read leaves loading on and the count unreported", async () => {
    sumMock.mockRejectedValue(new Error("x"));
    const onCount = vi.fn();
    const h = renderHook(() => useEnquiries(vi.fn(), onCount, CLOSED));
    await flush();
    expect(h.result.current.enquiries).toEqual([]);
    expect(onCount).not.toHaveBeenCalled();
    h.unmount();
  });

  it("a failed page read ends the panel's loading, keeps the list empty and says so", async () => {
    sumMock.mockResolvedValue(summary());
    pageMock.mockRejectedValue(new Error("x"));
    const notify = vi.fn();
    const h = renderHook(() => useEnquiries(notify, undefined, OPEN));
    await flush();
    expect(h.result.current.listLoading).toBe(false);
    expect(h.result.current.enquiries).toEqual([]);
    expect(notify).toHaveBeenCalledWith(expect.stringContaining("Couldn’t load"));
    h.unmount();
  });
});

describe("status changes", () => {
  it("updates at once, adds a history entry, saves, and says what happened", async () => {
    const { h, notify } = await setup();
    act(() => h.result.current.setStatus("a", "called"));
    const a = h.result.current.enquiries.find((e) => e.id === "a")!;
    expect(a.status).toBe("called");
    expect(a.history.at(-1)?.status).toBe("called");
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(saveMock.mock.calls[0][0]).toMatchObject({ id: "a", status: "called" });
    expect(notify).toHaveBeenCalledWith("Marked as called", expect.any(Function));
    h.unmount();
  });

  it("marking for follow-up fills a date (tomorrow) when there is none, and keeps an existing one", async () => {
    const { h } = await setup([enq("a"), enq("c", { followUpDate: "2026-12-24" })]);
    act(() => h.result.current.setStatus("a", "followup"));
    act(() => h.result.current.setStatus("c", "followup"));
    expect(h.result.current.enquiries.find((e) => e.id === "a")!.followUpDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(h.result.current.enquiries.find((e) => e.id === "c")!.followUpDate).toBe("2026-12-24");
    h.unmount();
  });

  it("undo puts the old values back and saves them", async () => {
    const { h, notify } = await setup();
    act(() => h.result.current.setStatus("a", "cancelled"));
    const undo = notify.mock.calls[0][1] as () => void;
    act(() => undo());
    expect(h.result.current.enquiries.find((e) => e.id === "a")!.status).toBe("new");
    expect(saveMock).toHaveBeenCalledTimes(2);
    expect(saveMock.mock.calls[1][0]).toMatchObject({ id: "a", status: "new" });
    h.unmount();
  });

  it("a failed save puts the old values back and tells the person", async () => {
    const { h, notify } = await setup();
    saveMock.mockRejectedValue(new Error("rls"));
    act(() => h.result.current.setStatus("a", "called"));
    await flush();
    expect(h.result.current.enquiries.find((e) => e.id === "a")!.status).toBe("new");
    expect(notify).toHaveBeenCalledWith(expect.stringContaining("undone"));
    h.unmount();
  });

  it("shows the history the server wrote after a save", async () => {
    const { h } = await setup();
    saveMock.mockResolvedValue([{ status: "new", at: "t0" }, { status: "called", at: "server-time" }]);
    act(() => h.result.current.setStatus("a", "called"));
    await flush();
    expect(h.result.current.enquiries.find((e) => e.id === "a")!.history.at(-1)?.at).toBe("server-time");
    h.unmount();
  });

  it("an unknown id does nothing", async () => {
    const { h, notify } = await setup();
    act(() => h.result.current.setStatus("zzz", "called"));
    expect(saveMock).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
    h.unmount();
  });
});

describe("notes and follow-up dates", () => {
  it("saves a trimmed note; an unchanged note is not saved again", async () => {
    const { h, notify } = await setup([enq("a", { note: "call back" })]);
    act(() => h.result.current.saveNote("a", "  call back "));
    expect(saveMock).not.toHaveBeenCalled();
    act(() => h.result.current.saveNote("a", "  new text "));
    expect(h.result.current.enquiries[0].note).toBe("new text");
    expect(saveMock.mock.calls[0][0]).toMatchObject({ note: "new text" });
    expect(notify).toHaveBeenCalledWith("Note saved");
    h.unmount();
  });

  it("a note can be cleared", async () => {
    const { h } = await setup([enq("a", { note: "x" })]);
    act(() => h.result.current.saveNote("a", "   "));
    expect(h.result.current.enquiries[0].note).toBe("");
    expect(saveMock).toHaveBeenCalledTimes(1);
    h.unmount();
  });

  it("setFollowDate saves the date, and a failure restores the old one", async () => {
    const { h } = await setup([enq("a", { followUpDate: "2026-12-01" })]);
    saveMock.mockRejectedValue(new Error("x"));
    act(() => h.result.current.setFollowDate("a", "2026-12-05"));
    expect(h.result.current.enquiries[0].followUpDate).toBe("2026-12-05");
    await flush();
    expect(h.result.current.enquiries[0].followUpDate).toBe("2026-12-01");
    h.unmount();
  });
});

describe("refresh every 60 s (M-6, H-6 rule)", () => {
  it("a changed summary updates the counts, and reads the first page again only while the panel is open", async () => {
    const a = enq("a", { createdAt: "2026-11-03T00:00:00Z" });
    const b = enq("b", { createdAt: "2026-11-02T00:00:00Z" });
    const { h } = await setup([a, b]);
    pageMock.mockClear();
    pageMock.mockResolvedValue({ items: [enq("new1", { createdAt: "2026-11-05T00:00:00Z" }), a, b], hasMore: false });
    sumMock.mockResolvedValue(summary({ total: 3, new: 2, newestId: "new1" }));
    await advance(60000);
    expect(h.result.current.enqTotal).toBe(3);
    expect(h.result.current.enquiries.map((e) => e.id)).toEqual(["new1", "a", "b"]);
    h.unmount();
  });

  it("with the panel closed a change updates the counts and downloads no rows (egress)", async () => {
    const { h } = await setup([], CLOSED);
    sumMock.mockResolvedValue(summary({ total: 3, new: 2, newestId: "new1" }));
    await advance(60000);
    expect(h.result.current.enqNew).toBe(2);
    expect(pageMock).not.toHaveBeenCalled();
    h.unmount();
  });

  it("when nothing changed it reads no rows", async () => {
    const { h } = await setup();
    pageMock.mockClear();
    await advance(180000);
    expect(sumMock.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(pageMock).not.toHaveBeenCalled();
    h.unmount();
  });

  it("is skipped while the tab is hidden, and runs when it is shown again", async () => {
    const { h } = await setup();
    sumMock.mockClear();
    hidden = true;
    await advance(120000);
    expect(sumMock).not.toHaveBeenCalled();
    hidden = false;
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(sumMock).toHaveBeenCalledTimes(1);
    h.unmount();
  });

  it("is skipped while a save is on its way", async () => {
    const { h } = await setup();
    saveMock.mockImplementation(() => new Promise(() => {}));
    act(() => h.result.current.setStatus("a", "called"));
    sumMock.mockClear();
    await advance(60000);
    expect(sumMock).not.toHaveBeenCalled();
    h.unmount();
  });

  it("an answer for a request that started before a change is thrown away", async () => {
    const { h } = await setup();
    let release!: (p: { items: Enquiry[]; hasMore: boolean }) => void;
    pageMock.mockImplementation(() => new Promise((r) => { release = r; }));
    sumMock.mockResolvedValue(summary({ total: 3, newestId: "new1" }));
    await advance(60000);
    act(() => h.result.current.setStatus("a", "called"));
    await flush();
    await act(async () => { release({ items: [enq("a"), enq("b", { status: "followup" })], hasMore: false }); });
    expect(h.result.current.enquiries.find((e) => e.id === "a")!.status).toBe("called");
    h.unmount();
  });

  it("a failed refresh keeps the list on screen", async () => {
    const { h } = await setup();
    sumMock.mockRejectedValue(new Error("offline"));
    await advance(60000);
    expect(h.result.current.enquiries.length).toBe(2);
    h.unmount();
  });

  it("stops polling when the page is left", async () => {
    const { h } = await setup();
    h.unmount();
    sumMock.mockClear();
    await advance(180000);
    expect(sumMock).not.toHaveBeenCalled();
  });
});

describe("counts follow a status change", () => {
  it("moves one from the old status to the new one at once, and reads exact numbers again when saved", async () => {
    const { h } = await setup();
    sumMock.mockClear();
    act(() => h.result.current.setStatus("a", "called"));
    expect(h.result.current.enqNew).toBe(0);
    expect(h.result.current.counts.called).toBe(1);
    await flush();
    expect(sumMock).toHaveBeenCalledTimes(1);
    h.unmount();
  });

  it("a failed save puts the counts back", async () => {
    const { h } = await setup();
    saveMock.mockRejectedValue(new Error("rls"));
    sumMock.mockResolvedValue(summary());
    act(() => h.result.current.setStatus("a", "called"));
    await flush();
    expect(h.result.current.enqNew).toBe(1);
    h.unmount();
  });
});
