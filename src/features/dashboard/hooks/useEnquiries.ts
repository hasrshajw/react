import { useCallback, useEffect, useRef, useState } from "react";
import { isoDay } from "../../../lib/dashboardData";
import { useLatest } from "../../../hooks/useLatest";
import { fetchEnquiryPage, fetchEnquirySummary, saveEnquiry, type EnquirySummary } from "../../../lib/api";
import type { Enquiry, EnquiryStatus, EnquiryTab, Notify } from "../../../types/dashboard";

const STATUS_TOAST: Record<EnquiryStatus, string> = {
  new: "Marked as new",
  called: "Marked as called",
  cancelled: "Marked as cancelled",
  followup: "Marked for follow-up",
};

const EMPTY: EnquirySummary = { total: 0, new: 0, followup: 0, called: 0, cancelled: 0, staleNew: 0, dueFollow: 0, newestId: "" };
const sameSummary = (a: EnquirySummary, b: EnquirySummary) => (Object.keys(a) as (keyof EnquirySummary)[]).every((k) => a[k] === b[k]);
const byNewest = (a: Enquiry, b: Enquiry) => (a.createdAt === b.createdAt ? (a.id < b.id ? 1 : -1) : a.createdAt < b.createdAt ? 1 : -1);

/** What the panel is showing: which tab, which search, and whether it is open. The list is read only while it is open. */
export interface EnquiryView { open: boolean; tab: EnquiryTab; search: string }

/** Site enquiries. The Dashboard opens with one small summary (counts); the rows themselves are read in pages of 10 when the panel is
 *  opened, and again for a tab or a search. Status changes (with undo), notes and follow-up dates work on the rows on screen. */
