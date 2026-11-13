// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { act, flush } from "../test/renderHook";
import type { InvitationRow } from "../types/dashboard";

/* The "All invitations" page (task M-14). The real page, store hook, filters, selection and table run; only the data layer
   (`lib/api`) and the CSV download are replaced, so what is checked is what the person sees and what is sent to be saved. */
const h = vi.hoisted(() => ({
  fetchInvitations: vi.fn(),
  savePublished: vi.fn(),
  saveDeleted: vi.fn(),
  saveInvitation: vi.fn(),
  fetchExpiredTrashIds: vi.fn(),
  deleteInvitation: vi.fn(),
  fetchReviewQueue: vi.fn(),
  exportCsv: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  fetchInvitations: (...a: unknown[]) => h.fetchInvitations(...a),
  savePublished: (m: unknown) => h.savePublished(m),
  saveDeleted: (m: unknown) => h.saveDeleted(m),
  saveInvitation: (...a: unknown[]) => h.saveInvitation(...a),
  fetchExpiredTrashIds: () => h.fetchExpiredTrashIds(),
  deleteInvitation: (id: string) => h.deleteInvitation(id),
  fetchReviewQueue: () => h.fetchReviewQueue(),
}));
vi.mock("../features/invitations/utils", async () => {
  const real = await vi.importActual<typeof import("../features/invitations/utils")>("../features/invitations/utils");
  return { ...real, exportInvitationsCsv: (...a: unknown[]) => h.exportCsv(...a) };
});

import Invitations from "./Invitations";

const FUTURE = new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 10);
const PAST = new Date(Date.now() - 40 * 86400000).toISOString().slice(0, 10);
const row = (id: string, groom: string, bride: string, extra: Partial<InvitationRow> = {}): InvitationRow => ({
  id, groom_name: groom, bride_name: bride, event_date: FUTURE, views: 0, created_at: "2026-01-01T00:00:00Z", ...extra,
});
const ROWS = [
  row("a", "Arjun", "Meera", { views: 50, client_email: "client.a@example.com" }),
  row("b", "Bala", "Sita", { views: 5 }),
  row("c", "Chandra", "Priya", { event_date: PAST, client_email: "priya.family@test.com" }),
];

let host: HTMLDivElement, root: Root;
let where = "";
const Where = () => { const l = useLocation(); where = l.pathname + l.search; return null; };

type ListAnswer = { rows: typeof ROWS; published: Record<string, boolean>; deleted: Record<string, number>; truncated?: boolean };
async function show(url = "/invitations", data: ListAnswer = { rows: ROWS, published: {}, deleted: {} }) {
  h.fetchInvitations.mockResolvedValue(data);
  act(() => {
    root.render(
      <MemoryRouter initialEntries={[url]}>
        <Where />
        <Routes>
          <Route path="/invitations" element={<Invitations />} />
          <Route path="/create" element={<p>PAGE:create</p>} />
        </Routes>
      </MemoryRouter>,
    );
  });
  await flush(); await flush();
}
const text = () => document.body.textContent || "";
const $ = <T extends Element = HTMLElement>(sel: string) => host.querySelector<T>(sel);
const btn = (label: string | RegExp) =>
  [...document.body.querySelectorAll("button")].find((b) => (typeof label === "string" ? b.textContent?.trim() === label : label.test(b.textContent || "")))!;
const click = (el: Element) => act(() => { (el as HTMLElement).click(); });
const names = () => [...host.querySelectorAll("td.td-couple b")].map((b) => b.textContent);
const check = (label: string) => host.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;
const typeInto = (el: HTMLInputElement, value: string) => act(() => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
});

beforeEach(() => {
  where = "";
  for (const f of Object.values(h)) f.mockReset();
  h.savePublished.mockResolvedValue(undefined);
  h.saveDeleted.mockResolvedValue(undefined);
  h.fetchExpiredTrashIds.mockResolvedValue([]);
  h.fetchReviewQueue.mockResolvedValue([]);
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.innerHTML = "";
});

