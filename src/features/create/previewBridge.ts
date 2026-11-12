import morphdomUmd from "morphdom/dist/morphdom-umd.min.js?raw";

/* C-2: the live-preview iframe runs WITHOUT `allow-same-origin`, so the editor can no longer reach into its
   document. Instead the editor posts messages and this small script, injected into the frame, applies them.

   Messages (parent -> frame), all plain objects:
     { schedy: "patch", html }    morph the frame's <head> and <body> to match the compiled invitation
                                  (L-9: so <style> and <link> changes show; every <script> is dropped, the editor never runs template scripts)
     { schedy: "focus", target }  scroll to a field and flash it
   Only messages whose `source` is the parent window are handled. The frame never sends anything back, so
   a template script cannot use this channel to reach the editor. */
const BRIDGE = `
(function(){
  if (window.__schedyBridge) return; window.__schedyBridge = true;
  var st = document.createElement("style");
  st.setAttribute("data-schedy-bridge", "1"); st.textContent = ".schedy-focus{outline:3px solid #a5b4fc;outline-offset:4px;border-radius:4px}";
  (document.head || document.documentElement).appendChild(st);
  function patch(html){
    if (typeof html !== "string" || !document.body) return;
    var parsed = new DOMParser().parseFromString(html, "text/html");
    /* L-9: template scripts are never executed in the editor. they are removed from the parsed copy first, so no browser rule about parsed scripts can matter. */
    Array.prototype.forEach.call(parsed.querySelectorAll("script"), function(n){ n.remove(); });
    var attrs = parsed.documentElement.attributes;
    Array.prototype.forEach.call(document.documentElement.getAttributeNames(), function(a){ if (!parsed.documentElement.hasAttribute(a)) document.documentElement.removeAttribute(a); });
    Array.prototype.forEach.call(attrs, function(a){ document.documentElement.setAttribute(a.name, a.value); });
    var key = function(n){ return n.id || (n.dataset && n.dataset.previewKey) || null; };
    /* morphdom matches elements by tag name, so it would rewrite the bridge's own <style> into the template's first <style>.
       The bridge nodes are set aside during the head patch and put back after it (moving a script does not run it again). */
    var own = Array.prototype.slice.call(document.head.querySelectorAll("[data-schedy-bridge]"));
    own.forEach(function(n){ n.parentNode.removeChild(n); });
    morphdom(document.head, parsed.head, { childrenOnly: true, getNodeKey: key });
    own.forEach(function(n){ document.head.appendChild(n); });
    morphdom(document.body, parsed.body, { childrenOnly: true, getNodeKey: key });
  }
  function focusField(name, attempts){
    if (typeof name !== "string") return;
    var esc = (window.CSS && CSS.escape) ? CSS.escape(name) : name.replace(/["\\\\]/g, "\\\\$&");
    var t = document.querySelector('[data-scroll-target="' + esc + '"]') || document.querySelector('[data-schedy-field="' + esc + '"]') || document.getElementById(name);
    if (!t) { if (attempts < 40) setTimeout(function(){ focusField(name, attempts + 1); }, 50); return; }
    var rect = t.getBoundingClientRect();
    var current = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    window.scrollTo({ top: Math.max(0, current + rect.top - Math.max(60, (window.innerHeight || 700) * 0.34)), behavior: "smooth" });
    t.classList.add("schedy-focus");
    setTimeout(function(){ t.classList.remove("schedy-focus"); }, 1200);
  }
  window.addEventListener("message", function(e){
    if (e.source !== window.parent) return;
    var d = e.data;
    if (!d || typeof d !== "object") return;
    if (d.schedy === "patch") patch(d.html);
    else if (d.schedy === "focus") focusField(d.target, 0);
  });
})();`;

const escapeScript = (s: string) => s.replace(/<\/script/gi, "<\\/script");

/** L-9: the frame starts as an empty shell that holds only the bridge. The compiled invitation (head, styles and body, without its
 *  scripts) arrives in the first "patch" message, so nothing from the raw template is ever executed in the editor. morphdom is
 *  inlined because the frame cannot import from the app. */
export function previewShell(): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><script data-schedy-bridge="1">${escapeScript(morphdomUmd)}</script><script data-schedy-bridge="1">${escapeScript(BRIDGE)}</script></head><body></body></html>`;
}

export type PreviewMessage = { schedy: "patch"; html: string } | { schedy: "focus"; target: string };
