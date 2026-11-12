import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Save, X } from "../../../components/Icons";

/* Shown when the user tries to open another page with unsaved changes.
   Save    -> saves, then continues to the page they chose.
   Cancel  -> continues without saving; the local draft is kept, so the
              "Restore them?" card shows up when they come back.
   X / Esc -> stays on this page and keeps editing. */
export function LeaveModal({ onSave, onCancel, onStay }: { onSave: () => void; onCancel: () => void; onStay: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const stayRef = useRef<() => void>(onStay);
  stayRef.current = onStay;
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { stayRef.current(); return; }
      if (e.key !== "Tab") return;
      const els = [...ref.current!.querySelectorAll<HTMLElement>("button:not([disabled])")];
      if (!els.length) return;
      const first = els[0] as HTMLElement, last = els[els.length - 1] as HTMLElement;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); if (prev?.isConnected) prev.focus?.(); };
  }, []);
  return createPortal(
    <div className="cx-overlay" onMouseDown={(e) => e.target === e.currentTarget && onStay()}>
      <div className="cx-modal lv" ref={ref} role="alertdialog" aria-modal="true" aria-labelledby="lv-title" aria-describedby="lv-desc">
        <button type="button" className="cx-close" aria-label="Keep editing" onClick={onStay}><X size={17} /></button>
        <div className="cx-ok warn"><AlertCircle size={30} /></div>
        <h3 id="lv-title">Save your changes?</h3>
        <p id="lv-desc">You have unsaved changes on this invitation. Save them before you leave, or cancel and we'll keep a draft you can restore when you come back.</p>
        <div className="cx-grid lv-actions">
          <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
          <button type="button" className="primary" data-autofocus onClick={onSave}><Save size={16} /> Save</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* =========================================================
   PAGE
   ========================================================= */
