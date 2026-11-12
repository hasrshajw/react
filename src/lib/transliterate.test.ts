import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { transliterateOffline } from "./telugu";

/* The module keeps a cache and an "offline until" time, so every test loads a fresh copy. `fetch` is replaced by a fake. */
type Fake = (url: string, init: { signal: AbortSignal }) => Promise<Response>;
let calls: string[];
async function load(fake: Fake) {
  vi.resetModules();
  calls = [];
  vi.stubGlobal("fetch", (url: string, init: { signal: AbortSignal }) => { calls.push(url); return fake(url, init); });
  return (await import("./transliterate")).transliterate;
}
const answer = (suggestion: string | null) => async () =>
  new Response(JSON.stringify(["SUCCESS", [["x", suggestion === null ? [] : [suggestion]]]]), { status: 200 });

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-12T10:00:00Z")); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("transliterate (M-2)", () => {
  it("uses the online suggestion and remembers it", async () => {
    const t = await load(answer("రవి"));
    expect(await t("ravi")).toBe("రవి");
    expect(await t("ravi")).toBe("రవి");
    expect(calls.length).toBe(1);
  });
  it("sends one request per word and keeps spacing", async () => {
    const t = await load(answer("X"));
    expect(await t("  ravi   kumar ")).toBe("X   X");
    expect(calls.length).toBe(2);
  });
  it("keeps digits and symbols without asking the service", async () => {
    const t = await load(answer("X"));
    expect(await t("123 - 45")).toBe("123 - 45");
    expect(calls.length).toBe(0);
  });
  it("returns an empty string for blank text", async () => {
    const t = await load(answer("X"));
    expect(await t("   ")).toBe("");
  });
  it("a word with no suggestion uses the offline rules, is remembered, and does NOT switch online mode off", async () => {
    let n = 0;
    const t = await load(async () => (++n === 1 ? answer(null)() : answer("OK")()));
    expect(await t("zzzz")).toBe(transliterateOffline("zzzz"));
    expect(await t("zzzz")).toBe(transliterateOffline("zzzz"));
    expect(calls.length).toBe(1);
    expect(await t("ravi")).toBe("OK"); // still online right away
    expect(calls.length).toBe(2);
  });

  const failures: Array<[string, Fake]> = [
    ["a network error", async () => { throw new TypeError("network"); }],
    ["HTTP 500", async () => new Response("", { status: 500 })],
    ["a body that is not JSON", async () => new Response("<html>", { status: 200 })],
    ["a status other than SUCCESS", async () => new Response(JSON.stringify(["FAILED_TO_PARSE_REQUEST_BODY"]), { status: 200 })],
  ];
  it.each(failures)("%s: offline result now, lookups pause for 60 s, then resume", async (_n, bad) => {
    let healthy = false;
    const t = await load((u, i) => (healthy ? answer("ON")() : bad(u, i)));
    expect(await t("ravi")).toBe(transliterateOffline("ravi"));
    expect(calls.length).toBe(1);
    expect(await t("priya")).toBe(transliterateOffline("priya")); // paused: no request
    expect(calls.length).toBe(1);
    vi.advanceTimersByTime(59_000);
    await t("kumar");
    expect(calls.length).toBe(1);
    healthy = true;
    vi.advanceTimersByTime(2_000);
    expect(await t("ravi")).toBe("ON"); // the word from the outage was not remembered
    expect(calls.length).toBe(2);
  });
  it("a request that takes longer than 3.5 s is dropped", async () => {
    const t = await load((_u, { signal }) => new Promise<Response>((_res, rej) => signal.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError")))));
    const p = t("ravi");
    await vi.advanceTimersByTimeAsync(3_500);
    expect(await p).toBe(transliterateOffline("ravi"));
  });
  it("keeps at most 1000 words, oldest first", async () => {
    const t = await load(answer("X"));
    const words = Array.from({ length: 1001 }, (_, i) => `word${String.fromCharCode(97 + (i % 26))}${i}`);
    for (const w of words) await t(w);
    expect(calls.length).toBe(1001);
    await t(words[1000]); // the newest word is still remembered
    expect(calls.length).toBe(1001);
    await t(words[0]); // the oldest was dropped, so it is asked again
    expect(calls.length).toBe(1002);
  });
});
