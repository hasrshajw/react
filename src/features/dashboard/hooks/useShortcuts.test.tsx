// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "../../../test/renderHook";
import { useShortcuts } from "./useShortcuts";

const press = (key: string, init: KeyboardEventInit = {}, target: EventTarget = document.body) => {
  const e = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init });
  act(() => { target.dispatchEvent(e); });
  return e;
};
beforeEach(() => { document.body.innerHTML = ""; });

describe("useShortcuts", () => {
  it("runs the function for a key (any case) and prevents the browser default", () => {
    const search = vi.fn(), create = vi.fn();
    const h = renderHook(() => useShortcuts({ "/": search, n: create }, false));
    expect(press("/").defaultPrevented).toBe(true);
    press("N");
    press("n");
    expect(search).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(2);
    h.unmount();
  });

  it("ignores keys with no shortcut without blocking them", () => {
    const fn = vi.fn();
    const h = renderHook(() => useShortcuts({ n: fn }, false));
    expect(press("x").defaultPrevented).toBe(false);
    expect(fn).not.toHaveBeenCalled();
    h.unmount();
  });

  it("ignores keys while typing in an input, textarea, select or editable element", () => {
    const fn = vi.fn();
    const h = renderHook(() => useShortcuts({ n: fn }, false));
    for (const tag of ["input", "textarea", "select"]) {
      const el = document.body.appendChild(document.createElement(tag));
      press("n", {}, el);
    }
    const ed = document.body.appendChild(document.createElement("div"));
    ed.setAttribute("contenteditable", "true");
    press("n", {}, ed);
    expect(fn).not.toHaveBeenCalled();
    h.unmount();
  });

  it("ignores keys with Ctrl, Meta or Alt, and keys another handler already used", () => {
    const fn = vi.fn();
    const h = renderHook(() => useShortcuts({ n: fn }, false));
    press("n", { ctrlKey: true });
    press("n", { metaKey: true });
    press("n", { altKey: true });
    window.addEventListener("keydown", (e) => e.preventDefault(), { once: true, capture: true });
    press("n");
    expect(fn).not.toHaveBeenCalled();
    h.unmount();
  });

  it("does nothing while blocked, and works again when unblocked", () => {
    const fn = vi.fn();
    const h = renderHook<void, boolean>((blocked) => useShortcuts({ n: fn }, blocked), true);
    press("n");
    expect(fn).not.toHaveBeenCalled();
    h.rerender(false);
    press("n");
    expect(fn).toHaveBeenCalledTimes(1);
    h.unmount();
  });

  it("always calls the newest function (no stale closure) without re-subscribing", () => {
    const first = vi.fn(), second = vi.fn();
    const add = vi.spyOn(window, "addEventListener");
    const h = renderHook((fn: () => void) => useShortcuts({ n: fn }, false), first);
    const subscribed = add.mock.calls.filter((c) => c[0] === "keydown").length;
    h.rerender(second);
    press("n");
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(add.mock.calls.filter((c) => c[0] === "keydown").length).toBe(subscribed);
    h.unmount();
  });

  it("stops listening after unmount", () => {
    const fn = vi.fn();
    const h = renderHook(() => useShortcuts({ n: fn }, false));
    h.unmount();
    press("n");
    expect(fn).not.toHaveBeenCalled();
  });
});
