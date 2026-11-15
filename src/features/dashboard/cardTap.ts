import type { MouseEvent } from "react";

/** Phone cards open their menu (or toggle their selection) when the card itself is tapped.
 *  Taps on a button, link or checkbox inside the card keep doing their own job. */
export function onCardTap(e: MouseEvent<HTMLElement>, fn: () => void) {
  if ((e.target as HTMLElement).closest("button, a, input, label, select, textarea")) return;
  fn();
}
