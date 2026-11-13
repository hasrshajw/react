import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Inbox } from "../components/Icons";
import { PageHeader } from "../features/dashboard/components/PageHeader";
import { Toast } from "../features/dashboard/components/Toast";
import { useNotify } from "../features/dashboard/hooks/useNotify";
import { ReviewDetail } from "../features/reviews/ReviewDetail";
import { fetchReviewQueue, type RequestStatus, type ReviewItem } from "../lib/api";
import { fmtDateTime, timeAgo } from "../lib/dashboardData";
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

const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  superseded: "Superseded",
};

const STATUS_CHIP: Record<RequestStatus, string> = {
  pending: "pending",
  approved: "ok",
  rejected: "enq-cancelled",
  withdrawn: "draft",
  superseded: "draft",
};

type Props = {
  /** Lets AdminApp keep the sidebar pending badge in sync (same pattern as enquiries). */
  onPendingCountChange?: (n: number) => void;
};

export default function Reviews({ onPendingCountChange }: Props) {
  const { toast, notify, dismiss } = useNotify();
  const [status, setStatus] = useState<RequestStatus | "all">("pending");
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback((silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(false);
    fetchReviewQueue(status).then(
      (list) => {
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

  const pendingOnPage = useMemo(
    () => items.filter((i) => i.status === "pending").length,
    [items],
  );

  return (
    <>
      <style>{dashboardCss}{invitationsCss}</style>
      <PageHeader
        title="Review queue"
        subtitle="Client change requests waiting for your decision"
        lastUpdated={lastUpdated}
        now={now}
        onRefresh={() => load(true)}
        loading={loading && lastUpdated === null}
        refreshing={refreshing}
        createTitle="Create invitation"
      />

      <div className="inv-tabbar" style={{ marginBottom: 14 }}>
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
              {key === "pending" && !loading && status === "pending" && (
                <em>{pendingOnPage}</em>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="inv-panel">
        {error ? (
          <div className="empty-state" style={{ padding: 40, textAlign: "center" }}>
            <p>Couldn’t load the queue.</p>
            <button type="button" className="act-btn" onClick={() => load()}>Retry</button>
          </div>
        ) : loading && lastUpdated === null ? (
          <div className="empty-state" style={{ padding: 40, textAlign: "center", color: "var(--gray)" }}>
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state" style={{ padding: 48, textAlign: "center" }}>
            <Inbox size={32} style={{ opacity: 0.4, marginBottom: 12 }} />
            <p style={{ margin: 0, fontWeight: 600 }}>
              {status === "pending"
                ? "No pending reviews"
                : status === "all"
                  ? "No requests yet"
                  : `No ${STATUS_LABEL[status].toLowerCase()} requests`}
            </p>
            <p style={{ margin: "8px 0 0", color: "var(--gray)", fontSize: 14 }}>
              When a client submits changes, they will show up here.
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Invitation</th>
                  <th>Changed fields</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th className="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className={selectedId === item.id ? "active" : undefined}>
                    <td data-label="Client">
                      <span className="client-email" title={item.clientEmail}>{item.clientEmail || "—"}</span>
                    </td>
                    <td data-label="Invitation">
                      <code style={{ fontSize: 12 }}>{item.invitationId.slice(0, 8)}…</code>
                    </td>
                    <td data-label="Changed fields">
                      {item.changedKeys.length
                        ? <span style={{ fontSize: 13 }}>{item.changedKeys.slice(0, 5).join(", ")}{item.changedKeys.length > 5 ? ` +${item.changedKeys.length - 5}` : ""}</span>
                        : <span className="muted">—</span>}
                    </td>
                    <td data-label="Submitted">
                      <span title={fmtDateTime(item.createdAt)} style={{ fontSize: 13 }}>
                        {timeAgo(item.createdAt, now) || fmtDateTime(item.createdAt)}
                      </span>
                    </td>
                    <td data-label="Status">
                      <span className={`chip ${STATUS_CHIP[item.status]}`}>{STATUS_LABEL[item.status]}</span>
                    </td>
                    <td className="td-actions">
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <button
                          type="button"
                          className="act-btn"
                          onClick={() => setSelectedId(item.id)}
                        >
                          {item.status === "pending" ? "Review" : "View"}
                        </button>
                        <Link className="act-btn" to={`/create?edit=${encodeURIComponent(item.invitationId)}`}>
                          Open invitation
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selected && (
          <ReviewDetail
            item={selected}
            onClose={() => setSelectedId(null)}
            onDecided={() => { setSelectedId(null); load(true); }}
            notify={notify}
          />
        )}
      </div>

      {toast && <Toast toast={toast} onDismiss={dismiss} />}
    </>
  );
}
