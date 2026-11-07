import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, FilePlus2, Search } from "../../../components/Icons";

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

/** Skeleton rows shown while invitations load. `children` renders one skeleton row's cells. */
export function TableSkeleton({ rows, children }: { rows: number; children: (i: number) => ReactNode }) {
  return (
    <div className="table-scroll">
      <table className="inv-table">
        <tbody>
          {Array.from({ length: rows }, (_, i) => <tr key={i}>{children(i)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
