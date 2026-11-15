import { useEffect, useRef } from "react";

/* Phone "layers" (the bottom sheet, selection mode) close with the browser's back gesture / back button.
   One history entry is shared by every open layer: it is pushed when the first layer opens and taken
   back when the last one closes, so closing a layer by hand never leaves a dead entry behind. */

type Layer = { close: () => void };
const layers: Layer[] = [];
let entryPushed = false;
let ownBack = false;
let listening = false;
let timer = 0;

const MARK = "__backClose";
const ours = () => (window.history.state as Record<string, unknown> | null)?.[MARK] === true;

function onPop() {
  if (ownBack) { ownBack = false; return; }
  if (!entryPushed) return;
  entryPushed = false;
  /* The person went back: close the top layer. It unregisters itself when it unmounts. */
  layers[layers.length - 1]?.close();
  settle();
}

/* Runs after React has committed, so a layer that closes while another opens (sheet -> selection mode) keeps the entry. */
function settle() {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    if (layers.length > 0 && !entryPushed) {
      window.history.pushState({ ...(window.history.state ?? {}), [MARK]: true }, "");
      entryPushed = true;
    } else if (layers.length === 0 && entryPushed) {
      entryPushed = false;
      /* If something navigated meanwhile (Edit, Preview...), the entry is no longer on top: leave history alone. */
      if (ours()) { ownBack = true; window.history.back(); }
    }
    if (layers.length === 0 && listening) { window.removeEventListener("popstate", onPop); listening = false; }
  }, 0);
}

/** While `active`, the browser's back action calls `onBack` instead of leaving the page. */
export function useBackClose(active: boolean, onBack: () => void) {
  const cb = useRef(onBack);
  cb.current = onBack;
  useEffect(() => {
    if (!active || typeof window === "undefined") return;
    const layer: Layer = { close: () => cb.current() };
    layers.push(layer);
    if (!listening) { window.addEventListener("popstate", onPop); listening = true; }
    settle();
    return () => {
      const i = layers.indexOf(layer);
      if (i >= 0) layers.splice(i, 1);
      settle();
    };
  }, [active]);
}
