import { afterEach, describe, expect, it, vi } from "vitest";
import { uid } from "./uid";

const SAFE = /^[A-Za-z0-9-]+$/; // becomes the /<id> link: no dot (Vercel treats it as a file), and it must fit the database slug rule

describe("uid (L-5)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses randomUUID when there is one", () => {
    expect(uid()).toMatch(SAFE);
  });
  it("falls back to getRandomValues: only letters, digits and '-', under 40 characters, unique", () => {
    vi.stubGlobal("crypto", { getRandomValues: (a: Uint8Array) => { for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256); return a; } });
    const ids = Array.from({ length: 2000 }, () => uid());
    expect(ids.every((x) => SAFE.test(x) && x.length < 40)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("falls back to Math.random when there is no crypto at all", () => {
    vi.stubGlobal("crypto", undefined);
    const ids = Array.from({ length: 500 }, () => uid());
    expect(ids.every((x) => SAFE.test(x) && x.length < 40)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
