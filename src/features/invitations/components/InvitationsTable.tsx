import type { MouseEvent, RefObject } from "react";
import { CalendarDays, Eye, Loader2 } from "../../../components/Icons";
import {
  coupleName, fmt, fmtDate, getViews, initials, isPast, statusChip,
} from "../../../lib/dashboardData";
import type { InvitationRow } from "../../../types/dashboard";
import { RowActions } from "../../dashboard/components/RowActions";
import { Countdown } from "./Countdown";
import { useIsPhone } from "../../../hooks/useIsPhone";
import { onCardTap, useLongPress } from "../../dashboard/cardTap";
import { templateOf } from "../utils";

interface Props {
  shown: InvitationRow[];
  total: number;
  visibleCount: number;
  /** More invitations exist on the server than are loaded: show the "More" button. */
  hasMore?: boolean;
  loadingMore?: boolean;
  onMore?: () => void;
  sel: Set<string>;
  allOnPage: boolean;
  headCheck: RefObject<HTMLInputElement | null>;
  topId: string | null;
  topTemplate?: { name: string; n: number };
  previewId?: string;
  menuId?: string;
  /** Invitation ids that currently have a pending change request (admin review queue). */
  pendingIds?: ReadonlySet<string>;
  isPub: (x: InvitationRow) => boolean;
  onTogglePage: () => void;
  onToggle: (id: string) => void;
  onPreview: (x: InvitationRow) => void;
  onCopyLink: (x: InvitationRow) => void;
  onOpenMenu: (e: MouseEvent<HTMLElement>, x: InvitationRow) => void;
  /** Phone only: checkboxes are hidden until "Select" is chosen in a card's menu; Done leaves selection mode. */
  selecting?: boolean;
  onDone?: () => void;
  /** Phone only: long-press on a card (a shortcut into selection mode, ticking that card). */
  onLongPress?: (x: InvitationRow) => void;
}

export function InvitationsTable(p: Props) {
  const { total } = p;
  const phone = useIsPhone();
  const selecting = phone && !!p.selecting;
  const longPress = useLongPress();
  return (
    <>
      {selecting && (
        <div className="sel-bar">
          <label>
            <input ref={p.headCheck} type="checkbox" checked={p.allOnPage} aria-label="Select all invitations on this page" onChange={p.onTogglePage} />
            <span>{p.sel.size ? `${p.sel.size} selected` : "Select all"}</span>
          </label>
          <button type="button" className="act-btn solid" onClick={p.onDone}>Done</button>
        </div>
      )}
      <div className="table-scroll">
        <table className={`inv-table has-check${selecting ? " selecting" : ""}`}>
          <thead>
            <tr>
              <th className="th-check">
                <input ref={selecting ? undefined : p.headCheck} type="checkbox" checked={p.allOnPage} aria-label="Select all invitations on this page" onChange={p.onTogglePage} />
              </th>
              <th>Couple</th>
              <th>Client</th>
              <th>Event date</th>
              <th>Invitation views</th>
              <th className="th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {p.shown.map((x) => {
              const live = p.isPub(x);
              const past = isPast(x);
              const chip = statusChip(x, live);
              const checked = p.sel.has(x.id);
              const clientEmail = (x.client_email || "").trim();
              const pending = p.pendingIds?.has(x.id) ?? false;
              return (
                <tr
                  key={x.id} className={`${p.previewId === x.id ? "active" : ""}${checked ? " sel" : ""}${past ? " is-past" : ""}`.trim()}
                  onClick={phone ? (e) => { if (longPress.consumed()) return; onCardTap(e, () => (selecting ? p.onToggle(x.id) : p.onOpenMenu(e, x))); } : undefined}
                  {...(phone && !selecting && p.onLongPress ? longPress.bind(() => p.onLongPress?.(x)) : {})}
                >
                  <td className="td-check">
                    <input type="checkbox" checked={checked} aria-label={`Select ${coupleName(x)}`} onChange={() => p.onToggle(x.id)} />
                  </td>
                  <td className="td-couple">
                    <div className="cell-couple">
                      <div className="row-avatar">{initials(x)}</div>
                      <div className="cell-stack">
                        <b>{coupleName(x)}</b>
                        <span className="cell-line">
                          <span className={`chip ${chip[0]}`}>{chip[1]}</span>
                          {pending && <span className="chip pending">Pending review</span>}
                          <small className="tpl-name">{templateOf(x).name}</small>
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="td-client" data-label="Client">
                    {clientEmail
                      ? <span className="client-email" title={clientEmail}>{clientEmail}</span>
                      : <span className="muted">—</span>}
                  </td>
                  <td className="td-date" data-label="Event date">
                    <div className="cell-stack">
                      <span className="cell-date"><CalendarDays size={14} /> {x.event_date ? fmtDate(x.event_date) : "Date not set"}</span>
                      <span className="cd-wrap"><Countdown x={x} live={live} /></span>
                    </div>
                  </td>
                  <td className="td-views" data-label="Views">
                    <span className="views">
                      <Eye size={15} /> {fmt(getViews(x))}
                      {p.topId === x.id && <span className="top">Top</span>}
                    </span>
                  </td>
                  <td className="td-actions">
                    <RowActions
                      x={x} live={live} previewActive={p.previewId === x.id} menuOpen={p.menuId === x.id}
                      onPreview={p.onPreview} onCopyLink={p.onCopyLink} onOpenMenu={p.onOpenMenu}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="table-foot">
        <span>
          {p.hasMore ? `Showing ${total} of ${p.visibleCount}` : `Showing all ${total}`}
          {p.topTemplate && p.visibleCount > 1 && (
            <span className="insight" title="Template used by the most invitations"> · Most used template: <b>{p.topTemplate.name}</b> ({p.topTemplate.n} of {p.visibleCount})</span>
          )}
        </span>
      </div>
      {p.hasMore && (
        <div className="more-row">
          <button type="button" className="more-btn" disabled={p.loadingMore} onClick={p.onMore}>
            {p.loadingMore ? <><Loader2 className="spin" size={15} /> Loading…</> : "More"}
          </button>
        </div>
      )}
    </>
  );
}
