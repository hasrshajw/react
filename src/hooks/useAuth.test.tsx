// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { act, flush } from "../test/renderHook";

/* M-1 / M-7: the session state in AuthProvider. lib/auth and lib/userData are replaced, so the tests check what the
   provider does with the answers (and when it clears the previous person's data), not Supabase itself. */
const state = vi.hoisted(() => ({ cached: null as unknown, onChange: null as null | ((s: unknown) => void), unsub: null as null | ReturnType<typeof vi.fn> }));
vi.mock("../lib/auth", () => ({
  SESSION_KEY: "schedy_session",
  getSession: vi.fn(() => state.cached),
  signInWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  syncSupabaseSession: vi.fn(),
  watchAuthChanges: vi.fn((cb: (s: unknown) => void) => { state.onChange = cb; state.unsub = vi.fn(); return state.unsub; }),
}));
vi.mock("../lib/userData", () => ({ resetUserData: vi.fn() }));

import * as auth from "../lib/auth";
import { resetUserData } from "../lib/userData";
import { AuthProvider, useAuth } from "./useAuth";
import type { Session } from "../lib/auth";

const sync = vi.mocked(auth.syncSupabaseSession);
const email = vi.mocked(auth.signInWithEmail);
const google = vi.mocked(auth.signInWithGoogle);
const out = vi.mocked(auth.signOut);
const reset = vi.mocked(resetUserData);
const person = (e: string): Session => ({ provider: "email", email: e, name: e.split("@")[0], at: 1 });

function mount() {
  const result = { current: undefined as unknown as ReturnType<typeof useAuth> };
  const Probe = () => { result.current = useAuth(); return null; };
  const root = createRoot(document.createElement("div"));
  act(() => { root.render(<AuthProvider><Probe /></AuthProvider>); });
  return { result, unmount: () => act(() => { root.unmount(); }) };
}

beforeEach(() => {
  state.cached = null; state.onChange = null; state.unsub = null;
  vi.clearAllMocks();
  sync.mockResolvedValue(null);
  out.mockResolvedValue(undefined);
});

describe("useAuth / AuthProvider", () => {
  it("starts from the cached session", async () => {
    state.cached = person("a@x.com");
    sync.mockResolvedValue(person("a@x.com"));
    const h = mount(); await flush();
    expect(h.result.current.session?.email).toBe("a@x.com");
    h.unmount();
  });

  it("throws when used outside the provider", () => {
    const Bad = () => { useAuth(); return null; };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const root = createRoot(document.createElement("div"));
    expect(() => act(() => { root.render(<Bad />); })).toThrow("useAuth must be used inside <AuthProvider>");
    spy.mockRestore();
  });

  it("adopts a login found by syncSupabaseSession (Google redirect)", async () => {
    sync.mockResolvedValue(person("g@x.com"));
    const h = mount(); await flush();
    expect(h.result.current.session?.email).toBe("g@x.com");
    h.unmount();
  });

  it("ignores a failing syncSupabaseSession and keeps the cached session", async () => {
    state.cached = person("a@x.com");
    sync.mockRejectedValue(new Error("offline"));
    const h = mount(); await flush();
    expect(h.result.current.session?.email).toBe("a@x.com");
    h.unmount();
  });

  it("follows another tab: storage event for the session key re-reads it, other keys do not", async () => {
    state.cached = person("a@x.com");
    sync.mockResolvedValue(person("a@x.com"));
    const h = mount(); await flush();
    state.cached = null;
    act(() => { window.dispatchEvent(new StorageEvent("storage", { key: "something_else" })); });
    expect(h.result.current.session?.email).toBe("a@x.com");
    act(() => { window.dispatchEvent(new StorageEvent("storage", { key: "schedy_session" })); });
    expect(h.result.current.session).toBeNull();
    state.cached = person("b@x.com");
    act(() => { window.dispatchEvent(new StorageEvent("storage", { key: null })); }); // storage.clear()
    expect(h.result.current.session?.email).toBe("b@x.com");
    h.unmount();
  });

  it("follows Supabase's own events and unsubscribes on unmount", async () => {
    const h = mount(); await flush();
    act(() => { state.onChange!(person("n@x.com")); });
    expect(h.result.current.session?.email).toBe("n@x.com");
    act(() => { state.onChange!(null); });
    expect(h.result.current.session).toBeNull();
    h.unmount();
    expect(state.unsub).toHaveBeenCalledTimes(1);
  });

  it("signInEmail stores and returns the session; a failure rejects and changes nothing", async () => {
    const h = mount(); await flush();
    email.mockResolvedValueOnce(person("e@x.com"));
    let got: Session | undefined;
    await act(async () => { got = await h.result.current.signInEmail("e@x.com", "pw"); });
    expect(got?.email).toBe("e@x.com");
    expect(email).toHaveBeenCalledWith("e@x.com", "pw");
    expect(h.result.current.session?.email).toBe("e@x.com");

    email.mockRejectedValueOnce(new Error("Invalid login credentials"));
    await act(async () => { await expect(h.result.current.signInEmail("e@x.com", "bad")).rejects.toThrow("Invalid login credentials"); });
    expect(h.result.current.session?.email).toBe("e@x.com");
    h.unmount();
  });

  it("signInGoogle passes the page to return to", async () => {
    const h = mount(); await flush();
    google.mockResolvedValueOnce({ ...person("g@x.com"), provider: "google" });
    await act(async () => { await h.result.current.signInGoogle("/create?edit=1"); });
    expect(google).toHaveBeenCalledWith("/create?edit=1");
    expect(h.result.current.session?.provider).toBe("google");
    h.unmount();
  });

  it("logout signs out at once, returns the sign-out promise, and clears the person's data", async () => {
    state.cached = person("a@x.com");
    sync.mockResolvedValue(person("a@x.com"));
    const h = mount(); await flush();
    let release!: () => void;
    out.mockReturnValueOnce(new Promise<void>((r) => { release = r; }));
    let done = false;
    act(() => { h.result.current.logout().then(() => { done = true; }); });
    expect(h.result.current.session).toBeNull(); // the screen is signed out before Supabase answers
    expect(out).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(done).toBe(false);
    await act(async () => { release(); await Promise.resolve(); });
    expect(done).toBe(true);
    h.unmount();
  });

  it("resetUserData runs only when the person goes away or changes", async () => {
    const h = mount(); await flush();
    expect(reset).not.toHaveBeenCalled();                          // mount with nobody
    act(() => { state.onChange!(person("a@x.com")); });
    expect(reset).not.toHaveBeenCalled();                          // nobody -> a (a normal sign-in)
    act(() => { state.onChange!({ ...person("a@x.com"), at: 2 }); });
    expect(reset).not.toHaveBeenCalled();                          // same email, new object
    act(() => { state.onChange!(person("b@x.com")); });
    expect(reset).toHaveBeenCalledTimes(1);                        // a -> b
    act(() => { state.onChange!(null); });
    expect(reset).toHaveBeenCalledTimes(2);                        // b -> nobody
    h.unmount();
  });

  it("an expired login found on start (cached person, then none) clears their data", async () => {
    state.cached = person("a@x.com");
    sync.mockResolvedValue(null);
    const h = mount(); await flush();
    expect(h.result.current.session).toBeNull();
    expect(reset).toHaveBeenCalledTimes(1);
    h.unmount();
  });
});
