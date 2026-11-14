// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, flush } from "../../../test/renderHook";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import type { InvitationRow } from "../../../types/dashboard";

/* The list row holds only the link ID, so the preview reads the full invitation for the one that is open. */
const h = vi.hoisted(() => ({ fetchInvitation: vi.fn(), compile: vi.fn() }));
vi.mock("../../../lib/api", () => ({ fetchInvitation: (id: string) => h.fetchInvitation(id) }));
vi.mock("../../../lib/compileInvitation", () => ({ compile: (...a: unknown[]) => h.compile(...a) }));
vi.mock("../../../hooks/useTemplates", () => ({
  useTemplates: () => ({ templates: [{ id: "t1", html_code: "<p>x</p>", name: "T" }], loading: false }),
}));
import { PreviewPanel } from "./PreviewPanel";

let root: Root;
let slot: HTMLElement;
const list: InvitationRow = { id: "a", groom_name: "G", bride_name: "B", template_id: "t1", details: { customId: "g-b" }, listOnly: true };
const mount = async (row: InvitationRow) => {
  await act(async () => { root.render(<MemoryRouter><PreviewPanel slot={slot} row={row} published onClose={() => {}} /></MemoryRouter>); });
  await flush();
};

beforeEach(() => {
  h.fetchInvitation.mockReset(); h.compile.mockReset(); h.compile.mockReturnValue("<html>ok</html>");
  slot = document.createElement("div"); document.body.appendChild(slot);
  root = createRoot(document.createElement("div"));
});
afterEach(() => { act(() => root.unmount()); slot.remove(); });

describe("PreviewPanel", () => {
  it("reads the full invitation for a list row and builds the preview from it", async () => {
    h.fetchInvitation.mockResolvedValue({ ...list, listOnly: undefined, details: { customId: "g-b", venueEn: "Hall 7" } });
    await mount(list);
    expect(h.fetchInvitation).toHaveBeenCalledWith("a");
    expect(h.compile).toHaveBeenCalled();
    expect((h.compile.mock.calls.at(-1)![1] as Record<string, unknown>).venueEn).toBe("Hall 7");
    expect(slot.querySelector("iframe")).not.toBeNull();
  });

  it("never builds a preview from the incomplete list row while the full one is loading", async () => {
    h.fetchInvitation.mockImplementation(() => new Promise(() => {}));
    await mount(list);
    expect(h.compile).not.toHaveBeenCalled();
    expect(slot.textContent).toContain("Loading preview");
  });

  it("says so when the full invitation cannot be read", async () => {
    h.fetchInvitation.mockRejectedValue(new Error("offline"));
    await mount(list);
    expect(slot.textContent).toContain("Couldn’t load the preview");
    expect(h.compile).not.toHaveBeenCalled();
  });

  it("a row that is already complete is used as it is (no extra read)", async () => {
    await mount({ ...list, listOnly: undefined, details: { venueEn: "Full" } });
    expect(h.fetchInvitation).not.toHaveBeenCalled();
    expect((h.compile.mock.calls.at(-1)![1] as Record<string, unknown>).venueEn).toBe("Full");
  });
});
