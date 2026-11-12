// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, advance, flush, renderHook } from "../../../test/renderHook";

vi.mock("../../../lib/api", () => ({ fetchNewEnquiryCount: vi.fn() }));
import { fetchNewEnquiryCount } from "../../../lib/api";
import { useEnquiryBadge } from "./useEnquiryBadge";

const count = vi.mocked(fetchNewEnquiryCount);
let hidden = false;
const setHidden = (v: boolean) => { hidden = v; };

beforeEach(() => {
  vi.useFakeTimers();
  hidden = false;
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  document.title = "Schedy Admin";
  count.mockReset();
});
afterEach(() => { vi.useRealTimers(); });

describe("useEnquiryBadge (M-6)", () => {
  it("asks the server on mount and shows the number in the tab title", async () => {
    count.mockResolvedValue(3);
    const h = renderHook(() => useEnquiryBadge());
    await flush();
    expect(h.result.current.count).toBe(3);
    expect(document.title).toBe("(3) Schedy Admin");
    h.unmount();
  });

  it("zero removes the prefix, and the prefix never stacks", async () => {
    count.mockResolvedValueOnce(2).mockResolvedValueOnce(5).mockResolvedValueOnce(0);
    const h = renderHook(() => useEnquiryBadge(1000));
    await flush();
    expect(document.title).toBe("(2) Schedy Admin");
    await advance(1000);
    expect(document.title).toBe("(5) Schedy Admin");
    await advance(1000);
    expect(document.title).toBe("Schedy Admin");
    h.unmount();
  });

  it("polls on the interval and stops when the page is left (title restored)", async () => {
    count.mockResolvedValue(1);
    const h = renderHook(() => useEnquiryBadge(1000));
    await flush();
    await advance(3000);
    expect(count).toHaveBeenCalledTimes(4);
    h.unmount();
    expect(document.title).toBe("Schedy Admin");
    await advance(5000);
    expect(count).toHaveBeenCalledTimes(4);
  });

  it("does not ask while the tab is hidden, and asks again when it is shown", async () => {
    count.mockResolvedValue(1);
    setHidden(true);
    const h = renderHook(() => useEnquiryBadge(1000));
    await flush();
    await advance(3000);
    expect(count).not.toHaveBeenCalled();
    setHidden(false);
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(count).toHaveBeenCalledTimes(1);
    h.unmount();
  });

  it("asks again when the window gets focus", async () => {
    count.mockResolvedValue(1);
    const h = renderHook(() => useEnquiryBadge(60000));
    await flush();
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    expect(count).toHaveBeenCalledTimes(2);
    h.unmount();
  });

  it("never runs two requests at once", async () => {
    let release!: (n: number) => void;
    count.mockImplementation(() => new Promise<number>((r) => { release = r; }));
    const h = renderHook(() => useEnquiryBadge(1000));
    await advance(5000);
    expect(count).toHaveBeenCalledTimes(1);
    await act(async () => { release(2); });
    await advance(1000);
    expect(count).toHaveBeenCalledTimes(2);
    h.unmount();
  });

  it("report() sets the number at once, and an older poll cannot overwrite it", async () => {
    let release!: (n: number) => void;
    count.mockImplementation(() => new Promise<number>((r) => { release = r; }));
    const h = renderHook(() => useEnquiryBadge(60000));
    await flush();
    act(() => h.result.current.report(7));
    expect(h.result.current.count).toBe(7);
    await act(async () => { release(2); });
    expect(h.result.current.count).toBe(7);
    h.unmount();
  });

  it("keeps the last number when a poll fails, and tries again", async () => {
    count.mockResolvedValueOnce(4).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(6);
    const h = renderHook(() => useEnquiryBadge(1000));
    await flush();
    await advance(1000);
    expect(h.result.current.count).toBe(4);
    await advance(1000);
    expect(h.result.current.count).toBe(6);
    h.unmount();
  });

  it("ignores an answer that arrives after the page was left", async () => {
    let release!: (n: number) => void;
    count.mockImplementation(() => new Promise<number>((r) => { release = r; }));
    const h = renderHook(() => useEnquiryBadge(60000));
    await flush();
    h.unmount();
    await act(async () => { release(9); });
    expect(document.title).toBe("Schedy Admin");
  });
});
