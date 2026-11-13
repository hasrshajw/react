// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { act } from "../../../test/renderHook";
import { ShareModal } from "./ShareModal";

let root: Root | null = null;
afterEach(() => { if (root) act(() => { root!.unmount(); }); root = null; document.body.innerHTML = ""; });

function show(onClose: () => void) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root ??= createRoot(host);
  act(() => {
    root!.render(
      <MemoryRouter>
        <ShareModal name="Asha & Ravi" link="https://x.test/a" onCopy={vi.fn()} onWhatsApp={vi.fn()} onClose={onClose} onAnother={vi.fn()} />
      </MemoryRouter>,
    );
  });
}
const press = (key: string) => act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })); });

describe("ShareModal", () => {
  it("Escape closes the dialog", () => {
    const onClose = vi.fn();
    show(onClose);
    press("Escape");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Escape calls the newest onClose after the parent passed a new function", () => {
    const first = vi.fn();
    const second = vi.fn();
    show(first);
    show(second);
    press("Escape");
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("clicking the backdrop closes it, other keys do not", () => {
    const onClose = vi.fn();
    show(onClose);
    press("a");
    expect(onClose).not.toHaveBeenCalled();
    const overlay = document.querySelector(".cx-overlay") as HTMLElement;
    act(() => { overlay.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("stops listening for keys once it is closed", () => {
    const onClose = vi.fn();
    show(onClose);
    act(() => { root!.unmount(); });
    root = null;
    press("Escape");
    expect(onClose).not.toHaveBeenCalled();
  });
});
