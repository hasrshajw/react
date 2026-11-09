import { useEffect, useState } from "react";
import { isoDay } from "../../../lib/dashboardData";
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

  useEffect(() => {
    let live = true;
    fetchEnquiries().then(
      (rows) => { if (live) { setEnquiries(rows); setLoading(false); } },
      () => { if (live) setLoading(false); },
    );
    return () => { live = false; };
  }, []);

  /* Save in the background; if it fails, put the old values back and tell the user. */
  const persist = (next: Enquiry, prev: Enquiry) => {
    saveEnquiry(next).catch(() => {
      setEnquiries((p) => p.map((e) => (e.id === prev.id ? prev : e)));
      notify("Couldn’t save that change, so it was undone.");
    });
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

  /* unread badge: tab title + callback for the sidebar */
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s/, "");
    document.title = enqNew > 0 ? `(${enqNew}) ${base}` : base;
    return () => { document.title = base; };
  }, [enqNew]);
  useEffect(() => { onCountChange?.(enqNew); }, [enqNew]);

  return { enquiries, loading, enqNew, enqFollow, setStatus, saveNote, setFollowDate };
}
