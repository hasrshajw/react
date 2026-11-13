// M-4: orphan cleanup (api/_orphans.js and api/cleanup-previews.js). A fake Supabase `fetch` holds a bucket and an invitations table in memory.
import { describe, it, expect } from "vitest";
import { pathFromSeoImage, findOrphans, cleanup, headers, GRACE_MS, MAX_DELETE, BUCKET } from "../../api/_orphans.js";
import handler, { isAuthorized } from "../../api/cleanup-previews.js";

const URL_ = "https://proj.supabase.co";
const NOW = Date.parse("2026-11-13T12:00:00Z");
const OLD = "2026-11-01T00:00:00Z";
const RECENT = "2026-11-13T06:00:00Z";
const pub = (p: string, q = "") => `${URL_}/storage/v1/object/public/${BUCKET}/${p}${q}`;

type F = { path: string; updated?: string | null; id?: string | null };
type Inv = { id: string; seo?: string | null };

/** Fake of the three Supabase endpoints the code uses. Records calls; `failOn` makes one endpoint answer 500. */
function fake(files: F[], invs: Inv[], failOn = "") {
  const calls: { method: string; url: string; body?: any }[] = [];
  const deleted: string[] = [];
  const fetchFn = async (url: string, init: any = {}) => {
    const method = init.method ?? "GET";
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ method, url, body });
    const ok = (data: unknown) => ({ ok: true, status: 200, json: async () => data });
    const bad = () => ({ ok: false, status: 500, json: async () => ({}) });
    if (url.includes("/storage/v1/object/list/")) {
      if (failOn === "list") return bad();
      const prefix: string = body.prefix;
      const rows = prefix === ""
        ? [...new Set(files.map((f) => f.path.split("/")[0]))].map((name) => ({ name, id: null }))
        : files.filter((f) => f.path.startsWith(prefix + "/")).map((f) => ({
            name: f.path.slice(prefix.length + 1), id: f.id === undefined ? "obj" : f.id, updated_at: f.updated ?? null, created_at: null,
          }));
      return ok(rows.slice(body.offset, body.offset + body.limit));
    }
    if (url.includes("/rest/v1/invitations")) {
      if (failOn === "rest") return bad();
      const [a, b] = String(init.headers.Range).split("-").map(Number);
      return ok(invs.slice(a, b + 1));
    }
    if (method === "DELETE") {
      if (failOn === "delete") return bad();
      deleted.push(...body.prefixes);
      return ok([]);
    }
    return bad();
  };
  return { fetchFn: fetchFn as unknown as typeof fetch, calls, deleted };
}
const run = (f: ReturnType<typeof fake>, extra: Record<string, unknown> = {}) =>
  cleanup({ url: URL_, key: "K", fetchFn: f.fetchFn, now: NOW, ...extra } as any);

describe("pathFromSeoImage", () => {
  it("reads the file path from an own-bucket link, with or without ?v=", () => {
    expect(pathFromSeoImage(pub("u1/a.jpg"))).toBe("u1/a.jpg");
    expect(pathFromSeoImage(pub("u1/a.jpg", "?v=123"))).toBe("u1/a.jpg");
  });
  it("gives an empty string for anything else", () => {
    for (const v of [null, undefined, "", 5, "not a url", "https://x.test/img.jpg", `${URL_}/storage/v1/object/public/other/u1/a.jpg`, pub("a.jpg"), pub("u1/a.png"), pub("u1/x/a.jpg")])
      expect(pathFromSeoImage(v as string)).toBe("");
  });
});

describe("findOrphans", () => {
  const base = { invitationIds: new Set(["live"]), referenced: new Set(["u1/shared.jpg"]), now: NOW };
  it("keeps a file whose invitation exists, a referenced file, a recent file and an unknown age", () => {
    const files = [
      { path: "u1/live.jpg", updatedAt: OLD }, { path: "u1/shared.jpg", updatedAt: OLD },
      { path: "u1/new.jpg", updatedAt: RECENT }, { path: "u1/noage.jpg", updatedAt: null }, { path: "u1/badage.jpg", updatedAt: "yesterday" },
    ];
    expect(findOrphans({ ...base, files })).toEqual([]);
  });
  it("returns an old file with no invitation and no reference, and only that", () => {
    expect(findOrphans({ ...base, files: [{ path: "u1/gone.jpg", updatedAt: OLD }, { path: "u1/live.jpg", updatedAt: OLD }] })).toEqual(["u1/gone.jpg"]);
  });
  it("ignores names of another shape", () => {
    const files = ["u1/gone.png", "gone.jpg", "u1/x/gone.jpg", "u1/.emptyFolderPlaceholder"].map((path) => ({ path, updatedAt: OLD }));
    expect(findOrphans({ ...base, files })).toEqual([]);
  });
  it("uses the grace period: just inside keeps, exactly at it deletes", () => {
    const at = new Date(NOW - GRACE_MS).toISOString();
    const inside = new Date(NOW - GRACE_MS + 1000).toISOString();
    expect(findOrphans({ ...base, files: [{ path: "u1/a.jpg", updatedAt: at }, { path: "u1/b.jpg", updatedAt: inside }] })).toEqual(["u1/a.jpg"]);
  });
  it("compares ids exactly (no case folding)", () => {
    expect(findOrphans({ ...base, files: [{ path: "u1/LIVE.jpg", updatedAt: OLD }] })).toEqual(["u1/LIVE.jpg"]);
  });
});

