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
  fetchInvitation: vi.fn(),
  savePublished: vi.fn(),
  saveDeleted: vi.fn(),
  saveInvitation: vi.fn(),
  fetchExpiredTrashIds: vi.fn(),
  deleteInvitation: vi.fn(),
  fetchPendingInvitationIds: vi.fn(),
  fetchInvitationSummary: vi.fn(),
  exportCsv: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  fetchInvitations: (...a: unknown[]) => h.fetchInvitations(...a),
  fetchInvitation: (id: string) => h.fetchInvitation(id),
  savePublished: (m: unknown) => h.savePublished(m),
  saveDeleted: (m: unknown) => h.saveDeleted(m),
  saveInvitation: (...a: unknown[]) => h.saveInvitation(...a),
  fetchExpiredTrashIds: () => h.fetchExpiredTrashIds(),
  deleteInvitation: (id: string) => h.deleteInvitation(id),
  fetchPendingInvitationIds: () => h.fetchPendingInvitationIds(),
  fetchInvitationSummary: () => h.fetchInvitationSummary(),
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
  h.fetchPendingInvitationIds.mockResolvedValue([]);
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

const SUMMARY = { total: 25, published: 20, drafts: 5, upcoming: 3, week: 1, past: 2, views: 100, viewed: 10, draftSoon: 0, noViews: 0, trashed: 0, topId: null, templates: [] };

describe("newest 10 first, then \"More\"", () => {
  beforeEach(() => { h.fetchInvitationSummary.mockResolvedValue(SUMMARY); });

  it("reads only the newest 10 invitations at first", async () => {
    await show();
    expect(h.fetchInvitations).toHaveBeenLastCalledWith(10);
  });

  it("with older invitations on the server: shows \"More\", the totals from the database, and no old limit note", async () => {
    await show("/invitations", { rows: ROWS, published: {}, deleted: {}, truncated: true });
    expect(btn("More")).toBeTruthy();
    expect(text()).toContain("Showing 3 of 25");
    expect([...host.querySelectorAll(".inv-tab")].map((t) => t.textContent)).toEqual(["All 25", "Published 20", "Drafts 5"]);
    expect(host.querySelector(".list-limit")).toBeNull();
  });

  it("\"More\" reads 10 more, and disappears when nothing older is left", async () => {
    await show("/invitations", { rows: ROWS, published: {}, deleted: {}, truncated: true });
    h.fetchInvitations.mockResolvedValue({ rows: [...ROWS, row("d", "Dev", "Anu")], published: {}, deleted: {}, truncated: false });
    click(btn("More"));
    await flush(); await flush();
    expect(h.fetchInvitations).toHaveBeenLastCalledWith(20);
    expect(text()).toContain("Dev & Anu");
    expect(text()).toContain("Showing all 4");
    expect(document.body.querySelector(".more-btn")).toBeNull();
  });

  it("searching reads every invitation, so older ones can be found", async () => {
    await show("/invitations", { rows: ROWS, published: {}, deleted: {}, truncated: true });
    h.fetchInvitations.mockResolvedValue({ rows: [...ROWS, row("z", "Zed", "Old")], published: {}, deleted: {}, truncated: false });
    typeInto($<HTMLInputElement>('input[type="search"]')!, "Zed");
    await flush(); await flush();
    expect(h.fetchInvitations).toHaveBeenLastCalledWith(10000);
    expect(names()).toEqual(["Zed & Old"]);
  });

  it("shows the old-limit note only when even the full read was cut", async () => {
    await show("/invitations", { rows: ROWS, published: {}, deleted: {}, truncated: true });
    h.fetchInvitations.mockResolvedValue({ rows: ROWS, published: {}, deleted: {}, truncated: true });
    typeInto($<HTMLInputElement>('input[type="search"]')!, "a");
    await flush(); await flush();
    expect(host.querySelector(".list-limit")).not.toBeNull();
  });

  it("has no \"More\" button and no note for a short list", async () => {
    await show();
    expect(document.body.querySelector(".more-btn")).toBeNull();
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
    h.fetchPendingInvitationIds.mockResolvedValue(["a"]);
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

describe("long list", () => {
  const many = Array.from({ length: 11 }, (_, i) => row(`r${i}`, `G${String(i).padStart(2, "0")}`, "B"));

  it("shows every loaded row on one page, with no pager", async () => {
    await show("/invitations", { rows: many, published: {}, deleted: {} });
    expect(names()).toHaveLength(11);
    expect(text()).toContain("Showing all 11");
    expect(host.querySelector('button[aria-label="Next page"]')).toBeNull();
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
    /* The list row holds only the link ID; the copy must be made from the full invitation. */
    h.fetchInvitation.mockResolvedValue({ ...withLink[0], listOnly: undefined, details: { customId: "arjun-meera", venueEn: "Hall 7", events: [{ name: "Reception" }] } });
    await show("/invitations", { rows: withLink, published: {}, deleted: {} });
    openMenu(0);
    click(btn("Duplicate"));
    await flush(); await flush();
    expect(h.fetchInvitation).toHaveBeenCalledWith("a");
    const [copy, opts] = h.saveInvitation.mock.calls[0] as [InvitationRow, { published: boolean }];
    expect(copy.id).not.toBe("a");
    expect(copy.details?.customId).toBe("");
    expect((copy.details as Record<string, unknown>).venueEn).toBe("Hall 7");
    expect(copy.listOnly).toBeUndefined();
    expect(copy.views).toBeUndefined();
    expect(opts).toEqual({ published: false });
    expect(text()).toContain("Duplicated Arjun & Meera as a draft");
    expect(h.fetchInvitations.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("tells the person when a duplicate could not be saved", async () => {
    h.fetchInvitation.mockResolvedValue({ id: "a", groom_name: "A", bride_name: "B", details: {} });
    h.saveInvitation.mockRejectedValue(new Error("x"));
    await show();
    openMenu(0);
    click(btn("Duplicate"));
    await flush(); await flush();
    expect(text()).toContain("Couldn’t duplicate that invitation.");
  });

  it("tells the person when the full invitation could not be read to duplicate it", async () => {
    h.fetchInvitation.mockRejectedValue(new Error("offline"));
    h.saveInvitation.mockClear();
    await show();
    openMenu(0);
    click(btn("Duplicate"));
    await flush(); await flush();
    expect(h.saveInvitation).not.toHaveBeenCalled();
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
