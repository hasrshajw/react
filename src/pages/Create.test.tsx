// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { act, flush, advance } from "../test/renderHook";
import { LS_DRAFT } from "../lib/storageKeys";

/* The Create page (task M-14): loading an invitation, validation, saving, the unsaved-changes guard and the local draft.
   The data layer, the template list and the heavy form children are replaced. The form stub below calls the same
   callbacks the real form gets, so the page's own logic is what is under test. The two dialogs are the real ones. */
const fetchInvitation = vi.fn();
const saveInvitation = vi.fn();
vi.mock("../lib/api", () => {
  class ApiError extends Error {}
  return { ApiError, fetchInvitation: (id: string) => fetchInvitation(id), saveInvitation: (r: unknown) => saveInvitation(r) };
});
vi.mock("../hooks/useTemplates", () => ({
  useTemplates: () => ({ loading: false, error: null, categories: [], templates: [{ id: "t1", name: "Classic", html_code: "<p>x</p>" }] }),
}));
vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ session: null, signInGoogle: async () => ({}), signInEmail: async () => ({}), logout: async () => {} }),
}));
vi.mock("../lib/compileInvitation", () => ({ compile: (html: string) => html }));
vi.mock("../features/create/hooks/useTransliteration", () => ({ useTransliteration: () => () => {} }));
const scrollToSection = vi.fn();
vi.mock("../features/create/scroll", () => ({ scrollToSection: (s: string) => scrollToSection(s) }));
vi.mock("../features/create/components/SectionNav", () => ({ SectionNav: () => null }));
vi.mock("../features/create/components/LivePreview", () => ({ LivePreview: () => null }));
vi.mock("../features/create/CreateForm", () => ({
  CreateForm: (p: {
    data: Record<string, unknown>; set: (k: string, v: unknown) => void; vis: (k: string) => string | undefined;
    touch: (k: string) => void; onSubmit: (e: React.FormEvent) => void;
  }) => (
    <form id="create-form" onSubmit={p.onSubmit}>
      <output data-testid="groom">{String(p.data.groomEn)}</output>
      <output data-testid="bride">{String(p.data.brideEn)}</output>
      <output data-testid="template">{String(p.data.templateId)}</output>
      <output data-testid="err-groom">{p.vis("groomEn") ?? ""}</output>
      <button type="button" data-testid="fill" onClick={() => {
        p.set("templateId", "t1"); p.set("weddingDate", "2027-02-14"); p.set("groomEn", "Ravi"); p.set("brideEn", "Sita");
      }} />
      <button type="button" data-testid="type-groom" onClick={() => p.set("groomEn", "Ravi")} />
      <button type="button" data-testid="type-bride" onClick={() => p.set("brideEn", "Priya")} />
      <button type="button" data-testid="custom-id" onClick={() => p.set("customId", "my-link")} />
      <button type="button" data-testid="touch-groom" onClick={() => p.touch("groomEn")} />
    </form>
  ),
}));

import Create from "./Create";
import { ApiError } from "../lib/api";

