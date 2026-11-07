import { useEffect, useState } from "react";

export interface AsyncState<T> { data: T | null; loading: boolean; error: boolean }

/** Runs `load` once on mount. `loading` is true until it settles. */
export function useAsync<T>(load: () => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: false });
  useEffect(() => {
    let live = true;
    load().then(
      (data) => live && setState({ data, loading: false, error: false }),
      () => live && setState({ data: null, loading: false, error: true }),
    );
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return state;
}
