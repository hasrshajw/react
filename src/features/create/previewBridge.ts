import morphdomUmd from "morphdom/dist/morphdom-umd.min.js?raw";

/* C-2: the live-preview iframe runs WITHOUT `allow-same-origin`, so the editor can no longer reach into its
   document. Instead the editor posts messages and this small script, injected into the frame, applies them.

   Messages (parent -> frame), all plain objects:
     { schedy: "patch", html }    morph the frame's <body> to match the compiled invitation
     { schedy: "focus", target }  scroll to a field and flash it
   Only messages whose `source` is the parent window are handled. The frame never sends anything back, so
   a template script cannot use this channel to reach the editor. */
const BRIDGE = `
(function(){
  if (window.__schedyBridge) return; window.__schedyBridge = true;
  var st = document.createElement("style");
  st.textContent = ".schedy-focus{outline:3px solid #a5b4fc;outline-offset:4px;border-radius:4px}";
  (document.head || document.documentElement).appendChild(st);
  function patch(html){
    if (typeof html !== "string" || !document.body) return;
    var parsed = new DOMParser().parseFromString(html, "text/html");
    morphdom(document.body, parsed.body, {
      childrenOnly: true,
      getNodeKey: function(n){ return n.id || (n.dataset && n.dataset.previewKey) || null; }
    });
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

/** The template source plus the bridge (morphdom is inlined because the frame cannot import from the app). */
export function withPreviewBridge(source: string): string {
  return `${source}<script>${escapeScript(morphdomUmd)}</script><script>${escapeScript(BRIDGE)}</script>`;
}

export type PreviewMessage = { schedy: "patch"; html: string } | { schedy: "focus"; target: string };
