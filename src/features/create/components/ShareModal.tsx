import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Copy, CheckCircle2, LayoutDashboard, MessageCircle, Plus } from "../../../components/Icons";
import { DASHBOARD_PATH } from "../constants";
import { useLatest } from "../../../hooks/useLatest";

export function ShareModal({ name, link, onCopy, onWhatsApp, onClose, onAnother }: { name: string; link: string; onCopy: () => void; onWhatsApp: () => void; onClose: () => void; onAnother: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useLatest(onClose);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("button, a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { closeRef.current(); return; }
      if (e.key !== "Tab") return;
      const els = [...ref.current!.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
      if (!els.length) return;
      const first = els[0] as HTMLElement, last = els[els.length - 1] as HTMLElement;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); if (prev?.isConnected) prev.focus?.(); };
  }, [closeRef]);
  return createPortal(
    <div className="cx-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cx-modal" ref={ref} role="dialog" aria-modal="true" aria-label="Invitation saved">
        <div className="cx-ok"><CheckCircle2 size={30} /></div>
        <h3>Invitation saved</h3>
        <p><b>{name}</b> is ready. Share it with your guests or keep editing.</p>
        <div className="cx-link">
          <code>{link}</code>
          <button type="button" className="cx-copy" aria-label="Copy link" onClick={onCopy}><Copy size={15} /></button>
        </div>
        <div className="cx-grid">
          <button type="button" className="secondary" onClick={onCopy}><Copy size={15} /> Copy link</button>
          <button type="button" className="secondary wa" onClick={onWhatsApp}><MessageCircle size={15} /> WhatsApp</button>
        </div>
        <div className="cx-foot">
          <Link to={DASHBOARD_PATH} className="primary"><LayoutDashboard size={16} /> Go to dashboard</Link>
          <div className="cx-grid">
            <button type="button" className="secondary" onClick={onClose}>Keep editing</button>
            <button type="button" className="secondary" onClick={onAnother}><Plus size={15} /> Create another</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
