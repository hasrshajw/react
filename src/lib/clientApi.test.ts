import { beforeEach, describe, expect, it, vi } from "vitest";

/* Track B (B4): the client-editing calls in src/lib/api.ts. A fake Supabase client records the RPC name and its arguments, and the
   table calls, so the tests check exactly what is sent and how the answers (and the 40001 conflict) are turned into app values. */
type Rec = { kind: "rpc" | "from"; name: string; args?: unknown; ops: [string, unknown[]][] };
type Result = { data?: unknown; error?: { message: string; code?: string } | null; count?: number | null };
let recs: Rec[] = [];

async function load(answer: (r: Rec) => Result) {
  vi.resetModules(); recs = [];
  const chain = (r: Rec): any => new Proxy({}, {
    get: (_t, p: string) => p === "then"
      ? (res: any, rej: any) => Promise.resolve(answer(r)).then((x) => ({ data: null, error: null, ...x })).then(res, rej)
      : (...a: unknown[]) => { r.ops.push([p, a]); return chain(r); },
  });
  const fake = {
    rpc: (name: string, args?: unknown) => { const r: Rec = { kind: "rpc", name, args, ops: [] }; recs.push(r); return chain(r); },
    from: (name: string) => { const r: Rec = { kind: "from", name, ops: [] }; recs.push(r); return chain(r); },
    auth: { getUser: async () => ({ data: { user: null } }) },
  };
  vi.doMock("./supabase", () => ({ db: () => fake, SUPABASE_CONFIGURED: true, supabase: fake }));
  return import("./api");
}
const op = (r: Rec, name: string) => r.ops.find(([n]) => n === name)?.[1];

beforeEach(() => { vi.restoreAllMocks(); });

describe("fetchMyInvitations", () => {
  it("calls my_invitations and maps rows, with and without a request", async () => {
    const api = await load(() => ({ data: [
      { id: "i1", groom_name: "Ravi", bride_name: "Sita", event_date: "2027-01-02", template_id: 7, published: true, details: { groomEn: "Ravi" }, updated_at: "T1",
        request_id: "r1", request_status: "rejected", request_admin_note: "Fix the date", request_created_at: "T0", request_acknowledged_at: null,
        request_proposed_details: { weddingDate: "2027-02-01" } },
      { id: "i2", groom_name: null, bride_name: null, event_date: null, template_id: null, published: null, details: null, updated_at: "T2", request_id: null },
    ] }));
    const rows = await api.fetchMyInvitations();
    expect(recs[0]).toMatchObject({ kind: "rpc", name: "my_invitations" });
    expect(rows[0]).toEqual({ id: "i1", groomName: "Ravi", brideName: "Sita", eventDate: "2027-01-02", templateId: "7", published: true,
      details: { groomEn: "Ravi" }, updatedAt: "T1",
      request: { id: "r1", status: "rejected", adminNote: "Fix the date", createdAt: "T0", acknowledgedAt: null, proposedDetails: { weddingDate: "2027-02-01" } } });
    expect(rows[1]).toMatchObject({ groomName: "", templateId: "", details: {}, request: null });
  });
  it("gives an empty list for no rows or a non-array answer, and throws the server message on error", async () => {
    expect(await (await load(() => ({ data: [] }))).fetchMyInvitations()).toEqual([]);
    expect(await (await load(() => ({ data: null }))).fetchMyInvitations()).toEqual([]);
    await expect((await load(() => ({ error: { message: "boom" } }))).fetchMyInvitations()).rejects.toThrow("boom");
  });
});

