import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LIST_LIMIT } from "../../../lib/listLimit";
import { deleteInvitation, fetchExpiredTrashIds, fetchInvitations, saveDeleted, savePublished } from "../../../lib/api";
import {
  DAY, TRASH_DAYS, isPast,
} from "../../../lib/dashboardData";
import type {
  DeletedMap, InvitationRow, Notify, PublishMap, TrashItem,
} from "../../../types/dashboard";

interface Options {
  notify: Notify;
  /** Hard-delete invitations that have sat in the trash for TRASH_DAYS (when the data layer supports it). */
  purgeExpired?: boolean;
}

/** State that changes on screen immediately and is saved afterwards (optimistic update).
 *  If the save fails, the screen goes back to the last state that was saved and `onFail` runs.
 *  Saves finish in the order they were sent (the data layer runs them one at a time, see lib/api.ts).
 *  `adopt` lets a refresh from the server replace the state, but only when no local change is waiting to be saved. */
function useOptimisticMap<T>(initial: () => T, persist: (next: T) => Promise<unknown>, onFail: () => void) {
  const [state, setState] = useState<T>(initial);
  const ref = useRef(state);
  const confirmed = useRef(state);
  const sent = useRef(0);
  const settled = useRef(0);
  const waiting = useRef(0); // saves that were sent and have not finished yet

  const commit = useCallback((next: T) => {
    ref.current = next;
    setState(next);
    const id = ++sent.current;
    waiting.current++;
    persist(next).then(
      () => { waiting.current--; if (id > settled.current) { settled.current = id; confirmed.current = next; } },
      () => {
        waiting.current--;
        if (id !== sent.current) return; // a newer change is already on its way and includes this one
        ref.current = confirmed.current;
        setState(confirmed.current);
        onFail();
      },
    );
  }, [persist, onFail]);

  /* Replace the state with what the server says (used for the first load). */
  const reset = useCallback((next: T) => { ref.current = next; confirmed.current = next; setState(next); }, []);

  /* H-6: take what the server says after a refresh. `since` is `version()` read before the request started.
     Skipped when a change was made, or is still being saved, in the meantime: the screen is then newer than the answer. */
  const adopt = useCallback((next: T, since: number) => {
    if (waiting.current > 0 || sent.current !== since) return;
    reset(next);
  }, [reset]);
  const version = useCallback(() => sent.current, []);

  return [state, ref, commit, reset, adopt, version] as const;
}

/** Loads invitations and owns the "published" and "trashed" state shared by Dashboard and All Invitations.
 *  `loading` is true only until the first data arrives (show skeletons). Later reloads set `refreshing`
 *  instead and keep the old rows on screen (stale-while-revalidate). */
