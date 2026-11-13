import { useCallback, useEffect, useRef, useState } from "react";
import { isoDay } from "../../../lib/dashboardData";
import { useLatest } from "../../../hooks/useLatest";
import { fetchEnquiries, saveEnquiry } from "../../../lib/api";
import type { Enquiry, EnquiryStatus, Notify } from "../../../types/dashboard";

const STATUS_TOAST: Record<EnquiryStatus, string> = {
  new: "Marked as new",
  called: "Marked as called",
  cancelled: "Marked as cancelled",
  followup: "Marked for follow-up",
};

/** Site enquiries: status changes (with undo), notes, follow-up dates and the unread count. */
export function useEnquiries(notify: Notify, onCountChange?: (n: number) => void) {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);

  /* Changes made on this screen, and saves still on their way. A refresh that started before a change, or
     while a save is pending, is thrown away (the next one picks up the server state), so polling never
     overwrites what the person just did. Same rule as the invitation flags (H-6). */
  const changes = useRef(0);
  const saving = useRef(0);

  useEffect(() => {
    let live = true;
    fetchEnquiries().then(
      (rows) => { if (live) { setEnquiries(rows); setLoading(false); } },
      () => { if (live) setLoading(false); },
    );
    return () => { live = false; };
  }, []);

  /* M-6: pick up enquiries that arrive while the Dashboard stays open: every 60 s and when the tab is shown again. */
  const refresh = useCallback(() => {
    if (document.hidden || saving.current > 0) return;
    const started = changes.current;
    fetchEnquiries().then(
      (rows) => { if (changes.current === started && saving.current === 0) setEnquiries(rows); },
      () => { /* silent: the list on screen stays as it is */ },
    );
  }, []);
  useEffect(() => {
    if (loading) return;
    const t = setInterval(refresh, 60000);
    const onVisible = () => { if (!document.hidden) refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVisible); };
  }, [loading, refresh]);

  /* Save in the background; if it fails, put the old values back and tell the user. */
  const persist = (next: Enquiry, prev: Enquiry) => {
    changes.current++;
    saving.current++;
    saveEnquiry(next).then((history) => {
      /* Show the history the server wrote (server time, other admins' entries), unless another save of ours is still on its way. */
      if (saving.current === 1) setEnquiries((p) => p.map((e) => (e.id === next.id ? { ...e, history } : e)));
    }).catch(() => {
      setEnquiries((p) => p.map((e) => (e.id === prev.id ? prev : e)));
      notify("Couldn’t save that change, so it was undone.");
    }).finally(() => { saving.current--; changes.current++; });
  };

  const enqNew = enquiries.filter((e) => e.status === "new").length;
  const enqFollow = enquiries.filter((e) => e.status === "followup").length;

  const setStatus = (id: string, status: EnquiryStatus) => {
    const prev = enquiries.find((e) => e.id === id);
    if (!prev) return;
    const next: Enquiry = {
      ...prev,
      status,
      history: [...(prev.history || []), { status, at: new Date().toISOString() }],
      followUpDate: status === "followup" ? prev.followUpDate || isoDay(1) : prev.followUpDate,
    };
    setEnquiries((p) => p.map((e) => (e.id === id ? next : e)));
    persist(next, prev);
    notify(STATUS_TOAST[status], () => { setEnquiries((p) => p.map((e) => (e.id === id ? prev : e))); persist(prev, next); });
  };

  const saveNote = (id: string, value: string) => {
    const v = value.trim();
    const prev = enquiries.find((e) => e.id === id);
    if (!prev || (prev.note || "") === v) return;
    const next = { ...prev, note: v };
    setEnquiries((p) => p.map((e) => (e.id === id ? next : e)));
    persist(next, prev);
    notify("Note saved");
  };

  const setFollowDate = (id: string, date: string) => {
    const prev = enquiries.find((e) => e.id === id);
    if (!prev) return;
    const next = { ...prev, followUpDate: date };
    setEnquiries((p) => p.map((e) => (e.id === id ? next : e)));
    persist(next, prev);
  };

  /* unread badge: reported to the shell (sidebar badge and tab title) once the first list has loaded; before that the
     count is still 0 and would wipe the number the shell fetched on its own. */
  const countChangeRef = useLatest(onCountChange);
  useEffect(() => { if (!loading) countChangeRef.current?.(enqNew); }, [enqNew, loading, countChangeRef]);

  return { enquiries, loading, enqNew, enqFollow, setStatus, saveNote, setFollowDate };
}
