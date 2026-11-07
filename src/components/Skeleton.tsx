import type { CSSProperties } from "react";

type Size = number | string;
const px = (v?: Size) => (typeof v === "number" ? `${v}px` : v);

/** A standalone shimmer block. Prefer SkText / the `sk-bg` ghost class when the real element already exists. */
export function Sk({ w, h, r, circle, className = "", style }: {
  w?: Size; h?: Size; r?: Size; circle?: boolean; className?: string; style?: CSSProperties;
}) {
  return (
    <i
      className={`sk ${className}`.trim()}
      style={{ width: px(w), height: px(h), borderRadius: circle ? "50%" : px(r), ...style }}
      aria-hidden="true"
    />
  );
}

/** A text-height bar. Put it INSIDE the real element so it inherits that element's font size and line height.
 *  A number is a width in characters (ch). */
export function SkText({ w = 8, className = "" }: { w?: Size; className?: string }) {
  const width = typeof w === "number" ? `${w}ch` : w;
  return <i className={`sk sk-text ${className}`.trim()} style={{ "--w": width } as CSSProperties} aria-hidden="true" />;
}

/** Tells screen readers that something is loading (the shimmer itself is hidden from them). */
export function Loading({ label = "Loading…" }: { label?: string }) {
  return <span className="sr-only" role="status">{label}</span>;
}

/** Thin bar across the top of the screen while data is refreshed in place (the old data stays visible). */
export function RefreshBar({ active }: { active: boolean }) {
  return <div className={`top-progress${active ? " on" : ""}`} role="progressbar" aria-label="Refreshing" aria-hidden={!active} />;
}

