// Tiny hook tester (task M-14): no extra dependency, only react-dom and React's own `act`. Use in a file that starts with
// `// @vitest-environment jsdom`.
import { act } from "react";
import { createRoot } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

export function renderHook<T, P = undefined>(hook: (props: P) => T, initialProps?: P) {
  const result = { current: undefined as T };
  const root = createRoot(document.createElement("div"));
  const Probe = ({ p }: { p: P }) => { result.current = hook(p); return null; };
  act(() => { root.render(<Probe p={initialProps as P} />); });
  return {
    result,
    rerender: (p?: P) => act(() => { root.render(<Probe p={p as P} />); }),
    unmount: () => act(() => { root.unmount(); }),
  };
}

/** Lets promises that are already resolved run, and React apply the state they set. */
export const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });
/** Moves fake time forward and lets the promises that this wakes up finish. */
export const advance = (ms: number) => act(async () => { const { vi } = await import("vitest"); await vi.advanceTimersByTimeAsync(ms); });
export { act };
