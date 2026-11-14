import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchNotifications, markNotificationRead, markNotificationsRead, toNotification, type AppNotification } from "../../lib/api";
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

  /* Realtime. The message already carries the changed row, so it is applied to the list on screen: no download at all.
     (This used to read the whole list again for every message, and marking 20 notifications read caused 20 full reads.)
     Only if a message is unusable does one delayed re-read happen. */
  const lastLoad = useRef(Date.now());
  useEffect(() => { if (!loading) lastLoad.current = Date.now(); }, [loading, items]);
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;
    let channel: ReturnType<ReturnType<typeof db>["channel"]> | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reloadLater = () => { clearTimeout(timer); timer = setTimeout(() => load(true), 2000); };
    try {
      channel = db()
        .channel("admin-notifications")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications" },
          (msg: { eventType?: string; new?: Record<string, unknown>; old?: Record<string, unknown> }) => {
            if (!alive.current) return;
            if (msg.eventType === "DELETE") {
              const id = msg.old?.id;
              if (typeof id === "number") setItems((list) => list.filter((n) => n.id !== id));
              else reloadLater();
              return;
            }
            const n = toNotification(msg.new);
            if (!n) { reloadLater(); return; }
            setItems((list) => {
              const at = list.findIndex((x) => x.id === n.id);
              if (at >= 0) return list.map((x) => (x.id === n.id ? n : x));
              return [n, ...list].slice(0, limit);
            });
          },
        )
        .subscribe();
    } catch {
      /* Realtime unavailable; coming back to the tab still refreshes */
    }
    /* Coming back to the tab: one read, and not more than once a minute (focus and visibilitychange both fire, and each used to read). */
    const refreshIfStale = () => {
      if (document.hidden || Date.now() - lastLoad.current < 60_000) return;
      lastLoad.current = Date.now();
      load(true);
    };
    window.addEventListener("focus", refreshIfStale);
    document.addEventListener("visibilitychange", refreshIfStale);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refreshIfStale);
      document.removeEventListener("visibilitychange", refreshIfStale);
      if (channel) {
        try { void db().removeChannel(channel); } catch { /* ignore */ }
      }
    };
  }, [load, limit]);

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
      await markNotificationsRead(unreadIds);
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
    case "change_superseded":
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

/* Client area: the same notifications table, but the person reading is the client, so links go to /my and the wording is about "your" changes. */
export function clientNotificationHref(n: AppNotification): string | null {
  return n.invitationId ? `/my/${encodeURIComponent(n.invitationId)}` : "/my";
}

export function clientNotificationBody(n: AppNotification): string {
  switch (n.type) {
    case "change_approved": return "Your changes are now live";
    case "change_rejected": return "Open the editor to see the admin's note";
    case "change_superseded":
    case "request_superseded": return "The invitation changed, so this request was cancelled";
    default: return "";
  }
}
