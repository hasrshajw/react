import dashboardCss from "../styles/dashboard.css?inline";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive, EyeOff, Globe, MessageCircle, QrCode, Trash2,
} from "../components/Icons";
import {
  DAY, LS_AUTO, PAGE_SIZE, coupleName, copyText, followDue, getInviteLink, getViews,
  isPast, readJSON, shareOnWhatsApp, sortInvitations, topViewedId, writeJSON,
} from "../lib/dashboardData";
import { PreviewPanel } from "../features/dashboard/components/PreviewPanel";
import { QrModal } from "../features/dashboard/components/QrModal";
import { TrashModal } from "../features/dashboard/components/TrashModal";
import { EnquiriesPanel } from "../features/dashboard/components/EnquiriesPanel";
import { PageHeader } from "../features/dashboard/components/PageHeader";
import { LimitNotice } from "../features/dashboard/components/ListStates";
import { StatCards } from "../features/dashboard/components/StatCards";
import { AttentionStrip, type AttentionItem } from "../features/dashboard/components/AttentionStrip";
import { RecentInvitations } from "../features/dashboard/components/RecentInvitations";
import { RowMenu } from "../features/dashboard/components/RowMenu";
import { Toast } from "../features/dashboard/components/Toast";
import { matchesFilter } from "../features/dashboard/filters";
import { useRowHint } from "../hooks/useRowHint";
import { useLatest } from "../hooks/useLatest";
import { useSkeletonPhase } from "../hooks/useSkeletonPhase";
import { useNotify } from "../features/dashboard/hooks/useNotify";
import { useInvitationStore } from "../features/dashboard/hooks/useInvitationStore";
import { useEnquiries } from "../features/dashboard/hooks/useEnquiries";
import { useRowMenu } from "../features/dashboard/hooks/useRowMenu";
import { useShortcuts } from "../features/dashboard/hooks/useShortcuts";
import type { EnquiryTab, InvitationRow, SortKey, TableFilter } from "../types/dashboard";

interface Props {
  onPanelChange?: (open: boolean) => void;
  onEnquiryCountChange?: (n: number) => void;
}

