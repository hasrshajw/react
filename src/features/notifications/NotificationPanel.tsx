import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { AppNotification } from "../../lib/api";
import { fmtDateTime, timeAgo } from "../../lib/dashboardData";
import {
  notificationBody,
  notificationHref,
  notificationTitle,
} from "./useAdminNotifications";

type Props = {
  open: boolean;
  onClose: () => void;
  items: AppNotification[];
  loading: boolean;
  error: boolean;
  unread: number;
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  onRetry: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
};

export function NotificationPanel({
  open, onClose, items, loading, error, unread, onMarkRead, onMarkAllRead, onRetry, anchorRef,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const now = Date.now();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (anchorRef?.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  const openItem = (n: AppNotification) => {
    if (!n.readAt) onMarkRead(n.id);
    const href = notificationHref(n);
    onClose();
    if (href) navigate(href);
  };

  return (
    <div
      ref={panelRef}
      className="notif-panel"
      role="dialog"
      aria-label="Notifications"
      aria-modal="false"
    >
      <div className="notif-panel-head">
        <b>Notifications</b>
        {unread > 0 && (
          <button type="button" className="link-btn" onClick={onMarkAllRead}>
            Mark all read
          </button>
        )}
      </div>

      {loading && items.length === 0 ? (
        <p className="notif-empty">Loading…</p>
      ) : error && items.length === 0 ? (
        <div className="notif-empty">
          <p>Couldn’t load notifications.</p>
          <button type="button" className="act-btn" onClick={onRetry}>Retry</button>
        </div>
      ) : items.length === 0 ? (
        <p className="notif-empty">No notifications yet.</p>
      ) : (
        <ul className="notif-list">
          {items.map((n) => {
            const unreadItem = !n.readAt;
            return (
              <li key={n.id}>
                <button
                  type="button"
                  className={`notif-item${unreadItem ? " unread" : ""}`}
                  onClick={() => openItem(n)}
                >
                  <span className="notif-item-title">
                    {unreadItem && <i className="notif-dot" aria-hidden="true" />}
                    {notificationTitle(n)}
                  </span>
                  {notificationBody(n) && (
                    <span className="notif-item-body">{notificationBody(n)}</span>
                  )}
                  <span className="notif-item-time" title={fmtDateTime(n.createdAt)}>
                    {timeAgo(n.createdAt, now) || fmtDateTime(n.createdAt)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
