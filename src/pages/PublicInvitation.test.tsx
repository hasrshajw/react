// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { act, flush } from "../test/renderHook";

/* The page a guest sees (task H-4 and the preview title). The two lib modules are replaced: `fetch` is the only outside
   world, and `compile` is made visible so a test can see what it was given. */
const fetchPublicInvitation = vi.fn();
const recordInvitationView = vi.fn(async (_slug: string) => true);
vi.mock("../lib/publicInvitation", () => ({
  fetchPublicInvitation: (slug: string) => fetchPublicInvitation(slug),
  recordInvitationView: (slug: string) => recordInvitationView(slug),
}));
vi.mock("../lib/compileInvitation", () => ({
  compile: (html: string, d: unknown) => `${html}|${JSON.stringify(d)}`,
}));

import PublicInvitation from "./PublicInvitation";

const row = (over: Record<string, unknown> = {}) => ({ groom_name: "Ravi", bride_name: "Sita", details: {}, ...over });
const found = (over: Record<string, unknown> = {}, html = "<p>hi</p>") => ({ invitation: row(over), html });
const LOADING = "Loading invitation…", MISSING = "This invitation isn’t available", FAILED = "Couldn’t load the invitation";

let host: HTMLDivElement, root: Root;
function show(el: React.ReactElement, path = "/abc") {
  act(() => {
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path="/:slug" element={el} /><Route path="*" element={el} /></Routes>
      </MemoryRouter>,
    );
  });
}
const text = () => host.textContent || "";
const iframe = () => host.querySelector("iframe");
const deferred = <T,>() => { let resolve!: (v: T) => void, reject!: (e: unknown) => void; const promise = new Promise<T>((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };

beforeEach(() => {
  fetchPublicInvitation.mockReset(); recordInvitationView.mockClear();
  document.title = "Schedy";
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); });

describe("PublicInvitation", () => {
  it("shows a loading message first, then the compiled invitation in a sandboxed frame", async () => {
    const d = deferred<ReturnType<typeof found>>();
    fetchPublicInvitation.mockReturnValue(d.promise);
    show(<PublicInvitation />);
    expect(text()).toContain(LOADING);
    expect(iframe()).toBeNull();
    d.resolve(found({ details: { a: 1 } }));
    await flush();
    const f = iframe()!;
    expect(f).not.toBeNull();
    expect(f.getAttribute("srcdoc")).toBe('<p>hi</p>|{"a":1}');
    expect(f.getAttribute("sandbox")).toBe("allow-scripts allow-popups allow-popups-to-escape-sandbox");
    expect(f.getAttribute("sandbox")).not.toContain("allow-same-origin"); // the owner's html must never share the site's origin
    expect(text()).not.toContain(LOADING);
  });

  it("takes the slug from the route, and a slug prop (the short-link route) wins over it", async () => {
    fetchPublicInvitation.mockResolvedValue(null);
    show(<PublicInvitation />, "/from-route");
    await flush();
    expect(fetchPublicInvitation).toHaveBeenLastCalledWith("from-route");
    show(<PublicInvitation slug="from-prop" />, "/from-route");
    await flush();
    expect(fetchPublicInvitation).toHaveBeenLastCalledWith("from-prop");
  });

  it("counts one view, with the slug, only after the invitation is ready", async () => {
    const d = deferred<ReturnType<typeof found>>();
    fetchPublicInvitation.mockReturnValue(d.promise);
    show(<PublicInvitation />, "/my-link");
    await flush();
    expect(recordInvitationView).not.toHaveBeenCalled();
    d.resolve(found());
    await flush();
    expect(recordInvitationView).toHaveBeenCalledTimes(1);
    expect(recordInvitationView).toHaveBeenCalledWith("my-link");
  });

  it("says the invitation is not available, and counts nothing, for a missing or unpublished link", async () => {
    fetchPublicInvitation.mockResolvedValue(null);
    show(<PublicInvitation />);
    await flush();
    expect(text()).toContain(MISSING);
    expect(iframe()).toBeNull();
    expect(recordInvitationView).not.toHaveBeenCalled();
  });

  it("treats an invitation with no html the same as a missing one", async () => {
    fetchPublicInvitation.mockResolvedValue(found({}, ""));
    show(<PublicInvitation />);
    await flush();
    expect(text()).toContain(MISSING);
    expect(iframe()).toBeNull();
    expect(recordInvitationView).not.toHaveBeenCalled();
  });

  it("shows a connection message, and counts nothing, when the request fails", async () => {
    fetchPublicInvitation.mockRejectedValue(new Error("Request failed (503)"));
    show(<PublicInvitation />);
    await flush();
    expect(text()).toContain(FAILED);
    expect(text()).not.toContain("503"); // no technical detail for a guest
    expect(iframe()).toBeNull();
    expect(recordInvitationView).not.toHaveBeenCalled();
  });

  it("passes empty details to compile when the invitation has none", async () => {
    fetchPublicInvitation.mockResolvedValue(found({ details: null }));
    show(<PublicInvitation />);
    await flush();
    expect(iframe()!.getAttribute("srcdoc")).toBe("<p>hi</p>|{}");
  });

  it("does not change the invitation's own details object when compiling", async () => {
    const details = { a: 1 };
    fetchPublicInvitation.mockResolvedValue(found({ details }));
    show(<PublicInvitation />);
    await flush();
    expect(details).toEqual({ a: 1 });
  });

  describe("browser tab title", () => {
    it("uses the preview title the owner typed, trimmed, over the couple's names", async () => {
      fetchPublicInvitation.mockResolvedValue(found({ details: { seoTitle: "  Join our wedding!  " } }));
      show(<PublicInvitation />);
      await flush();
      expect(document.title).toBe("Join our wedding!");
    });

    it("falls back to the couple's names, and ignores a blank or non-text custom title", async () => {
      for (const seoTitle of ["   ", 42, undefined]) {
        document.title = "Schedy";
        fetchPublicInvitation.mockResolvedValue(found({ details: { seoTitle } }));
        show(<PublicInvitation slug={`s-${String(seoTitle)}`} />);
        await flush();
        expect(document.title).toBe("Ravi & Sita | Wedding invitation");
      }
    });

    it("leaves the title alone when there is no custom title and no names", async () => {
      fetchPublicInvitation.mockResolvedValue(found({ groom_name: "", bride_name: null }));
      show(<PublicInvitation />);
      await flush();
      expect(iframe()).not.toBeNull();
      expect(document.title).toBe("Schedy");
    });

    it("does not touch the title for a missing invitation", async () => {
      fetchPublicInvitation.mockResolvedValue(null);
      show(<PublicInvitation />);
      await flush();
      expect(document.title).toBe("Schedy");
    });
  });

  describe("changing or leaving the page", () => {
    it("loads again, with the loading message, when the slug changes", async () => {
      fetchPublicInvitation.mockResolvedValueOnce(found({}, "<p>one</p>"));
      show(<PublicInvitation slug="one" />);
      await flush();
      expect(iframe()!.getAttribute("srcdoc")).toContain("one");
      const d = deferred<ReturnType<typeof found>>();
      fetchPublicInvitation.mockReturnValueOnce(d.promise);
      show(<PublicInvitation slug="two" />);
      await flush();
      expect(text()).toContain(LOADING);
      expect(iframe()).toBeNull();
      d.resolve(found({}, "<p>two</p>"));
      await flush();
      expect(iframe()!.getAttribute("srcdoc")).toContain("two");
      expect(recordInvitationView.mock.calls.map((c) => c[0])).toEqual(["one", "two"]);
    });

    it("ignores a slow answer for an old slug that arrives after the new one", async () => {
      const slow = deferred<ReturnType<typeof found>>();
      fetchPublicInvitation.mockReturnValueOnce(slow.promise);
      show(<PublicInvitation slug="old" />);
      await flush();
      fetchPublicInvitation.mockResolvedValueOnce(found({}, "<p>new</p>"));
      show(<PublicInvitation slug="new" />);
      await flush();
      slow.resolve(found({}, "<p>old</p>"));
      await flush();
      expect(iframe()!.getAttribute("srcdoc")).toContain("new");
      expect(iframe()!.getAttribute("srcdoc")).not.toContain("old");
      expect(recordInvitationView.mock.calls.map((c) => c[0])).toEqual(["new"]);
    });

    it("counts nothing and shows nothing if the guest leaves before the answer arrives", async () => {
      const d = deferred<ReturnType<typeof found>>();
      fetchPublicInvitation.mockReturnValue(d.promise);
      show(<PublicInvitation />);
      await flush();
      act(() => root.render(<p>elsewhere</p>));
      d.resolve(found());
      await flush();
      expect(recordInvitationView).not.toHaveBeenCalled();
      expect(text()).toBe("elsewhere");
    });

    it("ignores a late failure from an old slug", async () => {
      const slow = deferred<ReturnType<typeof found>>();
      fetchPublicInvitation.mockReturnValueOnce(slow.promise);
      show(<PublicInvitation slug="old" />);
      await flush();
      fetchPublicInvitation.mockResolvedValueOnce(found({}, "<p>new</p>"));
      show(<PublicInvitation slug="new" />);
      await flush();
      slow.reject(new Error("late"));
      await flush();
      expect(iframe()).not.toBeNull();
      expect(text()).not.toContain(FAILED);
    });
  });
});