export default function Dashboard({ onPanelChange, onEnquiryCountChange }: Props) {
  const navigate = useNavigate();
  const { toast, notify, dismiss } = useNotify();
  const store = useInvitationStore({ notify, purgeExpired: true });
  const { visible, trashed, isPub, now } = store;
  const enq = useEnquiries(notify, onEnquiryCountChange);
  /* Skeletons wait ~150ms before appearing and stay at least ~300ms, so fast loads do not flash. */
  const invPhase = useSkeletonPhase(store.loading);
  const enqPhase = useSkeletonPhase(enq.loading);
  const invSkel = invPhase !== "idle";
  const enqSkel = enqPhase !== "idle";

  const [autoRefresh, setAutoRefresh] = useState(() => readJSON(LS_AUTO, false));

  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [filter, setFilter] = useState<TableFilter>("all");
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState(1);

  const [reqOpen, setReqOpen] = useState(false);
  const [reqTab, setReqTab] = useState<EnquiryTab>("new");
  const [preview, setPreview] = useState<InvitationRow | null>(null);
  const [qr, setQr] = useState<InvitationRow | null>(null);
  const [trash, setTrash] = useState(false);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [narrow, setNarrow] = useState(false);

  const pageRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const { menu, menuRef, openMenu, closeMenu, onMenuKey } = useRowMenu(opener);

  /* optional silent auto-refresh */
  const { load: loadList } = store;
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => loadList(true), 60000);
    return () => clearInterval(t);
  }, [autoRefresh, loadList]);

  useEffect(() => { setSlot(document.getElementById("preview-slot")); }, []);

  /* Tell the page when it is narrow (e.g. preview open) so the cards can reflow. */
  useEffect(() => {
    const el = pageRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setNarrow(e.contentRect.width < 980));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---------- side panels (preview / enquiries) ---------- */
  const rememberOpener = () => { opener.current = document.activeElement as HTMLElement | null; };
  const refocusOpener = () => {
    const el = opener.current;
    opener.current = null;
    if (el && el !== document.body && el.isConnected) setTimeout(() => el.focus?.(), 0);
  };
  const closePanel = () => {
    setPreview(null);
    setReqOpen(false);
    refocusOpener();
  };
  const openPreview = (x: InvitationRow) => {
    if (preview?.id === x.id) { closePanel(); return; }
    if (!preview && !reqOpen) rememberOpener();
    setReqOpen(false);
    setPreview(x);
  };
  /* Open the enquiries panel on a tab (or just switch tab if it is already open). */
  const showRequests = (tab: EnquiryTab = "new") => {
    if (!reqOpen && !preview) rememberOpener();
    setPreview(null);
    setReqTab(tab);
    setReqOpen(true);
  };
  const toggleRequests = () => {
    if (reqOpen) { closePanel(); return; }
    showRequests(reqTab);
  };

  /* Tell App whether a right-side panel is open. */
  const panelChangeRef = useLatest(onPanelChange);
  useEffect(() => { panelChangeRef.current?.(!!(preview || reqOpen)); }, [preview, reqOpen, panelChangeRef]);
  useEffect(() => () => panelChangeRef.current?.(false), [panelChangeRef]);

  /* ---------- derived invitation data ---------- */
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    let r = visible.filter((x) => matchesFilter(x, filter, isPub(x)));
    if (term) r = r.filter((x) => coupleName(x).toLowerCase().includes(term));
    return sortInvitations(r, sort);
  }, [visible, q, sort, filter, isPub]);

  const expanded = showAll || q.trim() !== "" || filter !== "all";
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const shown = expanded ? list.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE) : list.slice(0, 5);
  const topId = useMemo(() => topViewedId(visible), [visible]);
  const pubCount = visible.filter(isPub).length;
  /* Real view counts: a visitor's first open of a public link each day adds one (see record_invitation_view in schema.sql). */
  const totalViews = visible.reduce((n, x) => n + getViews(x), 0);
  const viewedCount = visible.filter((x) => getViews(x) > 0).length;
  const skeletonRows = useRowHint("dashboard", visible.length, store.loading, 5);
  const attnReady = !store.loading && !enq.loading;
  const [attnHint] = useState(() => Number(readJSON<number>("schedy-attn", 0)) || 0);

  const applyFilter = (f: TableFilter) => {
    setFilter(f);
    setQ("");
    setPage(1);
    setShowAll(false);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    tableRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  /* ---------- "Needs attention" ---------- */
  const soonDrafts = visible.filter((x) => matchesFilter(x, "draftSoon", isPub(x))).length;
  const noViews = visible.filter((x) => matchesFilter(x, "noViews", isPub(x))).length;
  const staleNew = enq.enquiries.filter((e) => e.status === "new" && now - Date.parse(e.createdAt) > DAY).length;
  const dueFollow = enq.enquiries.filter((e) => ["today", "overdue"].includes(followDue(e) || "")).length;
  const attention = [
    soonDrafts > 0 && { key: "soon", tone: "danger", count: soonDrafts, label: `draft ${soonDrafts === 1 ? "invitation" : "invitations"} with an event in 7 days`, run: () => applyFilter("draftSoon") },
    staleNew > 0 && { key: "stale", tone: "danger", count: staleNew, label: `new ${staleNew === 1 ? "enquiry" : "enquiries"} waiting over 24h`, run: () => showRequests("new") },
    dueFollow > 0 && { key: "due", tone: "warn", count: dueFollow, label: `follow-up${dueFollow === 1 ? "" : "s"} due or overdue`, run: () => showRequests("followup") },
    noViews > 0 && { key: "views", tone: "info", count: noViews, label: "published with no views", run: () => applyFilter("noViews") },
  ].filter((a): a is AttentionItem => !!a);

  useEffect(() => { if (attnReady) writeJSON("schedy-attn", attention.length); }, [attnReady, attention.length]);

  /* ---------- row actions ---------- */
  const copyLink = (x: InvitationRow) => copyText(getInviteLink(x), "Link copied", notify);
  const doDelete = (x: InvitationRow) => {
    store.moveToTrash(x);
    if (preview?.id === x.id) closePanel();
  };

  const closeAll = () => {
    setQr(null);
    setTrash(false);
    const el = opener.current;
    if (el && el.isConnected) setTimeout(() => el.focus?.(), 0);
  };

  /* ---------- keyboard shortcuts: "/" search, "N" new invitation ---------- */
  useShortcuts(
    { "/": () => searchRef.current?.focus(), n: () => navigate("/create") },
    !!(qr || trash || menu)
  );

  return (
    <div
      className={`dashboard-page${narrow ? " narrow" : ""}${invPhase === "hold" || enqPhase === "hold" ? " sk-pending" : ""}`}
      ref={pageRef} aria-busy={store.loading || enq.loading || store.refreshing}
    >
      <PageHeader
        title="Dashboard"
        subtitle="Manage and preview your invitations."
        lastUpdated={store.lastUpdated}
        loading={invSkel}
        refreshing={store.refreshing}
        now={now}
        onRefresh={() => store.load()}
        createTitle="Create invitation (N)"
        extra={
          <button
            type="button" className={`auto-btn${autoRefresh ? " on" : ""}`} aria-pressed={autoRefresh} title="Refresh every minute"
            onClick={() => { const v = !autoRefresh; setAutoRefresh(v); writeJSON(LS_AUTO, v); }}
          >
            Auto
          </button>
        }
      />

      {store.truncated && <LimitNotice shown={store.rows.length} onLoadMore={store.loadMore} busy={store.refreshing} />}

      <StatCards
        loading={invSkel} enqLoading={enqSkel}
        total={visible.length} published={pubCount} drafts={visible.length - pubCount}
        onFilter={applyFilter}
        views={totalViews} viewed={viewedCount} unviewed={visible.length - viewedCount}
        enqNew={enq.enqNew} enqTotal={enq.enquiries.length} enqFollow={enq.enqFollow}
        requestsOpen={reqOpen}
        onShowFollowups={() => showRequests("followup")}
        onToggleRequests={toggleRequests}
      />

      <AttentionStrip items={attention} loading={invSkel || enqSkel} expected={attnHint} />

      <RecentInvitations
        tableRef={tableRef} searchRef={searchRef}
        loading={invSkel} holdSkeleton={invPhase === "hold"} skeletonRows={skeletonRows} error={store.error}
        visible={visible} list={list} shown={shown} trashed={trashed} topId={topId}
        q={q} sort={sort} filter={filter} expanded={expanded} showAll={showAll} page={cur} pages={pages}
        previewId={preview?.id} menuId={menu?.x.id}
        isPub={isPub}
        onQuery={(v) => { setQ(v); setPage(1); }}
        onSort={(v) => { setSort(v); setPage(1); }}
        onClearFilter={() => { setFilter("all"); setPage(1); }}
        onClearAll={() => { setQ(""); setFilter("all"); }}
        onRetry={() => store.load()}
        onOpenTrash={(e: MouseEvent<HTMLButtonElement>) => { opener.current = e.currentTarget; setTrash(true); }}
        onPreview={openPreview} onCopyLink={copyLink} onOpenMenu={openMenu}
        onPage={setPage}
        onShowLess={() => { setShowAll(false); setPage(1); }}
        onViewAll={() => navigate(sort !== "recent" ? `/invitations?sort=${sort}` : "/invitations")}
      />

      {/* ---------- row menu ---------- */}
      {menu && (() => {
        const x = menu.x;
        const live = isPub(x);
        const past = isPast(x);
        return (
          <RowMenu menu={menu} menuRef={menuRef} onKeyDown={onMenuKey}>
            <button type="button" role="menuitem" disabled={!live} onClick={() => { shareOnWhatsApp(x); closeMenu(true); }}>
              <MessageCircle size={15} /> Share on WhatsApp
            </button>
            <button type="button" role="menuitem" disabled={!live} onClick={() => { setQr(x); closeMenu(false); }}>
              <QrCode size={15} /> QR code
            </button>
            <button type="button" role="menuitem" onClick={() => { store.togglePublish(x); closeMenu(true); }}>
              {live ? (past ? <><Archive size={15} /> Archive &amp; expire link</> : <><EyeOff size={15} /> Move to draft</>) : <><Globe size={15} /> Publish</>}
            </button>
            <i className="menu-sep" />
            <button type="button" role="menuitem" className="danger" onClick={() => { doDelete(x); closeMenu(true); }}>
              <Trash2 size={15} /> Move to trash
            </button>
          </RowMenu>
        );
      })()}

      {/* ---------- overlays ---------- */}
      {preview && <PreviewPanel slot={slot} row={preview} published={isPub(preview)} onClose={closePanel} />}
      {qr && <QrModal row={qr} onClose={closeAll} onCopy={copyLink} />}
      {trash && <TrashModal items={trashed} onRestore={store.restoreInvitation} onClose={closeAll} />}
      {reqOpen && (
        <EnquiriesPanel
          slot={slot} enquiries={enq.enquiries} now={now} tab={reqTab} onTab={setReqTab} onClose={closePanel}
          onSetStatus={enq.setStatus} onSaveNote={enq.saveNote} onSetFollowDate={enq.setFollowDate} notify={notify}
        />
      )}
      <Toast toast={toast} onDismiss={dismiss} />

      <style>{dashboardCss}</style>
    </div>
  );
}
