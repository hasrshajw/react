import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Plus, RefreshCw } from "../../../components/Icons";
import { fmtDateTime, timeAgo } from "../../../lib/dashboardData";

interface Props {
  title: string;
  subtitle: string;
  lastUpdated: number | null;
  now: number;
  onRefresh: () => void;
  /** Extra controls shown before Refresh (e.g. the Dashboard's Auto toggle). */
  extra?: ReactNode;
  createTitle?: string;
}

export function PageHeader({ title, subtitle, lastUpdated, now, onRefresh, extra, createTitle }: Props) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="head-actions">
        {lastUpdated && <span className="updated" title={fmtDateTime(lastUpdated)}>Updated {timeAgo(lastUpdated, now).toLowerCase()}</span>}
        {extra}
        <button type="button" className="refresh" onClick={onRefresh}><RefreshCw size={16} /> Refresh</button>
        <Link to="/create" className="create-btn" title={createTitle}><Plus size={16} /> Create invitation</Link>
      </div>
    </div>
  );
}
