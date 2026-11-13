import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchNotifications, markNotificationRead, type AppNotification } from "../../lib/api";
import { db, SUPABASE_CONFIGURED } from "../../lib/supabase";

/** Admin notification list + unread count for the navbar bell (B5).
 *  Loads on mount, refreshes on Realtime changes to `notifications`, and on tab focus.
 *  `reportUnread` is optional so the shell can mirror the count elsewhere if needed. */
export function useAdminNotifications(limit = 40) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const alive = useRef(true);

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    setError(false);
    fetchNotifications(limit).then(
      (list) => {
        if (!alive.current) return;
        setItems(list);
        setLoading(false);
      },
      () => {
        if (!alive.current) return;
        setError(true);
        setLoading(false);
      },
    );
  }, [limit]);

  useEffect(() => {
    alive.current = true;
    load();
    return () => { alive.current = false; };
  }, [load]);

  /* Realtime: any insert/update on notifications that RLS allows through. */
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;
    let channel: ReturnType<ReturnType<typeof db>["channel"]> | null = null;
    try {
      channel = db()
        .channel("admin-notifications")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications" },
          () => { load(true); },
        )
        .subscribe();
    } catch {
      /* Realtime unavailable; focus/poll still work */
    }
    const onFocus = () => load(true);
    const onVisible = () => { if (!document.hidden) load(true); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) {
        try { void db().removeChannel(channel); } catch { /* ignore */ }
      }
    };
  }, [load]);

  const unread = useMemo(() => items.filter((n) => !n.readAt).length, [items]);

  const markRead = useCallback(async (id: number) => {
    const prev = items;
    setItems((list) => list.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n)));
    try {
      await markNotificationRead(id);
    } catch {
      setItems(prev);
    }
  }, [items]);

  const markAllRead = useCallback(async () => {
    const unreadIds = items.filter((n) => !n.readAt).map((n) => n.id);
    if (unreadIds.length === 0) return;
    const prev = items;
    const now = new Date().toISOString();
    setItems((list) => list.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    try {
      await Promise.all(unreadIds.map((id) => markNotificationRead(id)));
    } catch {
      setItems(prev);
    }
  }, [items]);

  return { items, loading, error, unread, load, markRead, markAllRead };
}

export function notificationTitle(n: AppNotification): string {
  switch (n.type) {
    case "change_submitted":
      return "Change request submitted";
    case "change_approved":
      return "Changes approved";
    case "change_rejected":
      return "Changes rejected";
    case "request_superseded":
      return "Request cancelled";
    default:
      return n.type.replace(/_/g, " ");
  }
}

export function notificationHref(n: AppNotification): string | null {
  if (n.type === "change_submitted" || n.requestId) return "/reviews";
  if (n.invitationId) return `/create?edit=${encodeURIComponent(n.invitationId)}`;
  return null;
}

export function notificationBody(n: AppNotification): string {
  const email = typeof n.payload.client_email === "string" ? n.payload.client_email : "";
  const keys = Array.isArray(n.payload.changed_keys)
    ? (n.payload.changed_keys as unknown[]).filter((k): k is string => typeof k === "string")
    : [];
  if (n.type === "change_submitted") {
    const who = email || "A client";
    const what = keys.length ? keys.slice(0, 4).join(", ") + (keys.length > 4 ? "…" : "") : "some fields";
    return `${who} updated ${what}`;
  }
  if (email) return email;
  if (n.invitationId) return `Invitation ${n.invitationId.slice(0, 8)}…`;
  return "";
}