describe("cleanup", () => {
  const files: F[] = [
    { path: "u1/live.jpg", updated: OLD }, { path: "u1/trashed.jpg", updated: OLD }, { path: "u1/orphan.jpg", updated: OLD },
    { path: "u2/shared.jpg", updated: OLD }, { path: "u2/fresh.jpg", updated: RECENT }, { path: "u2/orphan2.jpg", updated: OLD },
  ];
  const invs: Inv[] = [
    { id: "live" }, { id: "trashed" },
    { id: "copy", seo: pub("u2/shared.jpg", "?v=9") }, /* a Duplicate pointing at the original's file, whose own row is gone */
  ];

  it("a dry run reports the orphans and deletes nothing", async () => {
    const f = fake(files, invs);
    const s = await run(f);
    expect(s).toMatchObject({ dryRun: true, files: 6, invitations: 3, orphans: 2, deleted: 0 });
    expect(s.sample).toEqual(["u1/orphan.jpg", "u2/orphan2.jpg"]);
    expect(f.calls.some((c) => c.method === "DELETE")).toBe(false);
    expect(f.deleted).toEqual([]);
  });
  it("deletes exactly the orphans when dryRun is false, once, in the right bucket", async () => {
    const f = fake(files, invs);
    const s = await run(f, { dryRun: false });
    expect(s.deleted).toBe(2);
    expect(f.deleted.sort()).toEqual(["u1/orphan.jpg", "u2/orphan2.jpg"]);
    const del = f.calls.filter((c) => c.method === "DELETE");
    expect(del).toHaveLength(1);
    expect(del[0].url).toBe(`${URL_}/storage/v1/object/${BUCKET}`);
  });
  it("keeps files of trashed invitations (the row still exists) and files a copy points at", async () => {
    const f = fake(files, invs);
    await run(f, { dryRun: false });
    for (const keep of ["u1/live.jpg", "u1/trashed.jpg", "u2/shared.jpg", "u2/fresh.jpg"]) expect(f.deleted).not.toContain(keep);
  });
  it("refuses when files exist but no invitation was read (wrong project or key)", async () => {
    const f = fake(files, []);
    const s = await run(f, { dryRun: false });
    expect(s.deleted).toBe(0);
    expect(s.skipped).toMatch(/no invitations were read/);
    expect(f.deleted).toEqual([]);
  });
  it("does nothing for an empty bucket", async () => {
    const s = await run(fake([], []), { dryRun: false });
    expect(s).toMatchObject({ files: 0, orphans: 0, deleted: 0, skipped: "" });
  });
  it("handles at most MAX_DELETE files per run and says so", async () => {
    const many: F[] = Array.from({ length: MAX_DELETE + 30 }, (_, i) => ({ path: `u1/o${String(i).padStart(4, "0")}.jpg`, updated: OLD }));
    const f = fake(many, [{ id: "live" }]);
    const s = await run(f, { dryRun: false });
    expect(s.orphans).toBe(MAX_DELETE + 30);
    expect(s.deleted).toBe(MAX_DELETE);
    expect(f.deleted).toHaveLength(MAX_DELETE);
    expect(s.skipped).toMatch(/first 200/);
    expect(s.sample).toHaveLength(20);
  });
  it("reads past 1,000 invitations and past 100 files per folder", async () => {
    const many: F[] = Array.from({ length: 250 }, (_, i) => ({ path: `u1/f${String(i).padStart(4, "0")}.jpg`, updated: OLD }));
    const invs2: Inv[] = Array.from({ length: 2300 }, (_, i) => ({ id: `f${String(i).padStart(4, "0")}` })); /* ids f0000..f2299 cover every file */
    const s = await run(fake(many, invs2));
    expect(s).toMatchObject({ files: 250, invitations: 2300, orphans: 0 });
  });
  it("a failed list, read or delete throws, and a failed read deletes nothing", async () => {
    for (const failOn of ["list", "rest"]) {
      const f = fake(files, invs, failOn);
      await expect(run(f, { dryRun: false })).rejects.toThrow(/failed \(HTTP 500\)/);
      expect(f.deleted).toEqual([]);
    }
    await expect(run(fake(files, invs, "delete"), { dryRun: false })).rejects.toThrow(/Deleting files failed/);
  });
  it("leaves a file at the bucket root and a folder placeholder alone", async () => {
    const f = fake([{ path: "rootfile.jpg", updated: OLD, id: "x" }, { path: "u1/.emptyFolderPlaceholder", updated: OLD }, { path: "u1/ghost.jpg", updated: OLD }], [{ id: "live" }]);
    await run(f, { dryRun: false });
    expect(f.deleted).toEqual(["u1/ghost.jpg"]);
  });
  it("sends the service key only as headers, never in a URL or a body", async () => {
    const f = fake(files, invs);
    await run(f, { dryRun: false });
    for (const c of f.calls) { expect(c.url).not.toContain("K&"); expect(JSON.stringify(c.body ?? {})).not.toContain('"K"'); }
  });
});

