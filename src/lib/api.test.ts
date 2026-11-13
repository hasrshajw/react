import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* Tests for the data layer (src/lib/api.ts) against a fake Supabase client. Covers M-5 (paging), H-6 (flag writes run in order and
   only send what changed), M-4 (preview file kept while still used), M-13 (missing profile is never "active"), L-7 (history is not
   sent), L-8 (the server decides what is expired). The fake records every call, so the tests can check what was sent, and in what order. */

type Op = [string, unknown[]];
type Call = { table: string; ops: Op[] };
type Result = { data?: any; error?: { message: string; code?: string } | null; count?: number | null };
type Handler = (call: Call) => Result | Promise<Result>;

const has = (call: Call, name: string) => call.ops.find(([n]) => n === name)?.[1];

function makeDb(handler: Handler, extra: Record<string, unknown> = {}) {
  const calls: Call[] = [];
  const from = (table: string) => {
    const call: Call = { table, ops: [] };
    calls.push(call);
    const b: any = new Proxy({}, {
      get(_t, prop: string) {
        if (prop === "then") return (res: any, rej: any) => Promise.resolve(handler(call)).then((r) => ({ data: null, error: null, ...r }), undefined).then(res, rej);
        return (...args: unknown[]) => { call.ops.push([prop, args]); return b; };
      },
    });
    return b;
  };
  const db = {
    from,
    rpc: (name: string) => from(`rpc:${name}`),
    auth: { getUser: async () => ({ data: { user: { id: "u1", email: "a@b.c" } } }), getSession: async () => ({ data: { session: { user: { id: "u1" } } } }) },
    storage: { from: () => ({ upload: vi.fn(), remove: vi.fn(), getPublicUrl: vi.fn() }) },
    ...extra,
  };
  return { db, calls };
}

async function load(handler: Handler, extra: Record<string, unknown> = {}) {
  vi.resetModules();
  const fake = makeDb(handler, extra);
  vi.doMock("./supabase", () => ({ db: () => fake.db, SUPABASE_CONFIGURED: true, supabase: fake.db }));
  vi.doMock("./auth", () => ({ getSession: () => ({ name: "Session Name", email: "session@x.y" }) }));
  const api = await import("./api");
  return { api, ...fake };
}

const rows = (from: number, n: number) => Array.from({ length: n }, (_, i) => ({ id: `r${from + i}` }));
const inv = (id: string, extra: Record<string, unknown> = {}) => ({ id, groom_name: "G", bride_name: "B", details: {}, published: true, deleted_at: null, slug: "s", owner: "o", ...extra });

beforeEach(() => { vi.spyOn(console, "warn").mockImplementation(() => {}); });
afterEach(() => { vi.restoreAllMocks(); vi.doUnmock("./supabase"); vi.doUnmock("./auth"); });

