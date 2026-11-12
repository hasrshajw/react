import { createPortal } from "react-dom";
import type { KeyboardEvent, ReactNode, RefObject } from "react";
import type { RowMenuState } from "../hooks/useRowMenu";

interface Props {
  menu: RowMenuState;
  menuRef: RefObject<HTMLDivElement>;
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
  children: ReactNode;
}

/** Fixed-position menu rendered in a portal so a scrolling table never clips it. */
export function RowMenu({ menu, menuRef, onKeyDown, children }: Props) {
  return createPortal(
    <div
      className="row-menu" ref={menuRef} onKeyDown={onKeyDown} role="menu"
      style={{ right: menu.right, top: menu.top, bottom: menu.bottom }}
    >
      {children}
    </div>,
    document.body
  );
}
