import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, Eye, MoreHorizontal, Pencil } from "../../components/Icons";
import { BottomSheet } from "../../components/BottomSheet";
import { useEscape } from "../../hooks/useEscape";
import { useIsPhone } from "../../hooks/useIsPhone";
import { SkText } from "../../components/Skeleton";
import type { ReviewItem } from "../../lib/api";
import { coupleName, fmtDateTime, initials, timeAgo } from "../../lib/dashboardData";
import type { InvitationRow } from "../../types/dashboard";
import { templateOf } from "../invitations/utils";
import { fieldLabel } from "./fieldLabels";
import { STATUS_CHIP, STATUS_LABEL } from "./status";

interface Props {
  items: ReviewItem[];
  /** Invitation rows by id, for the couple name and template. A missing one (deleted, or not loaded) falls back to the id. */
  invitations: ReadonlyMap<string, InvitationRow>;
  selectedId: string | null;
  now: number;
  total: number;
  /** Older requests are not loaded yet ("View more" is shown). */
  hasMore?: boolean;
  onOpen: (item: ReviewItem) => void;
}

const fieldsText = (item: ReviewItem) => {
  const labels = item.changedKeys.map(fieldLabel);
  return labels.slice(0, 3).join(", ") + (labels.length > 3 ? ` +${labels.length - 3} more` : "");
};

