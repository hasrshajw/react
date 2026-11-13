import { describe, expect, it, vi } from "vitest";
import handler from "../../api/invite-client.js";

function mockRes() {
  const res = { statusCode: 0, headers: {}, body: null, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b; } };
  return res;
}

describe("api/invite-client", () => {
  it("rejects non-POST", async () => {
    const res = mockRes();
    await handler({ method: "GET", headers: {} }, res, { env: {} });
    expect(res.statusCode).toBe(405);
  });

  it("answers 503 when secrets are missing", async () => {
    const res = mockRes();
    await handler({ method: "POST", headers: { authorization: "Bearer t" }, body: { email: "a@b.com" } }, res, { env: {} });
    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.body).error).toMatch(/not configured/i);
  });

  it("answers 401 without a bearer token", async () => {
    const res = mockRes();
    await handler({ method: "POST", headers: {}, body: { email: "a@b.com" } }, res, {
      env: { VITE_SUPABASE_URL: "https://x.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "pk", SUPABASE_SERVICE_ROLE_KEY: "sk" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("answers 403 when is_admin is false", async () => {
    const res = mockRes();
    const fetchFn = vi.fn(async () => ({ ok: true, json: async () => false }));
    await handler(
      { method: "POST", headers: { authorization: "Bearer user-token" }, body: { email: "client@x.com" } },
      res,
      {
        env: { VITE_SUPABASE_URL: "https://x.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "pk", SUPABASE_SERVICE_ROLE_KEY: "sk" },
        fetch: fetchFn,
      },
    );
    expect(res.statusCode).toBe(403);
  });

  it("invites when the caller is an admin", async () => {
    const res = mockRes();
    const fetchFn = vi.fn(async (url) => {
      if (String(url).includes("is_admin")) return { ok: true, json: async () => true };
      return { ok: true, json: async () => ({ id: "user-1" }) };
    });
    await handler(
      { method: "POST", headers: { authorization: "Bearer user-token" }, body: { email: "client@x.com", invitationId: "inv1" } },
      res,
      {
        env: { VITE_SUPABASE_URL: "https://x.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "pk", SUPABASE_SERVICE_ROLE_KEY: "sk", SITE_URL: "https://app.test" },
        fetch: fetchFn,
      },
    );
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
    expect(body.email).toBe("client@x.com");
    const inviteCall = fetchFn.mock.calls.find((c) => String(c[0]).includes("/auth/v1/invite"));
    expect(inviteCall).toBeTruthy();
    expect(JSON.parse(inviteCall[1].body).redirect_to).toBe("https://app.test/my");
  });
});