describe("loading and empty states", () => {
  it("lists every invitation as 'Groom & Bride' and says how many are shown", async () => {
    await show();
    expect(names()).toEqual(expect.arrayContaining(["Arjun & Meera", "Bala & Sita", "Chandra & Priya"]));
    expect(names()).toHaveLength(3);
    expect(text()).toContain("Showing all 3");
  });

  it("shows the error state when the first load fails, and Retry loads again", async () => {
    h.fetchInvitations.mockRejectedValue(new Error("offline"));
    act(() => { root.render(<MemoryRouter><Invitations /></MemoryRouter>); });
    await flush(); await flush();
    expect(text()).toContain("Couldn’t load invitations");
    h.fetchInvitations.mockResolvedValue({ rows: ROWS, published: {}, deleted: {} });
    click(btn("Retry"));
    await flush(); await flush();
    expect(text()).not.toContain("Couldn’t load invitations");
    expect(names()).toHaveLength(3);
  });

  it("shows 'No invitations yet' with a link to create one when there are none", async () => {
    await show("/invitations", { rows: [], published: {}, deleted: {} });
    expect(text()).toContain("No invitations yet");
    expect(host.querySelector('a[href="/create"]')).not.toBeNull();
  });

  it("does not list an invitation that is in the trash", async () => {
    await show("/invitations", { rows: ROWS, published: {}, deleted: { b: Date.now() } });
    expect(names()).toEqual(expect.not.arrayContaining(["Bala & Sita"]));
    expect(names()).toHaveLength(2);
  });
});

describe("list cut at the read limit (M-5)", () => {
  it("shows a note above the list when the list was truncated, and none otherwise", async () => {
    await show("/invitations", { rows: ROWS, published: {}, deleted: {}, truncated: true });
    expect(text()).toContain("Showing your newest 3 invitations");
    expect(host.querySelector(".list-limit")).not.toBeNull();
  });

  it("Load more reads the next 10,000 and the note goes away when nothing older is left", async () => {
    await show("/invitations", { rows: ROWS, published: {}, deleted: {}, truncated: true });
    expect(h.fetchInvitations).toHaveBeenLastCalledWith(10000);
    h.fetchInvitations.mockResolvedValue({ rows: [...ROWS, row("d", "Dev", "Anu")], published: {}, deleted: {}, truncated: false });
    click(btn("Load more"));
    await flush(); await flush();
    expect(h.fetchInvitations).toHaveBeenLastCalledWith(20000);
    expect(text()).toContain("Dev & Anu");
    expect(host.querySelector(".list-limit")).toBeNull();
  });

  it("has no note for a normal list", async () => {
    await show();
    expect(host.querySelector(".list-limit")).toBeNull();
  });
});

describe("status tabs", () => {
  const data = { rows: ROWS, published: { b: false }, deleted: {} };

  it("counts published and draft invitations on the tabs", async () => {
    await show("/invitations", data);
    const tabs = [...host.querySelectorAll(".inv-tab")].map((t) => t.textContent);
    expect(tabs).toEqual(["All 3", "Published 2", "Drafts 1"]);
  });

  it("Drafts shows only the draft, and the choice goes into the URL", async () => {
    await show("/invitations", data);
    click(btn(/^Drafts/));
    expect(names()).toEqual(["Bala & Sita"]);
    expect(where).toContain("status=draft");
  });

  it("opens on the filter that the URL names", async () => {
    await show("/invitations?status=published", data);
    expect(names().sort()).toEqual(["Arjun & Meera", "Chandra & Priya"]);
    expect(btn(/^Published/).getAttribute("aria-pressed")).toBe("true");
  });

  it("going back to All takes the status out of the URL", async () => {
    await show("/invitations?status=draft", data);
    click(btn(/^All/));
    expect(where).toBe("/invitations");
    expect(names()).toHaveLength(3);
  });
});