describe("readAllPages (M-5)", () => {
  it("reads one page when it is not full", async () => {
    const { api } = await load(() => ({}));
    const page = vi.fn(async () => ({ data: rows(0, 3), error: null }));
    expect((await api.readAllPages(page)).length).toBe(3);
    expect(page).toHaveBeenCalledTimes(1);
    expect(page).toHaveBeenCalledWith(0, 499);
  });

  it("keeps reading while pages are full, with the right ranges", async () => {
    const { api } = await load(() => ({}));
    const page = vi.fn(async (from: number) => ({ data: from === 0 ? rows(0, 500) : from === 500 ? rows(500, 500) : rows(1000, 20), error: null }));
    const out = await api.readAllPages(page);
    expect(out.length).toBe(1020);
    expect(page.mock.calls).toEqual([[0, 499], [500, 999], [1000, 1499]]);
  });

  it("an empty answer after a full page ends the read", async () => {
    const { api } = await load(() => ({}));
    const page = vi.fn(async (from: number) => ({ data: from === 0 ? rows(0, 500) : [], error: null }));
    expect((await api.readAllPages(page)).length).toBe(500);
    expect(page).toHaveBeenCalledTimes(2);
  });

  it("drops a row that arrives twice (something was inserted while paging)", async () => {
    const { api } = await load(() => ({}));
    const page = vi.fn(async (from: number) => ({ data: from === 0 ? rows(0, 500) : [{ id: "r499" }, { id: "new" }], error: null }));
    const out = await api.readAllPages(page);
    expect(out.length).toBe(501);
    expect(out.filter((r) => r.id === "r499").length).toBe(1);
  });

  it("throws the server's message on an error and keeps nothing", async () => {
    const { api } = await load(() => ({}));
    await expect(api.readAllPages(async () => ({ data: null, error: { message: "permission denied" } }))).rejects.toThrow("permission denied");
  });

  it("reads up to the limit it is given, so \"Load more\" can ask for more than 10,000 (M-5)", async () => {
    const { api } = await load(() => ({}));
    let n = 0;
    const page = vi.fn(async () => ({ data: rows((n++) * 500, 500), error: null }));
    const out = await api.readAllPages(page, 20000);
    expect(out.length).toBe(20000);
    expect(page).toHaveBeenCalledTimes(40);
  });

  it("stops at 10,000 rows and says so", async () => {
    const { api } = await load(() => ({}));
    let n = 0;
    const page = vi.fn(async () => ({ data: rows((n++) * 500, 500), error: null }));
    const out = await api.readAllPages(page);
    expect(out.length).toBe(10000);
    expect(page).toHaveBeenCalledTimes(20);
    expect(console.warn).toHaveBeenCalled();
  });
});

