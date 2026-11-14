// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { act, flush } from "./test/renderHook";

vi.mock("./hooks/useAuth", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({ session: { email: "client@x.com", name: "Client", accessToken: "t", emailVerified: true }, logout: async () => {} }),
}));
vi.mock("./components/RoleGate", () => ({ RoleGate: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("./lib/config", () => ({ ADMIN_EMAIL: "help@x.com", SUPABASE_CONFIGURED: true, SUPABASE_URL: "https://x.supabase.co", SUPABASE_KEY: "pk" }));
vi.mock("./lib/supabase", () => ({ SUPABASE_CONFIGURED: false, db: () => ({}) }));
vi.mock("./lib/api", () => ({
  fetchMyInvitations: vi.fn(),
  fetchClientTemplateHtml: vi.fn().mockResolvedValue("<html><body>{{groomEn}}</body></html>"),
  submitChangeRequest: vi.fn(),
  withdrawChangeRequest: vi.fn(),
  acknowledgeRejection: vi.fn(),
  fetchAccount: vi.fn().mockResolvedValue({ user: { name: "Client", email: "client@x.com", role: "Member" }, plan: { name: "Pro", status: "active", trialDaysLeft: 0 } }),
  fetchNotifications: vi.fn().mockResolvedValue([]),
  markNotificationRead: vi.fn(),
}));
vi.mock("./lib/transliterate", () => ({ transliterate: async (v: string) => `TE:${v}` }));
import { fetchMyInvitations } from "./lib/api";
import ClientApp from "./ClientApp";

const invitation = {
  id: "ab", groomName: "Ravi", brideName: "Sita", eventDate: null, templateId: "1", published: true,
  details: { groomEn: "Ravi", brideEn: "Sita" }, updatedAt: "2026-01-01T00:00:00Z", request: null,
} as never;

async function open() {
  vi.mocked(fetchMyInvitations).mockResolvedValue([invitation]);
  const host = document.createElement("div");
  document.body.append(host);
  const router = createMemoryRouter([{ path: "/my/*", element: <ClientApp /> }], { initialEntries: ["/my/ab"] });
  await act(async () => { createRoot(host).render(<RouterProvider router={router} />); });
  await flush(); await flush(); await flush();
  return host;
}

const type = (el: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => { setter.call(el, value); el.dispatchEvent(new Event("input", { bubbles: true })); });
};

beforeEach(() => { document.body.innerHTML = ""; });

describe("client editor layout", () => {
  it("has the admin layout: section nav and form on the left, live preview panel on the right", async () => {
    const h = await open();
    expect(h.querySelector(".client-ws .main-content form#create-form")).toBeTruthy();
    const labels = [...h.querySelectorAll(".sec-nav .chip-nav")].map((b) => b.textContent?.trim());
    expect(labels).toContain("Groom");
    expect(labels).not.toContain("Template");
    expect(labels).not.toContain("Client access");
    const panel = h.querySelector(".client-ws .preview-slot .create-live-preview-panel");
    expect(panel).toBeTruthy();
    expect(panel?.querySelector("iframe")).toBeTruthy();
    expect(h.querySelector(".mbar")?.textContent).toContain("Preview");
  });

  it("uses the admin shell frame: a top strip with the Schedy mark, then the rounded app area", async () => {
    const h = await open();
    const strip = h.querySelector(".client-ws > header.client-promo");
    expect(strip?.querySelector(".promo-mark img")).toBeTruthy();
    expect(strip?.textContent).toContain("Schedy");
    expect(strip?.textContent).not.toContain("Log out");
    expect(h.querySelector(".client-ws-body > .client-app > .main-content")).toBeTruthy();
  });

  it("has the admin sidebar and top navigation: Dashboard and Edit links, notifications and profile at the top", async () => {
    const h = await open();
    const nav = [...h.querySelectorAll(".d-sidebar nav a.nav-item")].map((a) => a.textContent?.trim());
    expect(nav).toEqual(["Dashboard", "Edit"]);
    expect(h.querySelector(".d-sidebar nav a.nav-item.active")?.textContent).toContain("Edit");
    expect(h.querySelector(".d-sidebar .live-site")?.textContent).toContain("View invitation");
    const top = h.querySelector(".top-navbar")!;
    expect(top.querySelector('button[aria-label^="Notifications"]')).toBeTruthy();
    expect(top.querySelector('button[aria-label="Profile"]')).toBeTruthy();
  });

  it("while a request is in review: shows the Awaiting admin review card and locks the whole form", async () => {
    const pendingInv = { ...(invitation as object), request: { id: "r1", status: "pending", adminNote: "", createdAt: "2026-02-01T10:00:00Z", acknowledgedAt: null, proposedDetails: null } } as never;
    vi.mocked(fetchMyInvitations).mockResolvedValue([pendingInv]);
    const host = document.createElement("div");
    document.body.append(host);
    const router = createMemoryRouter([{ path: "/my/*", element: <ClientApp /> }], { initialEntries: ["/my/ab"] });
    await act(async () => { createRoot(host).render(<RouterProvider router={router} />); });
    await flush(); await flush(); await flush();
    const card = host.querySelector(".rv-card");
    expect(card?.textContent).toContain("Awaiting admin review");
    expect(card?.textContent).toContain("Editing is locked");
    expect([...card!.querySelectorAll("button")].some((b) => b.textContent?.includes("Withdraw request"))).toBe(true);
    expect(host.querySelector<HTMLFieldSetElement>("#create-form fieldset")?.disabled).toBe(true);
    const submit = [...host.querySelectorAll<HTMLButtonElement>("button[type=submit]")];
    expect(submit.length).toBeGreaterThan(0);
    expect(submit.every((b) => b.disabled)).toBe(true);
  });

  it("typing English fills the Telugu field, like the admin form", async () => {
    const h = await open();
    const en = h.querySelector<HTMLInputElement>("#f-groomEn")!;
    type(en, "Ravi Kumar");
    await act(async () => { await new Promise((r) => setTimeout(r, 700)); });
    expect(h.querySelector<HTMLInputElement>("#f-groomTe")!.value).toBe("TE:Ravi Kumar");
  });
});
