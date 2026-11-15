import { useSyncExternalStore } from "react";

/* Same breakpoint as the stacked-card table layout in dashboard.css. */
const QUERY = "(max-width: 760px)";

export const isPhone = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(QUERY).matches;

const subscribe = (cb: () => void) => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const mq = window.matchMedia(QUERY);
  mq.addEventListener?.("change", cb);
  return () => mq.removeEventListener?.("change", cb);
};

/** True on phone-width screens, where table rows are cards and their actions live in a bottom sheet. */
export const useIsPhone = () => useSyncExternalStore(subscribe, isPhone, () => false);
