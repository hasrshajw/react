// @vitest-environment jsdom
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderHook } from "../test/renderHook";
import { useLatest } from "./useLatest";

describe("useLatest", () => {
  it("returns the same ref object on every render and keeps the newest value in it", () => {
    const h = renderHook((p: { v: number }) => useLatest(p.v), { v: 1 });
    const first = h.result.current;
    expect(first.current).toBe(1);
    h.rerender({ v: 2 });
    expect(h.result.current).toBe(first);
    expect(first.current).toBe(2);
    h.unmount();
  });

  it("an effect that reads the ref runs only for its own inputs, but always calls the newest callback", () => {
    const calls: string[] = [];
    const h = renderHook((p: { on: boolean; cb: () => void }) => {
      const cbRef = useLatest(p.cb);
      useEffect(() => { cbRef.current(); }, [p.on, cbRef]);
    }, { on: false, cb: () => calls.push("first") });
    expect(calls).toEqual(["first"]);
    // a new function with the same input: the effect must not run again
    h.rerender({ on: false, cb: () => calls.push("second") });
    expect(calls).toEqual(["first"]);
    // the input changes: the effect runs and uses the newest function
    h.rerender({ on: true, cb: () => calls.push("third") });
    expect(calls).toEqual(["first", "third"]);
    h.unmount();
  });

  it("an unmount cleanup calls the newest callback, not the one from the first render", () => {
    const first = vi.fn();
    const second = vi.fn();
    const h = renderHook((p: { cb: () => void }) => {
      const cbRef = useLatest(p.cb);
      useEffect(() => () => cbRef.current(), [cbRef]);
    }, { cb: first });
    h.rerender({ cb: second });
    h.unmount();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
