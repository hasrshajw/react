// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { act, flush } from "../test/renderHook";

/* Track B (B4): RoleGate. useAuth and useRole are replaced, so the tests check only where each kind of person is sent. */
const s = vi.hoisted(() => ({ session: null as unknown, role: { role: null, loading: true, error: false, retry: () => {} } as { role: string | null; loading: boolean; error: boolean; retry: () => void } }));
vi.mock("../hooks/useAuth", () => ({ useAuth: () => ({ session: s.session }) }));
vi.mock("../hooks/useRole", () => ({ useRole: () => s.role }));
import { RoleGate } from "./RoleGate";

const Where = () => { const l = useLocation(); return <div id="where">{l.pathname}{l.search}|{JSON.stringify(l.state)}</div>; };
async function show(allow: "admin" | "client", at: string) {
  const host = document.createElement("div");
  await act(async () => {
    createRoot(host).render(
      <MemoryRouter initialEntries={[at]}>
        <Routes>
          <Route path="/login" element={<Where />} />
          <Route path="/my" element={<Where />} />
          <Route path="/dashboard" element={<Where />} />
          <Route path="*" element={<RoleGate allow={allow}><p id="ok">inside</p></RoleGate>} />
        </Routes>
      </MemoryRouter>,
    );
  });
  await flush();
  return host;
}
const set = (session: unknown, role: string | null, extra: Partial<typeof s.role> = {}) => { s.session = session; s.role = { role, loading: role === null, error: false, retry: () => {}, ...extra }; };
const text = (h: HTMLElement) => h.textContent ?? "";

beforeEach(() => set(null, null));

describe("RoleGate", () => {
  it("sends a signed-out person to /login and remembers the page they asked for", async () => {
    set(null, "none");
    const h = await show("client", "/my/abc?x=1");
    expect(text(h)).toContain('/login|{"from":"/my/abc?x=1"}');
  });
  it("shows nothing but a waiting message while the role is unknown", async () => {
    set({ email: "a@x.com" }, null);
    const h = await show("admin", "/dashboard/x");
    expect(text(h)).toBe("Loading…");
  });
  it("shows a retry button, not a guess, when the lookup failed; the button calls retry", async () => {
    const retry = vi.fn(); set({ email: "a@x.com" }, null, { error: true, loading: false, retry });
    const h = await show("admin", "/dashboard/x");
    expect(h.querySelector("[role=alert]")).not.toBeNull();
    act(() => { h.querySelector("button")!.click(); });
    expect(retry).toHaveBeenCalledTimes(1);
    expect(h.querySelector("#ok")).toBeNull();
  });
  it("lets an administrator into the admin app and a client into the client app", async () => {
    set({ email: "a@x.com" }, "admin");
    expect((await show("admin", "/dashboard/x")).querySelector("#ok")).not.toBeNull();
    set({ email: "c@x.com" }, "client");
    expect((await show("client", "/foo")).querySelector("#ok")).not.toBeNull();
  });
  it("sends a client who asks for an admin page to /my, and an administrator who asks for the client area to /dashboard", async () => {
    set({ email: "c@x.com" }, "client");
    expect(text(await show("admin", "/dashboard/x"))).toContain("/my|");
    set({ email: "a@x.com" }, "admin");
    expect(text(await show("client", "/foo"))).toContain("/dashboard|");
  });
});
