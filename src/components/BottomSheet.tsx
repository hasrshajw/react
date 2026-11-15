import { createPortal } from "react-dom";
import { useEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject, type TouchEvent } from "react";
import { X } from "./Icons";
import { useBackClose } from "../hooks/useBackClose";

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

/** Drag farther than this (px) or faster than the speed below and the sheet closes on release. */
const CLOSE_DISTANCE = 90;
const CLOSE_SPEED = 0.6; // px per ms

/** Phone-only sheet that slides up from the bottom. Closes with the X, a tap on the dimmed area, a swipe down on the
 *  handle or header, or the browser's back action. */
export function BottomSheet({ label, onClose, head, children, bodyRef, onBodyKeyDown }: Props) {
  const sheet = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);

  /* Keep the page behind from scrolling while the sheet is open. */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useBackClose(true, onClose);

  const setOffset = (dy: number, animate: boolean) => {
    const el = sheet.current;
    if (!el) return;
    el.style.transition = animate ? "transform .2s ease" : "none";
    el.style.transform = dy > 0 ? `translateY(${dy}px)` : "";
  };
  const onGrabStart = (e: TouchEvent<HTMLElement>) => {
    /* The close button keeps doing its own job. */
    if ((e.target as HTMLElement).closest("button")) return;
    drag.current = { y: e.touches[0].clientY, t: Date.now(), dy: 0 };
  };
  const onGrabMove = (e: TouchEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    d.dy = Math.max(0, e.touches[0].clientY - d.y);
    setOffset(d.dy, false);
  };
  const onGrabEnd = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const speed = d.dy / Math.max(1, Date.now() - d.t);
    if (d.dy > CLOSE_DISTANCE || (d.dy > 30 && speed > CLOSE_SPEED)) onClose();
    else setOffset(0, true);
  };

  return createPortal(
    <div className="bs-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bs-sheet" role="dialog" aria-modal="true" aria-label={label} ref={sheet}>
        <div className="bs-grab" onTouchStart={onGrabStart} onTouchMove={onGrabMove} onTouchEnd={onGrabEnd} onTouchCancel={onGrabEnd}>
          <span className="bs-handle" aria-hidden="true" />
          <div className="bs-head">
            <div className="bs-info">{head}</div>
            <button type="button" className="bs-close" aria-label="Close menu" onClick={onClose}><X size={18} /></button>
          </div>
        </div>
        <div className="bs-body" role="menu" ref={bodyRef} onKeyDown={onBodyKeyDown}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
