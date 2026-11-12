// @vitest-environment node
import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { previewShell } from "./previewBridge";

/* L-9 / C-2: the live-preview frame. The real shell and bridge are loaded into jsdom with scripts enabled
   (as in the sandboxed iframe) and driven with real `message` events whose source is the parent window. */
function frame() {
  const dom = new JSDOM(previewShell(), { runScripts: "dangerously", pretendToBeVisual: true });
  const w = dom.window as unknown as Window & typeof globalThis & { __ran?: string[] };
  const send = (msg: unknown, source: unknown = w.parent) => {
    w.dispatchEvent(new w.MessageEvent("message", { data: msg, source: source as Window }));
  };
  return { w, doc: w.document, send };
}

const compiledDoc = (head: string, body: string, htmlAttrs = "") =>
  `<!doctype html><html ${htmlAttrs}><head>${head}</head><body>${body}</body></html>`;

describe("previewShell", () => {
  it("holds only the bridge: no template markup, an empty body", () => {
    const { doc } = frame();
    expect(doc.body.innerHTML).toBe("");
    expect(doc.querySelectorAll("script[data-schedy-bridge]").length).toBe(2);
    expect(doc.querySelectorAll("script:not([data-schedy-bridge])").length).toBe(0);
  });
});

describe("patch message", () => {
  it("shows the compiled body", () => {
    const { doc, send } = frame();
    send({ schedy: "patch", html: compiledDoc("", "<h1>Anil &amp; Sita</h1>") });
    expect(doc.body.innerHTML).toBe("<h1>Anil &amp; Sita</h1>");
  });

  it("shows <style> and <link> from the compiled <head> (the L-9 gap) and follows later changes", () => {
    const { doc, send } = frame();
    send({ schedy: "patch", html: compiledDoc("<style>h1{color:red}</style>", "<h1>x</h1>") });
    expect(doc.head.querySelector("style:not([data-schedy-bridge])")?.textContent).toBe("h1{color:red}");
    send({ schedy: "patch", html: compiledDoc('<style>h1{color:blue}</style><link rel="stylesheet" href="https://fonts.example/a.css">', "<h1>x</h1>") });
    expect(doc.head.querySelector("style:not([data-schedy-bridge])")?.textContent).toBe("h1{color:blue}");
    expect(doc.head.querySelector("link")?.getAttribute("href")).toBe("https://fonts.example/a.css");
    send({ schedy: "patch", html: compiledDoc("", "<h1>x</h1>") });
    expect(doc.head.querySelector("link")).toBeNull();
    expect(doc.head.querySelectorAll("style:not([data-schedy-bridge])").length).toBe(0);
  });

  it("never removes its own scripts and focus style from the head", () => {
    const { doc, send } = frame();
    send({ schedy: "patch", html: compiledDoc("<style>a{}</style>", "") });
    send({ schedy: "patch", html: compiledDoc("", "") });
    expect(doc.querySelectorAll("script[data-schedy-bridge]").length).toBe(2);
    expect(doc.querySelectorAll("style[data-schedy-bridge]").length).toBe(1);
  });

  it("does not run a template script, inline or external, in the head or the body", () => {
    const { w, doc, send } = frame();
    w.__ran = [];
    send({
      schedy: "patch",
      html: compiledDoc(
        '<script>window.__ran.push("head")</script><script src="https://cdn.example/x.js"></script>',
        '<p>hi</p><script>window.__ran.push("body")</script><script src="/_next/a.js"></script>'
      ),
    });
    expect(doc.querySelectorAll("script:not([data-schedy-bridge])").length).toBe(0);
    expect(w.__ran).toEqual([]);
    expect(doc.body.innerHTML).toBe("<p>hi</p>");
  });

  it("copies the <html> attributes (lang, class) and drops ones that went away", () => {
    const { doc, send } = frame();
    send({ schedy: "patch", html: compiledDoc("", "", 'lang="te" class="dark"') });
    expect(doc.documentElement.getAttribute("lang")).toBe("te");
    send({ schedy: "patch", html: compiledDoc("", "", 'lang="en"') });
    expect(doc.documentElement.getAttribute("lang")).toBe("en");
    expect(doc.documentElement.hasAttribute("class")).toBe(false);
  });

  it("keeps an element with an id (same node, not rebuilt) so typing does not reset it", () => {
    const { doc, send } = frame();
    send({ schedy: "patch", html: compiledDoc("", '<div id="a">one</div>') });
    const before = doc.getElementById("a");
    send({ schedy: "patch", html: compiledDoc("", '<div id="a">two</div>') });
    expect(doc.getElementById("a")).toBe(before);
    expect(before?.textContent).toBe("two");
  });

  it("ignores a message whose source is not the parent window, and non-string html", () => {
    const { doc, send } = frame();
    send({ schedy: "patch", html: compiledDoc("", "<p>ok</p>") });
    send({ schedy: "patch", html: compiledDoc("", "<p>evil</p>") }, {});
    send({ schedy: "patch", html: 42 });
    send(null);
    send("patch");
    expect(doc.body.innerHTML).toBe("<p>ok</p>");
  });
});

describe("focus message", () => {
  it("flashes the target field and removes the mark again", async () => {
    const { w, doc, send } = frame();
    send({ schedy: "patch", html: compiledDoc("", '<span data-schedy-field="venue-en">V</span>') });
    w.scrollTo = (() => {}) as typeof w.scrollTo;
    send({ schedy: "focus", target: "venue-en" });
    const el = doc.querySelector('[data-schedy-field="venue-en"]')!;
    expect(el.classList.contains("schedy-focus")).toBe(true);
    await new Promise((r) => setTimeout(r, 1300));
    expect(el.classList.contains("schedy-focus")).toBe(false);
  });
});