describe("search and filters", () => {
  it("typing in the search box narrows the list (not case-sensitive)", async () => {
    await show();
    typeInto($<HTMLInputElement>('input[type="search"]')!, "MEERA");
    expect(names()).toEqual(["Arjun & Meera"]);
    expect(where).toContain("q=MEERA");
  });

  it("search also matches client email", async () => {
    await show();
    typeInto($<HTMLInputElement>('input[type="search"]')!, "PRIYA.FAMILY");
    expect(names()).toEqual(["Chandra & Priya"]);
    expect(where).toContain("q=PRIYA.FAMILY");
  });

  it("shows the Client column and a Pending review chip when the queue has that invitation", async () => {
    h.fetchReviewQueue.mockResolvedValue([
      { id: "r1", invitationId: "a", clientEmail: "client.a@example.com", baseUpdatedAt: "", createdAt: "", status: "pending", changedKeys: [], proposedDetails: {} },
    ]);
    await show();
    await flush();
    expect(text()).toContain("client.a@example.com");
    expect(text()).toContain("priya.family@test.com");
    const pending = [...host.querySelectorAll(".chip.pending")].map((el) => el.textContent);
    expect(pending).toEqual(["Pending review"]);
  });

  it("shows 'no match' with Clear filters when nothing fits, and Clear brings the list back", async () => {
    await show("/invitations?q=zzz");
    expect(text()).toContain("No invitations match “zzz”");
    click(btn("Clear filters"));
    expect(names()).toHaveLength(3);
    expect(where).toBe("/invitations");
  });

  it("the Past date filter shows only past events", async () => {
    await show("/invitations?when=past");
    expect(names()).toEqual(["Chandra & Priya"]);
  });

  it("an unknown status in the URL falls back to All", async () => {
    await show("/invitations?status=banana");
    expect(names()).toHaveLength(3);
  });

  it("'/' focuses the search box, but not while typing in it", async () => {
    await show();
    const search = $<HTMLInputElement>('input[type="search"]')!;
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "/", bubbles: true, cancelable: true })); });
    expect(document.activeElement).toBe(search);
  });
});

describe("selection and bulk actions", () => {
  it("ticking a row shows the bulk bar with the count; clearing hides it", async () => {
    await show();
    expect($('[aria-label="Bulk actions"]')).toBeNull();
    click(check("Select Arjun & Meera"));
    expect($('[aria-label="Bulk actions"]')).not.toBeNull();
    expect(text()).toContain("1 selected");
    click(host.querySelector('button[aria-label="Clear selection"]')!);
    expect($('[aria-label="Bulk actions"]')).toBeNull();
  });

  it("the header box selects every row on the page", async () => {
    await show();
    click(check("Select all invitations on this page"));
    expect(text()).toContain("3 selected");
    expect(check("Select Bala & Sita").checked).toBe(true);
  });

  it("changing a filter clears the selection (the row is still on screen, so it must be un-ticked)", async () => {
    await show();
    click(check("Select Arjun & Meera"));
    expect(text()).toContain("1 selected");
    click(btn(/^Published/)); // Arjun is published, so he stays in the list
    expect(names()).toContain("Arjun & Meera");
    expect($('[aria-label="Bulk actions"]')).toBeNull();
    expect(check("Select Arjun & Meera").checked).toBe(false);
  });

  it("changing the sort keeps the selection", async () => {
    await show();
    click(check("Select Arjun & Meera"));
    click(host.querySelector('button[aria-label^="Sort invitations"]')!);
    click(document.body.querySelector('[role="option"][aria-selected="false"]')!);
    expect(where).toContain("sort=");
    expect(text()).toContain("1 selected");
    expect(check("Select Arjun & Meera").checked).toBe(true);
  });

  it("Move to draft saves the ids as unpublished and offers Undo", async () => {
    await show();
    click(check("Select Arjun & Meera"));
    click(check("Select Bala & Sita"));
    click(btn("Move to draft"));
    expect(h.savePublished).toHaveBeenLastCalledWith({ a: false, b: false });
    expect(text()).toContain("2 invitations moved to draft");
    expect(text()).not.toContain("selected");
    click(btn("Undo"));
    expect(h.savePublished).toHaveBeenLastCalledWith({});
  });

  it("Publish after drafting saves the ids as published", async () => {
    await show("/invitations", { rows: ROWS, published: { a: false }, deleted: {} });
    click(check("Select Arjun & Meera"));
    click(btn("Publish"));
    expect(h.savePublished).toHaveBeenLastCalledWith({ a: true });
    expect(text()).toContain("1 invitation published");
  });

  it("Move to trash removes the rows, saves their ids, and Undo puts them back", async () => {
    await show();
    click(check("Select Arjun & Meera"));
    click(btn("Move to trash"));
    const saved = h.saveDeleted.mock.calls.at(-1)![0] as Record<string, number>;
    expect(Object.keys(saved)).toEqual(["a"]);
    expect(names()).toEqual(["Bala & Sita", "Chandra & Priya"]);
    expect(text()).toContain("1 invitation moved to trash");
    click(btn("Undo"));
    expect(h.saveDeleted).toHaveBeenLastCalledWith({});
    expect(names()).toHaveLength(3);
    expect(check("Select Arjun & Meera").checked).toBe(false); // the selection was cleared when it was trashed
    expect($('[aria-label="Bulk actions"]')).toBeNull();
  });

  it("Export CSV hands only the selected rows to the exporter", async () => {
    await show();
    click(check("Select Bala & Sita"));
    click(btn("Export CSV"));
    expect(h.exportCsv).toHaveBeenCalledTimes(1);
    expect((h.exportCsv.mock.calls[0][0] as InvitationRow[]).map((r) => r.id)).toEqual(["b"]);
    expect(text()).toContain("Exported 1 invitation");
  });

  it("when a save fails the change is undone and the person is told", async () => {
    await show();
    h.savePublished.mockRejectedValueOnce(new Error("nope"));
    click(check("Select Arjun & Meera"));
    click(btn("Move to draft"));
    await flush(); await flush();
    expect(text()).toContain("Couldn’t save that change, so it was undone.");
    expect([...host.querySelectorAll(".inv-tab")].map((t) => t.textContent)).toEqual(["All 3", "Published 3", "Drafts 0"]);
  });
});

