// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { renderHook } from "../test/renderHook";
import { useRowHint } from "./useRowHint";

const KEY = "schedy-rows:list";

beforeEach(() => { localStorage.clear(); });

describe("useRowHint", () => {
  it("uses the fallback on the first visit (and `max` when no fallback is given)", () => {
    const a = renderHook(() => useRowHint("list", 0, true, 8, 5));
    expect(a.result.current).toBe(5);
    a.unmount();
    const b = renderHook(() => useRowHint("list", 0, true, 8));
    expect(b.result.current).toBe(8);
    b.unmount();
  });

  it("remembers the row count of the last visit and starts the next visit with it", () => {
    const first = renderHook((p: { count: number; loading: boolean }) => useRowHint("list", p.count, p.loading, 8, 8), { count: 0, loading: true });
    first.rerender({ count: 6, loading: false });
    expect(JSON.parse(localStorage.getItem(KEY) as string)).toBe(6);
    first.unmount();
    const second = renderHook(() => useRowHint("list", 0, true, 8, 8));
    expect(second.result.current).toBe(6);
    second.unmount();
  });

  it("keeps the hint it started with while the list is on screen (no jump)", () => {
    const h = renderHook((p: { count: number; loading: boolean }) => useRowHint("list", p.count, p.loading, 8, 4), { count: 0, loading: true });
    expect(h.result.current).toBe(4);
    h.rerender({ count: 7, loading: false });
    expect(h.result.current).toBe(4);
    h.unmount();
  });

  it("writes nothing while loading, and nothing for an empty list or a failed load", () => {
    const h = renderHook((p: { count: number; loading: boolean }) => useRowHint("list", p.count, p.loading, 8), { count: 5, loading: true });
    expect(localStorage.getItem(KEY)).toBeNull();
    h.rerender({ count: 0, loading: false });
    expect(localStorage.getItem(KEY)).toBeNull();
    h.unmount();
  });

  it("an empty list does not overwrite what was remembered", () => {
    localStorage.setItem(KEY, "6");
    const h = renderHook((p: { count: number; loading: boolean }) => useRowHint("list", p.count, p.loading, 8), { count: 0, loading: true });
    h.rerender({ count: 0, loading: false });
    expect(localStorage.getItem(KEY)).toBe("6");
    expect(h.result.current).toBe(6);
    h.unmount();
  });

  it("never goes above `max` or below `min` (default 3)", () => {
    const big = renderHook((p: { count: number; loading: boolean }) => useRowHint("list", p.count, p.loading, 8), { count: 0, loading: true });
    big.rerender({ count: 50, loading: false });
    expect(JSON.parse(localStorage.getItem(KEY) as string)).toBe(8);
    big.unmount();
    localStorage.clear();
    const small = renderHook((p: { count: number; loading: boolean }) => useRowHint("list", p.count, p.loading, 8), { count: 0, loading: true });
    small.rerender({ count: 1, loading: false });
    expect(JSON.parse(localStorage.getItem(KEY) as string)).toBe(3);
    small.unmount();
  });

  it("a stored value outside the range is clamped when read, and a `min` above `max` is lowered to `max`", () => {
    localStorage.setItem(KEY, "99");
    const a = renderHook(() => useRowHint("list", 0, true, 8));
    expect(a.result.current).toBe(8);
    a.unmount();
    localStorage.setItem(KEY, "1");
    const b = renderHook(() => useRowHint("list", 0, true, 8, 8, 5));
    expect(b.result.current).toBe(5);
    b.unmount();
    const c = renderHook(() => useRowHint("list", 0, true, 2, 2, 5));
    expect(c.result.current).toBe(2);
    c.unmount();
  });

  it("a stored value that is not a number falls back to the fallback", () => {
    localStorage.setItem(KEY, JSON.stringify("many"));
    const h = renderHook(() => useRowHint("list", 0, true, 8, 5));
    expect(h.result.current).toBe(5);
    h.unmount();
    localStorage.setItem(KEY, "{broken");
    const g = renderHook(() => useRowHint("list", 0, true, 8, 5));
    expect(g.result.current).toBe(5);
    g.unmount();
  });

  it("each key has its own count", () => {
    localStorage.setItem("schedy-rows:a", "4");
    localStorage.setItem("schedy-rows:b", "7");
    const a = renderHook(() => useRowHint("a", 0, true, 8));
    const b = renderHook(() => useRowHint("b", 0, true, 8));
    expect(a.result.current).toBe(4);
    expect(b.result.current).toBe(7);
    a.unmount();
    b.unmount();
  });

  it("does not throw when the browser refuses the write", () => {
    const real = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error("quota"); };
    try {
      const h = renderHook((p: { count: number; loading: boolean }) => useRowHint("list", p.count, p.loading, 8), { count: 0, loading: true });
      expect(() => h.rerender({ count: 5, loading: false })).not.toThrow();
      h.unmount();
    } finally {
      Storage.prototype.setItem = real;
    }
  });
});
