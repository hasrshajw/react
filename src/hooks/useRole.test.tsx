// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, flush, renderHook } from "../test/renderHook";

/* Track B (B4): useRole. lib/api, lib/userData and useAuth are replaced, so the tests check when the database is asked, what is
   remembered, and that a failed request never turns into an "admin" or "client" guess. */
const s = vi.hoisted(() => ({ session: null as null | { email: string }, reset: null as null | (() => void) }));
vi.mock("./useAuth", () => ({ useAuth: () => ({ session: s.session }) }));
vi.mock("../lib/api", () => ({ fetchIsAdmin: vi.fn() }));
vi.mock("../lib/userData", () => ({ onUserDataReset: (fn: () => void) => { s.reset = fn; return () => {}; } }));

import { fetchIsAdmin } from "../lib/api";
import { useRole } from "./useRole";

const ask = vi.mocked(fetchIsAdmin);
const as = (email: string | null) => { s.session = email ? { email } : null; };

beforeEach(() => { ask.mockReset(); as(null); act(() => { s.reset?.(); }); });

describe("useRole", () => {
  it("is `none` with no request when nobody is signed in", async () => {
    const h = renderHook(() => useRole()); await flush();
    expect(h.result.current).toMatchObject({ role: "none", loading: false, error: false });
    expect(ask).not.toHaveBeenCalled();
  });

  it("is loading with a null role until the database answers, then `admin`", async () => {
    let done!: (v: boolean) => void; ask.mockReturnValue(new Promise<boolean>((r) => { done = r; })); as("a@x.com");
    const h = renderHook(() => useRole());
    expect(h.result.current).toMatchObject({ role: null, loading: true });
    done(true); await flush();
    expect(h.result.current).toMatchObject({ role: "admin", loading: false, error: false });
  });

  it("calls anybody who is signed in but not an admin a `client`", async () => {
    ask.mockResolvedValue(false); as("c@x.com");
    const h = renderHook(() => useRole()); await flush();
    expect(h.result.current.role).toBe("client");
  });

  it("asks once per person and remembers the answer for the next mount", async () => {
    ask.mockResolvedValue(true); as("a@x.com");
    const first = renderHook(() => useRole()); await flush(); first.unmount();
    const second = renderHook(() => useRole());
    expect(second.result.current.role).toBe("admin");
    await flush();
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it("compares the email without case or spaces", async () => {
    ask.mockResolvedValue(true); as("A@X.com ");
    renderHook(() => useRole()); await flush();
    as("a@x.com");
    const again = renderHook(() => useRole());
    expect(again.result.current.role).toBe("admin");
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it("asks again for a different person and never shows the first person's role", async () => {
    ask.mockResolvedValueOnce(true).mockResolvedValueOnce(false); as("a@x.com");
    const h = renderHook(() => useRole()); await flush();
    expect(h.result.current.role).toBe("admin");
    as("b@x.com"); h.rerender();
    expect(h.result.current).toMatchObject({ role: null, loading: true });
    await flush();
    expect(h.result.current.role).toBe("client");
  });

  it("goes back to `none` when the person signs out", async () => {
    ask.mockResolvedValue(true); as("a@x.com");
    const h = renderHook(() => useRole()); await flush();
    as(null); h.rerender();
    expect(h.result.current.role).toBe("none");
  });

  it("forgets the answer when the user data is reset (sign-out)", async () => {
    ask.mockResolvedValue(true); as("a@x.com");
    renderHook(() => useRole()); await flush();
    act(() => { s.reset?.(); });
    const h = renderHook(() => useRole()); await flush();
    expect(ask).toHaveBeenCalledTimes(2);
    expect(h.result.current.role).toBe("admin");
  });

  it("reports an error with a null role (no guess) and `retry` asks again", async () => {
    ask.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(true); as("a@x.com");
    const h = renderHook(() => useRole()); await flush();
    expect(h.result.current).toMatchObject({ role: null, loading: false, error: true });
    act(() => { h.result.current.retry(); }); await flush();
    expect(h.result.current).toMatchObject({ role: "admin", error: false });
    expect(ask).toHaveBeenCalledTimes(2);
  });

  it("does not remember or show an answer that arrives after the component is gone", async () => {
    let done!: (v: boolean) => void; ask.mockReturnValueOnce(new Promise<boolean>((r) => { done = r; })); as("a@x.com");
    const h = renderHook(() => useRole()); h.unmount();
    done(true); await flush();
    ask.mockResolvedValueOnce(false);
    const again = renderHook(() => useRole()); await flush();
    expect(again.result.current.role).toBe("client");
    expect(ask).toHaveBeenCalledTimes(2);
  });
});