/** Review queue table. Same cell layout and classes as the Invitations table, so both look and stack the same on small screens. */
export function ReviewsTable({ items, invitations, selectedId, now, total, hasMore = false, onOpen }: Props) {
  const phone = useIsPhone();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<ReviewItem | null>(null);
  useEscape(!!sheet, () => setSheet(null));
  const sheetInv = sheet ? invitations.get(sheet.invitationId) : undefined;
  return (
    <>
      <div className="table-scroll">
        <table className="inv-table">
          <thead>
            <tr>
              <th>Couple</th>
              <th>Client</th>
              <th>Changes</th>
              <th>Submitted</th>
              <th className="th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const inv = invitations.get(item.invitationId);
              const pending = item.status === "pending";
              const count = item.changedKeys.length;
              return (
                <tr key={item.id} className={selectedId === item.id ? "active" : undefined}>
                  <td className="td-couple">
                    <div className="cell-couple">
                      <div className="row-avatar">{inv ? initials(inv) : "?"}</div>
                      <div className="cell-stack">
                        <b>{inv ? coupleName(inv) : "Invitation unavailable"}</b>
                        <span className="cell-line">
                          <span className={`chip ${STATUS_CHIP[item.status]}`}>{STATUS_LABEL[item.status]}</span>
                          {inv && <small className="tpl-name">{templateOf(inv).name}</small>}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="td-client" data-label="Client">
                    {item.clientEmail
                      ? <span className="client-email" title={item.clientEmail}>{item.clientEmail}</span>
                      : <span className="muted">—</span>}
                  </td>
                  <td className="td-changes" data-label="Changes">
                    {count ? (
                      <div className="cell-stack">
                        <b>{count} {count === 1 ? "field" : "fields"}</b>
                        <small className="rv-fields">{fieldsText(item)}</small>
                      </div>
                    ) : <span className="muted">—</span>}
                  </td>
                  <td className="td-date" data-label="Submitted">
                    <div className="cell-stack">
                      <span className="cell-date"><CalendarDays size={14} /> {timeAgo(item.createdAt, now) || fmtDateTime(item.createdAt)}</span>
                      <small className="when" title={fmtDateTime(item.createdAt)}>{fmtDateTime(item.createdAt)}</small>
                    </div>
                  </td>
                  <td className="td-actions">
                    {phone ? (
                      /* Phone cards show one Menu button; the bottom sheet holds Review / View and Edit. */
                      <div className="row-actions">
                        <button type="button" className="act-btn menu-btn" aria-haspopup="dialog" onClick={() => setSheet(item)}>
                          <MoreHorizontal size={16} /> Menu
                        </button>
                      </div>
                    ) : (
                      <div className="row-actions">
                        <button type="button" className={`act-btn${pending ? " solid" : ""}`} onClick={() => onOpen(item)}>
                          {pending ? "Review" : "View"}
                        </button>
                        <Link to={`/create?edit=${encodeURIComponent(item.invitationId)}`} className="act-btn"><Pencil size={14} /> Edit</Link>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {phone && sheet && (
        <BottomSheet
          label={`Actions for ${sheetInv ? coupleName(sheetInv) : "this request"}`} onClose={() => setSheet(null)}
          head={
            <>
              <div className="row-avatar">{sheetInv ? initials(sheetInv) : "?"}</div>
              <div className="bs-text">
                <b>{sheetInv ? coupleName(sheetInv) : "Invitation unavailable"}</b>
                <span className="bs-meta"><span className={`chip ${STATUS_CHIP[sheet.status]}`}>{STATUS_LABEL[sheet.status]}</span></span>
                {sheet.clientEmail && <span className="bs-meta">{sheet.clientEmail}</span>}
                {sheet.changedKeys.length > 0 && <span className="bs-meta"><Eye size={13} /> {sheet.changedKeys.length} {sheet.changedKeys.length === 1 ? "field" : "fields"}: {fieldsText(sheet)}</span>}
                <span className="bs-meta"><CalendarDays size={13} /> {timeAgo(sheet.createdAt, now) || fmtDateTime(sheet.createdAt)} · {fmtDateTime(sheet.createdAt)}</span>
              </div>
            </>
          }
        >
          <button type="button" role="menuitem" onClick={() => { const it = sheet; setSheet(null); onOpen(it); }}>
            <Eye size={15} /> {sheet.status === "pending" ? "Review changes" : "View request"}
          </button>
          <button type="button" role="menuitem" onClick={() => { const id = sheet.invitationId; setSheet(null); navigate(`/create?edit=${encodeURIComponent(id)}`); }}>
            <Pencil size={15} /> Edit invitation
          </button>
        </BottomSheet>
      )}
      <div className="table-foot">
        <span>{hasMore ? `Showing the newest ${items.length}` : items.length === total ? `Showing all ${total}` : `Showing ${items.length} of ${total}`}</span>
      </div>
    </>
  );
}

interface SkeletonProps {
  rows?: number;
  /** Loading has not lasted long enough to show a skeleton yet: keep the space, draw nothing (see useSkeletonPhase). */
  hold?: boolean;
}

/** Placeholder while the queue loads. It is built from the same cells as the real rows (couple + status chip + template,
 *  client email, changes + field list, submitted + full date, Review / Edit buttons) and the same footer, so nothing moves
 *  when the data arrives. Static text (headers, button labels) is shown as is; only server data is ghosted. */
export function ReviewsTableSkeleton({ rows = 4, hold = false }: SkeletonProps) {
  const cls = hold ? "sk-hold" : "sk-reveal";
  return (
    <>
      <div className={`table-scroll ${cls}`} aria-busy="true">
        <table className="inv-table">
          <caption className="sr-only">Loading review queue</caption>
          <thead>
            <tr>
              <th>Couple</th><th>Client</th><th>Changes</th><th>Submitted</th>
              <th className="th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, i) => (
              <tr key={i} className="sk-row" aria-hidden="true">
                <td className="td-couple">
                  <div className="cell-couple">
                    <div className="row-avatar sk-bg">AB</div>
                    <div className="cell-stack">
                      <b><SkText w={16 - (i % 3) * 2} /></b>
                      <span className="cell-line">
                        <span className="chip sk-bg">Pending</span>
                        <small className="tpl-name"><SkText w={10} /></small>
                      </span>
                    </div>
                  </div>
                </td>
                <td className="td-client" data-label="Client">
                  <span className="client-email"><SkText w={14 - (i % 2) * 2} /></span>
                </td>
                <td className="td-changes" data-label="Changes">
                  <div className="cell-stack">
                    <b><SkText w={6} /></b>
                    <small className="rv-fields"><SkText w={14} /></small>
                  </div>
                </td>
                <td className="td-date" data-label="Submitted">
                  <div className="cell-stack">
                    <span className="cell-date"><CalendarDays size={14} /> <SkText w={8} /></span>
                    <small className="when"><SkText w={13} /></small>
                  </div>
                </td>
                <td className="td-actions">
                  <div className="row-actions">
                    <span className="act-btn sk-bg">Review</span>
                    <span className="act-btn sk-bg"><Pencil size={14} /> Edit</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={`table-foot ${cls}`} aria-hidden="true">
        <span><SkText w={16} /></span>
      </div>
    </>
  );
}
