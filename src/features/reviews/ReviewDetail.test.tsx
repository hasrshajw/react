// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { act } from "../../test/renderHook";
import type { ReviewItem } from "../../lib/api";
import { ReviewDetail } from "./ReviewDetail";

vi.mock("../../lib/api", async (orig) => ({
  ...(await orig<typeof import("../../lib/api")>()),
  fetchInvitation: vi.fn(async () => ({
    id: "inv1", template_id: "t1", groom_name: "Ravi", bride_name: "Sita", event_date: "2026-12-01",
    details: { groomEn: "Ravi", brideEn: "Sita", venueEn: "Old hall" },
  })),
}));
vi.mock("../../hooks/useTemplates", () => ({
  useTemplates: () => ({ templates: [{ id: "t1", html_code: "<html><body>Hello</body></html>" }], loading: false }),
}));

let host: HTMLDivElement, slot: HTMLDivElement, root: Root;
beforeEach(() => {
  host = document.createElement("div"); slot = document.createElement("div");
  document.body.append(host, slot); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); slot.remove(); });

const item: ReviewItem = {
  id: "r1", invitationId: "inv1", clientEmail: "c@x.com", baseUpdatedAt: "", createdAt: new Date().toISOString(),
  status: "pending", changedKeys: ["venueEn"], proposedDetails: { venueEn: "New hall" },
};

async function mount(onClose = vi.fn()) {
  await act(async () => {
    root.render(
      <MemoryRouter>
        <ReviewDetail slot={slot} item={item} onClose={onClose} onDecided={vi.fn()} notify={vi.fn()} />
      </MemoryRouter>,
    );
  });
  return onClose;
}

describe("ReviewDetail", () => {
  it("keeps the changes inline and shows the proposed preview in the right-side slot", async () => {
    await mount();
    expect(host.textContent).toContain("Changes");
    expect(host.textContent).toContain("New hall");
    expect(host.querySelector("iframe")).toBeNull();
    const aside = slot.querySelector("aside.dash-side-panel");
    expect(aside?.textContent).toContain("Proposed preview");
    expect(aside?.querySelector("iframe")?.getAttribute("srcdoc")).toContain("Hello");
  });

  it("closes from the panel's close button", async () => {
    const onClose = await mount();
    act(() => slot.querySelector<HTMLButtonElement>('button[aria-label="Close preview"]')!.click());
    expect(onClose).toHaveBeenCalled();
  });
});
