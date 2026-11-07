import { createPortal } from "react-dom";
import { Check } from "../../../components/Icons";
import type { ToastState } from "../hooks/useNotify";

export function Toast({ toast, onDismiss }: { toast: ToastState | null; onDismiss: () => void }) {
  if (!toast) return null;
  return createPortal(
    <div className="dx-toast" role="status">
      <Check size={15} /> {toast.msg}
      {toast.undo && (
        <button type="button" onClick={() => { toast.undo?.(); onDismiss(); }}>Undo</button>
      )}
    </div>,
    document.body
  );
}
