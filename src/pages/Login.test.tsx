// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { act, flush } from "../test/renderHook";

/* The sign-in page (tasks M-1 and M-7). `useAuth` and the parts of `lib/auth` that talk to Supabase are replaced; the small
   pure helpers (`isEmail`, `isSafeTarget`, `AuthError`, `MIN_PASSWORD`) stay real, so a change in their rules shows here. */
const h = vi.hoisted(() => ({
  session: null as { email: string } | null,
  recovery: false,
  returnTo: null as string | null,
  signInGoogle: vi.fn(),
  signInEmail: vi.fn(),
  signUpEmail: vi.fn(),
  logout: vi.fn(),
  requestPasswordReset: vi.fn(),
  setNewPassword: vi.fn(),
  takeLoginTarget: vi.fn(),
  preloadAdmin: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ session: h.session, signInGoogle: h.signInGoogle, signInEmail: h.signInEmail, signUpEmail: h.signUpEmail, logout: h.logout }),
}));
vi.mock("../lib/preload", () => ({ preloadAdmin: () => h.preloadAdmin() }));
vi.mock("../lib/auth", async () => {
  const real = await vi.importActual<typeof import("../lib/auth")>("../lib/auth");
  return {
    ...real,
    get RECOVERY_LINK() { return h.recovery; },
    takeLoginTarget: () => h.takeLoginTarget(),
    requestPasswordReset: (e: string) => h.requestPasswordReset(e),
    setNewPassword: (p: string) => h.setNewPassword(p),
  };
});

import Login from "./Login";
import { AuthError } from "../lib/auth";

const GENERIC = "Something went wrong. Please try again.";
let host: HTMLDivElement, root: Root;
let where = "";
const Where = () => { const l = useLocation(); where = l.pathname + l.search; return null; };
const Page = ({ name }: { name: string }) => <><Where /><p>PAGE:{name}</p></>;

