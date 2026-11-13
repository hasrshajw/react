// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, advance, flush, renderHook } from "../../../test/renderHook";
import type { Enquiry } from "../../../types/dashboard";

vi.mock("../../../lib/api", () => ({ fetchEnquiries: vi.fn(), saveEnquiry: vi.fn() }));
import { fetchEnquiries, saveEnquiry } from "../../../lib/api";
import { useEnquiries } from "./useEnquiries";

const fetchMock = vi.mocked(fetchEnquiries);
const saveMock = vi.mocked(saveEnquiry);
let hidden = false;

const enq = (id: string, extra: Partial<Enquiry> = {}): Enquiry => ({
  id, name: id, phone: "", email: "", message: "", createdAt: "2026-11-01T00:00:00Z", status: "new", note: "", followUpDate: "", history: [], ...extra,
});

async function setup(list = [enq("a"), enq("b", { status: "followup" })]) {
  fetchMock.mockResolvedValue(list);
  const notify = vi.fn();
  const onCount = vi.fn();
  const h = renderHook(() => useEnquiries(notify, onCount));
  await flush();
  return { h, notify, onCount };
}

beforeEach(() => {
  vi.useFakeTimers();
  hidden = false;
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  fetchMock.mockReset();
  saveMock.mockReset();
  saveMock.mockResolvedValue([]);
});
afterEach(() => { vi.useRealTimers(); });

describe("loading", () => {
  it("loads the list, counts new and follow-up, and reports the count once loaded", async () => {
    const { h, onCount } = await setup();
    expect(h.result.current.loading).toBe(false);
    expect(h.result.current.enquiries.map((e) => e.id)).toEqual(["a", "b"]);
    expect(h.result.current.enqNew).toBe(1);
    expect(h.result.current.enqFollow).toBe(1);
    expect(onCount).toHaveBeenCalledWith(1);
    h.unmount();
  });

  it("does not report 0 before the first list arrives (it would wipe the shell's number)", async () => {
    let release!: (l: Enquiry[]) => void;
    fetchMock.mockImplementation(() => new Promise((r) => { release = r; }));
    const onCount = vi.fn();
    const h = renderHook(() => useEnquiries(vi.fn(), onCount));
    await flush();
    expect(h.result.current.loading).toBe(true);
    expect(onCount).not.toHaveBeenCalled();
    await act(async () => { release([enq("a")]); });
    expect(onCount).toHaveBeenCalledWith(1);
    h.unmount();
  });

  it("a new onCountChange function from the parent does not re-report the same count, and the newest one gets the next change", async () => {
    fetchMock.mockResolvedValue([enq("a")]);
    const first = vi.fn();
    const second = vi.fn();
    const h = renderHook((p: { cb: (n: number) => void }) => useEnquiries(vi.fn(), p.cb), { cb: first });
    await flush();
    expect(first).toHaveBeenCalledTimes(1);
    h.rerender({ cb: second });
    expect(second).not.toHaveBeenCalled();
    act(() => { h.result.current.setStatus("a", "called"); });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledWith(0);
    h.unmount();
  });

  it("a failed first load ends loading with an empty list", async () => {
    fetchMock.mockRejectedValue(new Error("x"));
    const h = renderHook(() => useEnquiries(vi.fn()));
    await flush();
    expect(h.result.current.loading).toBe(false);
    expect(h.result.current.enquiries).toEqual([]);
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
  it("picks up new enquiries", async () => {
    const { h } = await setup();
    fetchMock.mockResolvedValue([enq("a"), enq("b"), enq("new1")]);
    await advance(60000);
    expect(h.result.current.enquiries.length).toBe(3);
    h.unmount();
  });

  it("is skipped while the tab is hidden, and runs when it is shown again", async () => {
    const { h } = await setup();
    fetchMock.mockClear();
    hidden = true;
    await advance(120000);
    expect(fetchMock).not.toHaveBeenCalled();
    hidden = false;
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    h.unmount();
  });

  it("is skipped while a save is on its way", async () => {
    const { h } = await setup();
    saveMock.mockImplementation(() => new Promise(() => {}));
    act(() => h.result.current.setStatus("a", "called"));
    fetchMock.mockClear();
    await advance(60000);
    expect(fetchMock).not.toHaveBeenCalled();
    h.unmount();
  });

  it("an answer for a request that started before a change is thrown away", async () => {
    const { h } = await setup();
    let release!: (l: Enquiry[]) => void;
    fetchMock.mockImplementation(() => new Promise((r) => { release = r; }));
    await advance(60000);
    act(() => h.result.current.setStatus("a", "called"));
    await flush();
    await act(async () => { release([enq("a"), enq("b", { status: "followup" })]); });
    expect(h.result.current.enquiries.find((e) => e.id === "a")!.status).toBe("called");
    h.unmount();
  });

  it("a failed refresh keeps the list on screen", async () => {
    const { h } = await setup();
    fetchMock.mockRejectedValue(new Error("offline"));
    await advance(60000);
    expect(h.result.current.enquiries.length).toBe(2);
    h.unmount();
  });

  it("stops polling when the page is left", async () => {
    const { h } = await setup();
    h.unmount();
    fetchMock.mockClear();
    await advance(180000);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
