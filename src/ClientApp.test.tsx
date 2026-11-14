// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { act, flush } from "./test/renderHook";

/* Track B (B4): the three landing cases of the client area. The gate and the data call are replaced.
   createMemoryRouter is required so ClientEditor's useBlocker (leave guard) has a data router. */
vi.mock("./hooks/useAuth", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    session: { email: "client@x.com", name: "Client", accessToken: "t", emailVerified: true },
    signInGoogle: async () => ({ email: "client@x.com", name: "Client", accessToken: "t", emailVerified: true }),
    signInEmail: async () => ({ email: "client@x.com", name: "Client", accessToken: "t", emailVerified: true }),
    logout: async () => {},
  }),
}));
vi.mock("./components/RoleGate", () => ({ RoleGate: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("./lib/config", () => ({ ADMIN_EMAIL: "help@x.com", SUPABASE_CONFIGURED: true, SUPABASE_URL: "https://x.supabase.co", SUPABASE_KEY: "pk" }));
vi.mock("./lib/supabase", () => ({ SUPABASE_CONFIGURED: false, db: () => ({}) }));
vi.mock("./lib/api", () => ({
  fetchMyInvitations: vi.fn(),
  fetchClientTemplateHtml: vi.fn().mockResolvedValue(""),
  submitChangeRequest: vi.fn(),
  withdrawChangeRequest: vi.fn(),
  acknowledgeRejection: vi.fn(),
  fetchAccount: vi.fn().mockResolvedValue({ user: { name: "Client", email: "client@x.com", role: "Member" }, plan: { name: "Pro", status: "active", trialDaysLeft: 0 } }),
  fetchNotifications: vi.fn().mockResolvedValue([]),
  markNotificationRead: vi.fn(),
}));
import { fetchMyInvitations } from "./lib/api";
import ClientApp from "./ClientApp";

const get = vi.mocked(fetchMyInvitations);
const inv = (id: string, g = "Ravi", b = "Sita") =>
  ({
    id,
    groomName: g,
    brideName: b,
    eventDate: null,
    templateId: "1",
    published: true,
    details: {},
    updatedAt: "2026-01-01T00:00:00Z",
    views: 42,
    request: null,
  }) as never;

async function open(at: string) {
  const host = document.createElement("div");
  const router = createMemoryRouter(
    [{ path: "/my/*", element: <ClientApp /> }, { path: "*", element: <div>outside /my</div> }],
    { initialEntries: [at] },
  );
  await act(async () => {
    createRoot(host).render(<RouterProvider router={router} />);
  });
  await flush();
  await flush();
  return host;
}

beforeEach(() => get.mockReset());

const links = (h: HTMLElement) => [...h.querySelectorAll("a")].map((a) => [a.textContent?.trim(), a.getAttribute("href")] as const);

describe("ClientApp dashboard", () => {
  it("none linked: shows \"No invitations to show\" and offers the admin address", async () => {
    get.mockResolvedValue([]);
    const h = await open("/my");
    expect(h.textContent).toContain("No invitations to show");
    expect(h.querySelector('a[href^="mailto:"]')?.getAttribute("href")).toBe("mailto:help@x.com");
  });

  it("one linked: the dashboard shows its details, including the views", async () => {
    get.mockResolvedValue([inv("ab")]);
    const h = await open("/my");
    expect(h.querySelector(".cd h1")?.textContent).toBe("Ravi & Sita");
    expect(h.querySelector(".cd-stats")?.textContent).toContain("Total views");
    expect(h.querySelector(".cd-stats")?.textContent).toContain("42");
    expect(links(h.querySelector(".cd") as HTMLElement).some(([t, href]) => t === "Edit" && href === "/my/ab")).toBe(true);
  });

  it("the sidebar has only Dashboard and Edit, and \"View invitation\" replaces \"View live site\"", async () => {
    get.mockResolvedValue([inv("ab")]);
    const h = await open("/my");
    const nav = [...h.querySelectorAll(".d-sidebar nav a.nav-item")].map((a) => [a.textContent?.trim(), a.getAttribute("href")]);
    expect(nav).toEqual([["Dashboard", "/my"], ["Edit", "/my/ab"]]);
    const foot = h.querySelector<HTMLAnchorElement>(".d-sidebar .live-site")!;
    expect(foot.textContent).toContain("View invitation");
    expect(foot.textContent).not.toContain("live site");
    expect(foot.getAttribute("href")).toBe(`${window.location.origin}/ab`);
    expect(foot.getAttribute("target")).toBe("_blank");
  });

  it("the top navigation has the notifications bell and the profile button, and no Create button", async () => {
    get.mockResolvedValue([inv("ab")]);
    const h = await open("/my");
    const top = h.querySelector(".top-navbar")!;
    expect(top.querySelector('button[aria-label^="Notifications"]')).toBeTruthy();
    expect(top.querySelector('button[aria-label="Profile"]')).toBeTruthy();
    expect(top.querySelector(".nav-cta")).toBeNull();
  });

  it("several linked: a picker lists them and the Edit link follows the selection", async () => {
    get.mockResolvedValue([inv("i1"), inv("i2", "Amar", "Priya")]);
    const h = await open("/my");
    const options = [...h.querySelectorAll(".cd-pick option")].map((o) => [o.textContent, (o as HTMLOptionElement).value]);
    expect(options).toEqual([["Ravi & Sita", "i1"], ["Amar & Priya", "i2"]]);
    const select = h.querySelector<HTMLSelectElement>(".cd-pick select")!;
    await act(async () => {
      select.value = "i2";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(h.querySelector(".cd h1")?.textContent).toBe("Amar & Priya");
    expect(links(h.querySelector(".cd") as HTMLElement).some(([t, href]) => t === "Edit" && href === "/my/i2")).toBe(true);
  });

  it("an invitation that is not in the person's list is not shown", async () => {
    get.mockResolvedValue([inv("i1")]);
    const h = await open("/my/other");
    expect(h.textContent).toContain("isn’t linked to your account");
    expect(h.querySelector("#create-form")).toBeNull();
  });

  it("a failed load shows a message and no details; unknown paths go to /my", async () => {
    get.mockRejectedValue(new Error("x"));
    const failed = await open("/my");
    expect(failed.querySelector("[role=alert]")).not.toBeNull();
    expect([...failed.querySelectorAll("button")].some((b) => b.textContent === "Try again")).toBe(true);
    expect(failed.querySelector(".cd-stats")).toBeNull();
    get.mockResolvedValue([]);
    expect((await open("/my/a/b/c")).textContent).toContain("No invitations to show");
  });
});
