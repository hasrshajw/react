import type { MouseEvent, RefObject } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, ArrowUpRight, Eye, Search, Trash2, X } from "../../../components/Icons";
import {
  FILTER_LABEL, PAGE_SIZE, coupleName, dayDiff, fmt, fmtDate, getViews, initials, statusChip, whenText,
} from "../../../lib/dashboardData";
import type { InvitationRow, SortKey, TableFilter, TrashItem } from "../../../types/dashboard";
import { SORT_OPTIONS, Select } from "./Select";
import { RowActions } from "./RowActions";
import { ErrorState, InvitationsTableSkeleton, NoInvitationsState, NoMatchState } from "./ListStates";

interface Props {
  tableRef: RefObject<HTMLDivElement>;
  searchRef: RefObject<HTMLInputElement>;
  loading: boolean;
  /** Loading is still quick: reserve the skeleton's space but draw nothing yet (see useSkeletonPhase). */
  holdSkeleton?: boolean;
  /** Rows to draw while loading (see useRowHint). */
  skeletonRows: number;
  error: boolean;
  visible: InvitationRow[];
  list: InvitationRow[];
  shown: InvitationRow[];
  trashed: TrashItem[];
  topId: string | null;
  q: string;
  sort: SortKey;
  filter: TableFilter;
  expanded: boolean;
  showAll: boolean;
  page: number;
  pages: number;
  previewId?: string;
  menuId?: string;
  isPub: (x: InvitationRow) => boolean;
  onQuery: (v: string) => void;
  onSort: (v: SortKey) => void;
  onClearFilter: () => void;
  onClearAll: () => void;
  onRetry: () => void;
  onOpenTrash: (e: MouseEvent<HTMLButtonElement>) => void;
  onPreview: (x: InvitationRow) => void;
  onCopyLink: (x: InvitationRow) => void;
  onOpenMenu: (e: MouseEvent<HTMLElement>, x: InvitationRow) => void;
  onPage: (n: number) => void;
  onShowLess: () => void;
  onViewAll: () => void;
}

/** The "Recent invitations" card: toolbar, filter chip, table, empty/error states and footer. */
export function RecentInvitations(p: Props) {
  const { list, visible, expanded, showAll, page: cur, pages, q, filter } = p;
  const canShowLess = showAll && !q.trim() && filter === "all";
  const showFoot = (expanded && list.length > PAGE_SIZE) || (!expanded && visible.length > 5) || showAll;

  return (
    <div className="recent-card" ref={p.tableRef}>
      <div className="recent-head">
        <div className="recent-title">
          <strong>Recent invitations</strong>
          {p.loading ? <em className="sk-bg" aria-hidden="true">00</em> : visible.length > 0 && <em>{fmt(visible.length)}</em>}
        </div>
        <div className="recent-tools">
          <label className="search">
            <Search size={15} />
            <input
              ref={p.searchRef} type="search" placeholder="Search couple" value={q} aria-label="Search invitations"
              onChange={(e) => p.onQuery(e.target.value)}
            />
            {!q && <kbd className="kbd" aria-hidden="true">/</kbd>}
          </label>
          <Select label="Sort invitations" value={p.sort} options={SORT_OPTIONS} onChange={(v) => p.onSort(v as SortKey)} />
          {p.trashed.length > 0 && (
            <button type="button" className="act-btn" onClick={p.onOpenTrash}>
              <Trash2 size={14} /> Trash <em className="cnt">{p.trashed.length}</em>
            </button>
          )}
        </div>
      </div>

      {filter !== "all" && (
        <div className="filter-row">
          <span className="filter-pill">
            {FILTER_LABEL[filter]}
            <button type="button" aria-label="Clear filter" onClick={p.onClearFilter}><X size={12} /></button>
          </span>
          <small>{fmt(list.length)} shown</small>
        </div>
      )}

      {p.error ? (
        <ErrorState onRetry={p.onRetry} />
      ) : p.loading ? (
        <InvitationsTableSkeleton rows={p.skeletonRows} hold={p.holdSkeleton} />
      ) : visible.length === 0 ? (
        <NoInvitationsState />
      ) : list.length === 0 ? (
        <NoMatchState query={q} emptyHint="Nothing matches the current filter." onClear={p.onClearAll} />
      ) : (
        <>
          <div className="table-scroll">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Couple</th>
                  <th>Event date</th>
                  <th>Invitation views</th>
                  <th className="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {p.shown.map((x) => {
                  const live = p.isPub(x);
                  const chip = statusChip(x, live);
                  const when = whenText(dayDiff(x.event_date));
                  return (
                    <tr key={x.id} className={p.previewId === x.id ? "active" : ""}>
                      <td className="td-couple">
                        <div className="cell-couple">
                          <div className="row-avatar">{initials(x)}</div>
                          <div className="cell-stack">
                            <b>{coupleName(x)}</b>
                            <span className={`chip ${chip[0]}`}>{chip[1]}</span>
                          </div>
                        </div>
                      </td>
                      <td className="td-date" data-label="Event date">
                        <div className="cell-stack">
                          <span className="cell-date"><CalendarDays size={14} /> {x.event_date ? fmtDate(x.event_date) : "Date not set"}</span>
                          {when && <small className="when">{when}</small>}
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

          {showFoot && (
            <div className="table-foot">
              {expanded && list.length > PAGE_SIZE ? (
                <>
                  <span>Showing {(cur - 1) * PAGE_SIZE + 1}–{Math.min(cur * PAGE_SIZE, list.length)} of {list.length}</span>
                  <div className="pager">
                    {canShowLess && <button type="button" className="act-btn" onClick={p.onShowLess}>Show less</button>}
                    <button type="button" className="icon-btn" aria-label="Previous page" disabled={cur === 1} onClick={() => p.onPage(cur - 1)}><ChevronLeft size={16} /></button>
                    <span className="page-no">{cur} / {pages}</span>
                    <button type="button" className="icon-btn" aria-label="Next page" disabled={cur === pages} onClick={() => p.onPage(cur + 1)}><ChevronRight size={16} /></button>
                  </div>
                </>
              ) : !expanded ? (
                <>
                  <span>Showing 5 of {visible.length}</span>
                  <button type="button" className="head-link as-btn" onClick={p.onViewAll}>
                    View all invitations <ArrowUpRight size={14} />
                  </button>
                </>
              ) : (
                <>
                  <span>Showing all {list.length}</span>
                  {canShowLess && <button type="button" className="act-btn" onClick={p.onShowLess}>Show less</button>}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
