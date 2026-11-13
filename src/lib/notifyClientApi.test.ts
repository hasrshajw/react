import { describe, expect, it, vi, beforeEach } from "vitest";
import handler from "../../api/notify-client.js";

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

describe("api/notify-client", () => {
  beforeEach(() => {
    /* process-local seen set is shared; tests use unique request ids */
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
      { method: "POST", headers: {}, body: { record: { id: "c1", status: "approved", client_email: "c@x.com" } } },
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
        body: { record: { id: "c-secret-ok", status: "approved", client_email: "c@x.com" } },
      },
      res,
      { env: { WEBHOOK_SECRET: "s3cret" } },
    );
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body!);
    expect(body.ok).toBe(true);
  });

  it("skips non-decision status", async () => {
    const res = mockRes();
    await handler(
      { method: "POST", headers: {}, body: { record: { id: "c-pending", status: "pending", client_email: "c@x.com" } } },
      res,
      { env: {} },
    );
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body!).skipped).toBe("not_decision");
  });

  it("skips when old_record status is already the same", async () => {
    const res = mockRes();
    await handler(
      {
        method: "POST",
        headers: {},
        body: {
          record: { id: "c-same", status: "approved", client_email: "c@x.com" },
          old_record: { id: "c-same", status: "approved", client_email: "c@x.com" },
        },
      },
      res,
      { env: {} },
    );
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body!).skipped).toBe("status_unchanged");
  });

  it("skips when not transitioning from pending", async () => {
    const res = mockRes();
    await handler(
      {
        method: "POST",
        headers: {},
        body: {
          record: { id: "c-from-rej", status: "approved", client_email: "c@x.com" },
          old_record: { id: "c-from-rej", status: "rejected", client_email: "c@x.com" },
        },
      },
      res,
      { env: {} },
    );
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body!).skipped).toBe("not_from_pending");
  });

  it("succeeds without mail when RESEND_API_KEY missing", async () => {
    const res = mockRes();
    await handler(
      {
        method: "POST",
        headers: {},
        body: {
          record: {
            id: "c-no-mail",
            status: "approved",
            client_email: "client@example.com",
            invitation_id: "inv-1",
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
    expect(body.to).toBe("client@example.com");
  });

  it("sends via Resend when approved", async () => {
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
          type: "UPDATE",
          table: "change_requests",
          record: {
            id: "c-mail-1",
            status: "approved",
            client_email: "client@x.com",
            invitation_id: "inv-99",
            admin_note: "Looks good",
          },
          old_record: {
            id: "c-mail-1",
            status: "pending",
            client_email: "client@x.com",
            invitation_id: "inv-99",
          },
        },
      },
      res,
      {
        env: {
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
    expect(body.to).toBe("client@x.com");
    expect(body.status).toBe("approved");

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const call = fetchFn.mock.calls[0] as unknown as [string, { method: string; headers: Record<string, string>; body: string }];
    const [url, opts] = call;
    expect(url).toBe("https://api.resend.com/emails");
    expect(opts.method).toBe("POST");
    expect(opts.headers.Authorization).toBe("Bearer re_test");
    const payload = JSON.parse(opts.body);
    expect(payload.to).toEqual(["client@x.com"]);
    expect(payload.from).toBe("noreply@test.com");
    expect(payload.subject).toMatch(/approved/i);
    expect(payload.text).toContain("https://app.test/my/inv-99");
    expect(payload.text).toContain("Looks good");
    /* B8: email body must not leak provider keys or service-role material. */
    expect(payload.text).not.toMatch(/re_test|service_role|eyJ|sb_secret|Bearer/i);
  });

  it("sends via Resend when rejected with note", async () => {
    const res = mockRes();
    const fetchFn = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => "",
      json: async () => ({ id: "email_2" }),
    }));

    await handler(
      {
        method: "POST",
        headers: {},
        body: {
          record: {
            id: "c-mail-rej",
            status: "rejected",
            client_email: "client@x.com",
            invitation_id: "inv-2",
            admin_note: "Please fix the date",
          },
        },
      },
      res,
      {
        env: { RESEND_API_KEY: "re_test", SITE_URL: "https://app.test" },
        fetch: fetchFn,
      },
    );

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body!);
    expect(body.emailed).toBe(true);
    expect(body.status).toBe("rejected");
    const payload = JSON.parse((fetchFn.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(payload.subject).toMatch(/not approved/i);
    expect(payload.text).toContain("Please fix the date");
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
        body: { record: { id: "c-mail-fail", status: "approved", client_email: "c@x.com" } },
      },
      res,
      {
        env: { RESEND_API_KEY: "re_test" },
        fetch: fetchFn,
      },
    );

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body!);
    expect(body.ok).toBe(true);
    expect(body.emailed).toBe(false);
    expect(body.providerStatus).toBe(422);
  });

  it("dedupes the same request id and status", async () => {
    const env = {};
    const res1 = mockRes();
    await handler(
      { method: "POST", headers: {}, body: { record: { id: "c-dedupe", status: "approved", client_email: "c@x.com" } } },
      res1,
      { env },
    );
    expect(JSON.parse(res1.body!).skipped).toBeUndefined();

    const res2 = mockRes();
    await handler(
      { method: "POST", headers: {}, body: { record: { id: "c-dedupe", status: "approved", client_email: "c@x.com" } } },
      res2,
      { env },
    );
    expect(JSON.parse(res2.body!).skipped).toBe("already_seen");
  });
});