function show(state?: { from?: string; loggedOut?: boolean }) {
  act(() => {
    root.render(
      <MemoryRouter initialEntries={[{ pathname: "/login", state }]}>
        <Routes>
          <Route path="/login" element={<><Where /><Login /></>} />
          <Route path="/dashboard" element={<Page name="dashboard" />} />
          <Route path="/create" element={<Page name="create" />} />
          <Route path="/somewhere" element={<Page name="somewhere" />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}
const text = () => host.textContent || "";
const $ = <T extends Element = HTMLElement>(sel: string) => host.querySelector<T>(sel);
const input = (id: string) => $<HTMLInputElement>(`#${id}`)!;
const btn = (label: string | RegExp) =>
  [...host.querySelectorAll("button")].find((b) => (typeof label === "string" ? b.textContent?.trim() === label : label.test(b.textContent || "")))!;
const labelled = (label: string) => host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
const typeInto = (el: HTMLInputElement, value: string) => act(() => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
});
const click = (el: Element) => act(() => { (el as HTMLElement).click(); });
const submit = () => act(() => { $("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
const fill = (email: string, password: string) => { typeInto(input("login-email"), email); typeInto(input("login-password"), password); };
const pageshow = (persisted: boolean) => act(() => { window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted })); });
const deferred = <T = void,>() => { let resolve!: (v: T) => void, reject!: (e: unknown) => void; const promise = new Promise<T>((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };

beforeEach(() => {
  h.session = null; h.recovery = false; h.returnTo = null; where = "";
  for (const f of [h.signInGoogle, h.signInEmail, h.signUpEmail, h.logout, h.requestPasswordReset, h.setNewPassword, h.preloadAdmin]) f.mockReset();
  h.takeLoginTarget.mockReset(); h.takeLoginTarget.mockImplementation(() => h.returnTo);
  h.signInGoogle.mockResolvedValue(undefined); h.signInEmail.mockResolvedValue(undefined);
  h.logout.mockResolvedValue(undefined); h.requestPasswordReset.mockResolvedValue(undefined); h.setNewPassword.mockResolvedValue(undefined);
  document.title = "Before";
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); });

describe("Login: email and password", () => {
  it("asks for both fields and sends nothing; the first missing field gets focus", () => {
    show();
    submit();
    expect(text()).toContain("Enter your email address.");
    expect(text()).toContain("Enter your password.");
    expect(h.signInEmail).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(input("login-email"));
    typeInto(input("login-email"), "a@b.co");
    submit();
    expect(text()).not.toContain("Enter your email address.");
    expect(document.activeElement).toBe(input("login-password"));
    expect(h.signInEmail).not.toHaveBeenCalled();
  });

  it("refuses an address that is not an email, before any request", () => {
    show();
    fill("not-an-email", "secret");
    submit();
    expect(text()).toContain("Enter a valid email address.");
    expect(h.signInEmail).not.toHaveBeenCalled();
  });

  it("clears a field's message as soon as the person edits that field", () => {
    show();
    submit();
    expect(text()).toContain("Enter your email address.");
    typeInto(input("login-email"), "a");
    expect(text()).not.toContain("Enter your email address.");
    expect(text()).toContain("Enter your password.");
    expect(input("login-email").getAttribute("aria-invalid")).toBe("false");
    expect(input("login-password").getAttribute("aria-invalid")).toBe("true");
  });

  it("signs in and goes to the dashboard", async () => {
    show();
    fill("ravi@example.com", "secret1");
    submit(); await flush();
    expect(h.signInEmail).toHaveBeenCalledTimes(1);
    expect(h.signInEmail).toHaveBeenCalledWith("ravi@example.com", "secret1");
    expect(text()).toContain("PAGE:dashboard");
  });

  it("does not check the password length on the client (M-7): a 3-character password reaches the server", async () => {
    h.signInEmail.mockRejectedValue(new AuthError("Invalid login credentials"));
    show();
    fill("ravi@example.com", "abc");
    submit(); await flush();
    expect(h.signInEmail).toHaveBeenCalledWith("ravi@example.com", "abc");
    expect(text()).toContain("Invalid login credentials");
    expect(text()).not.toMatch(/at least|characters/i);
  });

  it("shows the server's message for an AuthError and only a generic one for anything else", async () => {
    h.signInEmail.mockRejectedValueOnce(new AuthError("Email not confirmed"));
    show();
    fill("ravi@example.com", "secret1");
    submit(); await flush();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("Email not confirmed");
    h.signInEmail.mockRejectedValueOnce(new Error("fetch failed: ECONNRESET 10.0.0.4"));
    submit(); await flush();
    const alert = host.querySelector('[role="alert"]')!.textContent!;
    expect(alert).toContain(GENERIC);
    expect(alert).not.toContain("ECONNRESET");
  });

  it("locks the form while signing in, ignores a second submit, and unlocks after a failure", async () => {
    const d = deferred();
    h.signInEmail.mockReturnValue(d.promise);
    show();
    fill("ravi@example.com", "secret1");
    submit();
    expect(btn("Signing in…").getAttribute("aria-busy")).toBe("true");
    expect(input("login-email").disabled).toBe(true);
    expect(input("login-password").disabled).toBe(true);
    expect(btn("Continue with Google").disabled).toBe(true);
    expect(btn("Forgot password?").disabled).toBe(true);
    submit();
    expect(h.signInEmail).toHaveBeenCalledTimes(1);
    d.reject(new AuthError("Nope")); await flush();
    expect(input("login-email").disabled).toBe(false);
    expect(btn("Sign in").disabled).toBe(false);
    expect(text()).toContain("Nope");
  });

  it("goes back to the page the person came from, but only when it is an in-app path", async () => {
    show({ from: "/create?edit=abc" });
    fill("ravi@example.com", "secret1");
    submit(); await flush();
    expect(where).toBe("/create?edit=abc");
    act(() => root.unmount()); root = createRoot(host);
    for (const evil of ["//evil.com", "https://evil.com", "/login", "/\\evil.com"]) {
      where = "";
      show({ from: evil });
      fill("ravi@example.com", "secret1");
      submit(); await flush();
      expect(where, evil).toBe("/dashboard");
      act(() => root.unmount()); root = createRoot(host);
    }
  });

  it("shows and hides the password", () => {
    show();
    expect(input("login-password").type).toBe("password");
    click(labelled("Show password"));
    expect(input("login-password").type).toBe("text");
    click(labelled("Hide password"));
    expect(input("login-password").type).toBe("password");
  });
});

describe("Login: Google (M-7)", () => {
  it("starts Google sign-in with the page the person came from and shows it is busy", async () => {
    const d = deferred();
    h.signInGoogle.mockReturnValue(d.promise);
    show({ from: "/create?edit=abc" });
    click(btn("Continue with Google"));
    expect(h.signInGoogle).toHaveBeenCalledWith("/create?edit=abc");
    expect(btn("Signing in…").getAttribute("aria-busy")).toBe("true");
    d.resolve(); await flush();
    expect(where).toBe("/create?edit=abc");
  });

  it("passes nothing when there is no page to return to, and ignores a second click while busy", () => {
    h.signInGoogle.mockReturnValue(new Promise(() => {}));
    show();
    click(btn("Continue with Google"));
    expect(h.signInGoogle).toHaveBeenCalledWith(undefined);
    click(btn("Signing in…"));
    expect(h.signInGoogle).toHaveBeenCalledTimes(1);
  });

  it("frees the button when the page comes back from the back/forward cache, and only then", () => {
    h.signInGoogle.mockReturnValue(new Promise(() => {}));
    show();
    click(btn("Continue with Google"));
    expect(btn("Signing in…").disabled).toBe(true);
    pageshow(false);
    expect(btn("Signing in…").disabled).toBe(true); // an ordinary page show changes nothing
    pageshow(true);
    expect(btn("Continue with Google").disabled).toBe(false);
    expect(btn("Continue with Google").getAttribute("aria-busy")).toBe("false");
  });

  it("a page show from the cache does not cancel an email sign-in that is running", () => {
    h.signInEmail.mockReturnValue(new Promise(() => {}));
    show();
    fill("ravi@example.com", "secret1");
    submit();
    pageshow(true);
    expect(btn("Signing in…").disabled).toBe(true);
    expect(input("login-email").disabled).toBe(true);
  });

  it("shows the message and unlocks when Google sign-in fails", async () => {
    h.signInGoogle.mockRejectedValue(new AuthError("Popup closed"));
    show();
    click(btn("Continue with Google")); await flush();
    expect(text()).toContain("Popup closed");
    expect(btn("Continue with Google").disabled).toBe(false);
  });

  it("stops listening for page shows after the page is left", () => {
    const off = vi.spyOn(window, "removeEventListener");
    show();
    act(() => root.unmount()); root = createRoot(host);
    expect(off.mock.calls.some(([t]) => t === "pageshow")).toBe(true);
    off.mockRestore();
  });
});

describe("Login: forgot password (M-7)", () => {
  it("asks for an email first and sends nothing when it is empty or not valid", () => {
    show();
    click(btn("Forgot password?"));
    expect(text()).toContain("Enter your email address above");
    expect(document.activeElement).toBe(input("login-email"));
    typeInto(input("login-email"), "nope");
    click(btn("Forgot password?"));
    expect(h.requestPasswordReset).not.toHaveBeenCalled();
    expect(text()).not.toContain("reset link is on its way");
  });

  it("sends the reset for the typed address and gives a neutral answer", async () => {
    show();
    typeInto(input("login-email"), "ravi@example.com");
    click(btn("Forgot password?")); await flush();
    expect(h.requestPasswordReset).toHaveBeenCalledWith("ravi@example.com");
    expect(text()).toContain("If an account exists for that email, a reset link is on its way");
    expect(text()).not.toMatch(/no account|not found|doesn.t exist/i);
  });

  it("locks the form while the request is on its way, then unlocks", async () => {
    const d = deferred();
    h.requestPasswordReset.mockReturnValue(d.promise);
    show();
    typeInto(input("login-email"), "ravi@example.com");
    click(btn("Forgot password?"));
    expect(btn("Sign in").disabled).toBe(true);
    expect(input("login-email").disabled).toBe(true);
    click(btn("Forgot password?"));
    expect(h.requestPasswordReset).toHaveBeenCalledTimes(1);
    d.resolve(); await flush();
    expect(btn("Sign in").disabled).toBe(false);
  });

  it("shows the error when the request fails, and no \"link is on its way\" message", async () => {
    h.requestPasswordReset.mockRejectedValue(new AuthError("Too many requests"));
    show();
    typeInto(input("login-email"), "ravi@example.com");
    click(btn("Forgot password?")); await flush();
    expect(text()).toContain("Too many requests");
    expect(text()).not.toContain("reset link is on its way");
    expect(btn("Sign in").disabled).toBe(false);
  });

  it("removes the old \"link is on its way\" message when the person tries again", async () => {
    show();
    typeInto(input("login-email"), "ravi@example.com");
    click(btn("Forgot password?")); await flush();
    expect(text()).toContain("reset link is on its way");
    typeInto(input("login-email"), "bad");
    click(btn("Forgot password?"));
    expect(text()).not.toContain("reset link is on its way");
  });
});

describe("Login: set a new password after the reset email (M-7)", () => {
  beforeEach(() => { h.recovery = true; });

  it("shows the new-password form instead of the sign-in form, even when the link has signed the person in", () => {
    h.session = { email: "ravi@example.com" };
    show();
    expect(text()).toContain("Choose a new password");
    expect(text()).toContain("at least 6 characters");
    expect(input("new-password")).not.toBeNull();
    expect($("#login-email")).toBeNull();
    expect(text()).not.toContain("PAGE:"); // no redirect into the app yet
  });

  it("refuses two different passwords without a request", () => {
    show();
    typeInto(input("new-password"), "abcdef");
    typeInto(input("new-password-2"), "abcdeg");
    submit();
    expect(text()).toContain("The two passwords don’t match.");
    expect(h.setNewPassword).not.toHaveBeenCalled();
  });

  it("saves the new password and goes on to the dashboard", async () => {
    show();
    typeInto(input("new-password"), "abcdef");
    typeInto(input("new-password-2"), "abcdef");
    submit(); await flush();
    expect(h.setNewPassword).toHaveBeenCalledWith("abcdef");
    expect(text()).toContain("PAGE:dashboard");
  });

  it("locks the form while saving and ignores a second submit", async () => {
    const d = deferred();
    h.setNewPassword.mockReturnValue(d.promise);
    show();
    typeInto(input("new-password"), "abcdef");
    typeInto(input("new-password-2"), "abcdef");
    submit();
    expect(btn("Saving…").getAttribute("aria-busy")).toBe("true");
    expect(input("new-password").disabled).toBe(true);
    expect(btn("Back to sign in").disabled).toBe(true);
    submit();
    expect(h.setNewPassword).toHaveBeenCalledTimes(1);
    d.resolve(); await flush();
  });

  it("shows the server's message (an AuthError) or a generic one, and allows another try", async () => {
    h.setNewPassword.mockRejectedValueOnce(new AuthError("Password should be at least 6 characters."));
    show();
    typeInto(input("new-password"), "abc");
    typeInto(input("new-password-2"), "abc");
    submit(); await flush();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("Password should be at least 6 characters.");
    expect(btn("Save new password").disabled).toBe(false);
    h.setNewPassword.mockRejectedValueOnce(new Error("boom 500"));
    submit(); await flush();
    const alert = host.querySelector('[role="alert"]')!.textContent!;
    expect(alert).toContain(GENERIC);
    expect(alert).not.toContain("boom");
  });

  it("\"Back to sign in\" returns to the sign-in form", () => {
    show();
    click(btn("Back to sign in"));
    expect($("#login-email")).not.toBeNull();
    expect($("#new-password")).toBeNull();
  });
});

describe("Login: logging out (M-1)", () => {
  it("signs out once on arrival and keeps the form locked until the sign-out has finished", async () => {
    const d = deferred();
    h.logout.mockReturnValue(d.promise);
    show({ loggedOut: true });
    expect(h.logout).toHaveBeenCalledTimes(1);
    expect(text()).toContain("You’ve been logged out.");
    expect(input("login-email").disabled).toBe(true);
    expect(input("login-password").disabled).toBe(true);
    expect(btn("Continue with Google").disabled).toBe(true);
    expect(btn("Sign in").disabled).toBe(true);
    // a click or a submit during the sign-out does nothing
    click(btn("Continue with Google"));
    submit();
    expect(h.signInGoogle).not.toHaveBeenCalled();
    expect(h.signInEmail).not.toHaveBeenCalled();
    d.resolve(); await flush();
    expect(input("login-email").disabled).toBe(false);
    expect(btn("Sign in").disabled).toBe(false);
    expect(h.logout).toHaveBeenCalledTimes(1);
  });

  it("does not sign out on an ordinary visit", () => {
    show();
    expect(h.logout).not.toHaveBeenCalled();
    expect(text()).not.toContain("You’ve been logged out.");
  });

  it("stays on the login page (no redirect) while the old session is still being cleared", () => {
    h.session = { email: "ravi@example.com" };
    h.logout.mockReturnValue(new Promise(() => {}));
    show({ loggedOut: true });
    expect(text()).toContain("Welcome back");
    expect(text()).not.toContain("PAGE:");
    expect(text()).not.toContain("You’ve been logged out."); // shown only once the session is gone
  });

  it("does not touch the page if it is left before the sign-out finishes", async () => {
    const d = deferred();
    h.logout.mockReturnValue(d.promise);
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    show({ loggedOut: true });
    act(() => root.unmount()); root = createRoot(host);
    d.resolve(); await flush();
    expect(err).not.toHaveBeenCalled();
    err.mockRestore();
  });
});

describe("Login: already signed in, and page details", () => {
  it("sends a signed-in person to the dashboard", () => {
    h.session = { email: "ravi@example.com" };
    show();
    expect(where).toBe("/dashboard");
    expect(text()).toContain("PAGE:dashboard");
  });

  it("sends a signed-in person to the page they asked for, or to the one kept through the Google redirect", () => {
    h.session = { email: "ravi@example.com" };
    show({ from: "/somewhere" });
    expect(where).toBe("/somewhere");
    act(() => root.unmount()); root = createRoot(host);
    h.returnTo = "/create?edit=xyz";
    show();
    expect(where).toBe("/create?edit=xyz");
    act(() => root.unmount()); root = createRoot(host);
    h.returnTo = "/somewhere";
    show({ from: "//evil.com" }); // an unsafe `from` falls back to the kept target
    expect(where).toBe("/somewhere");
  });

  it("reads the kept target once per visit, not on every render", () => {
    show();
    fill("a@b.co", "x");
    fill("a@b.co", "xy");
    expect(h.takeLoginTarget).toHaveBeenCalledTimes(1);
  });

  it("sets the tab title and puts the old one back", () => {
    show();
    expect(document.title).toBe("Sign in · Schedy Admin");
    act(() => root.unmount()); root = createRoot(host);
    expect(document.title).toBe("Before");
  });

  it("starts downloading the dashboard code unless the person has just logged out", async () => {
    show();
    expect(h.preloadAdmin).toHaveBeenCalledTimes(1);
    act(() => root.unmount()); root = createRoot(host);
    h.preloadAdmin.mockClear();
    show({ loggedOut: true });
    await flush();
    expect(h.preloadAdmin).not.toHaveBeenCalled();
  });
});

describe("Login: sign up", () => {
  const openSignUp = () => { show(); click(btn("Create an account")); };

  it("switches to the sign-up form and back", () => {
    openSignUp();
    expect(text()).toContain("Create your account");
    expect(btn("Create account")).toBeTruthy();
    expect(text()).not.toContain("Forgot password?");
    click(btn("Sign in"));
    expect(text()).toContain("Welcome back");
  });

  it("checks the password length before any request", () => {
    openSignUp();
    fill("new@example.com", "abc");
    submit();
    expect(text()).toContain("Use at least");
    expect(h.signUpEmail).not.toHaveBeenCalled();
  });

  it("signed in at once: goes to the dashboard (non-admins are then sent to /my by the role gate)", async () => {
    h.signUpEmail.mockResolvedValue({ email: "new@example.com" });
    openSignUp();
    fill("new@example.com", "secret1");
    submit(); await flush();
    expect(h.signUpEmail).toHaveBeenCalledWith("new@example.com", "secret1");
    expect(text()).toContain("PAGE:dashboard");
  });

  it("email confirmation required: tells the person to check their inbox and returns to sign in", async () => {
    h.signUpEmail.mockResolvedValue(null);
    openSignUp();
    fill("new@example.com", "secret1");
    submit(); await flush();
    expect(text()).toContain("Check your inbox for a confirmation link");
    expect(text()).toContain("Welcome back");
  });

  it("shows the server's message when sign-up fails", async () => {
    h.signUpEmail.mockRejectedValue(new AuthError("An account with this email already exists. Sign in instead."));
    openSignUp();
    fill("new@example.com", "secret1");
    submit(); await flush();
    expect(text()).toContain("already exists");
  });
});
