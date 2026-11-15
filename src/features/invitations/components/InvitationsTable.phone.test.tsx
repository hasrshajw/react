// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { act } from "../../../test/renderHook";
import type { InvitationRow } from "../../../types/dashboard";
import { InvitationsTable } from "./InvitationsTable";

let host: HTMLDivElement, root: Root;
const realMatchMedia = window.matchMedia;
const setPhone = (matches: boolean) => {
  window.matchMedia = ((q: string) => ({ matches, media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
};
beforeEach(() => { setPhone(true); host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); window.matchMedia = realMatchMedia; });

const rows = [
  { id: "a", groom_name: "Ravi", bride_name: "Sita", template_name: "Classic" },
  { id: "b", groom_name: "Arjun", bride_name: "Meera", template_name: "Classic" },
] as InvitationRow[];

function show(over: Partial<Parameters<typeof InvitationsTable>[0]> = {}) {
  const fns = { onToggle: vi.fn(), onTogglePage: vi.fn(), onPreview: vi.fn(), onCopyLink: vi.fn(), onOpenMenu: vi.fn(), onDone: vi.fn() };
  act(() => {
    root.render(
      <MemoryRouter>
        <InvitationsTable
          shown={rows} total={2} visibleCount={2} sel={new Set()} allOnPage={false} headCheck={{ current: null }} topId={null}
          isPub={() => true} {...fns} {...over}
        />
      </MemoryRouter>,
    );
  });
  return fns;
}

describe("InvitationsTable on a phone", () => {
  it("has one icon-only menu button per card and no selection bar", () => {
    show();
    const btns = host.querySelectorAll("td.td-actions button");
    expect(btns.length).toBe(2);
    expect(btns[0].textContent).toBe("");
    expect(host.querySelector(".sel-bar")).toBeNull();
    expect(host.querySelector("table.selecting")).toBeNull();
  });

  it("tapping a card opens its menu", () => {
    const fns = show();
    act(() => { (host.querySelector("tbody tr") as HTMLElement).click(); });
    expect(fns.onOpenMenu).toHaveBeenCalledTimes(1);
    expect(fns.onOpenMenu.mock.calls[0][1]).toBe(rows[0]);
  });

  it("in selection mode shows the bar, tapping a card toggles it, and Done leaves", () => {
    const fns = show({ selecting: true, sel: new Set(["a"]) });
    expect(host.querySelector("table.selecting")).toBeTruthy();
    expect(host.querySelector(".sel-bar")?.textContent).toContain("1 selected");
    act(() => { (host.querySelectorAll("tbody tr")[1] as HTMLElement).click(); });
    expect(fns.onToggle).toHaveBeenCalledWith("b");
    expect(fns.onOpenMenu).not.toHaveBeenCalled();
    act(() => { (host.querySelector(".sel-bar button") as HTMLButtonElement).click(); });
    expect(fns.onDone).toHaveBeenCalled();
  });

  it("on a wide screen the selection bar never shows, even if selecting is set", () => {
    setPhone(false);
    show({ selecting: true });
    expect(host.querySelector(".sel-bar")).toBeNull();
  });
});