let host: HTMLDivElement, root: Root;
let router: ReturnType<typeof createMemoryRouter>;
function show(path = "/create") {
  router = createMemoryRouter(
    [{ path: "/create", element: <Create /> }, { path: "/dashboard", element: <p>dashboard page</p> }, { path: "/other", element: <p>other page</p> }],
    { initialEntries: [path] },
  );
  /* Create reads ?edit= from window.location for its first state, so the address bar follows the router. */
  window.history.replaceState(null, "", path);
  act(() => { root.render(<RouterProvider router={router} />); });
}
const q = (id: string) => host.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
const click = (el: Element | null) => act(() => { (el as HTMLElement).click(); });
const text = () => document.body.textContent || "";
const saveButton = () => host.querySelector<HTMLButtonElement>("header .actions button")!;
const submit = () => act(() => { host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
const fillValid = () => click(q("fill"));
const savedRow = (over: Record<string, unknown> = {}) => ({
  id: "inv1", bride_name: "Sita", groom_name: "Ravi", event_date: "2027-02-14", template_id: "t1", details: { weddingDate: "2027-02-14" }, ...over,
});

beforeEach(() => {
  localStorage.clear();
  fetchInvitation.mockReset(); saveInvitation.mockReset(); scrollToSection.mockReset();
  saveInvitation.mockResolvedValue(savedRow());
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.useRealTimers(); });

describe("Create page: a new invitation", () => {
  it("starts instantly with an empty form, a Create button and no request", async () => {
    show();
    await flush();
    expect(text()).toContain("Create invitation");
    expect(saveButton().textContent).toContain("Create");
    expect(saveButton().disabled).toBe(false);
    expect(fetchInvitation).not.toHaveBeenCalled();
    expect(text()).not.toContain("Unsaved changes");
  });

  it("does not save an incomplete form: it counts the problems, scrolls to the first one and shows the messages", async () => {
    show();
    await flush();
    submit();
    expect(saveInvitation).not.toHaveBeenCalled();
    expect(text()).toContain("Fix 4 fields to continue"); // template, date, groom, bride
    expect(scrollToSection).toHaveBeenCalledWith("template");
    expect(q("err-groom").textContent).toBe("Groom's name is required"); // shown after a save attempt
  });

  it("shows a field's error only after the field was left, not while the form is untouched", async () => {
    show();
    await flush();
    expect(q("err-groom").textContent).toBe("");
    click(q("touch-groom"));
    expect(q("err-groom").textContent).toBe("Groom's name is required");
    click(q("type-groom"));
    expect(q("err-groom").textContent).toBe("");
  });

  it("saves a valid form once with the right record, opens the share dialog and switches to edit mode", async () => {
    show();
    await flush();
    fillValid();
    expect(text()).toContain("Unsaved changes");
    submit();
    await flush();
    expect(saveInvitation).toHaveBeenCalledTimes(1);
    const rec = saveInvitation.mock.calls[0][0];
    expect(rec).toMatchObject({
      bride_name: "Sita", groom_name: "Ravi", event_date: "2027-02-14", template_id: "t1", template_name: "Classic",
    });
    expect(typeof rec.id).toBe("string");
    expect(rec.id.length).toBeGreaterThan(0);
    expect(rec.details).toMatchObject({ groomEn: "Ravi", brideEn: "Sita", templateId: "t1" });
    expect(text()).toContain("Invitation saved");
    expect(text()).toContain("Ravi & Sita is ready");
    expect(window.location.search).toBe(`?edit=${rec.id}`); // address bar updated without a router navigation
    expect(text()).toContain("Edit invitation");
    expect(text()).toContain("All changes saved");
    expect(text()).not.toContain("Unsaved changes");
    expect(saveButton().textContent).toContain("Update");
    expect(saveButton().disabled).toBe(true); // nothing new to save
  });

  it("builds the share link from the link ID the owner typed, while the record keeps its own id", async () => {
    show();
    await flush();
    fillValid();
    click(q("custom-id"));
    submit();
    await flush();
    const code = document.body.querySelector(".cx-link code")!;
    expect(code.textContent).toBe(`${window.location.origin}/my-link`);
    expect(saveInvitation.mock.calls[0][0].details.customId).toBe("my-link");
  });

  it("builds the share link from the invitation id when no link ID was typed", async () => {
    show();
    await flush();
    fillValid();
    submit();
    await flush();
    const id = saveInvitation.mock.calls[0][0].id;
    expect(document.body.querySelector(".cx-link code")!.textContent).toBe(`${window.location.origin}/${id}`);
  });

  it("clears the stored draft after a successful save", async () => {
    vi.useFakeTimers();
    show();
    await flush();
    fillValid();
    await advance(900); // the draft is written 800 ms after the last change
    expect(Object.keys(localStorage).filter((k) => k.startsWith(LS_DRAFT))).toEqual([LS_DRAFT + "anon:new"]);
    submit();
    await flush();
    expect(Object.keys(localStorage).filter((k) => k.startsWith(LS_DRAFT))).toEqual([]);
  });

  it("shows the server's message when saving fails with an ApiError, keeps the work and allows another try", async () => {
    saveInvitation.mockRejectedValueOnce(new ApiError("This link name is already taken"));
    show();
    await flush();
    fillValid();
    submit();
    await flush();
    expect(text()).toContain("This link name is already taken");
    expect(text()).not.toContain("Invitation saved");
    expect(text()).toContain("Unsaved changes");
    expect(saveButton().disabled).toBe(false);
    expect(saveButton().textContent).toContain("Create"); // still a new invitation
    submit();
    await flush();
    expect(saveInvitation).toHaveBeenCalledTimes(2);
    expect(text()).toContain("Invitation saved");
  });

  it("shows a plain connection message for any other failure", async () => {
    saveInvitation.mockRejectedValueOnce(new Error("TypeError: failed to fetch (secret detail)"));
    show();
    await flush();
    fillValid();
    submit();
    await flush();
    expect(text()).toContain("Couldn’t save the invitation. Check your connection and try again.");
    expect(text()).not.toContain("secret detail");
  });

  it("ignores a second save while the first is still running", async () => {
    let finish!: (v: unknown) => void;
    saveInvitation.mockReturnValueOnce(new Promise((r) => { finish = r; }));
    show();
    await flush();
    fillValid();
    submit();
    submit();
    expect(saveInvitation).toHaveBeenCalledTimes(1);
    expect(saveButton().textContent).toContain("Saving...");
    expect(saveButton().disabled).toBe(true);
    finish(savedRow());
    await flush();
    expect(saveButton().textContent).toContain("Update");
  });

  it("Ctrl+S saves", async () => {
    show();
    await flush();
    fillValid();
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true, cancelable: true })); });
    await flush();
    expect(saveInvitation).toHaveBeenCalledTimes(1);
  });
});

