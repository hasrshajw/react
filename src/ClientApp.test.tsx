// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { act, flush } from "./test/renderHook";

/* Track B (B4): the three landing cases of the client area. The gate and the data call are replaced. */
vi.mock("./hooks/useAuth", () => ({ AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("./components/RoleGate", () => ({ RoleGate: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("./lib/config", () => ({ ADMIN_EMAIL: "help@x.com" }));
vi.mock("./lib/api", () => ({ fetchMyInvitations: vi.fn() }));
import { fetchMyInvitations } from "./lib/api";
import ClientApp from "./ClientApp";

const get = vi.mocked(fetchMyInvitations);
const inv = (id: string, g = "Ravi", b = "Sita") => ({ id, groomName: g, brideName: b }) as never;
async function open(at: string) {
  const host = document.createElement("div");
  await act(async () => { createRoot(host).render(<MemoryRouter initialEntries={[at]}><ClientApp /></MemoryRouter>); });
  await flush(); await flush();
  return host;
}
beforeEach(() => get.mockReset());

describe("ClientApp landing", () => {
  it("none linked: says so and offers the admin address", async () => {
    get.mockResolvedValue([]);
    const h = await open("/my");
    expect(h.textContent).toContain("No invitations are linked to this account.");
    expect(h.querySelector("a")?.getAttribute("href")).toBe("mailto:help@x.com");
  });
  it("one linked: opens it directly", async () => {
    get.mockResolvedValue([inv("a b")]);
    const h = await open("/my");
    expect(h.textContent).toContain("Ravi & Sita");
    expect(h.textContent).toContain("Editing will be available here soon");
  });
  it("several linked: lists them, each linking to its own page", async () => {
    get.mockResolvedValue([inv("i1"), inv("i2", "Amar", "Priya")]);
    const h = await open("/my");
    expect([...h.querySelectorAll("a")].map((a) => [a.textContent, a.getAttribute("href")])).toEqual([["Ravi & Sita", "/my/i1"], ["Amar & Priya", "/my/i2"]]);
  });
  it("an invitation that is not in the person's list is not shown", async () => {
    get.mockResolvedValue([inv("i1")]);
    const h = await open("/my/other");
    expect(h.textContent).toContain("isn’t linked to your account");
    expect(h.textContent).not.toContain("Ravi");
  });
  it("a failed load shows a message and no list; unknown paths go to /my", async () => {
    get.mockRejectedValue(new Error("x"));
    expect((await open("/my")).querySelector("[role=alert]")).not.toBeNull();
    get.mockResolvedValue([]);
    expect((await open("/my/a/b/c")).textContent).toContain("No invitations are linked");
  });
});
