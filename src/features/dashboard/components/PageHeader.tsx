import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Plus, RefreshCw } from "../../../components/Icons";
import { SkText } from "../../../components/Skeleton";
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
  /** First load only: the "Updated …" label has no value yet. */
  loading?: boolean;
}

export function PageHeader({ title, subtitle, lastUpdated, now, onRefresh, extra, createTitle, loading = false }: Props) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="head-actions">
        {loading ? <span className="updated" aria-hidden="true"><SkText w={15} /></span> : lastUpdated && <span className="updated" title={fmtDateTime(lastUpdated)}>Updated {timeAgo(lastUpdated, now).toLowerCase()}</span>}
        {extra}
        <button type="button" className="refresh" onClick={onRefresh}><RefreshCw size={16} /> Refresh</button>
        <Link to="/create" className="create-btn" title={createTitle}><Plus size={16} /> Create invitation</Link>
      </div>
    </div>
  );
}
