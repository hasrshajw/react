import { Link } from "react-router-dom";
import { CalendarDays, Pencil } from "../../components/Icons";
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
  onOpen: (item: ReviewItem) => void;
}

const fieldsText = (item: ReviewItem) => {
  const labels = item.changedKeys.map(fieldLabel);
  return labels.slice(0, 3).join(", ") + (labels.length > 3 ? ` +${labels.length - 3} more` : "");
};

/** Review queue table. Same cell layout and classes as the Invitations table, so both look and stack the same on small screens. */
export function ReviewsTable({ items, invitations, selectedId, now, total, onOpen }: Props) {
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
                    <div className="row-actions">
                      <button type="button" className={`act-btn${pending ? " solid" : ""}`} onClick={() => onOpen(item)}>
                        {pending ? "Review" : "View"}
                      </button>
                      <Link to={`/create?edit=${encodeURIComponent(item.invitationId)}`} className="act-btn"><Pencil size={14} /> Edit</Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="table-foot">
        <span>{items.length === total ? `Showing all ${total}` : `Showing ${items.length} of ${total}`}</span>
      </div>
    </>
  );
}

/** Placeholder while the queue loads. Reuses the real table's classes and headers. */
export function ReviewsTableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="table-scroll sk-reveal" aria-busy="true">
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
                    <span className="chip sk-bg">Pending</span>
                  </div>
                </div>
              </td>
              <td className="td-client" data-label="Client"><SkText w={14} /></td>
              <td className="td-changes" data-label="Changes">
                <div className="cell-stack"><b><SkText w={6} /></b><small className="rv-fields"><SkText w={12} /></small></div>
              </td>
              <td className="td-date" data-label="Submitted">
                <div className="cell-stack"><span className="cell-date"><CalendarDays size={14} /> <SkText w={8} /></span></div>
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
  );
}
