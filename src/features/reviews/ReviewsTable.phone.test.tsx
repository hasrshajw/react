// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { act } from "../../test/renderHook";
import type { ReviewItem } from "../../lib/api";
import type { InvitationRow } from "../../types/dashboard";
import { ReviewsTable } from "./ReviewsTable";

let host: HTMLDivElement, root: Root;
const realMatchMedia = window.matchMedia;
beforeEach(() => {
  /* a phone-width screen */
  window.matchMedia = ((q: string) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); window.matchMedia = realMatchMedia; document.body.style.overflow = ""; });

const item: ReviewItem = {
  id: "r1", invitationId: "inv1", clientEmail: "client@example.com", baseUpdatedAt: "", createdAt: new Date().toISOString(),
  status: "pending", changedKeys: ["groomEn", "venueEn"], proposedDetails: {},
};
const inv = { id: "inv1", groom_name: "Ravi", bride_name: "Sita", template_name: "Classic" } as InvitationRow;

function show(onOpen = vi.fn()) {
  act(() => {
    root.render(
      <MemoryRouter>
        <ReviewsTable items={[item]} invitations={new Map([[inv.id, inv]])} selectedId={null} now={Date.now()} total={1} onOpen={onOpen} />
      </MemoryRouter>,
    );
  });
  return onOpen;
}

describe("ReviewsTable on a phone", () => {
  it("shows one icon-only menu button per card instead of the action buttons", () => {
    show();
    const buttons = [...host.querySelectorAll("td.td-actions button, td.td-actions a")];
    expect(buttons.length).toBe(1);
    expect(buttons[0].textContent).toBe("");
    expect(buttons[0].getAttribute("aria-label")).toBe("More actions for Ravi & Sita");
  });

  it("opens the sheet when the card itself is tapped", () => {
    show();
    act(() => { (host.querySelector("tbody tr") as HTMLElement).click(); });
    expect(document.body.querySelector(".bs-sheet")).toBeTruthy();
  });

  it("opens a bottom sheet with the details and every action, and Review opens the request", () => {
    const onOpen = show();
    act(() => { (host.querySelector("td.td-actions button") as HTMLButtonElement).click(); });
    const sheet = document.body.querySelector(".bs-sheet") as HTMLElement;
    expect(sheet).toBeTruthy();
    expect(sheet.textContent).toContain("Ravi & Sita");
    expect(sheet.textContent).toContain("client@example.com");
    expect(sheet.textContent).toContain("Review changes");
    expect(sheet.textContent).toContain("Edit invitation");
    expect(document.body.style.overflow).toBe("hidden");
    act(() => { (sheet.querySelector('[role="menuitem"]') as HTMLButtonElement).click(); });
    expect(onOpen).toHaveBeenCalledWith(item);
    expect(document.body.querySelector(".bs-sheet")).toBeNull();
  });

  it("closes with the close button and with the dimmed area", () => {
    show();
    const open = () => act(() => { (host.querySelector("td.td-actions button") as HTMLButtonElement).click(); });
    open();
    act(() => { (document.body.querySelector(".bs-close") as HTMLButtonElement).click(); });
    expect(document.body.querySelector(".bs-sheet")).toBeNull();
    open();
    act(() => { (document.body.querySelector(".bs-overlay") as HTMLElement).click(); });
    expect(document.body.querySelector(".bs-sheet")).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });
});