export function useInvitationStore({ notify, purgeExpired = false }: Options) {
  const [rows, setRows] = useState<InvitationRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const alive = useRef(true);
  const loadedRef = useRef(false);
  /* How many rows a read may fetch. "Load more" raises it by LIST_LIMIT; refreshes keep using the raised value (M-5). */
  const limitRef = useRef(LIST_LIMIT);
  const loading = busy && lastUpdated === null;
  const refreshing = busy && lastUpdated !== null;

  const loadRef = useRef<(silent?: boolean) => void>(() => {});
  /* After a failed save the screen goes back to the last state it knew was saved, which can differ from the server
     (a bulk change may have been partly applied). Ask the server and show what it holds. */
  const failed = useCallback(() => {
    notify("Couldn’t save that change, so it was undone.");
    loadRef.current(true);
  }, [notify]);
  const [pub, pubRef, commitPub, resetPub, adoptPub, pubVersion] = useOptimisticMap<PublishMap>(() => ({}), savePublished, failed);
  const [deleted, delRef, writeDeleted, resetDeleted, adoptDeleted, delVersion] = useOptimisticMap<DeletedMap>(() => ({}), saveDeleted, failed);

  const load = useCallback((silent = false) => {
    if (!silent) setBusy(true);
    setError(false);
    const pubSince = pubVersion();
    const delSince = delVersion();
    fetchInvitations(limitRef.current).then(
      (res) => {
        if (!alive.current) return;
        setRows(res.rows);
        setTruncated(!!res.truncated);
        /* First load: the server decides. Later loads (H-6): the server decides too, unless a change made here is
           still being saved or was made after the request started, because then the screen is newer than the answer. */
        if (!loadedRef.current) { resetPub(res.published); resetDeleted(res.deleted); }
        else { adoptPub(res.published, pubSince); adoptDeleted(res.deleted, delSince); }
        loadedRef.current = true;
        setLastUpdated(Date.now());
        setBusy(false);
      },
      () => {
        if (!alive.current) return;
        if (silent) { /* background refresh: stay quiet */ }
        else if (loadedRef.current) notify("Couldn’t refresh. Showing the last loaded data.");
        else setError(true);
        setBusy(false);
      },
    );
  }, [notify, resetPub, resetDeleted, adoptPub, adoptDeleted, pubVersion, delVersion]);
  loadRef.current = load;
  const reload = useCallback(() => {
    fetchInvitations(limitRef.current).then((res) => { if (alive.current) { setRows(res.rows); setTruncated(!!res.truncated); } }, () => notify("Couldn’t refresh the list."));
  }, [notify]);

  /* "Load more": read another LIST_LIMIT older invitations. The raised limit is undone if the read fails. */
  const loadMore = useCallback(() => {
    if (busy) return;
    const before = limitRef.current;
    limitRef.current = before + LIST_LIMIT;
    setBusy(true);
    fetchInvitations(limitRef.current).then(
      (res) => { if (!alive.current) return; setRows(res.rows); setTruncated(!!res.truncated); adoptPub(res.published, pubVersion()); adoptDeleted(res.deleted, delVersion()); setBusy(false); },
      () => { limitRef.current = before; if (!alive.current) return; notify("Couldn’t load more invitations."); setBusy(false); },
    );
  }, [busy, notify, adoptPub, adoptDeleted, pubVersion, delVersion]);

  useEffect(() => {
    alive.current = true;
    load();
    return () => { alive.current = false; };
  }, [load]);

  /* clock for "x min ago" labels and due dates */
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  /* ---------- published flag ---------- */
  const isPub = useCallback((x: InvitationRow) => pub[x.id] !== false, [pub]);
  const writePub = useCallback((id: string, v: boolean) => commitPub({ ...pubRef.current, [id]: v }), [commitPub, pubRef]);

  const togglePublish = (x: InvitationRow) => {
    const wasLive = isPub(x);
    writePub(x.id, !wasLive);
    notify(
      wasLive ? (isPast(x) ? "Invitation archived" : "Invitation moved to draft") : "Invitation published",
      () => writePub(x.id, wasLive)
    );
  };

  /* ---------- trash ---------- */
  const restoreInvitation = useCallback((id: string) => {
    const n = { ...delRef.current };
    delete n[id];
    writeDeleted(n);
  }, [writeDeleted, delRef]);
  const moveToTrash = (x: InvitationRow) => {
    writeDeleted({ ...delRef.current, [x.id]: Date.now() });
    notify("Moved to trash", () => restoreInvitation(x.id));
  };

  const visible = useMemo(() => rows.filter((r) => !(r.id in deleted)), [rows, deleted]);
  const trashed = useMemo<TrashItem[]>(() => {
    const cutoff = Date.now() - TRASH_DAYS * DAY;
    return rows
      .filter((r) => r.id in deleted && deleted[r.id] >= cutoff)
      .map((row) => ({ row, at: deleted[row.id] }))
      .sort((a, b) => b.at - a.at);
  }, [rows, deleted]);

  /* L-8: which trashed invitations are old enough to delete for good is decided by the server (its clock, its stamp), once per
     visit, not by comparing this device's clock with the trash dates. Each one is removed with its preview image (deleteInvitation). */
  const purgedRef = useRef(false);
  useEffect(() => {
    if (!purgeExpired || purgedRef.current || !rows.length) return;
    purgedRef.current = true;
    fetchExpiredTrashIds()
      .then((ids) => {
        const known = new Set(rows.map((r) => r.id));
        const old = ids.filter((id) => known.has(id));
        if (!old.length) return;
        return Promise.all(old.map((id) => deleteInvitation(id))).then(() => { if (alive.current) loadRef.current(true); });
      })
      .catch(() => { /* try again next time the page opens */ });
  }, [rows, purgeExpired]);

  return {
    rows, truncated, loadMore, loading, refreshing, error, lastUpdated, now, load, reload,
    pub, pubRef, isPub, commitPub, writePub, togglePublish,
    deleted, delRef, writeDeleted, restoreInvitation, moveToTrash,
    visible, trashed,
  };
}
