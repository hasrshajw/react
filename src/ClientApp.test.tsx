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
vi.mock("./lib/api", () => ({
  fetchMyInvitations: vi.fn(),
  fetchClientTemplateHtml: vi.fn().mockResolvedValue(""),
  submitChangeRequest: vi.fn(),
  withdrawChangeRequest: vi.fn(),
  acknowledgeRejection: vi.fn(),
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

describe("ClientApp landing", () => {
  it("none linked: shows \"No invitations to show\" and offers the admin address", async () => {
    get.mockResolvedValue([]);
    const h = await open("/my");
    expect(h.textContent).toContain("No invitations to show");
    expect(h.querySelector("a")?.getAttribute("href")).toBe("mailto:help@x.com");
  });

  it("one linked: opens it directly", async () => {
    get.mockResolvedValue([inv("ab")]);
    const h = await open("/my");
    expect(h.textContent).toContain("Ravi & Sita");
    expect(h.textContent).toMatch(/Submit for review|Loading|Ravi/);
  });

  it("several linked: lists them, each linking to its own page", async () => {
    get.mockResolvedValue([inv("i1"), inv("i2", "Amar", "Priya")]);
    const h = await open("/my");
    const links = [...h.querySelectorAll("a")].map((a) => [a.textContent, a.getAttribute("href")]);
    expect(links.some(([text, href]) => text?.includes("Ravi & Sita") && href === "/my/i1")).toBe(true);
    expect(links.some(([text, href]) => text?.includes("Amar & Priya") && href === "/my/i2")).toBe(true);
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
    expect((await open("/my/a/b/c")).textContent).toContain("No invitations to show");
  });
});
