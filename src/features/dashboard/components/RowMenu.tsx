import { createPortal } from "react-dom";
import type { KeyboardEvent, ReactNode, RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Eye, LayoutTemplate, Link2, Mail, Pencil, Smartphone } from "../../../components/Icons";
import { BottomSheet } from "../../../components/BottomSheet";
import { useIsPhone } from "../../../hooks/useIsPhone";
import { coupleName, dayDiff, fmt, fmtDate, getViews, initials, statusChip, whenText } from "../../../lib/dashboardData";
import type { InvitationRow } from "../../../types/dashboard";
import { templateOf } from "../../invitations/utils";
import type { RowMenuState } from "../hooks/useRowMenu";

interface Props {
  menu: RowMenuState;
  menuRef: RefObject<HTMLDivElement>;
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
  /** Phone only: the sheet closes through this. */
  onClose: (refocus?: boolean) => void;
  /** Phone only: whether the invitation has a public link (decides the status chip). */
  live: boolean;
  /** Phone only: the buttons that sit next to the menu button on desktop (Preview, Edit, Link). */
  lead?: ReactNode;
  children: ReactNode;
}

/** The "more actions" menu of a table row. On desktop it is a small fixed-position menu rendered in a portal so a scrolling
 *  table never clips it. On a phone it is a bottom sheet with the invitation's details and every action. */
export function RowMenu({ menu, menuRef, onKeyDown, onClose, live, lead, children }: Props) {
  const phone = useIsPhone();
  if (phone) {
    const x = menu.x;
    const chip = statusChip(x, live);
    const when = whenText(dayDiff(x.event_date));
    return (
      <BottomSheet
        label={`Actions for ${coupleName(x)}`} onClose={() => onClose(true)} bodyRef={menuRef} onBodyKeyDown={onKeyDown}
        head={
          <>
            <div className="row-avatar bs-avatar">{initials(x)}</div>
            <div className="bs-text">
              <b>{coupleName(x)}</b>
              <span className="bs-meta"><span className={`chip ${chip[0]}`}>{chip[1]}</span></span>
              <span className="bs-facts">
                <span className="bs-fact"><CalendarDays size={13} />{x.event_date ? fmtDate(x.event_date) : "Date not set"}{when && <> · {when}</>}</span>
                <span className="bs-fact"><Eye size={13} />{fmt(getViews(x))} views</span>
                <span className="bs-fact"><LayoutTemplate size={13} />{templateOf(x).name}</span>
              </span>
              {(x.client_email || "").trim() && <span className="bs-email"><Mail size={13} />{x.client_email}</span>}
            </div>
          </>
        }
      >
        {lead}
        {children}
      </BottomSheet>
    );
  }
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

interface LeadProps {
  x: InvitationRow;
  live: boolean;
  onPreview: (x: InvitationRow) => void;
  onCopyLink: (x: InvitationRow) => void;
  onClose: (refocus?: boolean) => void;
}

/** Preview / Edit / Copy link: the three buttons a phone card no longer shows, as a row of tiles at the top of the sheet. */
export function RowMenuLead({ x, live, onPreview, onCopyLink, onClose }: LeadProps) {
  const navigate = useNavigate();
  return (
    <div className="bs-quick">
      <button type="button" role="menuitem" onClick={() => { onClose(false); onPreview(x); }}>
        <span className="bs-tile-ic"><Smartphone size={20} /></span><span>Preview</span>
      </button>
      <button type="button" role="menuitem" onClick={() => { onClose(false); navigate(`/create?edit=${x.id}`); }}>
        <span className="bs-tile-ic"><Pencil size={20} /></span><span>Edit</span>
      </button>
      <button type="button" role="menuitem" disabled={!live} onClick={() => { onCopyLink(x); onClose(true); }}>
        <span className="bs-tile-ic"><Link2 size={20} /></span><span>Copy link</span>
        {!live && <small>Publish first</small>}
      </button>
    </div>
  );
}