export function useEnquiries(notify: Notify, onCountChange?: (n: number) => void, view: EnquiryView = { open: false, tab: "new", search: "" }) {
  const [summary, setSummary] = useState<EnquirySummary | null>(null);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [moreBusy, setMoreBusy] = useState(false);

  /* Changes made on this screen, and saves still on their way. A refresh that started before a change, or while a save is
     pending, is thrown away (the next one picks up the server state), so polling never overwrites what the person just did. */
  const changes = useRef(0);
  const saving = useRef(0);
  const seen = useRef<EnquirySummary | null>(null);
  const offset = useRef(0);
  const listKey = useRef("");
  const viewRef = useLatest(view);

  const applySummary = useCallback((s: EnquirySummary) => { seen.current = s; setSummary(s); }, []);

  /* First load: one small request. */
  useEffect(() => {
    let live = true;
    fetchEnquirySummary().then((s) => { if (live) applySummary(s); }, () => { /* the card stays blank; the next check tries again */ });
    return () => { live = false; };
  }, [applySummary]);

  /* The list: first page when the panel opens or the tab / search changes. */
  const key = `${view.tab}|${view.search.trim()}`;
  useEffect(() => {
    if (!view.open) { listKey.current = ""; return; }
    let live = true;
    const started = changes.current;
    listKey.current = key;
    offset.current = 0;
    setListLoading(true);
    const run = () => {
      fetchEnquiryPage({ tab: view.tab, search: view.search }).then(
        (p) => {
          if (!live) return;
          /* Anything changed on screen while this was on its way: keep the screen's version of those rows. */
          setEnquiries((prev) => (changes.current === started || prev.length === 0 ? p.items : p.items.map((e) => prev.find((x) => x.id === e.id) ?? e)));
          offset.current = p.items.length;
          setHasMore(p.hasMore);
          setListLoading(false);
        },
        () => { if (live) { setListLoading(false); notify("Couldn’t load enquiries. Try again."); } },
      );
    };
    /* A short pause so typing a search does not send a request per letter. */
    const t = view.search.trim() ? setTimeout(run, 300) : (run(), undefined);
    return () => { live = false; if (t) clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.open, key]);

  const loadMore = useCallback(() => {
    const v = viewRef.current;
    if (moreBusy || !v.open) return;
    setMoreBusy(true);
    const forKey = listKey.current;
    fetchEnquiryPage({ tab: v.tab, search: v.search, offset: offset.current }).then(
      (p) => {
        if (listKey.current !== forKey) return;
        offset.current += p.items.length;
        setEnquiries((prev) => { const have = new Set(prev.map((e) => e.id)); return [...prev, ...p.items.filter((e) => !have.has(e.id))]; });
        setHasMore(p.hasMore);
      },
      () => notify("Couldn’t load more enquiries. Try again."),
    ).finally(() => setMoreBusy(false));
  }, [moreBusy, notify, viewRef]);

  /* M-6: pick up enquiries that arrive while the Dashboard stays open: every 60 s and when the tab is shown again.
     One small summary request; the first page is read again only if the summary changed and the panel is open. */
  const refresh = useCallback(() => {
    if (document.hidden || saving.current > 0) return;
    const started = changes.current;
    fetchEnquirySummary().then(
      (s) => {
        if (changes.current !== started || saving.current > 0) return;
        if (seen.current && sameSummary(seen.current, s)) return;
        applySummary(s);
        const v = viewRef.current;
        if (!v.open) return;
        return fetchEnquiryPage({ tab: v.tab, search: v.search }).then((p) => {
          if (changes.current !== started || saving.current > 0 || listKey.current !== `${v.tab}|${v.search.trim()}`) return;
          /* New and changed rows replace the ones on screen; rows already paged in stay. */
          setEnquiries((prev) => {
            const fresh = new Map(p.items.map((e) => [e.id, e]));
            const kept = prev.filter((e) => !fresh.has(e.id));
            return [...p.items, ...kept].sort(byNewest);
          });
        });
      },
      () => { /* silent: what is on screen stays */ },
    ).catch(() => { /* silent */ });
  }, [applySummary, viewRef]);
  useEffect(() => {
    if (!summary) return;
    const t = setInterval(refresh, 60000);
    const onVisible = () => { if (!document.hidden) refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVisible); };
  }, [summary === null, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Counts follow a change at once; the exact numbers (overdue, waiting over 24h) are read again when the saves are done. */
  const bump = (from: EnquiryStatus, to: EnquiryStatus) => {
    if (from === to) return;
    setSummary((s) => (s ? { ...s, [from]: Math.max(0, s[from] - 1), [to]: s[to] + 1 } : s));
  };
  const resync = () => { fetchEnquirySummary().then((s) => { if (saving.current === 0) applySummary(s); }, () => {}); };

  /* Save in the background; if it fails, put the old values back and tell the user. */
  const persist = (next: Enquiry, prev: Enquiry) => {
    changes.current++;
    saving.current++;
    saveEnquiry(next).then((history) => {
      /* Show the history the server wrote (server time, other admins' entries), unless another save of ours is still on its way. */
      if (saving.current === 1) setEnquiries((p) => p.map((e) => (e.id === next.id ? { ...e, history } : e)));
    }).catch(() => {
      setEnquiries((p) => p.map((e) => (e.id === prev.id ? prev : e)));
      bump(next.status, prev.status);
      notify("Couldn’t save that change, so it was undone.");
    }).finally(() => { saving.current--; changes.current++; if (saving.current === 0) resync(); });
  };

  const find = (id: string) => enquiries.find((e) => e.id === id);

  const setStatus = (id: string, status: EnquiryStatus) => {
    const prev = find(id);
    if (!prev) return;
    const next: Enquiry = {
      ...prev,
      status,
      history: [...(prev.history || []), { status, at: new Date().toISOString() }],
      followUpDate: status === "followup" ? prev.followUpDate || isoDay(1) : prev.followUpDate,
    };
    setEnquiries((p) => p.map((e) => (e.id === id ? next : e)));
    bump(prev.status, status);
    persist(next, prev);
    notify(STATUS_TOAST[status], () => { setEnquiries((p) => p.map((e) => (e.id === id ? prev : e))); bump(status, prev.status); persist(prev, next); });
  };

  const saveNote = (id: string, value: string) => {
    const v = value.trim();
    const prev = find(id);
    if (!prev || (prev.note || "") === v) return;
    const next = { ...prev, note: v };
    setEnquiries((p) => p.map((e) => (e.id === id ? next : e)));
    persist(next, prev);
    notify("Note saved");
  };

  const setFollowDate = (id: string, date: string) => {
    const prev = find(id);
    if (!prev) return;
    const next = { ...prev, followUpDate: date };
    setEnquiries((p) => p.map((e) => (e.id === id ? next : e)));
    persist(next, prev);
  };

  const s = summary ?? EMPTY;
  const loading = summary === null;

  /* unread badge: reported to the shell (sidebar badge and tab title) once the summary has loaded; before that the
     count is still 0 and would wipe the number the shell fetched on its own. */
  const countChangeRef = useLatest(onCountChange);
  useEffect(() => { if (summary) countChangeRef.current?.(summary.new); }, [summary?.new, summary === null, countChangeRef]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    enquiries, loading, listLoading, hasMore, moreBusy, loadMore,
    enqNew: s.new, enqFollow: s.followup, enqTotal: s.total, staleNew: s.staleNew, dueFollow: s.dueFollow, counts: s,
    setStatus, saveNote, setFollowDate,
  };
}
