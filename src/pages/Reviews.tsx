import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLatest } from "../hooks/useLatest";
import { useRowHint } from "../hooks/useRowHint";
import { useSkeletonPhase } from "../hooks/useSkeletonPhase";
import { SkText } from "../components/Skeleton";
import { AlertTriangle, Inbox, Search } from "../components/Icons";
import { PageHeader } from "../features/dashboard/components/PageHeader";
import { Toast } from "../features/dashboard/components/Toast";
import { useNotify } from "../features/dashboard/hooks/useNotify";
import { ReviewDetail } from "../features/reviews/ReviewDetail";
import { STATUS_LABEL } from "../features/reviews/status";
import { ReviewsTable, ReviewsTableSkeleton } from "../features/reviews/ReviewsTable";
import { fieldLabel } from "../features/reviews/fieldLabels";
import { fetchInvitationsByIds, fetchPendingReviewCount, fetchReviewPage, fetchReviewProposed, type RequestStatus, type ReviewItem } from "../lib/api";
import { Loader2 } from "../components/Icons";
import { coupleName } from "../lib/dashboardData";
import type { InvitationRow } from "../types/dashboard";
import dashboardCss from "../styles/dashboard.css?inline";
import invitationsCss from "../features/invitations/invitations.css?inline";

/* The newest 10 requests are read first; "View more" adds 10. A search reads up to 200 so it can find older ones. */
const PAGE = 10;
const SEARCH_LIMIT = 200;

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
  const [hasMore, setHasMore] = useState(false);
  const [pendingTotal, setPendingTotal] = useState<number | null>(null);
  const limitRef = useRef(PAGE);
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
    /* Couple names are cosmetic: if that read fails, the queue still loads and rows fall back to a generic label.
       Only the invitations of the requests on screen are read, not the whole list. */
    fetchReviewPage(status, limitRef.current).then(
      async ({ items: list, hasMore: more }) => {
        const [rows, pending] = await Promise.all([
          fetchInvitationsByIds(list.map((i) => i.invitationId)).catch(() => null),
          fetchPendingReviewCount().catch(() => null),
        ]);
        if (rows) setInvitations((prev) => { const m = new Map(prev); rows.forEach((r) => m.set(r.id, r)); return m; });
        setItems(list);
        setHasMore(more);
        setLoading(false);
        setRefreshing(false);
        setLastUpdated(Date.now());
        setNow(Date.now());
        if (pending !== null) { setPendingTotal(pending); onPendingCountChange?.(pending); }
        else if (status === "pending" && !more) onPendingCountChange?.(list.length);
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

  useEffect(() => { limitRef.current = PAGE; setSelectedId(null); load(); }, [load]);

  const viewMore = () => { limitRef.current += PAGE; load(true); };
  const term0 = q.trim();
  /* A search looks through more than the first 10. */
  useEffect(() => {
    if (term0 && hasMore && limitRef.current < SEARCH_LIMIT) { limitRef.current = SEARCH_LIMIT; load(true); }
  }, [term0, hasMore, load]);

  const picked = useMemo(
    () => (selectedId ? items.find((i) => i.id === selectedId) ?? null : null),
    [items, selectedId],
  );

  /* The list does not carry the proposed invitation data (it can be large). It is read for the one request that is open. */
  const [proposed, setProposed] = useState<{ id: string; data: ReviewItem["proposedDetails"] } | null>(null);
  const [proposedFailed, setProposedFailed] = useState(false);
  useEffect(() => {
    setProposedFailed(false);
    if (!selectedId) { setProposed(null); return; }
    let live = true;
    fetchReviewProposed(selectedId).then(
      (data) => { if (live) setProposed({ id: selectedId, data }); },
      () => { if (live) setProposedFailed(true); },
    );
    return () => { live = false; };
  }, [selectedId]);
  const selected = useMemo(
    () => (picked && proposed?.id === picked.id ? { ...picked, proposedDetails: proposed.data } : null),
    [picked, proposed],
  );

  const panelChangeRef = useLatest(onPanelChange);
  useEffect(() => { panelChangeRef.current?.(!!picked); }, [picked, panelChangeRef]);
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

  /* The skeleton shows on every full load (first visit, a tab change, Retry), not on a silent refresh or "View more", where the
     rows stay on screen. It waits ~150ms before it appears and stays at least ~300ms, so a fast load does not flash. */
  const phase = useSkeletonPhase(loading);
  const skel = phase !== "idle";
  const firstLoad = skel && lastUpdated === null;
  const skeletonRows = useRowHint("reviews", items.length, loading, PAGE, 4);
  const emptyTitle = status === "pending"
    ? "No pending reviews"
    : status === "all" ? "No requests yet" : `No ${STATUS_LABEL[status].toLowerCase()} requests`;

  return (
    <div className={`dashboard-page inv-page${phase === "hold" ? " sk-pending" : ""}`} aria-busy={loading || refreshing}>
      {!picked && (
        <>
        <PageHeader
          title="Review queue"
          subtitle="Client change requests waiting for your decision"
          lastUpdated={lastUpdated}
          now={now}
          onRefresh={() => load(true)}
          loading={firstLoad}
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
                {key === "pending" && status === "pending" && (skel ? <em className="sk-bg" aria-hidden="true">00</em> : <em>{pendingTotal ?? pendingOnPage}</em>)}
              </button>
            ))}
          </div>
        </div>

        {/* ---------- list ---------- */}
        <div className="inv-panel">
          <div className="inv-toolbar">
            <div className="inv-chips">
              <span className="insight">
                {skel ? <SkText w={11} /> : `${items.length}${hasMore ? "+" : ""} ${items.length === 1 && !hasMore ? "request" : "requests"}`}
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
            <ReviewsTableSkeleton rows={skeletonRows} hold={phase === "hold"} />
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
              now={now} total={items.length} hasMore={hasMore} onOpen={(i) => setSelectedId(i.id)}
            />
          )}

          {!error && !skel && hasMore && !term0 && (
            <div className="more-row">
              <button type="button" className="more-btn" disabled={refreshing} onClick={viewMore}>
                {refreshing ? <><Loader2 className="spin" size={15} /> Loading…</> : "View more"}
              </button>
            </div>
          )}

        </div>
        </>
      )}

      {picked && !selected && proposedFailed && (
        <div className="empty-state" role="alert">
          <div className="empty-icon err"><AlertTriangle size={22} /></div>
          <b>Couldn’t open this request</b>
          <span>Check your connection and try again.</span>
          <button type="button" className="empty-btn" onClick={() => setSelectedId(null)}>Back to the queue</button>
        </div>
      )}

      {/* Focused view: while a request is open, the left side shows only that request (the proposed preview is on the right).
          Until its proposed values arrive, the same panel is drawn with ghosts in their place, so nothing is replaced or moves. */}
      {picked && (selected || !proposedFailed) && (
        <ReviewDetail
          slot={slot}
          item={selected ?? picked}
          proposedLoading={!selected}
          onClose={() => setSelectedId(null)}
          onDecided={() => { setSelectedId(null); load(true); }}
          notify={notify}
        />
      )}

      {toast && <Toast toast={toast} onDismiss={dismiss} />}

      <style>{dashboardCss}</style>
      <style>{invitationsCss}</style>
    </div>
  );
}
