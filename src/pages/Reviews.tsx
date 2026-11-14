import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLatest } from "../hooks/useLatest";
import { AlertTriangle, Inbox, Search } from "../components/Icons";
import { PageHeader } from "../features/dashboard/components/PageHeader";
import { Toast } from "../features/dashboard/components/Toast";
import { useNotify } from "../features/dashboard/hooks/useNotify";
import { ReviewDetail } from "../features/reviews/ReviewDetail";
import { STATUS_LABEL } from "../features/reviews/status";
import { ReviewsTable, ReviewsTableSkeleton } from "../features/reviews/ReviewsTable";
import { fieldLabel } from "../features/reviews/fieldLabels";
import { fetchInvitations, fetchReviewQueue, type RequestStatus, type ReviewItem } from "../lib/api";
import { coupleName } from "../lib/dashboardData";
import type { InvitationRow } from "../types/dashboard";
import dashboardCss from "../styles/dashboard.css?inline";
import invitationsCss from "../features/invitations/invitations.css?inline";

const TABS: { key: RequestStatus | "all"; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "withdrawn", label: "Withdrawn" },
  { key: "superseded", label: "Superseded" },
  { key: "all", label: "All" },
];

type Props = {
  /** Lets AdminApp keep the sidebar pending badge in sync (same pattern as enquiries). */
  onPendingCountChange?: (n: number) => void;
  /** Tells AdminApp a right-side panel is open so the sidebar collapses and the page makes room. */
  onPanelChange?: (open: boolean) => void;
};

export default function Reviews({ onPendingCountChange, onPanelChange }: Props) {
  const { toast, notify, dismiss } = useNotify();
  const [status, setStatus] = useState<RequestStatus | "all">("pending");
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<ReadonlyMap<string, InvitationRow>>(() => new Map());
  const [q, setQ] = useState("");
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => { setSlot(document.getElementById("preview-slot")); }, []);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback((silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(false);
    /* Couple names are cosmetic: if the invitation list fails, the queue still loads and rows fall back to a generic label. */
    Promise.all([
      fetchReviewQueue(status),
      fetchInvitations().then((r) => r.rows, () => null),
    ]).then(
      ([list, rows]) => {
        if (rows) setInvitations(new Map(rows.map((r) => [r.id, r])));
        setItems(list);
        setLoading(false);
        setRefreshing(false);
        setLastUpdated(Date.now());
        setNow(Date.now());
        if (status === "pending") onPendingCountChange?.(list.length);
        setSelectedId((id) => (id && list.some((i) => i.id === id) ? id : null));
      },
      () => {
        setError(true);
        setLoading(false);
        setRefreshing(false);
        if (!silent) notify("Couldn’t load the review queue.");
      },
    );
  }, [status, onPendingCountChange, notify]);

  useEffect(() => { setSelectedId(null); load(); }, [load]);

  const selected = useMemo(
    () => (selectedId ? items.find((i) => i.id === selectedId) ?? null : null),
    [items, selectedId],
  );

  const panelChangeRef = useLatest(onPanelChange);
  useEffect(() => { panelChangeRef.current?.(!!selected); }, [selected, panelChangeRef]);
  useEffect(() => () => panelChangeRef.current?.(false), [panelChangeRef]);

  const term = q.trim().toLowerCase();
  const shown = useMemo(() => {
    if (!term) return items;
    return items.filter((i) => {
      const inv = invitations.get(i.invitationId);
      const hay = [inv ? coupleName(inv) : "", i.clientEmail, ...i.changedKeys.map(fieldLabel)].join(" ").toLowerCase();
      return hay.includes(term);
    });
  }, [items, invitations, term]);

  const pendingOnPage = useMemo(
    () => items.filter((i) => i.status === "pending").length,
    [items],
  );

  const skel = loading && lastUpdated === null;
  const emptyTitle = status === "pending"
    ? "No pending reviews"
    : status === "all" ? "No requests yet" : `No ${STATUS_LABEL[status].toLowerCase()} requests`;

  return (
    <div className="dashboard-page inv-page" aria-busy={loading || refreshing}>
      <PageHeader
        title="Review queue"
        subtitle="Client change requests waiting for your decision"
        lastUpdated={lastUpdated}
        now={now}
        onRefresh={() => load(true)}
        loading={skel}
        refreshing={refreshing}
        createTitle="Create invitation"
      />

      {/* ---------- status tabs ---------- */}
      <div className="inv-tabbar">
        <div className="inv-tabs" role="tablist" aria-label="Filter by status">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={status === key}
              className={`inv-tab${status === key ? " on" : ""}`}
              onClick={() => setStatus(key)}
            >
              {label}
              {key === "pending" && !loading && status === "pending" && <em>{pendingOnPage}</em>}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- list ---------- */}
      <div className="inv-panel">
        <div className="inv-toolbar">
          <div className="inv-chips">
            <span className="insight">
              {skel ? "Loading requests…" : `${items.length} ${items.length === 1 ? "request" : "requests"}`}
            </span>
            {term && <button type="button" className="link-btn" onClick={() => setQ("")}>Clear search</button>}
          </div>
          <div className="recent-tools">
            <label className="search">
              <Search size={15} />
              <input
                ref={searchRef} type="search" placeholder="Search couple, client or field" value={q}
                aria-label="Search review requests" onChange={(e) => setQ(e.target.value)}
              />
            </label>
          </div>
        </div>

        {error ? (
          <div className="empty-state">
            <div className="empty-icon err"><AlertTriangle size={22} /></div>
            <b>Couldn’t load the review queue</b>
            <span>Check your connection and try again.</span>
            <button type="button" className="empty-btn" onClick={() => load()}>Retry</button>
          </div>
        ) : skel ? (
          <ReviewsTableSkeleton rows={4} />
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Inbox size={22} /></div>
            <b>{emptyTitle}</b>
            <span>When a client submits changes, they will show up here.</span>
          </div>
        ) : shown.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Search size={22} /></div>
            <b>No requests match “{q.trim()}”</b>
            <span>Try a different name, email or field.</span>
            <button type="button" className="empty-btn" onClick={() => setQ("")}>Clear search</button>
          </div>
        ) : (
          <ReviewsTable
            items={shown} invitations={invitations} selectedId={selectedId}
            now={now} total={items.length} onOpen={(i) => setSelectedId(i.id)}
          />
        )}

        {selected && (
          <ReviewDetail
            slot={slot}
            item={selected}
            onClose={() => setSelectedId(null)}
            onDecided={() => { setSelectedId(null); load(true); }}
            notify={notify}
          />
        )}
      </div>

      {toast && <Toast toast={toast} onDismiss={dismiss} />}

      <style>{dashboardCss}</style>
      <style>{invitationsCss}</style>
    </div>
  );
}