describe("fetchInvitations", () => {
  it("is not truncated for a normal list, and is truncated when the read hits the 10,000-row limit (M-5)", async () => {
    const small = await load(() => ({ data: [inv("a"), inv("b")] }));
    expect((await small.api.fetchInvitations()).truncated).toBe(false);
    let n = 0;
    const big = await load(() => { const start = n++ * 500; return { data: Array.from({ length: 500 }, (_, i) => inv(`r${start + i}`)) }; });
    const out = await big.api.fetchInvitations();
    expect(out.rows).toHaveLength(10000);
    expect(out.truncated).toBe(true);
  });

  it("reads past 10,000 rows when a larger limit is given, and is truncated only at that limit (M-5 load more)", async () => {
    let n = 0;
    const big = await load(() => { const start = n++ * 500; return { data: Array.from({ length: 500 }, (_, i) => inv(`r${start + i}`)) }; });
    const out = await big.api.fetchInvitations(12000);
    expect(out.rows).toHaveLength(12000);
    expect(out.truncated).toBe(true);
    let m = 0;
    const part = await load(() => { const start = m++ * 500; return { data: Array.from({ length: m === 25 ? 100 : 500 }, (_, i) => inv(`q${start + i}`)) }; });
    const res = await part.api.fetchInvitations(20000);
    expect(res.rows).toHaveLength(12100);
    expect(res.truncated).toBe(false);
  });

  it("orders by created_at then id, reads by range, and names its columns", async () => {
    const { api, calls } = await load(() => ({ data: [] }));
    await api.fetchInvitations();
    const c = calls[0];
    expect(c.table).toBe("invitations");
    expect(has(c, "select")?.[0]).not.toBe("*");
    expect(c.ops.filter(([n]) => n === "order").map(([, a]) => a)).toEqual([["created_at", { ascending: false }], ["id", { ascending: false }]]);
    expect(has(c, "range")).toEqual([0, 499]);
  });

  it("splits the flags out of the rows and leaves slug and owner behind", async () => {
    const { api } = await load(() => ({
      data: [inv("a"), inv("b", { published: false }), inv("c", { deleted_at: "2026-11-01T00:00:00.000Z" })],
    }));
    const out = await api.fetchInvitations();
    expect(out.rows.map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(out.rows[0]).not.toHaveProperty("published");
    expect(out.rows[0]).not.toHaveProperty("slug");
    expect(out.rows[0]).not.toHaveProperty("owner");
    expect(out.published).toEqual({ a: true, b: false, c: true });
    expect(out.deleted).toEqual({ c: Date.parse("2026-11-01T00:00:00.000Z") });
  });

  it("a row with a null published column counts as published", async () => {
    const { api } = await load(() => ({ data: [inv("a", { published: null })] }));
    expect((await api.fetchInvitations()).published).toEqual({ a: true });
  });
});

describe("savePublished (H-6)", () => {
  it("sends nothing when nothing changed", async () => {
    const { api, calls } = await load(() => ({ data: [inv("a"), inv("b", { published: false })] }));
    const { published } = await api.fetchInvitations();
    calls.length = 0;
    await api.savePublished(published);
    expect(calls.length).toBe(0);
  });

  it("sends only what changed, with ids that share a value in one statement", async () => {
    const { api, calls } = await load(() => ({ data: [inv("a"), inv("b"), inv("c"), inv("d", { published: false })] }));
    await api.fetchInvitations();
    calls.length = 0;
    await api.savePublished({ a: false, b: false, c: true, d: true });
    expect(calls.length).toBe(2);
    const byValue = Object.fromEntries(calls.map((c) => [JSON.stringify(has(c, "update")?.[0]), has(c, "in")?.[1]]));
    expect(byValue['{"published":false}']).toEqual(["a", "b"]);
    expect(byValue['{"published":true}']).toEqual(["d"]);
  });

  it("splits more than 100 ids into several statements", async () => {
    const list = Array.from({ length: 250 }, (_, i) => inv(`i${i}`));
    const { api, calls } = await load(() => ({ data: list }));
    await api.fetchInvitations();
    calls.length = 0;
    await api.savePublished(Object.fromEntries(list.map((r) => [r.id, false])));
    expect(calls.map((c) => (has(c, "in")?.[1] as string[]).length)).toEqual([100, 100, 50]);
  });

  it("after a failure the next call sends the part that did not go through again", async () => {
    let failNext = false;
    const { api, calls } = await load((c) => (c.ops.some(([n]) => n === "update") && failNext ? { error: { message: "boom" } } : { data: [inv("a"), inv("b")] }));
    await api.fetchInvitations();
    calls.length = 0;
    failNext = true;
    await expect(api.savePublished({ a: false, b: true })).rejects.toThrow("boom");
    failNext = false;
    calls.length = 0;
    await api.savePublished({ a: false, b: true });
    expect(calls.length).toBe(1);
    expect(has(calls[0], "in")?.[1]).toEqual(["a"]);
  });

  it("a list read asked for after a write waits for the write (no stale list)", async () => {
    const order: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const { api } = await load(async (c) => {
      if (c.ops.some(([n]) => n === "update")) { order.push("write start"); await gate; order.push("write end"); return {}; }
      order.push("read");
      return { data: [inv("a")] };
    });
    await api.fetchInvitations();
    order.length = 0;
    const w = api.savePublished({ a: false });
    const r = api.fetchInvitations();
    await new Promise((x) => setTimeout(x, 20));
    expect(order).toEqual(["write start"]);
    release();
    await Promise.all([w, r]);
    expect(order).toEqual(["write start", "write end", "read"]);
  });

  it("a failed write does not block the read behind it", async () => {
    const { api } = await load((c) => (c.ops.some(([n]) => n === "update") ? { error: { message: "nope" } } : { data: [inv("a")] }));
    await api.fetchInvitations();
    const w = api.savePublished({ a: false });
    const r = api.fetchInvitations();
    await expect(w).rejects.toThrow("nope");
    await expect(r).resolves.toBeTruthy();
  });
});

describe("saveDeleted (L-8)", () => {
  it("sends an ISO time to trash and null to restore, grouped by value", async () => {
    const t = Date.parse("2026-11-10T10:00:00.000Z");
    const { api, calls } = await load(() => ({ data: [inv("a"), inv("b", { deleted_at: "2026-11-01T00:00:00.000Z" })] }));
    await api.fetchInvitations();
    calls.length = 0;
    await api.saveDeleted({ a: t });
    expect(calls.length).toBe(2);
    const sent = Object.fromEntries(calls.map((c) => [(has(c, "in")?.[1] as string[])[0], has(c, "update")?.[0]]));
    expect(sent.a).toEqual({ deleted_at: "2026-11-10T10:00:00.000Z" });
    expect(sent.b).toEqual({ deleted_at: null });
  });

  it("sends nothing when the map equals what the server had", async () => {
    const t = "2026-11-01T00:00:00.000Z";
    const { api, calls } = await load(() => ({ data: [inv("b", { deleted_at: t })] }));
    const { deleted } = await api.fetchInvitations();
    calls.length = 0;
    await api.saveDeleted(deleted);
    expect(calls.length).toBe(0);
  });
});

describe("fetchExpiredTrashIds (L-8)", () => {
  it("returns only string ids from the server function", async () => {
    const { api, calls } = await load(() => ({ data: ["a", 5, null, "b"] }));
    expect(await api.fetchExpiredTrashIds()).toEqual(["a", "b"]);
    expect(calls[0].table).toBe("rpc:expired_trash_ids");
  });
  it("returns an empty list for a non-array answer", async () => {
    const { api } = await load(() => ({ data: null }));
    expect(await api.fetchExpiredTrashIds()).toEqual([]);
  });
  it("rejects when the function is missing, so nothing is purged", async () => {
    const { api } = await load(() => ({ error: { message: "function expired_trash_ids does not exist" } }));
    await expect(api.fetchExpiredTrashIds()).rejects.toThrow(/does not exist/);
  });
});

describe("saveInvitation", () => {
  const rec: any = { id: "x1", groom_name: "G", bride_name: "B", template_id: 7, details: { customId: "  my-link " } };

  it("upserts with the trimmed link id as slug and a string template id", async () => {
    const { api, calls } = await load(() => ({ data: inv("x1") }));
    await api.saveInvitation(rec);
    const sent = has(calls[0], "upsert")?.[0] as Record<string, unknown>;
    expect(sent.slug).toBe("my-link");
    expect(sent.template_id).toBe("7");
    expect(sent).not.toHaveProperty("published");
  });

  it("falls back to the id as slug when there is no link id", async () => {
    const { api, calls } = await load(() => ({ data: inv("x1") }));
    await api.saveInvitation({ ...rec, details: {} });
    expect((has(calls[0], "upsert")?.[0] as any).slug).toBe("x1");
  });

  it("writes published only when asked", async () => {
    const { api, calls } = await load(() => ({ data: inv("x1") }));
    await api.saveInvitation(rec, { published: false });
    expect((has(calls[0], "upsert")?.[0] as any).published).toBe(false);
  });

  it("turns a duplicate link id into a message the person can act on", async () => {
    const { api } = await load(() => ({ error: { message: "duplicate key", code: "23505" } }));
    const err = await api.saveInvitation(rec).catch((e) => e);
    expect(err).toBeInstanceOf(api.ApiError);
    expect(err.message).toMatch(/already used/);
  });

  it("other errors keep the server's message", async () => {
    const { api } = await load(() => ({ error: { message: "rls violation", code: "42501" } }));
    await expect(api.saveInvitation(rec)).rejects.toThrow("rls violation");
  });
});

describe("deleteInvitation (M-4)", () => {
  const withStorage = (remove: ReturnType<typeof vi.fn>) => ({ storage: { from: () => ({ remove }) } });
  const handler = (count: number | null, deleteError?: string): Handler => (c) => {
    if (c.ops.some(([n]) => n === "delete")) return deleteError ? { error: { message: deleteError } } : {};
    return { count, error: count === null ? { message: "count failed" } : null };
  };

  it("deletes the row, then removes its preview file when nothing else uses it", async () => {
    const remove = vi.fn(async () => ({ error: null }));
    const { api } = await load(handler(0), withStorage(remove));
    await api.deleteInvitation("x1");
    expect(remove).toHaveBeenCalledWith(["u1/x1.jpg"]);
  });

  it("keeps the file while another invitation still points at it (a duplicate)", async () => {
    const remove = vi.fn(async () => ({ error: null }));
    const { api } = await load(handler(1), withStorage(remove));
    await api.deleteInvitation("x1");
    expect(remove).not.toHaveBeenCalled();
  });

  it("keeps the file when the check itself fails", async () => {
    const remove = vi.fn(async () => ({ error: null }));
    const { api } = await load(handler(null), withStorage(remove));
    await api.deleteInvitation("x1");
    expect(remove).not.toHaveBeenCalled();
  });

  it("a failed file removal does not fail the purge", async () => {
    const remove = vi.fn(async () => ({ error: { message: "storage down" } }));
    const { api } = await load(handler(0), withStorage(remove));
    await expect(api.deleteInvitation("x1")).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalled();
  });

  it("does not touch the file when the row could not be deleted", async () => {
    const remove = vi.fn(async () => ({ error: null }));
    const { api } = await load(handler(0, "rls"), withStorage(remove));
    await expect(api.deleteInvitation("x1")).rejects.toThrow("rls");
    expect(remove).not.toHaveBeenCalled();
  });

  it("without a signed-in user nothing is removed", async () => {
    const remove = vi.fn();
    const { api } = await load(handler(0), { ...withStorage(remove), auth: { getUser: async () => ({ data: { user: null } }), getSession: async () => ({ data: { session: null } }) } });
    await api.deleteInvitation("x1");
    expect(remove).not.toHaveBeenCalled();
  });
});

describe("enquiries", () => {
  it("fetchEnquiries maps columns, fills blanks and a non-array history", async () => {
    const { api } = await load(() => ({ data: [{ id: "e1", name: null, created_at: "2026-11-01", status: null, history: "x" }] }));
    const [e] = await api.fetchEnquiries();
    expect(e).toMatchObject({ id: "e1", name: "", phone: "", email: "", message: "", status: "new", note: "", followUpDate: "", history: [] });
  });

  it("fetchNewEnquiryCount counts on the server and downloads no rows", async () => {
    const { api, calls } = await load(() => ({ count: 4 }));
    expect(await api.fetchNewEnquiryCount()).toBe(4);
    expect(has(calls[0], "select")).toEqual(["id", { count: "exact", head: true }]);
    expect(has(calls[0], "eq")).toEqual(["status", "new"]);
  });

  it("fetchNewEnquiryCount reads a null count as 0", async () => {
    const { api } = await load(() => ({ count: null }));
    expect(await api.fetchNewEnquiryCount()).toBe(0);
  });

  const enq: any = { id: "e1", status: "contacted", note: "n", followUpDate: "", history: [{ status: "new", at: "t" }] };

  it("saveEnquiry does not send history, sends an empty follow-up date as null, and returns the server's history", async () => {
    const { api, calls } = await load(() => ({ data: { history: [{ status: "new", at: "a" }, { status: "contacted", at: "b" }] } }));
    const h = await api.saveEnquiry(enq);
    expect(has(calls[0], "update")?.[0]).toEqual({ status: "contacted", note: "n", follow_up_date: null });
    expect(h.length).toBe(2);
  });

  it("saveEnquiry keeps the local history when the server returns none", async () => {
    const { api } = await load(() => ({ data: {} }));
    expect(await api.saveEnquiry(enq)).toEqual(enq.history);
  });

  it("saveEnquiry throws on an error", async () => {
    const { api } = await load(() => ({ error: { message: "denied" } }));
    await expect(api.saveEnquiry(enq)).rejects.toThrow("denied");
  });
});

describe("fetchAccount (M-13)", () => {
  it("a missing profile is a member on an expired trial, never an active admin", async () => {
    const { api } = await load(() => ({ data: null }));
    const a = await api.fetchAccount();
    expect(a.user.role).toBe("Member");
    expect(a.plan.status).toBe("trial");
    expect(a.plan.trialDaysLeft).toBe(0);
  });

  it("uses the profile when there is one, and counts trial days up", async () => {
    const soon = new Date(Date.now() + 3 * 24 * 3600000 - 1000).toISOString();
    const { api } = await load(() => ({ data: { name: "Asha", role: "Admin", plan_name: "Pro", plan_status: "active", trial_ends_at: soon } }));
    const a = await api.fetchAccount();
    expect(a.user).toEqual({ name: "Asha", email: "a@b.c", role: "Admin" });
    expect(a.plan).toMatchObject({ name: "Pro", status: "active", trialDaysLeft: 3 });
  });
});