describe("Create page: editing an invitation", () => {
  it("loads the record and fills the form; the saved name columns win over the copy in details", async () => {
    fetchInvitation.mockResolvedValue(savedRow({ bride_name: "Column Bride", groom_name: "Column Groom", details: { groomEn: "Old", brideEn: "Old" } }));
    show("/create?edit=inv1");
    expect(fetchInvitation).toHaveBeenCalledWith("inv1");
    expect(saveButton().disabled).toBe(true); // still loading
    await flush();
    expect(text()).toContain("Edit invitation");
    expect(q("groom").textContent).toBe("Column Groom");
    expect(q("bride").textContent).toBe("Column Bride");
    expect(q("template").textContent).toBe("t1");
    expect(saveButton().textContent).toContain("Update");
    expect(saveButton().disabled).toBe(true); // nothing changed yet
    expect(text()).not.toContain("Unsaved changes");
  });

  it("enables Update after a change and saves under the same id, with a toast and no share dialog", async () => {
    fetchInvitation.mockResolvedValue(savedRow());
    show("/create?edit=inv1");
    await flush();
    click(q("type-bride"));
    expect(text()).toContain("Unsaved changes");
    expect(saveButton().disabled).toBe(false);
    submit();
    await flush();
    expect(saveInvitation).toHaveBeenCalledTimes(1);
    expect(saveInvitation.mock.calls[0][0]).toMatchObject({ id: "inv1", bride_name: "Priya", groom_name: "Ravi" });
    expect(text()).toContain("Invitation updated");
    expect(text()).not.toContain("Invitation saved");
    expect(saveButton().disabled).toBe(true);
  });

  it("does not save an unchanged invitation (Ctrl+S included)", async () => {
    fetchInvitation.mockResolvedValue(savedRow());
    show("/create?edit=inv1");
    await flush();
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true, cancelable: true })); });
    await flush();
    expect(saveInvitation).not.toHaveBeenCalled();
  });

  it("an unknown id says so and leaves an empty form that can still be saved as a new one", async () => {
    fetchInvitation.mockResolvedValue(null);
    show("/create?edit=gone");
    await flush();
    expect(text()).toContain("Invitation not found. You can create a new one.");
    expect(q("groom").textContent).toBe("");
  });

  it("a failed load never shows an empty form: Save stays disabled and a Retry button appears", async () => {
    fetchInvitation.mockRejectedValue(new Error("network"));
    show("/create?edit=inv1");
    await flush();
    expect(text()).toContain("Couldn't load this invitation. Check your connection and try again.");
    expect(saveButton().disabled).toBe(true);
    expect(host.querySelector(".msg-actions button")!.textContent).toBe("Retry");
    expect(saveInvitation).not.toHaveBeenCalled();
  });

  it("after a failed load, typing and pressing Ctrl+S never saves over the real invitation", async () => {
    fetchInvitation.mockRejectedValue(new Error("network"));
    show("/create?edit=inv1");
    await flush();
    fillValid(); // a complete form, so only the load-error guard can stop the save
    expect(saveButton().disabled).toBe(true);
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true, cancelable: true })); });
    await flush();
    submit();
    await flush();
    expect(saveInvitation).not.toHaveBeenCalled();
  });

  it("does not fail when the answer arrives after the page was left", async () => {
    let finish!: (v: unknown) => void;
    fetchInvitation.mockReturnValue(new Promise((r) => { finish = r; }));
    show("/create?edit=inv1");
    act(() => root.unmount());
    root = createRoot(host); // so afterEach can unmount cleanly
    expect(() => finish(savedRow())).not.toThrow();
    await flush();
  });
});

