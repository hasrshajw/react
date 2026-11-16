// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { act } from "../../../test/renderHook";
import type { InvitationRow } from "../../../types/dashboard";
import { RowMenu, RowMenuLead } from "./RowMenu";

let host: HTMLDivElement, root: Root;
const realMatchMedia = window.matchMedia;
const setPhone = (matches: boolean) => {
  window.matchMedia = ((q: string) => ({ matches, media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
};
beforeEach(() => { setPhone(true); host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); window.matchMedia = realMatchMedia; });

const x = { id: "a", groom_name: "Ravi", bride_name: "Sita", template_name: "Classic", client_email: "ravi@example.com" } as InvitationRow;
const menu = { x, right: 0 } as unknown as Parameters<typeof RowMenu>[0]["menu"];

function show(live: boolean) {
  const fns = { onPreview: vi.fn(), onCopyLink: vi.fn(), onClose: vi.fn() };
  act(() => {
    root.render(
      <MemoryRouter>
        <RowMenu menu={menu} menuRef={{ current: null }} onKeyDown={() => {}} onClose={fns.onClose} live={live} lead={<RowMenuLead x={x} live={live} {...fns} />}>
          <button type="button" role="menuitem">Duplicate</button>
        </RowMenu>
      </MemoryRouter>,
    );
  });
  return fns;
}
const item = (name: string) => [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find((b) => b.textContent?.includes(name));

describe("RowMenu on a phone (Dashboard / Invitations sheet)", () => {
  it("opens as a bottom sheet with the invitation's details and every action", () => {
    show(true);
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute("aria-label")).toBe(`Actions for ${"Ravi"} & ${"Sita"}`.replace(" & ", " & "));
    expect(dialog.textContent).toContain("ravi@example.com");
    expect(dialog.textContent).toContain("Classic");
    expect(["Preview", "Edit", "Copy link", "Duplicate"].every((n) => item(n))).toBe(true);
    expect(document.querySelector(".row-menu")).toBeNull();
  });

  it("Preview closes the sheet without refocusing and opens the preview", () => {
    const fns = show(true);
    act(() => { item("Preview")!.click(); });
    expect(fns.onClose).toHaveBeenCalledWith(false);
    expect(fns.onPreview).toHaveBeenCalledWith(x);
  });

  it("Copy link is disabled until the invitation is published", () => {
    const fns = show(false);
    const btn = item("Copy link")!;
    expect(btn.textContent).toContain("Publish first");
    expect(btn.disabled).toBe(true);
    act(() => { btn.click(); });
    expect(fns.onCopyLink).not.toHaveBeenCalled();
  });

  it("on a wide screen it is the small dropdown, not a sheet", () => {
    setPhone(false);
    show(true);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.querySelector(".row-menu")).toBeTruthy();
  });
});
