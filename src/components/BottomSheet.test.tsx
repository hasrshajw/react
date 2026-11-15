// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "../test/renderHook";
import { BottomSheet } from "./BottomSheet";

let host: HTMLDivElement, root: Root;
beforeEach(() => { vi.useFakeTimers(); host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); vi.useRealTimers(); });

const open = (onClose = vi.fn()) => {
  act(() => root.render(<BottomSheet label="Actions for Ravi & Sita" onClose={onClose} head={<b>Ravi &amp; Sita</b>}><button role="menuitem">Edit</button></BottomSheet>));
  return onClose;
};
/** jsdom has no Touch objects: give the event the one field the sheet reads. */
const touch = (el: Element, type: string, y: number) => act(() => {
  const e = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(e, "touches", { value: [{ clientY: y }] });
  el.dispatchEvent(e);
});

describe("BottomSheet", () => {
  it("is a labelled dialog and locks page scroll while open", () => {
    open();
    expect(document.querySelector('[role="dialog"]')?.getAttribute("aria-label")).toBe("Actions for Ravi & Sita");
    expect(document.body.style.overflow).toBe("hidden");
    act(() => root.unmount());
    root = createRoot(host);
    expect(document.body.style.overflow).toBe("");
  });

  it("closes from the X and from a tap on the dimmed area, not from a tap inside", () => {
    const onClose = open();
    act(() => { (document.querySelector(".bs-sheet") as HTMLElement).click(); });
    expect(onClose).not.toHaveBeenCalled();
    act(() => { (document.querySelector(".bs-close") as HTMLElement).click(); });
    expect(onClose).toHaveBeenCalledTimes(1);
    act(() => { (document.querySelector(".bs-overlay") as HTMLElement).click(); });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("closes on a long swipe down from the handle area", () => {
    const onClose = open();
    const grab = document.querySelector(".bs-grab")!;
    touch(grab, "touchstart", 100);
    touch(grab, "touchmove", 140);
    expect((document.querySelector(".bs-sheet") as HTMLElement).style.transform).toBe("translateY(40px)");
    touch(grab, "touchmove", 260);
    act(() => { grab.dispatchEvent(new Event("touchend", { bubbles: true })); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("snaps back after a short drag", () => {
    const onClose = open();
    const grab = document.querySelector(".bs-grab")!;
    vi.setSystemTime(new Date(2026, 10, 16, 3, 0, 0));
    touch(grab, "touchstart", 100);
    touch(grab, "touchmove", 125);
    vi.setSystemTime(new Date(2026, 10, 16, 3, 0, 2));
    act(() => { grab.dispatchEvent(new Event("touchend", { bubbles: true })); });
    expect(onClose).not.toHaveBeenCalled();
    expect((document.querySelector(".bs-sheet") as HTMLElement).style.transform).toBe("");
  });

  it("closes on the browser's back action", () => {
    const onClose = open();
    act(() => { vi.runAllTimers(); });
    act(() => { window.dispatchEvent(new PopStateEvent("popstate")); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
