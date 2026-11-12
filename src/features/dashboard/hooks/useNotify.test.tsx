// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, advance, renderHook } from "../../../test/renderHook";
import { useNotify } from "./useNotify";

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe("useNotify (dashboard toast)", () => {
  it("shows a message for 2.2 s, then clears it", async () => {
    const h = renderHook(() => useNotify());
    expect(h.result.current.toast).toBeNull();
    act(() => h.result.current.notify("Saved"));
    expect(h.result.current.toast).toEqual({ msg: "Saved", undo: undefined });
    await advance(2199);
    expect(h.result.current.toast?.msg).toBe("Saved");
    await advance(1);
    expect(h.result.current.toast).toBeNull();
    h.unmount();
  });

  it("an undoable message stays 6 s and keeps its undo function", async () => {
    const undo = vi.fn();
    const h = renderHook(() => useNotify());
    act(() => h.result.current.notify("Deleted", undo));
    expect(h.result.current.toast?.undo).toBe(undo);
    await advance(5999);
    expect(h.result.current.toast).not.toBeNull();
    await advance(1);
    expect(h.result.current.toast).toBeNull();
    h.unmount();
  });

  it("a newer message replaces the older one and restarts the timer", async () => {
    const h = renderHook(() => useNotify());
    act(() => h.result.current.notify("first"));
    await advance(2000);
    act(() => h.result.current.notify("second"));
    await advance(2000); // the first message's timer would have fired by now
    expect(h.result.current.toast?.msg).toBe("second");
    await advance(200);
    expect(h.result.current.toast).toBeNull();
    h.unmount();
  });

  it("dismiss clears it at once and cancels the timer", async () => {
    const h = renderHook(() => useNotify());
    act(() => h.result.current.notify("x"));
    act(() => h.result.current.dismiss());
    expect(h.result.current.toast).toBeNull();
    act(() => h.result.current.notify("y"));
    await advance(1000);
    expect(h.result.current.toast?.msg).toBe("y");
    h.unmount();
  });

  it("notify and dismiss keep the same identity across renders (a hook that depends on notify must not reload in a loop)", () => {
    const h = renderHook(() => useNotify());
    const { notify, dismiss } = h.result.current;
    act(() => notify("a"));
    h.rerender();
    expect(h.result.current.notify).toBe(notify);
    expect(h.result.current.dismiss).toBe(dismiss);
    h.unmount();
  });

  it("clears its timer on unmount (no state update after the page is left)", () => {
    const h = renderHook(() => useNotify());
    act(() => h.result.current.notify("x"));
    h.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
