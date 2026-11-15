import { createPortal } from "react-dom";
import { useEffect, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { X } from "./Icons";

interface Props {
  /** Accessible name of the sheet. */
  label: string;
  onClose: () => void;
  /** Info block at the top (name, status, date...). */
  head: ReactNode;
  /** Action list. Gets role="menu" so the arrow keys work the same as in the desktop menu. */
  children: ReactNode;
  bodyRef?: RefObject<HTMLDivElement>;
  onBodyKeyDown?: (e: KeyboardEvent<HTMLElement>) => void;
}

/** Phone-only sheet that slides up from the bottom. Tapping the dimmed area or the close button closes it. */
export function BottomSheet({ label, onClose, head, children, bodyRef, onBodyKeyDown }: Props) {
  /* Keep the page behind from scrolling while the sheet is open. */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return createPortal(
    <div className="bs-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bs-sheet" role="dialog" aria-modal="true" aria-label={label}>
        <span className="bs-handle" aria-hidden="true" />
        <div className="bs-head">
          <div className="bs-info">{head}</div>
          <button type="button" className="bs-close" aria-label="Close menu" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="bs-body" role="menu" ref={bodyRef} onKeyDown={onBodyKeyDown}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
