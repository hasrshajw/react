import { describe, expect, it, vi, beforeEach } from "vitest";
import handler from "../../api/notify-admin.js";

function mockRes() {
  const res: any = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: null as string | null,
    setHeader(k: string, v: string) {
      this.headers[k] = v;
    },
    end(b: string) {
      this.body = b;
    },
  };
  return res;
}

describe("api/notify-admin", () => {
  beforeEach(() => {
    /* each test gets a fresh module-level seen set via re-import is hard; we just avoid colliding ids */
  });

  it("rejects non-POST", async () => {
    const res = mockRes();
    await handler({ method: "GET", headers: {} }, res, { env: {} });
    expect(res.statusCode).toBe(405);
  });

  it("returns 400 on invalid JSON", async () => {
    const res = mockRes();
    await handler({ method: "POST", headers: {}, body: "{bad" }, res, { env: {} });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 when record is missing", async () => {
    const res = mockRes();
    await handler({ method: "POST", headers: {}, body: {} }, res, { env: {} });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body!).error).toMatch(/record/i);
  });

  it("rejects when secret is configured and missing", async () => {
    const res = mockRes();
    await handler(
      { method: "POST", headers: {}, body: { record: { id: "r1", status: "pending" } } },
      res,
      { env: { WEBHOOK_SECRET: "s3cret" } },
    );
    expect(res.statusCode).toBe(401);
  });

  it("accepts matching webhook secret header", async () => {
    const res = mockRes();
    await handler(
      {
        method: "POST",
        headers: { "x-webhook-secret": "s3cret" },
        body: { record: { id: "r-secret-ok", status: "pending" } },
      },
      res,
      { env: { WEBHOOK_SECRET: "s3cret" } },
    );
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body!);
    expect(body.ok).toBe(true);
    expect(body.emailed).toBe(false);
  });

  it("skips non-pending status", async () => {
    const res = mockRes();
    await handler(
      { method: "POST", headers: {}, body: { record: { id: "r-approved", status: "approved" } } },
      res,
      { env: {} },
    );
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body!).skipped).toBe("not_pending");
  });

  it("succeeds without mail when ADMIN_EMAIL or RESEND_API_KEY missing", async () => {
    const res = mockRes();
    await handler(
      {
        method: "POST",
        headers: {},
        body: {
          record: {
            id: "r-no-mail",
            status: "pending",
            client_email: "client@example.com",
            invitation_id: "inv-1",
            changed_keys: ["groom_name"],
          },
        },
      },
      res,
      { env: { SITE_URL: "https://app.test" } },
    );
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body!);
    expect(body.ok).toBe(true);
    expect(body.emailed).toBe(false);
  });

  it("sends via Resend when configured", async () => {
    const res = mockRes();
    const fetchFn = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => "",
      json: async () => ({ id: "email_1" }),
    }));

    await handler(
      {
        method: "POST",
        headers: {},
        body: {
          type: "INSERT",
          table: "change_requests",
          record: {
            id: "r-mail-1",
            status: "pending",
            client_email: "client@x.com",
            invitation_id: "inv-99",
            changed_keys: ["bride_name", "event_date"],
          },
        },
      },
      res,
      {
        env: {
          ADMIN_EMAIL: "admin@test.com",
          RESEND_API_KEY: "re_test",
          SITE_URL: "https://app.test",
          FROM_EMAIL: "noreply@test.com",
        },
        fetch: fetchFn,
      },
    );

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body!);
    expect(body.ok).toBe(true);
    expect(body.emailed).toBe(true);
    expect(body.to).toBe("admin@test.com");

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const call = fetchFn.mock.calls[0] as unknown as [string, { method: string; headers: Record<string, string>; body: string }];
    const [url, opts] = call;
    expect(url).toBe("https://api.resend.com/emails");
    expect(opts.method).toBe("POST");
    expect(opts.headers.Authorization).toBe("Bearer re_test");
    const payload = JSON.parse(opts.body);
    expect(payload.to).toEqual(["admin@test.com"]);
    expect(payload.from).toBe("noreply@test.com");
    expect(payload.subject).toMatch(/client@x.com/i);
    expect(payload.text).toContain("https://app.test/reviews");
    expect(payload.text).toContain("bride_name");
  });

  it("still returns 200 when Resend fails", async () => {
    const res = mockRes();
    const fetchFn = vi.fn(async () => ({
      ok: false,
      status: 422,
      text: async () => "invalid from",
    }));

    await handler(
      {
        method: "POST",
        headers: {},
        body: { record: { id: "r-mail-fail", status: "pending", client_email: "c@x.com" } },
      },
      res,
      {
        env: { ADMIN_EMAIL: "admin@test.com", RESEND_API_KEY: "re_test" },
        fetch: fetchFn,
      },
    );

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body!);
    expect(body.ok).toBe(true);
    expect(body.emailed).toBe(false);
    expect(body.providerStatus).toBe(422);
  });

  it("dedupes the same request id", async () => {
    const env = {};
    const res1 = mockRes();
    await handler(
      { method: "POST", headers: {}, body: { record: { id: "r-dedupe", status: "pending" } } },
      res1,
      { env },
    );
    expect(JSON.parse(res1.body!).skipped).toBeUndefined();

    const res2 = mockRes();
    await handler(
      { method: "POST", headers: {}, body: { record: { id: "r-dedupe", status: "pending" } } },
      res2,
      { env },
    );
    expect(JSON.parse(res2.body!).skipped).toBe("already_seen");
  });
});
