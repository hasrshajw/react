import { Link } from "react-router-dom";
import { AlertTriangle, CalendarDays, Eye, FilePlus2, Link2, Pencil, Search } from "../../../components/Icons";
import { SkText } from "../../../components/Skeleton";

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-icon err"><AlertTriangle size={22} /></div>
      <b>Couldn’t load invitations</b>
      <span>Check your connection and try again.</span>
      <button type="button" className="empty-btn" onClick={onRetry}>Retry</button>
    </div>
  );
}

export function NoInvitationsState() {
  return (
    <div className="empty-state">
      <div className="empty-icon"><FilePlus2 size={22} /></div>
      <b>No invitations yet</b>
      <span>Create your first invitation to see it here.</span>
      <Link to="/create">Create invitation</Link>
    </div>
  );
}

interface NoMatchProps { query: string; emptyHint: string; onClear: () => void }

export function NoMatchState({ query, emptyHint, onClear }: NoMatchProps) {
  const q = query.trim();
  return (
    <div className="empty-state">
      <div className="empty-icon"><Search size={22} /></div>
      <b>{q ? `No invitations match “${query}”` : "No invitations in this view"}</b>
      <span>{q ? "Try a different name." : emptyHint}</span>
      <button type="button" className="empty-btn" onClick={onClear}>Clear filters</button>
    </div>
  );
}

interface TableSkeletonProps {
  rows: number;
  /** All invitations page: leading checkbox column, template name and a countdown chip. */
  detailed?: boolean;
}

/** Placeholder for the invitations table. It reuses the real table's classes and column headers
 *  (static text is shown as is), and only the server data (names, dates, counts, buttons) is replaced. */
export function InvitationsTableSkeleton({ rows, detailed = false }: TableSkeletonProps) {
  return (
    <div className="table-scroll" aria-busy="true">
      <table className="inv-table">
        <caption className="sr-only">Loading invitations</caption>
        <thead>
          <tr>
            {detailed && <th className="th-check"><input type="checkbox" disabled tabIndex={-1} aria-label="Select all invitations" /></th>}
            <th>Couple</th>
            <th>Event date</th>
            <th>Invitation views</th>
            <th className="th-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, i) => (
            <tr key={i} className="sk-row" aria-hidden="true">
              {detailed && <td className="td-check"><input type="checkbox" disabled tabIndex={-1} /></td>}
              <td>
                <div className="cell-couple">
                  <div className="row-avatar sk-bg">AB</div>
                  <div className="cell-stack">
                    <b><SkText w={16 - (i % 3) * 2} /></b>
                    {detailed ? (
                      <span className="cell-line">
                        <span className="chip sk-bg">Published</span>
                        <small className="tpl-name"><SkText w={11} /></small>
                      </span>
                    ) : (
                      <span className="chip sk-bg">Published</span>
                    )}
                  </div>
                </div>
              </td>
              <td>
                <div className="cell-stack">
                  <span className="cell-date"><CalendarDays size={14} /> <SkText w={12} /></span>
                  {detailed
                    ? <span className="cd-wrap"><span className="cd sk-bg">In 12 days</span></span>
                    : <small className="when"><SkText w={9} /></small>}
                </div>
              </td>
              <td><span className="views"><Eye size={15} /> <SkText w={4} /></span></td>
              <td>
                <div className="row-actions">
                  <span className="icon-btn sk-bg" />
                  <span className="act-btn sk-bg"><Pencil size={14} /> Edit</span>
                  <span className="act-btn sk-bg"><Link2 size={14} /> Link</span>
                  <span className="icon-btn sk-bg" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
