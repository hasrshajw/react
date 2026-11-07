import React, { memo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import morphdom from "morphdom";
import { LayoutTemplate, X } from "../../../components/Icons";
import { TARGETS } from "../constants";

export interface FocusRequest { field: string; id: string }

interface Props {
  slot: HTMLElement;
  source: string;
  compiled: string;
  selected?: { id: string; name: string };
  open: boolean;
  focusRequest: FocusRequest | null;
  onClose: () => void;
  onChoose: () => void;
}

/* React.memo: typing in the form changes `compiled`, but nothing else here, and
   unrelated renders of the page (toasts, save state, nav) skip this panel entirely.
   The iframe is patched in place with morphdom instead of being reloaded. */
export const LivePreview = memo(function LivePreview({ slot, source, compiled, selected, open, focusRequest, onClose, onChoose }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = frameRef.current;
    if (!iframe || !compiled || !iframe.contentDocument?.body) return;
    const parsed = new DOMParser().parseFromString(compiled, "text/html");
    morphdom(iframe.contentDocument.body, parsed.body, {
      childrenOnly: true,
      getNodeKey: (node) => (node as HTMLElement).id || (node as HTMLElement).dataset?.previewKey || null,
    });
  }, [compiled, slot]);

  /* scroll the preview to the field being edited */
  useEffect(() => {
    if (!focusRequest || !selected) return;
    let cancelled = false, attempts = 0;
    const targetName = TARGETS[focusRequest.field] || focusRequest.field;
    const run = () => {
      if (cancelled) return;
      const iframe = frameRef.current, doc = iframe?.contentDocument, win = iframe?.contentWindow;
      if (!doc?.body || !win) { if (attempts++ < 40) setTimeout(run, 50); return; }
      const escaped = CSS.escape(targetName);
      const target = doc.querySelector(`[data-scroll-target="${escaped}"]`) || doc.querySelector(`[data-schedy-field="${escaped}"]`) || doc.getElementById(targetName);
      if (!target) { if (attempts++ < 40) setTimeout(run, 50); return; }
      const rect = target.getBoundingClientRect();
      const current = win.scrollY || doc.documentElement.scrollTop || doc.body.scrollTop || 0;
      win.scrollTo({ top: Math.max(0, current + rect.top - Math.max(60, (win.innerHeight || 700) * 0.34)), behavior: "smooth" });
      target.classList.add("schedy-focus");
      window.setTimeout(() => target.classList.remove("schedy-focus"), 1200);
    };
    const timer = setTimeout(run, 100);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [focusRequest, selected]);

  return createPortal(
    <aside className={`create-live-preview-panel ${open ? "mobile-open" : ""}`}>
      <div className="create-live-preview-head">
        <div>
          <b>Live Preview</b>
          <small>{selected?.name || "No template selected"}</small>
        </div>
        <button type="button" aria-label="Close preview" onClick={onClose}><X size={18} /></button>
      </div>
      <div className="create-live-preview-body">
        {selected ? (
          <iframe key={selected.id} ref={frameRef} title="Invitation preview" srcDoc={source} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
        ) : (
          <div className="empty">
            <LayoutTemplate size={28} />
            <b>Pick a template to start</b>
            <span>Your invitation appears here and updates as you type.</span>
            <button type="button" className="primary" onClick={onChoose}>Choose a template</button>
          </div>
        )}
      </div>
    </aside>,
    slot
  );
});
