// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { renderHook } from "../../../test/renderHook";
import { useBeforeUnload, useSaveShortcut } from "./useUnsavedWarnings";

const key = (init: KeyboardEventInit) => {
  const e = new KeyboardEvent("keydown", { cancelable: true, ...init });
  window.dispatchEvent(e);
  return e;
};
const unload = () => {
  const e = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(e);
  return e;
};

describe("useBeforeUnload", () => {
  it("asks the browser to warn while there are unsaved changes", () => {
    const h = renderHook(() => useBeforeUnload(true));
    expect(unload().defaultPrevented).toBe(true);
    h.unmount();
  });

  it("does nothing while there is nothing unsaved", () => {
    const h = renderHook(() => useBeforeUnload(false));
    expect(unload().defaultPrevented).toBe(false);
    h.unmount();
  });

  it("starts and stops with the flag", () => {
    const h = renderHook<void, boolean>((on) => useBeforeUnload(on), false);
    h.rerender(true);
    expect(unload().defaultPrevented).toBe(true);
    h.rerender(false);
    expect(unload().defaultPrevented).toBe(false);
    h.unmount();
  });

  it("removes its listener on unmount", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const h = renderHook(() => useBeforeUnload(true));
    h.unmount();
    expect(remove).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    expect(unload().defaultPrevented).toBe(false);
    remove.mockRestore();
  });
});

describe("useSaveShortcut", () => {
  it("runs the function on Ctrl+S and Cmd+S, in either case, and blocks the browser's save dialog", () => {
    const fn = vi.fn();
    const h = renderHook(() => useSaveShortcut(fn));
    expect(key({ key: "s", ctrlKey: true }).defaultPrevented).toBe(true);
    expect(key({ key: "S", metaKey: true }).defaultPrevented).toBe(true);
    expect(fn).toHaveBeenCalledTimes(2);
    h.unmount();
  });

  it("ignores S without Ctrl or Cmd, and other keys with Ctrl", () => {
    const fn = vi.fn();
    const h = renderHook(() => useSaveShortcut(fn));
    expect(key({ key: "s" }).defaultPrevented).toBe(false);
    expect(key({ key: "a", ctrlKey: true }).defaultPrevented).toBe(false);
    expect(key({ key: "s", altKey: true }).defaultPrevented).toBe(false);
    expect(fn).not.toHaveBeenCalled();
    h.unmount();
  });

  it("calls the newest function after a re-render", () => {
    const first = vi.fn();
    const second = vi.fn();
    const h = renderHook((fn: () => void) => useSaveShortcut(fn), first);
    h.rerender(second);
    key({ key: "s", ctrlKey: true });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    h.unmount();
  });

  it("stops after unmount", () => {
    const fn = vi.fn();
    const h = renderHook(() => useSaveShortcut(fn));
    h.unmount();
    expect(key({ key: "s", ctrlKey: true }).defaultPrevented).toBe(false);
    expect(fn).not.toHaveBeenCalled();
  });
});
