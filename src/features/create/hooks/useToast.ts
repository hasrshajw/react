import { useCallback, useEffect, useRef, useState } from "react";

export interface ToastState { msg: string; tone: "ok" | "error" }

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notify = useCallback((msg: string, tone: ToastState["tone"] = "ok") => {
    clearTimeout(timer.current);
    setToast({ msg, tone });
    timer.current = setTimeout(() => setToast(null), tone === "error" ? 3500 : 2200);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return { toast, notify };
}