describe("submitChangeRequest / withdraw / acknowledge", () => {
  it("sends the three arguments under the names the function expects and returns the id", async () => {
    const api = await load(() => ({ data: "req-1" }));
    expect(await api.submitChangeRequest("i1", { groomEn: "R" }, "2026-11-13T00:00:00Z")).toBe("req-1");
    expect(recs[0]).toMatchObject({ name: "submit_change_request", args: { p_invitation_id: "i1", p_details: { groomEn: "R" }, p_base_updated_at: "2026-11-13T00:00:00Z" } });
  });
  it("turns a database error into an ApiError that keeps the readable message", async () => {
    const api = await load(() => ({ error: { message: "You already have a pending request for this invitation", code: "23505" } }));
    const err = await api.submitChangeRequest("i1", {}, "T").catch((e) => e);
    expect(err).toBeInstanceOf(api.ApiError);
    expect(err).not.toBeInstanceOf(api.ChangeConflictError);
    expect(err.message).toMatch(/already have a pending/);
  });
  it("withdraw and acknowledge send p_id only", async () => {
    const api = await load(() => ({ data: null }));
    await api.withdrawChangeRequest("r1"); await api.acknowledgeRejection("r2");
    expect(recs.map((r) => [r.name, r.args])).toEqual([["withdraw_change_request", { p_id: "r1" }], ["acknowledge_rejection", { p_id: "r2" }]]);
    const bad = await load(() => ({ error: { message: "Request not found", code: "P0002" } }));
    await expect(bad.withdrawChangeRequest("x")).rejects.toThrow("Request not found");
    await expect(bad.acknowledgeRejection("x")).rejects.toThrow("Request not found");
  });
});

describe("reviewChangeRequest", () => {
  it("sends decision, trimmed note (null when blank) and force", async () => {
    const api = await load(() => ({ data: null }));
    await api.reviewChangeRequest("r1", "reject", "  wrong date  ");
    await api.reviewChangeRequest("r2", "approve");
    await api.reviewChangeRequest("r3", "approve", "", true);
    expect(recs.map((r) => r.args)).toEqual([
      { p_id: "r1", p_decision: "reject", p_note: "wrong date", p_force: false },
      { p_id: "r2", p_decision: "approve", p_note: null, p_force: false },
      { p_id: "r3", p_decision: "approve", p_note: null, p_force: true },
    ]);
  });
  it("turns SQLSTATE 40001 into ChangeConflictError (still an ApiError), other errors into plain ApiError", async () => {
    const conflict = await load(() => ({ error: { message: "The invitation was edited after the client started", code: "40001" } }));
    const e1 = await conflict.reviewChangeRequest("r1", "approve").catch((e) => e);
    expect(e1).toBeInstanceOf(conflict.ChangeConflictError);
    expect(e1).toBeInstanceOf(conflict.ApiError);
    const other = await load(() => ({ error: { message: "A note is required when rejecting", code: "22023" } }));
    const e2 = await other.reviewChangeRequest("r1", "reject").catch((e) => e);
    expect(e2).toBeInstanceOf(other.ApiError);
    expect(e2).not.toBeInstanceOf(other.ChangeConflictError);
  });
});

describe("fetchReviewQueue", () => {
  it("reads only pending requests, oldest first, explicit columns, capped at 200", async () => {
    const api = await load(() => ({ data: [{ id: "r1", invitation_id: "i1", client_email: "c@x.com", base_updated_at: "B", created_at: "C", status: "pending",
      changed_keys: ["groomEn", 5, "venueEn"], proposed_details: { groomEn: "R" } }, { id: "r2", invitation_id: "i2", status: "pending", changed_keys: null, proposed_details: null }] }));
    const items = await api.fetchReviewQueue();
    const r = recs[0];
    expect(r.name).toBe("change_requests");
    expect(op(r, "select")?.[0]).not.toMatch(/\*/);
    expect(op(r, "eq")).toEqual(["status", "pending"]);
    expect(r.ops.filter(([n]) => n === "order").map(([, a]) => a)).toEqual([["created_at", { ascending: true }], ["id", { ascending: true }]]);
    expect(op(r, "limit")).toEqual([200]);
    expect(items[0]).toEqual({ id: "r1", invitationId: "i1", clientEmail: "c@x.com", baseUpdatedAt: "B", createdAt: "C", status: "pending", changedKeys: ["groomEn", "venueEn"], proposedDetails: { groomEn: "R" } });
    expect(items[1]).toMatchObject({ clientEmail: "", status: "pending", changedKeys: [], proposedDetails: {} });
  });
  it("can list another status, newest first when not pending", async () => {
    const api = await load(() => ({ data: [{ id: "r3", invitation_id: "i3", client_email: "x@y.com", base_updated_at: "B", created_at: "C", status: "approved", changed_keys: [], proposed_details: {} }] }));
    const items = await api.fetchReviewQueue("approved");
    expect(op(recs[0], "eq")).toEqual(["status", "approved"]);
    expect(recs[0].ops.filter(([n]) => n === "order").map(([, a]) => a)).toEqual([["created_at", { ascending: false }], ["id", { ascending: false }]]);
    expect(items[0].status).toBe("approved");
  });
  it("throws on error", async () => {
    await expect((await load(() => ({ error: { message: "nope" } }))).fetchReviewQueue()).rejects.toThrow("nope");
  });
});

