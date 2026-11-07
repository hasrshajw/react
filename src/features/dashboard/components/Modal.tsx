import { useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  X,
} from "../../../components/Icons";
import { useEscape, useFocusTrap } from "../../../hooks/useEscape";

interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  headExtra?: ReactNode;
}

export function Modal({ title, subtitle, onClose, children, width = 440, headExtra }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEscape(true, onClose);
  useFocusTrap(ref);
  return createPortal(
    <div className="dx-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dx-modal" ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} style={{ width }}>
        <div className="dx-modal-head">
          <div>
            <b>{title}</b>
            {subtitle && <small>{subtitle}</small>}
          </div>
          <div className="dx-modal-actions">
            {headExtra}
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><X size={16} /></button>
          </div>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
