import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as demo from "../../../lib/demoData";
import {
  DAY, LS_DEL, LS_PUB, TRASH_DAYS, isPast, normDeleted, readJSON, writeJSON,
} from "../../../lib/dashboardData";
import type {
  DeletedMap, InvitationRow, Notify, PublishMap, TrashItem,
} from "../../../types/dashboard";

interface Options {
  notify: Notify;
  /** Hard-delete invitations that have sat in the trash for TRASH_DAYS (when the data layer supports it). */
  purgeExpired?: boolean;
}

/** Loads invitations and owns the "published" and "trashed" state shared by Dashboard and All Invitations. */
export function useInvitationStore({ notify, purgeExpired = false }: Options) {
  const [rows, setRows] = useState<InvitationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [pub, setPub] = useState<PublishMap>(() => readJSON<PublishMap>(LS_PUB, {}));
  const [deleted, setDeleted] = useState<DeletedMap>(() => normDeleted(readJSON<unknown>(LS_DEL, {})));
  const pubRef = useRef(pub);
  const delRef = useRef(deleted);

  const load = useCallback((silent = false) => {
    clearTimeout(timer.current);
    if (!silent) setLoading(true);
    setError(false);
    timer.current = setTimeout(() => {
      try {
        setRows(demo.getDemoInvitations());
        setLastUpdated(Date.now());
      } catch {
        if (!silent) setError(true);
      }
      setLoading(false);
    }, silent ? 0 : 350);
  }, []);
  const reload = useCallback(() => setRows(demo.getDemoInvitations()), []);

  useEffect(() => {
    load();
    return () => clearTimeout(timer.current);
  }, [load]);

  /* clock for "x min ago" labels and due dates */
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  /* ---------- published flag ---------- */
  const isPub = useCallback((x: InvitationRow) => pub[x.id] !== false, [pub]);
  const commitPub = useCallback((n: PublishMap) => {
    pubRef.current = n;
    setPub(n);
    writeJSON(LS_PUB, n);
  }, []);
  const writePub = useCallback((id: string, v: boolean) => commitPub({ ...pubRef.current, [id]: v }), [commitPub]);

  const togglePublish = (x: InvitationRow) => {
    const wasLive = isPub(x);
    writePub(x.id, !wasLive);
    notify(
      wasLive ? (isPast(x) ? "Invitation archived" : "Invitation moved to draft") : "Invitation published",
      () => writePub(x.id, wasLive)
    );
  };

  /* ---------- trash ---------- */
  const writeDeleted = useCallback((n: DeletedMap) => {
    delRef.current = n;
    setDeleted(n);
    writeJSON(LS_DEL, n);
  }, []);
  const restoreInvitation = useCallback((id: string) => {
    const n = { ...delRef.current };
    delete n[id];
    writeDeleted(n);
  }, [writeDeleted]);
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

  useEffect(() => {
    if (!purgeExpired || !rows.length) return;
    const hardDelete: unknown = Reflect.get(demo, "deleteDemoInvitation"); // not implemented by the demo data layer yet
    if (typeof hardDelete !== "function") return;
    const cutoff = Date.now() - TRASH_DAYS * DAY;
    const old = rows.filter((r) => r.id in delRef.current && delRef.current[r.id] < cutoff);
    if (!old.length) return;
    old.forEach((r) => (hardDelete as (id: string) => void)(r.id));
    const keep = { ...delRef.current };
    old.forEach((r) => delete keep[r.id]);
    writeDeleted(keep);
    reload();
  }, [rows, purgeExpired, writeDeleted, reload]);

  return {
    rows, loading, error, lastUpdated, now, load, reload,
    pub, pubRef, isPub, commitPub, writePub, togglePublish,
    deleted, delRef, writeDeleted, restoreInvitation, moveToTrash,
    visible, trashed,
  };
}
