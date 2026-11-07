import type { MouseEvent } from "react";
import { Link } from "react-router-dom";
import { Link2, MoreHorizontal, Pencil, Smartphone } from "../../../components/Icons";
import type { InvitationRow } from "../../../types/dashboard";

interface Props {
  x: InvitationRow;
  live: boolean;
  previewActive: boolean;
  menuOpen: boolean;
  onPreview: (x: InvitationRow) => void;
  onCopyLink: (x: InvitationRow) => void;
  onOpenMenu: (e: MouseEvent<HTMLElement>, x: InvitationRow) => void;
}

/** Preview / Edit / Copy link / More buttons at the end of an invitation row. */
export function RowActions({ x, live, previewActive, menuOpen, onPreview, onCopyLink, onOpenMenu }: Props) {
  return (
    <div className="row-actions">
      <button type="button" className={`icon-btn${previewActive ? " on" : ""}`} title="Preview" aria-label="Preview invitation" onClick={() => onPreview(x)}>
        <Smartphone size={16} />
      </button>
      <Link to={`/create?edit=${x.id}`} className="act-btn"><Pencil size={14} /> Edit</Link>
      <button
        type="button" className="act-btn" disabled={!live}
        title={live ? "Copy invitation link" : "Publish to enable the link"}
        onClick={() => onCopyLink(x)}
      >
        <Link2 size={14} /> Link
      </button>
      <button
        type="button" className="icon-btn menu-trigger" aria-label="More actions" aria-haspopup="menu"
        aria-expanded={menuOpen} onClick={(e) => onOpenMenu(e, x)}
      >
        <MoreHorizontal size={16} />
      </button>
    </div>
  );
}
