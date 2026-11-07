import { useCallback, useState, type SyntheticEvent } from "react";

/** For previews that render slowly (an <img>, or an <iframe> with a whole invitation in it).
 *  Put `className` on the element and `onLoad` / `onError` / `imgRef` on it, and render a shimmer
 *  (`<i className="sk thumb-shimmer" />`) while `loaded` is false: the preview fades in once it is ready. */
export function useFadeIn() {
  const [loaded, setLoaded] = useState(false);
  const done = useCallback((_e?: SyntheticEvent) => setLoaded(true), []);
  /* A cached image can finish before React hears about it. */
  const imgRef = useCallback((el: HTMLImageElement | null) => { if (el?.complete && el.naturalWidth > 0) setLoaded(true); }, []);
  return { loaded, className: `thumb-media${loaded ? " is-loaded" : ""}`, onLoad: done, onError: done, imgRef };
}
