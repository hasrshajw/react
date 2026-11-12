// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* The guest-side requests (H-4). `config` is mocked per test because the key decides which headers are sent, and a
   fresh copy of the module is loaded each time. */
const URL_ = "https://proj.supabase.co";
type Cfg = { SUPABASE_URL: string; SUPABASE_KEY: string };

async function load(cfg: Cfg = { SUPABASE_URL: URL_, SUPABASE_KEY: "sb_publishable_abc" }) {
  vi.resetModules();
  vi.doMock("./config", () => cfg);
  return import("./publicInvitation");
}
const reply = (body: unknown, ok = true, status = 200) => ({ ok, status, json: async () => body }) as Response;
const VISITOR_RE = /^[A-Za-z0-9_-]{16,64}$/;

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.doUnmock("./config"); });

describe("visitorId", () => {
  it("makes an id the database accepts, stores it and reuses it", async () => {
    const { visitorId } = await load();
    const a = visitorId();
    expect(a).toMatch(VISITOR_RE);
    expect(localStorage.getItem("schedy_visitor")).toBe(a);
    expect(visitorId()).toBe(a);
  });

  it("replaces a stored value that the database would refuse", async () => {
    const { visitorId } = await load();
    for (const bad of ["short", "has space in it 123456", "x".repeat(65), ""]) {
      localStorage.setItem("schedy_visitor", bad);
      const id = visitorId();
      expect(id).toMatch(VISITOR_RE);
      expect(id).not.toBe(bad);
      expect(localStorage.getItem("schedy_visitor")).toBe(id);
    }
  });

  it("keeps a valid stored id as it is", async () => {
    const { visitorId } = await load();
    localStorage.setItem("schedy_visitor", "abcDEF_123-4567890");
    expect(visitorId()).toBe("abcDEF_123-4567890");
  });

  it("gives a valid fresh id without throwing when storage is blocked", async () => {
    const { visitorId } = await load();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    const a = visitorId(), b = visitorId();
    expect(a).toMatch(VISITOR_RE);
    expect(b).toMatch(VISITOR_RE);
    expect(a).not.toBe(b); // nothing is remembered, so each call is a new visitor
  });

  it("still makes a valid id when crypto.randomUUID is missing, and when crypto is missing entirely", async () => {
    const { visitorId } = await load();
    vi.stubGlobal("crypto", { getRandomValues: (b: Uint8Array) => b.fill(171) });
    expect(visitorId()).toMatch(VISITOR_RE);
    localStorage.clear();
    vi.stubGlobal("crypto", undefined);
    expect(visitorId()).toMatch(VISITOR_RE);
  });
});

describe("fetchPublicInvitation", () => {
  it("posts the slug to the read-only function and splits html_code from the row", async () => {
    const { fetchPublicInvitation } = await load();
    fetchMock.mockResolvedValue(reply({ groom_name: "A", bride_name: "B", details: { x: 1 }, html_code: "<p>hi</p>" }));
    const r = await fetchPublicInvitation("my-link");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${URL_}/rest/v1/rpc/get_public_invitation`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ p_slug: "my-link" });
    expect(r?.html).toBe("<p>hi</p>");
    expect(r?.invitation).toEqual({ groom_name: "A", bride_name: "B", details: { x: 1 } });
  });

  it("gives an empty html string when the template has none, and null for a missing invitation", async () => {
    const { fetchPublicInvitation } = await load();
    fetchMock.mockResolvedValueOnce(reply({ groom_name: "A", html_code: null }));
    expect((await fetchPublicInvitation("a"))?.html).toBe("");
    fetchMock.mockResolvedValueOnce(reply(null));
    expect(await fetchPublicInvitation("nope")).toBeNull();
  });

  it("throws on an HTTP error with the status in the message", async () => {
    const { fetchPublicInvitation } = await load();
    fetchMock.mockResolvedValue(reply(null, false, 503));
    await expect(fetchPublicInvitation("a")).rejects.toThrow("503");
  });

  it("sends only the apikey for a publishable key, and also Authorization for a legacy JWT key", async () => {
    let m = await load();
    fetchMock.mockResolvedValue(reply(null));
    await m.fetchPublicInvitation("a");
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ "Content-Type": "application/json", apikey: "sb_publishable_abc" });
    m = await load({ SUPABASE_URL: URL_, SUPABASE_KEY: "eyJhbGciOi.legacy.key" });
    await m.fetchPublicInvitation("a");
    expect(fetchMock.mock.calls[1][1].headers).toEqual({
      "Content-Type": "application/json", apikey: "eyJhbGciOi.legacy.key", Authorization: "Bearer eyJhbGciOi.legacy.key",
    });
  });

  it("refuses to run, without a request, when Supabase is not configured", async () => {
    const { fetchPublicInvitation } = await load({ SUPABASE_URL: "", SUPABASE_KEY: "" });
    await expect(fetchPublicInvitation("a")).rejects.toThrow("not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("recordInvitationView", () => {
  it("posts the slug and this browser's visitor id, and returns true when the view was counted", async () => {
    const { recordInvitationView, visitorId } = await load();
    fetchMock.mockResolvedValue(reply(true));
    expect(await recordInvitationView("my-link")).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${URL_}/rest/v1/rpc/record_invitation_view`);
    expect(init.keepalive).toBe(true);
    expect(JSON.parse(init.body)).toEqual({ p_slug: "my-link", p_visitor: visitorId() });
  });

  it("returns false when the database says the view was not counted", async () => {
    const { recordInvitationView } = await load();
    fetchMock.mockResolvedValue(reply(false));
    expect(await recordInvitationView("a")).toBe(false);
  });

  it("returns false for anything other than the JSON value true", async () => {
    const { recordInvitationView } = await load();
    for (const body of ["true", 1, null, { ok: true }]) {
      fetchMock.mockResolvedValueOnce(reply(body));
      expect(await recordInvitationView("a")).toBe(false);
    }
  });

  it("never throws: an HTTP error, a network error, bad JSON or a missing configuration all give false", async () => {
    const { recordInvitationView } = await load();
    fetchMock.mockResolvedValueOnce(reply(true, false, 500));
    expect(await recordInvitationView("a")).toBe(false);
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    expect(await recordInvitationView("a")).toBe(false);
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => { throw new SyntaxError("bad"); } } as unknown as Response);
    expect(await recordInvitationView("a")).toBe(false);
    const bare = await load({ SUPABASE_URL: "", SUPABASE_KEY: "" });
    fetchMock.mockClear();
    expect(await bare.recordInvitationView("a")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the same visitor id on every call, so one browser counts once a day on the server", async () => {
    const { recordInvitationView } = await load();
    fetchMock.mockResolvedValue(reply(true));
    await recordInvitationView("a"); await recordInvitationView("b");
    const ids = fetchMock.mock.calls.map((c) => JSON.parse(c[1].body).p_visitor);
    expect(ids[0]).toBe(ids[1]);
  });
});
