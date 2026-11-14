// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { act } from "../../test/renderHook";
import type { ReviewItem } from "../../lib/api";
import type { InvitationRow } from "../../types/dashboard";
import { ReviewsTable, ReviewsTableSkeleton } from "./ReviewsTable";

let host: HTMLDivElement, root: Root;
beforeEach(() => { host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });

const item = (over: Partial<ReviewItem> = {}): ReviewItem => ({
  id: "r1", invitationId: "inv1", clientEmail: "client@example.com", baseUpdatedAt: "", createdAt: new Date().toISOString(),
  status: "pending", changedKeys: ["groomEn", "venueEn", "weddingDate", "seoTitle"], proposedDetails: {}, ...over,
});
const inv = { id: "inv1", groom_name: "Ravi", bride_name: "Sita", template_name: "Classic" } as InvitationRow;

function show(items: ReviewItem[], onOpen = vi.fn(), invitations = new Map([[inv.id, inv]])) {
  act(() => {
    root.render(
      <MemoryRouter>
        <ReviewsTable items={items} invitations={invitations} selectedId={null} now={Date.now()} total={items.length} onOpen={onOpen} />
      </MemoryRouter>,
    );
  });
  return onOpen;
}

describe("ReviewsTable", () => {
  it("shows the couple, status, template, client and a summary of the changed fields", () => {
    show([item()]);
    const text = host.textContent || "";
    expect(text).toContain("Ravi & Sita");
    expect(text).toContain("Pending");
    expect(text).toContain("Classic");
    expect(text).toContain("client@example.com");
    expect(text).toContain("4 fields");
    expect(text).toContain("Groom (EN), Venue (EN), Wedding date +1 more");
  });

  it("uses Review for pending and View for decided requests, and opens the right item", () => {
    const pending = item();
    const done = item({ id: "r2", status: "approved" });
    const onOpen = show([pending, done]);
    const buttons = [...host.querySelectorAll<HTMLButtonElement>("td.td-actions button")];
    expect(buttons.map((b) => b.textContent)).toEqual(["Review", "View"]);
    act(() => buttons[1].click());
    expect(onOpen).toHaveBeenCalledWith(done);
  });

  it("falls back gracefully when the invitation is not loaded", () => {
    show([item()], vi.fn(), new Map());
    expect(host.textContent).toContain("Invitation unavailable");
    expect(host.querySelector(".row-avatar")?.textContent).toBe("?");
  });

  it("draws a skeleton with the same columns and cell layout as a real row, plus the footer", () => {
    act(() => { root.render(<ReviewsTableSkeleton rows={3} />); });
    const heads = [...host.querySelectorAll("thead th")].map((th) => th.textContent);
    expect(heads).toEqual(["Couple", "Client", "Changes", "Submitted", "Actions"]);
    const rows = host.querySelectorAll("tbody tr.sk-row");
    expect(rows.length).toBe(3);
    const row = rows[0];
    /* every part a real row has: avatar, name, status chip + template name, client, count + field list, date + full date, two buttons */
    for (const sel of [".row-avatar", ".cell-couple .cell-stack b", ".cell-line .chip", ".cell-line .tpl-name", ".td-client .client-email", ".td-changes b", ".td-changes .rv-fields", ".td-date .cell-date", ".td-date small.when", ".row-actions .act-btn"]) {
      expect(row.querySelector(sel), sel).not.toBeNull();
    }
    expect(row.querySelectorAll(".row-actions .act-btn").length).toBe(2);
    expect(host.querySelector(".table-foot")).not.toBeNull();
  });

  it("keeps the space but draws nothing while the load is still quick (hold)", () => {
    act(() => { root.render(<ReviewsTableSkeleton hold />); });
    expect(host.querySelector(".table-scroll")?.className).toContain("sk-hold");
    expect(host.querySelector(".table-foot")?.className).toContain("sk-hold");
  });
});
