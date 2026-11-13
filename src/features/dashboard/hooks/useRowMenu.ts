import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type MutableRefObject } from "react";
import { useEscape } from "../../../hooks/useEscape";
import type { InvitationRow } from "../../../types/dashboard";

export interface RowMenuState {
  x: InvitationRow;
  right: number;
  top?: number;
  bottom?: number;
}

/** State and keyboard handling for the fixed "more actions" menu of a table row.
 *  `opener` is shared with the page so focus returns to whatever opened the menu, panel or modal. */
export function useRowMenu(opener: MutableRefObject<HTMLElement | null>) {
  const [menu, setMenu] = useState<RowMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = (refocus = false) => {
    setMenu(null);
    if (refocus) {
      const el = opener.current;
      if (el && el.isConnected) setTimeout(() => el.focus?.(), 0);
    }
  };

  const openMenu = (e: MouseEvent<HTMLElement>, x: InvitationRow) => {
    if (menu?.x.id === x.id) { closeMenu(true); return; }
    opener.current = e.currentTarget;
    const r = e.currentTarget.getBoundingClientRect();
    const up = window.innerHeight - r.bottom < 240;
    setMenu({
      x,
      right: window.innerWidth - r.right,
      top: up ? undefined : r.bottom + 6,
      bottom: up ? window.innerHeight - r.top + 6 : undefined,
    });
  };

  useEscape(!!menu, () => closeMenu(true));

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const down = (e: globalThis.MouseEvent) => {
      const t = e.target as Element;
      if (!t.closest(".row-menu") && !t.closest(".menu-trigger")) close();
    };
    document.addEventListener("mousedown", down);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", down);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  /* Focus the first item when a menu opens or moves to another row (not when only its position changes). */
  const menuOpen = !!menu;
  const menuRowId = menu?.x?.id;
  useEffect(() => {
    if (menuOpen) menuRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }, [menuOpen, menuRowId]);

  const onMenuKey = (e: KeyboardEvent<HTMLElement>) => {
    const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") || [])];
    if (!items.length) return;
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    else if (e.key === "Home") { e.preventDefault(); items[0].focus(); }
    else if (e.key === "End") { e.preventDefault(); items[items.length - 1].focus(); }
    else if (e.key === "Tab") { e.preventDefault(); closeMenu(true); }
  };

  return { menu, menuRef, openMenu, closeMenu, onMenuKey };
}
