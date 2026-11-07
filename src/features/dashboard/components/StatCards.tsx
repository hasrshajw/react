import { ArrowUpRight, FilePlus2, Inbox, Users } from "../../../components/Icons";
import { SkText } from "../../../components/Skeleton";
import { ACTIVITY, fmt } from "../../../lib/dashboardData";
import type { ActivityRange, TableFilter } from "../../../types/dashboard";

interface Props {
  loading: boolean;
  /** Enquiries load separately from invitations. */
  enqLoading: boolean;
  total: number;
  published: number;
  drafts: number;
  onFilter: (f: TableFilter) => void;
  range: ActivityRange;
  onRange: (r: ActivityRange) => void;
  enqNew: number;
  enqTotal: number;
  enqFollow: number;
  requestsOpen: boolean;
  onShowFollowups: () => void;
  onToggleRequests: () => void;
}

const RANGES: [ActivityRange, string][] = [["7", "7D"], ["30", "30D"], ["all", "All"]];

/** The three KPI cards at the top of the Dashboard. */
export function StatCards(p: Props) {
  const activity = ACTIVITY[p.range];
  return (
    <div className="dashboard-grid">
      <div className="stat-card">
        <div className="stat-icon"><FilePlus2 size={19} /></div>
        <div className="stat-body">
          <span>Total invitations</span>
          {p.loading ? (
            <>
              <div className="stat-line"><strong><SkText w={4} /></strong></div>
              <div className="stat-sub"><SkText w={9} /><i>·</i><SkText w={7} /></div>
            </>
          ) : (
            <>
              <div className="stat-line">
                <strong>{fmt(p.total)}</strong>
              </div>
              <div className="stat-sub">
                <button type="button" onClick={() => p.onFilter("published")}>{fmt(p.published)} published</button>
                <i>·</i>
                <button type="button" onClick={() => p.onFilter("draft")}>{fmt(p.drafts)} draft</button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="stat-card blue">
        <div className="stat-icon"><Users size={19} /></div>
        <div className="stat-body">
          <span>Invitation views</span>
          {p.loading ? (
            <>
              <div className="stat-line"><strong><SkText w={5} /></strong></div>
              <div className="stat-sub plain"><SkText w={8} /><i>·</i><SkText w={8} /></div>
            </>
          ) : (
            <>
              <div className="stat-line">
                <strong>{fmt(activity.views)}</strong>
              </div>
              <div className="stat-sub plain">
                <span>{fmt(activity.rsvps)} RSVPs</span>
                <i>·</i>
                <span>{fmt(activity.shares)} shares</span>
              </div>
            </>
          )}
        </div>
        <div className="seg" role="group" aria-label="Activity range">
          {RANGES.map(([k, l]) => (
            <button key={k} type="button" aria-pressed={p.range === k} className={p.range === k ? "on" : ""} onClick={() => p.onRange(k)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="stat-card green">
        <div className="stat-icon"><Inbox size={19} /></div>
        <div className="stat-body">
          <span>Site enquiries</span>
          {p.enqLoading ? (
            <>
              <div className="stat-line"><strong className="req-count"><SkText w={5} /></strong></div>
              <div className="stat-sub"><SkText w={10} /></div>
            </>
          ) : (
            <>
              <div className="stat-line">
                <strong className="req-count" title={`${p.enqNew} new of ${p.enqTotal} enquiries`}>
                  <span className={p.enqNew > 0 ? "pending" : "clear"}>{p.enqNew}</span>
                  <span className="total">/{p.enqTotal}</span>
                </strong>
              </div>
              <div className="stat-sub">
                <button type="button" onClick={p.onShowFollowups}>{p.enqFollow} follow-up</button>
              </div>
            </>
          )}
        </div>
        <button type="button" className={`round-btn${p.requestsOpen ? " on" : ""}`} aria-label="View site enquiries" aria-expanded={p.requestsOpen} disabled={p.enqLoading} onClick={p.onToggleRequests}>
          <ArrowUpRight size={16} />
        </button>
      </div>
    </div>
  );
}
