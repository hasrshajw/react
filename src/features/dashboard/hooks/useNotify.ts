import { useCallback, useEffect, useRef, useState } from "react";
import type { Notify } from "../../../types/dashboard";

export interface ToastState { msg: string; undo?: () => void }

/** Bottom toast with an optional Undo action (6s when undoable, 2.2s otherwise). */
export function useNotify() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const notify: Notify = useCallback((msg, undo) => {
    clearTimeout(timer.current);
    setToast({ msg, undo });
    timer.current = setTimeout(() => setToast(null), undo ? 6000 : 2200);
  }, []);

  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    setToast(null);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);
  return { toast, notify, dismiss };
}