describe("Create page: the local draft", () => {
  const draft = (data: Record<string, unknown>) => ({ data, at: new Date("2026-11-10T10:00:00").getTime() });

  it("offers a stored draft that differs from the form, and Restore puts it back", async () => {
    localStorage.setItem(LS_DRAFT + "anon:new", JSON.stringify(draft({ groomEn: "Draft Groom", brideEn: "Draft Bride" })));
    show();
    await flush();
    expect(text()).toContain("You have unsaved changes from");
    expect(text()).toContain("Restore them?");
    click([...host.querySelectorAll("button")].find((b) => b.textContent === "Restore") ?? null);
    expect(q("groom").textContent).toBe("Draft Groom");
    expect(q("bride").textContent).toBe("Draft Bride");
    expect(text()).toContain("Draft restored");
    expect(text()).not.toContain("Restore them?");
    expect(text()).toContain("Unsaved changes"); // restored data is not saved yet
  });

  it("Discard removes the stored draft and the card", async () => {
    localStorage.setItem(LS_DRAFT + "anon:new", JSON.stringify(draft({ groomEn: "Draft Groom" })));
    show();
    await flush();
    click([...host.querySelectorAll("button")].find((b) => b.textContent === "Discard") ?? null);
    expect(localStorage.getItem(LS_DRAFT + "anon:new")).toBeNull();
    expect(text()).not.toContain("Restore them?");
    expect(q("groom").textContent).toBe("");
  });

  it("does not offer a draft that equals the empty form, or a broken one", async () => {
    localStorage.setItem(LS_DRAFT + "anon:new", JSON.stringify(draft({})));
    show();
    await flush();
    expect(text()).not.toContain("Restore them?");
    act(() => root.unmount());
    root = createRoot(host);
    localStorage.setItem(LS_DRAFT + "anon:new", "{not json");
    show();
    await flush();
    expect(text()).not.toContain("Restore them?");
  });

  it("writes the draft 800 ms after the last change, not before", async () => {
    vi.useFakeTimers();
    show();
    await flush();
    click(q("type-groom"));
    await advance(700);
    expect(localStorage.getItem(LS_DRAFT + "anon:new")).toBeNull(); // debounced
    await advance(200);
    expect(JSON.parse(localStorage.getItem(LS_DRAFT + "anon:new")!).data.groomEn).toBe("Ravi");
  });

  it("does not write a draft while the offer card is waiting for an answer", async () => {
    vi.useFakeTimers();
    localStorage.setItem(LS_DRAFT + "anon:new", JSON.stringify(draft({ groomEn: "Draft Groom" })));
    show();
    await flush();
    click(q("type-groom"));
    await advance(2000);
    expect(JSON.parse(localStorage.getItem(LS_DRAFT + "anon:new")!).data.groomEn).toBe("Draft Groom"); // the offered draft is untouched
  });
});

