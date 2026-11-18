import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LayoutTemplate, X } from "../../../components/Icons";
import { Loading, Sk, SkText } from "../../../components/Skeleton";
import { TARGETS } from "../constants";
import { previewShell, type PreviewMessage } from "../previewBridge";

export interface FocusRequest { field: string; id: string }

interface Props {
  slot: HTMLElement;
  compiled: string;
  selected?: { id: string; name: string };
  open: boolean;
  /** A template is expected (editing, or /create?template=…) but has not arrived yet. */
  loading?: boolean;
  focusRequest: FocusRequest | null;
  onClose: () => void;
  /** Admin: opens the template section. Omit it (client page) and the empty state has no button. */
  onChoose?: () => void;
  emptyTitle?: string;
  emptyHint?: string;
}

/* React.memo: typing in the form changes `compiled`, but nothing else here, and
   unrelated renders of the page (toasts, save state, nav) skip this panel entirely.
   The iframe is patched in place (morphdom runs inside the frame, driven by postMessage; L-9: the frame holds the compiled document without its scripts) instead of being reloaded. */
/* Phones (<= 900px): the panel is drawn inside the page frame (#main), not in the side slot, so the mobile menu and its scrim stack above it exactly as they do above the form.
   On desktop it stays in the side slot. */
function usePhoneHost(slot: HTMLElement): HTMLElement {
  const query = "(max-width: 900px)";
  const [phone, setPhone] = useState(() => typeof window !== "undefined" && window.matchMedia?.(query).matches);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(query);
    const on = () => setPhone(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return (phone && document.getElementById("main")) || slot;
}

export const LivePreview = memo(function LivePreview({ slot, compiled, selected, open, loading = false, focusRequest, onClose, onChoose, emptyTitle = "Pick a template to start", emptyHint = "Your invitation appears here and updates as you type." }: Props) {
  const host = usePhoneHost(slot);
  const frameRef = useRef<HTMLIFrameElement>(null);
  /* C-2: the frame has an opaque origin (no allow-same-origin), so everything goes through postMessage.
     `targetOrigin` must be "*" for an opaque origin; the content sent is only this user's own compiled preview. */
  const shell = useMemo(() => previewShell(), []);
  const loadedRef = useRef(false);
  const compiledRef = useRef(compiled);
  const focusRef = useRef<string | null>(null);
  compiledRef.current = compiled;
  const send = (msg: PreviewMessage) => frameRef.current?.contentWindow?.postMessage(msg, "*");

  /* a new frame (other template) starts unloaded; its onLoad sends the current content */
  useEffect(() => { loadedRef.current = false; }, [selected?.id]);

  const onFrameLoad = () => {
    loadedRef.current = true;
    if (compiledRef.current) send({ schedy: "patch", html: compiledRef.current });
    if (focusRef.current) send({ schedy: "focus", target: focusRef.current });
  };

  useEffect(() => {
    if (!compiled || !loadedRef.current) return;
    send({ schedy: "patch", html: compiled });
  }, [compiled, host]);

  /* scroll the preview to the field being edited */
  useEffect(() => {
    if (!focusRequest || !selected) return;
    const target = TARGETS[focusRequest.field] || focusRequest.field;
    focusRef.current = target;
    if (loadedRef.current) send({ schedy: "focus", target });
  }, [focusRequest, selected]);

  return createPortal(
    <aside className={`create-live-preview-panel ${open ? "mobile-open" : ""}`}>
      <div className="create-live-preview-head">
        <div>
          <b>Live Preview</b>
          <small>{loading ? <SkText w={14} /> : selected?.name || "No template selected"}</small>
        </div>
        <button type="button" aria-label="Close preview" onClick={onClose}><X size={18} /></button>
      </div>
      <div className="create-live-preview-body">
        {loading ? (
          <div className="lp-skel" aria-hidden="true">
            <Sk w="38%" h={9} />
            <Sk circle w={112} h={112} style={{ margin: "10px 0" }} />
            <Sk w="58%" h={24} />
            <Sk w={18} h={14} />
            <Sk w="54%" h={24} />
            <Sk w={64} h={2} style={{ margin: "10px 0" }} />
            <Sk w="42%" h={9} />
            <Sk w="66%" h={9} />
            <Sk w="52%" h={9} />
            <Loading label="Loading template" />
          </div>
        ) : selected ? (
          <iframe key={selected.id} ref={frameRef} title="Invitation preview" srcDoc={shell} onLoad={onFrameLoad} sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" />
        ) : (
          <div className="empty">
            <LayoutTemplate size={28} />
            <b>{emptyTitle}</b>
            <span>{emptyHint}</span>
            {onChoose && <button type="button" className="primary" onClick={onChoose}>Choose a template</button>}
          </div>
        )}
      </div>
    </aside>,
    host
  );
});