describe("service key headers", () => {
  it("sends a new-style sb_secret_ key only as apikey", () => {
    const h = headers("sb_secret_abc", { Range: "0-9" }) as Record<string, string>;
    expect(h.apikey).toBe("sb_secret_abc");
    expect(h.Range).toBe("0-9");
    expect("Authorization" in h).toBe(false);
  });
  it("also sends a legacy JWT service_role key as a Bearer token", () => {
    const h = headers("eyJhbGciOi.payload.sig") as Record<string, string>;
    expect(h.apikey).toBe("eyJhbGciOi.payload.sig");
    expect(h.Authorization).toBe("Bearer eyJhbGciOi.payload.sig");
  });
  it("every request of a cleanup run uses those headers", async () => {
    const seen: Record<string, string>[] = [];
    const f = fake([{ path: "u1/a.jpg", updated: OLD }], [{ id: "x" }]);
    const wrapped = (async (u: string, init: any = {}) => { seen.push(init.headers); return (f.fetchFn as any)(u, init); }) as unknown as typeof fetch;
    await cleanup({ url: URL_, key: "sb_secret_abc", fetchFn: wrapped, now: NOW, dryRun: true } as any);
    expect(seen.length).toBeGreaterThan(0);
    for (const h of seen) { expect(h.apikey).toBe("sb_secret_abc"); expect("Authorization" in h).toBe(false); }
  });
});

describe("isAuthorized", () => {
  it("accepts exactly 'Bearer <secret>'", () => {
    expect(isAuthorized("Bearer s3cret", "s3cret")).toBe(true);
    for (const h of [undefined, "", "s3cret", "bearer s3cret", "Bearer s3cret ", "Bearer other"]) expect(isAuthorized(h as string, "s3cret")).toBe(false);
  });
  it("refuses everything when no secret is configured", () => {
    expect(isAuthorized("Bearer ", "")).toBe(false);
    expect(isAuthorized("Bearer undefined", undefined)).toBe(false);
  });
});

describe("handler", () => {
  const env = { CRON_SECRET: "s3cret", SUPABASE_SERVICE_ROLE_KEY: "K", VITE_SUPABASE_URL: URL_ };
  function call(opts: { method?: string; url?: string; auth?: string; env?: Record<string, string>; cleanupFn?: any }) {
    const out: { status: number; body: any; headers: Record<string, string> } = { status: 0, body: null, headers: {} };
    const res = {
      statusCode: 0, setHeader: (k: string, v: string) => { out.headers[k] = v; },
      end: (b?: string) => { out.status = (res as any).statusCode; out.body = b ? JSON.parse(b) : null; },
    };
    const calls: any[] = [];
    const cleanupFn = opts.cleanupFn ?? (async (a: any) => { calls.push(a); return { ok: true }; });
    const p = (handler as any)({ method: opts.method ?? "GET", url: opts.url ?? "/api/cleanup-previews", headers: opts.auth ? { authorization: opts.auth } : {} }, res, { env: opts.env ?? env, cleanup: cleanupFn });
    return p.then(() => ({ ...out, calls }));
  }
  it("405 for other methods, 503 without configuration, 401 without the secret", async () => {
    expect((await call({ method: "POST", auth: "Bearer s3cret" })).status).toBe(405);
    for (const k of Object.keys(env)) expect((await call({ auth: "Bearer s3cret", env: { ...env, [k]: "" } })).status).toBe(503);
    expect((await call({ env: { ...env, VITE_SUPABASE_URL: "http://x.test" }, auth: "Bearer s3cret" })).status).toBe(503);
    const r = await call({});
    expect(r.status).toBe(401);
    expect(r.calls).toHaveLength(0);
    expect((await call({ auth: "Bearer nope" })).calls).toHaveLength(0);
  });
  it("runs a dry run by default and deletes only with ?delete=1", async () => {
    const a = await call({ auth: "Bearer s3cret" });
    expect(a.status).toBe(200);
    expect(a.calls[0]).toMatchObject({ url: URL_, key: "K", dryRun: true });
    for (const q of ["?delete=0", "?delete=true", "?delete=", "?x=1"]) expect((await call({ auth: "Bearer s3cret", url: "/api/cleanup-previews" + q })).calls[0].dryRun).toBe(true);
    expect((await call({ auth: "Bearer s3cret", url: "/api/cleanup-previews?delete=1" })).calls[0].dryRun).toBe(false);
  });
  it("answers 502 with the message when the run fails, never with the key, and is not cached", async () => {
    const r = await call({ auth: "Bearer s3cret", cleanupFn: async () => { throw new Error("Reading invitations failed (HTTP 401)"); } });
    expect(r.status).toBe(502);
    expect(r.body.error).toBe("Reading invitations failed (HTTP 401)");
    expect(JSON.stringify(r.body)).not.toContain("K\"");
    expect(r.headers["Cache-Control"]).toBe("no-store");
  });
});
