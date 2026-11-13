import type { MouseEvent, RefObject } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Eye } from "../../../components/Icons";
import {
  PAGE_SIZE, coupleName, fmt, fmtDate, getViews, initials, isPast, statusChip,
} from "../../../lib/dashboardData";
import type { InvitationRow } from "../../../types/dashboard";
import { RowActions } from "../../dashboard/components/RowActions";
import { Countdown } from "./Countdown";
import { templateOf } from "../utils";

interface Props {
  shown: InvitationRow[];
  total: number;
  visibleCount: number;
  page: number;
  pages: number;
  sel: Set<string>;
  allOnPage: boolean;
  headCheck: RefObject<HTMLInputElement>;
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
  onPage: (n: number) => void;
}

export function InvitationsTable(p: Props) {
  const { page: cur, pages, total } = p;
  return (
    <>
      <div className="table-scroll">
        <table className="inv-table has-check">
          <thead>
            <tr>
              <th className="th-check">
                <input ref={p.headCheck} type="checkbox" checked={p.allOnPage} aria-label="Select all invitations on this page" onChange={p.onTogglePage} />
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
                <tr key={x.id} className={`${p.previewId === x.id ? "active" : ""}${checked ? " sel" : ""}${past ? " is-past" : ""}`.trim()}>
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
          {total > PAGE_SIZE
            ? `Showing ${(cur - 1) * PAGE_SIZE + 1}–${Math.min(cur * PAGE_SIZE, total)} of ${total}`
            : `Showing all ${total}`}
          {p.topTemplate && p.visibleCount > 1 && (
            <span className="insight" title="Template used by the most invitations"> · Most used template: <b>{p.topTemplate.name}</b> ({p.topTemplate.n} of {p.visibleCount})</span>
          )}
        </span>
        {total > PAGE_SIZE && (
          <div className="pager">
            <button type="button" className="icon-btn" aria-label="Previous page" disabled={cur === 1} onClick={() => p.onPage(cur - 1)}><ChevronLeft size={16} /></button>
            <span className="page-no">{cur} / {pages}</span>
            <button type="button" className="icon-btn" aria-label="Next page" disabled={cur === pages} onClick={() => p.onPage(cur + 1)}><ChevronRight size={16} /></button>
          </div>
        )}
      </div>
    </>
  );
}
