import { useRef, type MutableRefObject } from "react";

/** Holds the newest value of something (usually a callback prop) in a ref that never changes identity.
 *  Effects that must run only when their own inputs change (not when a parent passes a new function) read
 *  `ref.current` instead of listing the callback as a dependency. Same pattern as `useEscape`. */
export function useLatest<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