describe("Create page: leaving with unsaved changes", () => {
  const go = (to: string) => act(() => { void router.navigate(to); });

  it("does not ask when nothing changed", async () => {
    show();
    await flush();
    go("/other");
    await flush();
    expect(router.state.location.pathname).toBe("/other");
    expect(text()).not.toContain("Save your changes?");
  });

  it("asks first; Keep editing stays on the page and keeps the work", async () => {
    show();
    await flush();
    click(q("type-groom"));
    go("/other");
    await flush();
    expect(text()).toContain("Save your changes?");
    expect(router.state.location.pathname).toBe("/create");
    click(document.body.querySelector('[aria-label="Keep editing"]'));
    await flush();
    expect(text()).not.toContain("Save your changes?");
    expect(router.state.location.pathname).toBe("/create");
    expect(q("groom").textContent).toBe("Ravi");
  });

  it("Cancel leaves without saving and keeps a draft so the Restore card can appear later", async () => {
    show();
    await flush();
    click(q("type-groom"));
    go("/other");
    await flush();
    click([...document.body.querySelectorAll(".lv-actions button")].find((b) => b.textContent === "Cancel") ?? null);
    await flush();
    expect(router.state.location.pathname).toBe("/other");
    expect(saveInvitation).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(LS_DRAFT + "anon:new")!).data.groomEn).toBe("Ravi");
  });

  it("Save saves and then leaves", async () => {
    show();
    await flush();
    fillValid();
    go("/other");
    await flush();
    click([...document.body.querySelectorAll(".lv-actions button")].find((b) => b.textContent?.includes("Save")) ?? null);
    await flush();
    await flush();
    expect(saveInvitation).toHaveBeenCalledTimes(1);
    expect(router.state.location.pathname).toBe("/other");
  });

  it("Save with an incomplete form stays on the page and shows what to fix", async () => {
    show();
    await flush();
    click(q("type-groom")); // groom only: date, bride and template are missing
    go("/other");
    await flush();
    click([...document.body.querySelectorAll(".lv-actions button")].find((b) => b.textContent?.includes("Save")) ?? null);
    await flush();
    expect(saveInvitation).not.toHaveBeenCalled();
    expect(router.state.location.pathname).toBe("/create");
    expect(text()).not.toContain("Save your changes?");
    expect(text()).toContain("Fix 3 fields to continue");
  });

  it("Save that fails on the network stays on the page", async () => {
    saveInvitation.mockRejectedValueOnce(new Error("offline"));
    show();
    await flush();
    fillValid();
    go("/other");
    await flush();
    click([...document.body.querySelectorAll(".lv-actions button")].find((b) => b.textContent?.includes("Save")) ?? null);
    await flush();
    await flush();
    expect(router.state.location.pathname).toBe("/create");
    expect(text()).toContain("Couldn’t save the invitation");
  });

  it("after a successful save there is nothing to ask about", async () => {
    show();
    await flush();
    fillValid();
    submit();
    await flush();
    go("/other");
    await flush();
    expect(router.state.location.pathname).toBe("/other");
  });
});

describe("Create page: Create another", () => {
  it("empties the form, goes back to /create and gets a fresh id for the next invitation", async () => {
    show();
    await flush();
    fillValid();
    submit();
    await flush();
    const firstId = saveInvitation.mock.calls[0][0].id;
    click([...document.body.querySelectorAll(".cx-modal button")].find((b) => /another/i.test(b.textContent || "")) ?? null);
    await flush();
    expect(text()).not.toContain("Invitation saved");
    expect(q("groom").textContent).toBe("");
    expect(window.location.search).toBe("");
    fillValid();
    submit();
    await flush();
    expect(saveInvitation).toHaveBeenCalledTimes(2);
    expect(saveInvitation.mock.calls[1][0].id).not.toBe(firstId);
  });
});