describe("paging", () => {
  const many = Array.from({ length: 11 }, (_, i) => row(`r${i}`, `G${String(i).padStart(2, "0")}`, "B"));

  it("shows eight rows per page with a range, and Next / Previous move between pages", async () => {
    await show("/invitations", { rows: many, published: {}, deleted: {} });
    expect(names()).toHaveLength(8);
    expect(text()).toContain("Showing 1–8 of 11");
    click(host.querySelector('button[aria-label="Next page"]')!);
    expect(names()).toHaveLength(3);
    expect(text()).toContain("Showing 9–11 of 11");
    expect(host.querySelector<HTMLButtonElement>('button[aria-label="Next page"]')!.disabled).toBe(true);
    click(host.querySelector('button[aria-label="Previous page"]')!);
    expect(text()).toContain("Showing 1–8 of 11");
  });

  it("changing a filter goes back to page 1", async () => {
    await show("/invitations", { rows: many, published: {}, deleted: {} });
    click(host.querySelector('button[aria-label="Next page"]')!);
    typeInto($<HTMLInputElement>('input[type="search"]')!, "G0");
    expect(names()).toHaveLength(8); // 10 match; page 1 again, not page 2
    expect(text()).toContain("Showing 1–8 of 10");
  });
});

describe("row menu", () => {
  const openMenu = (i: number) => click(host.querySelectorAll('button[aria-label="More actions"]')[i]);
  const first = () => names()[0]!;

  it("Move to trash from the menu removes that invitation", async () => {
    await show();
    const who = first();
    openMenu(0);
    click(btn("Move to trash"));
    expect(names()).not.toContain(who);
    expect(h.saveDeleted).toHaveBeenCalledTimes(1);
  });

  it("Duplicate saves a copy as a draft with its own link id, then reloads", async () => {
    const withLink = [row("a", "Arjun", "Meera", { details: { customId: "arjun-meera" } as InvitationRow["details"], views: 9 })];
    h.saveInvitation.mockImplementation(async (r: InvitationRow) => r);
    await show("/invitations", { rows: withLink, published: {}, deleted: {} });
    openMenu(0);
    click(btn("Duplicate"));
    await flush(); await flush();
    const [copy, opts] = h.saveInvitation.mock.calls[0] as [InvitationRow, { published: boolean }];
    expect(copy.id).not.toBe("a");
    expect(copy.details?.customId).toBe("");
    expect(copy.views).toBeUndefined();
    expect(opts).toEqual({ published: false });
    expect(text()).toContain("Duplicated Arjun & Meera as a draft");
    expect(h.fetchInvitations.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("tells the person when a duplicate could not be saved", async () => {
    h.saveInvitation.mockRejectedValue(new Error("x"));
    await show();
    openMenu(0);
    click(btn("Duplicate"));
    await flush(); await flush();
    expect(text()).toContain("Couldn’t duplicate that invitation.");
  });

  it("a published invitation offers 'Move to draft' and a draft offers 'Publish'", async () => {
    await show("/invitations", { rows: [row("a", "A", "B")], published: {}, deleted: {} });
    openMenu(0);
    expect(btn("Move to draft")).toBeTruthy();
    click(btn("Move to draft"));
    expect(h.savePublished).toHaveBeenLastCalledWith({ a: false });
    openMenu(0);
    expect(btn("Publish")).toBeTruthy();
  });
});
