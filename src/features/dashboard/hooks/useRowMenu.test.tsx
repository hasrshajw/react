// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import { act, renderHook } from "../../../test/renderHook";
import { useRowMenu } from "./useRowMenu";
import type { InvitationRow } from "../../../types/dashboard";

/* The fixed "more actions" menu of a table row: placement, closing rules, focus and keyboard handling. */
const row = (id: string) => ({ id } as unknown as InvitationRow);
let opener: { current: HTMLElement | null };
let trigger: HTMLButtonElement;
let menuEl: HTMLDivElement;
let items: HTMLButtonElement[];

function rect(bottom: number, top: number, right: number) {
  trigger.getBoundingClientRect = () => ({ bottom, top, right, left: right - 30, width: 30, height: bottom - top, x: 0, y: top, toJSON() {} } as DOMRect);
}
const click = (h: { result: { current: ReturnType<typeof useRowMenu> } }, x: InvitationRow) =>
  act(() => { h.result.current.openMenu({ currentTarget: trigger } as unknown as ReactMouseEvent<HTMLElement>, x); });
const key = (h: { result: { current: ReturnType<typeof useRowMenu> } }, k: string) => {
  const e = { key: k, preventDefault: vi.fn() };
  act(() => { h.result.current.onMenuKey(e as unknown as ReactKeyboardEvent<HTMLElement>); });
  return e;
};

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
  opener = { current: null };
  trigger = document.createElement("button"); trigger.className = "menu-trigger";
  menuEl = document.createElement("div"); menuEl.className = "row-menu";
  items = ["Edit", "Share", "Delete"].map((t) => { const b = document.createElement("button"); b.textContent = t; menuEl.appendChild(b); return b; });
  document.body.append(trigger, menuEl);
  rect(100, 70, 900);
});
afterEach(() => { vi.useRealTimers(); });

function setup() {
  const h = renderHook(() => useRowMenu(opener as { current: HTMLElement | null }));
  (h.result.current.menuRef as { current: HTMLDivElement | null }).current = menuEl;
  return h;
}

describe("useRowMenu", () => {
  it("is closed at first; opening places it below the button, remembers the opener and focuses the first item", () => {
    const h = setup();
    expect(h.result.current.menu).toBeNull();
    click(h, row("a"));
    expect(h.result.current.menu).toMatchObject({ right: 100, top: 106, bottom: undefined });
    expect(h.result.current.menu?.x.id).toBe("a");
    expect(opener.current).toBe(trigger);
    expect(document.activeElement).toBe(items[0]);
    h.unmount();
  });

  it("opens upwards when there are fewer than 240px below the button", () => {
    rect(700, 670, 900);
    const h = setup();
    click(h, row("a"));
    expect(h.result.current.menu).toMatchObject({ top: undefined, bottom: 136 });
    h.unmount();
  });

  it("clicking the same row's button again closes it and returns focus to the opener", () => {
    const h = setup();
    click(h, row("a"));
    click(h, row("a"));
    expect(h.result.current.menu).toBeNull();
    act(() => { vi.advanceTimersByTime(1); });
    expect(document.activeElement).toBe(trigger);
    h.unmount();
  });

  it("another row's button moves the menu there instead of closing it", () => {
    const h = setup();
    click(h, row("a"));
    click(h, row("b"));
    expect(h.result.current.menu?.x.id).toBe("b");
    h.unmount();
  });

  it("Escape closes it and returns focus; Escape does nothing while closed", () => {
    const h = setup();
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); });
    expect(h.result.current.menu).toBeNull();
    click(h, row("a"));
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); });
    expect(h.result.current.menu).toBeNull();
    act(() => { vi.advanceTimersByTime(1); });
    expect(document.activeElement).toBe(trigger);
    h.unmount();
  });

  it("a click outside closes it; a click inside the menu or on a trigger does not", () => {
    const h = setup();
    click(h, row("a"));
    act(() => { items[1].dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); });
    expect(h.result.current.menu).not.toBeNull();
    act(() => { trigger.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); });
    expect(h.result.current.menu).not.toBeNull();
    act(() => { document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); });
    expect(h.result.current.menu).toBeNull();
    h.unmount();
  });

  it("scrolling (anywhere) or resizing closes it", () => {
    const h = setup();
    click(h, row("a"));
    act(() => { document.body.dispatchEvent(new Event("scroll")); });
    expect(h.result.current.menu).toBeNull();
    click(h, row("a"));
    act(() => { window.dispatchEvent(new Event("resize")); });
    expect(h.result.current.menu).toBeNull();
    h.unmount();
  });

  it("arrow keys move between enabled items and wrap; Home and End jump", () => {
    const h = setup();
    click(h, row("a"));
    items[1].disabled = true; // disabled items are skipped
    expect(key(h, "ArrowDown").preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(items[2]);
    key(h, "ArrowDown");
    expect(document.activeElement).toBe(items[0]);   // wraps to the top
    key(h, "ArrowUp");
    expect(document.activeElement).toBe(items[2]);   // wraps to the bottom
    key(h, "Home");
    expect(document.activeElement).toBe(items[0]);
    key(h, "End");
    expect(document.activeElement).toBe(items[2]);
    h.unmount();
  });

  it("Tab closes it, keeps focus order natural by returning to the opener, and other keys are left alone", () => {
    const h = setup();
    click(h, row("a"));
    const other = key(h, "x");
    expect(other.preventDefault).not.toHaveBeenCalled();
    expect(h.result.current.menu).not.toBeNull();
    const tab = key(h, "Tab");
    expect(tab.preventDefault).toHaveBeenCalled();
    expect(h.result.current.menu).toBeNull();
    act(() => { vi.advanceTimersByTime(1); });
    expect(document.activeElement).toBe(trigger);
    h.unmount();
  });

  it("does not refocus an opener that has left the page", () => {
    const h = setup();
    click(h, row("a"));
    trigger.remove();
    act(() => { h.result.current.closeMenu(true); });
    act(() => { vi.advanceTimersByTime(1); });
    expect(document.activeElement).not.toBe(trigger);
    h.unmount();
  });

  it("removes its listeners when closed or unmounted", () => {
    const add = vi.spyOn(document, "addEventListener");
    const h = setup();
    click(h, row("a"));
    expect(add).toHaveBeenCalledWith("mousedown", expect.any(Function));
    const rm = vi.spyOn(document, "removeEventListener");
    h.unmount();
    expect(rm).toHaveBeenCalledWith("mousedown", expect.any(Function));
  });
});
