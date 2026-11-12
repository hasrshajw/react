// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { advance, renderHook } from "../../../test/renderHook";

vi.mock("../../../lib/transliterate", () => ({ transliterate: vi.fn() }));
import { transliterate } from "../../../lib/transliterate";
import { useTransliteration } from "./useTransliteration";

const mock = vi.mocked(transliterate);

beforeEach(() => { vi.useFakeTimers(); mock.mockReset(); mock.mockImplementation(async (v: string) => `te:${v}`); });
afterEach(() => { vi.useRealTimers(); });

describe("useTransliteration", () => {
  it("waits 450 ms after the last keystroke, then applies the answer", async () => {
    const apply = vi.fn();
    const h = renderHook(() => useTransliteration());
    h.result.current("name", "ravi", apply);
    await advance(449);
    expect(mock).not.toHaveBeenCalled();
    await advance(1);
    expect(mock).toHaveBeenCalledWith("ravi");
    expect(apply).toHaveBeenCalledWith("te:ravi");
    h.unmount();
  });

  it("a newer request for the same field cancels the older one", async () => {
    const apply = vi.fn();
    const h = renderHook(() => useTransliteration());
    h.result.current("name", "ra", apply);
    await advance(300);
    h.result.current("name", "rav", apply);
    await advance(450);
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenCalledWith("rav");
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith("te:rav");
    h.unmount();
  });

  it("different fields do not cancel each other", async () => {
    const a = vi.fn();
    const b = vi.fn();
    const h = renderHook(() => useTransliteration());
    h.result.current("bride", "sita", a);
    h.result.current("groom", "rama", b);
    await advance(450);
    expect(a).toHaveBeenCalledWith("te:sita");
    expect(b).toHaveBeenCalledWith("te:rama");
    h.unmount();
  });

  it("a late answer never overwrites what was typed since", async () => {
    let release: (v: string) => void = () => {};
    mock.mockImplementationOnce(() => new Promise<string>((r) => { release = r; }));
    const apply = vi.fn();
    const h = renderHook(() => useTransliteration());
    h.result.current("name", "ra", apply);
    await advance(450); /* first request is now in flight */
    h.result.current("name", "rav", apply);
    release("OLD");
    await advance(0);
    expect(apply).not.toHaveBeenCalledWith("OLD");
    await advance(450);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith("te:rav");
    h.unmount();
  });

  it("an empty or blank value clears the field at once and cancels a waiting request", async () => {
    const apply = vi.fn();
    const h = renderHook(() => useTransliteration());
    h.result.current("name", "ravi", apply);
    h.result.current("name", "   ", apply);
    expect(apply).toHaveBeenCalledWith("");
    await advance(1000);
    expect(mock).not.toHaveBeenCalled();
    expect(apply).toHaveBeenCalledTimes(1);
    h.unmount();
  });

  it("an empty answer leaves the field as it is", async () => {
    mock.mockResolvedValue("");
    const apply = vi.fn();
    const h = renderHook(() => useTransliteration());
    h.result.current("name", "ravi", apply);
    await advance(450);
    expect(mock).toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
    h.unmount();
  });

  it("the returned function keeps its identity across renders", () => {
    const h = renderHook(() => useTransliteration());
    const first = h.result.current;
    h.rerender();
    expect(h.result.current).toBe(first);
    h.unmount();
  });

  it("waiting requests are cancelled on unmount", async () => {
    const apply = vi.fn();
    const h = renderHook(() => useTransliteration());
    h.result.current("name", "ravi", apply);
    h.unmount();
    await advance(1000);
    expect(mock).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
  });
});