describe("fetchPendingReviewCount", () => {
  it("counts pending only, with head: true so no rows are downloaded", async () => {
    const api = await load(() => ({ count: 3 }));
    expect(await api.fetchPendingReviewCount()).toBe(3);
    const r = recs[0];
    expect(r.name).toBe("change_requests");
    expect(op(r, "select")).toEqual(["id", { count: "exact", head: true }]);
    expect(op(r, "eq")).toEqual(["status", "pending"]);
  });
  it("reads a null count as 0", async () => {
    expect(await (await load(() => ({ count: null }))).fetchPendingReviewCount()).toBe(0);
  });
});

describe("notifications", () => {
  it("lists newest first, maps rows, and keeps the limit between 1 and 200", async () => {
    const api = await load(() => ({ data: [{ id: 9, audience: "admin", type: "change_submitted", invitation_id: "i1", request_id: "r1", payload: { keys: ["a"] }, read_at: null, created_at: "C" },
      { id: 8, audience: "user", type: "change_approved", payload: null, read_at: "R", created_at: "D" }] }));
    const list = await api.fetchNotifications();
    expect(list[0]).toEqual({ id: 9, audience: "admin", type: "change_submitted", invitationId: "i1", requestId: "r1", payload: { keys: ["a"] }, readAt: null, createdAt: "C" });
    expect(list[1]).toMatchObject({ invitationId: null, requestId: null, payload: {}, readAt: "R" });
    expect(recs[0].ops.filter(([n]) => n === "order").map(([, a]) => a)).toEqual([["created_at", { ascending: false }], ["id", { ascending: false }]]);
    await api.fetchNotifications(0); await api.fetchNotifications(99999); await api.fetchNotifications(12.7);
    expect(recs.slice(1).map((r) => op(r, "limit"))).toEqual([[50], [200], [12]]);
  });
  it("marks one read: sets only read_at, only for that id, only while unread", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-13T10:00:00Z"));
    const api = await load(() => ({ data: null }));
    await api.markNotificationRead(7);
    vi.useRealTimers();
    const r = recs[0];
    expect(r.name).toBe("notifications");
    expect(op(r, "update")).toEqual([{ read_at: "2026-11-13T10:00:00.000Z" }]);
    expect(op(r, "eq")).toEqual(["id", 7]);
    expect(op(r, "is")).toEqual(["read_at", null]);
    await expect((await load(() => ({ error: { message: "denied" } }))).markNotificationRead(1)).rejects.toThrow("denied");
  });
});

describe("fetchClientTemplateHtml / fetchIsAdmin", () => {
  it("template html: right argument name, string answer, empty string otherwise, errors keep the message", async () => {
    const api = await load(() => ({ data: "<html></html>" }));
    expect(await api.fetchClientTemplateHtml("i1")).toBe("<html></html>");
    expect(recs[0]).toMatchObject({ name: "client_template_html", args: { p_invitation_id: "i1" } });
    expect(await (await load(() => ({ data: null }))).fetchClientTemplateHtml("i1")).toBe("");
    await expect((await load(() => ({ error: { message: "Invitation not found", code: "P0002" } }))).fetchClientTemplateHtml("x")).rejects.toThrow("Invitation not found");
  });
  it("is_admin: true only for the JSON value true; an error rejects (no guess)", async () => {
    for (const [data, want] of [[true, true], [false, false], ["true", false], [1, false], [null, false]] as const) {
      expect(await (await load(() => ({ data }))).fetchIsAdmin()).toBe(want);
    }
    expect(recs[0]).toMatchObject({ name: "is_admin" });
    await expect((await load(() => ({ error: { message: "offline" } }))).fetchIsAdmin()).rejects.toThrow("offline");
  });
});
