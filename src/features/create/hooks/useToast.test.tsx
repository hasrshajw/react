// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, advance, renderHook } from "../../../test/renderHook";
import { useToast } from "./useToast";

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe("useToast (Create page)", () => {
  it("ok messages last 2.2 s and are tone ok by default", async () => {
    const h = renderHook(() => useToast());
    act(() => h.result.current.notify("Saved"));
    expect(h.result.current.toast).toEqual({ msg: "Saved", tone: "ok" });
    await advance(2200);
    expect(h.result.current.toast).toBeNull();
    h.unmount();
  });

  it("error messages last 3.5 s", async () => {
    const h = renderHook(() => useToast());
    act(() => h.result.current.notify("Could not save", "error"));
    await advance(3499);
    expect(h.result.current.toast).toEqual({ msg: "Could not save", tone: "error" });
    await advance(1);
    expect(h.result.current.toast).toBeNull();
    h.unmount();
  });

  it("a newer message restarts the timer, and notify keeps its identity", async () => {
    const h = renderHook(() => useToast());
    const { notify } = h.result.current;
    act(() => notify("one"));
    await advance(2000);
    act(() => notify("two", "error"));
    await advance(2000);
    expect(h.result.current.toast).toEqual({ msg: "two", tone: "error" });
    h.rerender();
    expect(h.result.current.notify).toBe(notify);
    h.unmount();
  });

  it("clears its timer on unmount", () => {
    const h = renderHook(() => useToast());
    act(() => h.result.current.notify("x"));
    h.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
