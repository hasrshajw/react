// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { act, flush } from "../test/renderHook";
import ErrorPage, { classifyError, describeError } from "./ErrorPage";

describe("classifyError", () => {
  it("recognises a stale deploy / failed chunk", () => {
    expect(classifyError(new TypeError("Failed to fetch dynamically imported module: https://x/assets/A.js"))).toBe("stale");
    expect(classifyError(new Error("Importing a module script failed."))).toBe("stale");
  });
  it("recognises network trouble", () => {
    expect(classifyError(new TypeError("Failed to fetch"))).toBe("network");
    expect(classifyError(new TypeError("NetworkError when attempting to fetch resource."))).toBe("network");
  });
  it("falls back to generic, also for odd values", () => {
    expect(classifyError(new Error("boom"))).toBe("generic");
    expect(classifyError("plain text")).toBe("generic");
    expect(classifyError(undefined)).toBe("generic");
  });
  it("describes errors without throwing", () => {
    expect(describeError(new Error("x")).message).toBe("x");
    expect(describeError({ a: 1 }).message).toBe('{"a":1}');
  });
});

async function show(boom: () => never) {
  const Boom = () => boom();
  const router = createMemoryRouter([{ path: "/", element: <Boom />, errorElement: <ErrorPage /> }]);
  const host = document.createElement("div");
  document.body.appendChild(host);
  vi.spyOn(console, "error").mockImplementation(() => {});
  await act(async () => { createRoot(host).render(<RouterProvider router={router} />); });
  await flush();
  return host;
}

describe("ErrorPage", () => {
  it("shows friendly text, not the developer message, and keeps the details behind a toggle", async () => {
    const host = await show(() => { throw new Error("kaboom"); });
    const t = host.textContent ?? "";
    expect(t).toContain("Something went wrong");
    expect(t).toContain("Reload page");
    expect(t).toContain("Go to home");
    expect(t).not.toContain("Hey developer");
    expect(host.querySelector("details")).not.toBeNull();
    expect(host.querySelector("pre")?.textContent).toContain("Error: kaboom");
    expect(host.querySelector("[role=alert]")).not.toBeNull();
  });
  it("uses the reload wording for a failed chunk", async () => {
    const host = await show(() => { throw new TypeError("Failed to fetch dynamically imported module: /assets/x.js"); });
    expect(host.textContent).toContain("Please reload to continue");
  });
});
