import dashboardCss from "../styles/dashboard.css?inline";
import invitationsCss from "../features/invitations/invitations.css?inline";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Archive, Copy, EyeOff, Globe, Share, Trash2 } from "../components/Icons";
import { fetchReviewQueue, saveInvitation } from "../lib/api";
import {
  PAGE_SIZE, copyText, coupleName, fmt, getInviteLink, isPast, shareOnWhatsApp, sortInvitations, topViewedId,
} from "../lib/dashboardData";
import { PreviewPanel } from "../features/dashboard/components/PreviewPanel";
import { TrashModal } from "../features/dashboard/components/TrashModal";
import { PageHeader } from "../features/dashboard/components/PageHeader";
import { RowMenu } from "../features/dashboard/components/RowMenu";
import { Toast } from "../features/dashboard/components/Toast";
import { ErrorState, InvitationsTableSkeleton, LimitNotice, NoInvitationsState, NoMatchState } from "../features/dashboard/components/ListStates";
import { useRowHint } from "../hooks/useRowHint";
import { useLatest } from "../hooks/useLatest";
import { useSkeletonPhase } from "../hooks/useSkeletonPhase";
import { useNotify } from "../features/dashboard/hooks/useNotify";
import { useInvitationStore } from "../features/dashboard/hooks/useInvitationStore";
import { useRowMenu } from "../features/dashboard/hooks/useRowMenu";
import { useShortcuts } from "../features/dashboard/hooks/useShortcuts";
import { BulkBar } from "../features/invitations/components/BulkBar";
import { InvitationsTable } from "../features/invitations/components/InvitationsTable";
import { InvitationsToolbar } from "../features/invitations/components/InvitationsToolbar";
import { ShareModal } from "../features/invitations/components/ShareModal";
import { useInvitationFilters } from "../features/invitations/hooks/useInvitationFilters";
import { useSelection } from "../features/invitations/hooks/useSelection";
import { dateMatch, exportInvitationsCsv, plural, templateOf, uid } from "../features/invitations/utils";
import type { InvitationRow } from "../types/dashboard";

/* "All Invitations" page: one flat list with status tabs, date filters, bulk actions
   and shareable URL filters. Deliberately not laid out like the Dashboard. */
export default function Invitations({ onPanelChange }: { onPanelChange?: (open: boolean) => void }) {
  const { toast, notify, dismiss } = useNotify();
  const store = useInvitationStore({ notify });
  const { rows, visible, trashed, isPub, loading } = store;
  const skeletonRows = useRowHint("invitations", visible.length, loading, PAGE_SIZE, 5);
  /* The skeleton waits ~150ms before appearing and stays at least ~300ms, so fast loads do not flash. */
  const phase = useSkeletonPhase(loading);
  const skel = phase !== "idle";

  const [page, setPage] = useState(1);
  const selection = useSelection();
  const { sel } = selection;

  /* Changing a filter resets paging and clears the selection (a selection should only
     ever cover rows the person can currently see). Sort keeps it. */
  const { status, when, sort, tpl, q, setParams, hasFilters, clearFilters } = useInvitationFilters((patch) => {
    setPage(1);
    if (!("sort" in patch)) selection.clear();
  });

  const [preview, setPreview] = useState<InvitationRow | null>(null);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [trash, setTrash] = useState(false);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(() => new Set());
  const opener = useRef<HTMLElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const headCheck = useRef<HTMLInputElement>(null);
  const { menu, menuRef, openMenu, closeMenu, onMenuKey } = useRowMenu(opener);

  useEffect(() => { setSlot(document.getElementById("preview-slot")); }, []);

  /* Pending change requests (admin only; RLS returns nothing for others). Used for the "Pending review" chip. */
  useEffect(() => {
    let live = true;
    fetchReviewQueue().then(
      (items) => {
        if (!live) return;
        setPendingIds(new Set(items.map((i) => i.invitationId)));
      },
      () => { /* list still works without the chip */ },
    );
    return () => { live = false; };
  }, [rows]);

  /* preview panel: tell App so the sidebar switches to overlay mode */
  const closePanel = () => {
    setPreview(null);
    const el = opener.current;
    if (el && el !== document.body && el.isConnected) setTimeout(() => el.focus?.(), 0);
  };
  const openPreview = (x: InvitationRow) => {
    if (preview?.id === x.id) { closePanel(); return; }
    if (!preview) opener.current = document.activeElement as HTMLElement | null;
    setPreview(x);
  };
  const panelChangeRef = useLatest(onPanelChange);
  useEffect(() => { panelChangeRef.current?.(!!preview); }, [preview, panelChangeRef]);
  useEffect(() => () => panelChangeRef.current?.(false), [panelChangeRef]);

  /* ---------- derived data ---------- */
  const stats = useMemo(() => ({
    total: visible.length,
    pub: visible.filter(isPub).length,
    draft: visible.filter((x) => !isPub(x)).length,
    upcoming: visible.filter((x) => dateMatch(x, "upcoming")).length,
    week: visible.filter((x) => dateMatch(x, "week")).length,
    past: visible.filter((x) => dateMatch(x, "past")).length,
  }), [visible, isPub]);

  const templates = useMemo(() => {
    const m = new Map<string, { key: string; name: string; n: number }>();
    visible.forEach((x) => {
      const t = templateOf(x);
      const e = m.get(t.key) || { ...t, n: 0 };
      e.n += 1;
      m.set(t.key, e);
    });
    return [...m.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  }, [visible]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    let r = visible.filter((x) => status === "all" || (status === "published" ? isPub(x) : !isPub(x)));
    r = r.filter((x) => dateMatch(x, when));
    if (tpl !== "all") r = r.filter((x) => templateOf(x).key === tpl);
    if (term) {
      r = r.filter((x) =>
        coupleName(x).toLowerCase().includes(term)
        || (x.client_email || "").toLowerCase().includes(term),
      );
    }
    return sortInvitations(r, sort);
  }, [visible, q, sort, status, when, tpl, isPub]);

  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const shown = list.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
  const topId = useMemo(() => topViewedId(visible), [visible]);

  const selectedRows = useMemo(() => list.filter((x) => sel.has(x.id)), [list, sel]);
  const onPageSel = shown.filter((x) => sel.has(x.id)).length;
  const allOnPage = shown.length > 0 && onPageSel === shown.length;
  useEffect(() => {
    if (headCheck.current) headCheck.current.indeterminate = onPageSel > 0 && !allOnPage;
  });

  const shareRow = shareId ? rows.find((r) => r.id === shareId) : null;
  useEffect(() => { if (shareId && !shareRow && !loading) setShareId(null); }, [shareId, shareRow, loading]);

  /* ---------- row actions ---------- */
  const copyLink = (x: InvitationRow) => copyText(getInviteLink(x), "Link copied", notify);
  const doDelete = (x: InvitationRow) => {
    store.moveToTrash(x);
    if (preview?.id === x.id) closePanel();
  };

  const duplicate = (x: InvitationRow) => {
    const { views: _views, created_at: _createdAt, updated_at: _updatedAt, ...rest } = x;
    saveInvitation({
      ...rest,
      id: uid(),
      // The copy needs its own link: a custom link ID can only belong to one invitation.
      details: x.details ? { ...x.details, customId: "" } : undefined,
    }, { published: false }).then(
      (copy) => {
        store.writePub(copy.id, false);
        store.reload();
        notify(`Duplicated ${coupleName(x)} as a draft`, () => store.writeDeleted({ ...store.delRef.current, [copy.id]: Date.now() }));
      },
      () => notify("Couldn’t duplicate that invitation."),
    );
  };

  const saveLink = (x: InvitationRow, slug: string) => {
    saveInvitation({ ...x, details: { ...(x.details || {}), customId: slug } }).then(
      () => { store.reload(); notify(slug ? "Link updated" : "Custom link removed"); },
      (e) => notify(e instanceof Error ? e.message : "Couldn’t update the link."),
    );
  };

  /* ---------- bulk actions ---------- */
  const bulkPublish = (v: boolean) => {
    const ids = selectedRows.map((x) => x.id);
    if (!ids.length) return;
    const prev = ids.map((id) => [id, store.pubRef.current[id]] as const);
    const n = { ...store.pubRef.current };
    ids.forEach((id) => { n[id] = v; });
    store.commitPub(n);
    selection.clear();
    notify(
      `${ids.length} ${plural(ids.length)} ${v ? "published" : "moved to draft"}`,
      () => {
        const back = { ...store.pubRef.current };
        prev.forEach(([id, was]) => { if (was === undefined) delete back[id]; else back[id] = was; });
        store.commitPub(back);
      }
    );
  };
  const bulkTrash = () => {
    const ids = selectedRows.map((x) => x.id);
    if (!ids.length) return;
    const stamp = Date.now();
    const n = { ...store.delRef.current };
    ids.forEach((id) => { n[id] = stamp; });
    store.writeDeleted(n);
    if (preview && ids.includes(preview.id)) closePanel();
    selection.clear();
    notify(
      `${ids.length} ${plural(ids.length)} moved to trash`,
      () => {
        const back = { ...store.delRef.current };
        ids.forEach((id) => { delete back[id]; });
        store.writeDeleted(back);
      }
    );
  };
  const bulkExport = () => {
    exportInvitationsCsv(selectedRows, isPub);
    notify(`Exported ${selectedRows.length} ${plural(selectedRows.length)}`);
  };

  const closeAll = () => {
    setShareId(null);
    setTrash(false);
    const el = opener.current;
    if (el && el.isConnected) setTimeout(() => el.focus?.(), 0);
  };

  /* "/" focuses the search box */
  useShortcuts({ "/": () => searchRef.current?.focus() }, !!(shareId || trash || menu));

  const tabs: [typeof status, string, number][] = [
    ["all", "All", stats.total],
    ["published", "Published", stats.pub],
    ["draft", "Drafts", stats.draft],
  ];

  return (
    <div className={`dashboard-page inv-page${phase === "hold" ? " sk-pending" : ""}`} aria-busy={loading || store.refreshing}>
      <PageHeader
        title="All invitations"
        subtitle="Every invitation you have created, in one place."
        lastUpdated={store.lastUpdated}
        loading={skel}
        refreshing={store.refreshing}
        now={store.now}
        onRefresh={() => store.load()}
      />

      {store.truncated && <LimitNotice shown={store.rows.length} onLoadMore={store.loadMore} busy={store.refreshing} />}

      {/* ---------- status tabs ---------- */}
      <div className="inv-tabbar">
        <div className="inv-tabs" role="group" aria-label="Filter by status">
          {tabs.map(([key, label, n]) => (
            <button
              key={key} type="button" aria-pressed={status === key}
              className={`inv-tab${status === key ? " on" : ""}`}
              onClick={() => setParams({ status: key })}
            >
              {label} {skel ? <em className="sk-bg" aria-hidden="true">00</em> : <em>{fmt(n)}</em>}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- list ---------- */}
      <div className="inv-panel">
        <InvitationsToolbar
          loading={skel} when={when} counts={stats} hasFilters={hasFilters}
          q={q} tpl={tpl} sort={sort} templates={templates} trashedCount={trashed.length}
          searchRef={searchRef} onParams={setParams} onClearFilters={clearFilters}
          onOpenTrash={(e: MouseEvent<HTMLButtonElement>) => { opener.current = e.currentTarget; setTrash(true); }}
        />

        {selectedRows.length > 0 && (
          <BulkBar
            selected={selectedRows.length} total={list.length}
            onSelectAll={() => selection.selectMany(list)}
            onPublish={bulkPublish} onExport={bulkExport} onTrash={bulkTrash} onClear={selection.clear}
          />
        )}

        {store.error ? (
          <ErrorState onRetry={() => store.load()} />
        ) : skel ? (
          <InvitationsTableSkeleton rows={skeletonRows} detailed hold={phase === "hold"} />
        ) : visible.length === 0 ? (
          <NoInvitationsState />
        ) : list.length === 0 ? (
          <NoMatchState query={q} emptyHint="Nothing matches the current filters." onClear={clearFilters} />
        ) : (
          <InvitationsTable
            shown={shown} total={list.length} visibleCount={visible.length} page={cur} pages={pages}
            sel={sel} allOnPage={allOnPage} headCheck={headCheck} topId={topId} topTemplate={templates[0]}
            previewId={preview?.id} menuId={menu?.x.id} pendingIds={pendingIds} isPub={isPub}
            onTogglePage={() => selection.togglePage(shown, allOnPage)} onToggle={selection.toggle}
            onPreview={openPreview} onCopyLink={copyLink} onOpenMenu={openMenu} onPage={setPage}
          />
        )}
      </div>

      {/* ---------- row menu ---------- */}
      {menu && (() => {
        const x = menu.x;
        const live = isPub(x);
        const past = isPast(x);
        return (
          <RowMenu menu={menu} menuRef={menuRef} onKeyDown={onMenuKey}>
            <button type="button" role="menuitem" onClick={() => { setShareId(x.id); closeMenu(false); }}>
              <Share size={15} /> Share…
            </button>
            <button type="button" role="menuitem" onClick={() => { duplicate(x); closeMenu(true); }}>
              <Copy size={15} /> Duplicate
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
      {shareRow && (
        <ShareModal
          row={shareRow} rows={rows} live={isPub(shareRow)} onClose={closeAll}
          onCopy={copyLink} onWhatsApp={shareOnWhatsApp} onSaveLink={saveLink}
          onPublish={(x) => store.writePub(x.id, true)}
        />
      )}
      {trash && <TrashModal items={trashed} onRestore={store.restoreInvitation} onClose={closeAll} />}
      <Toast toast={toast} onDismiss={dismiss} />

      <style>{dashboardCss}</style>
      <style>{invitationsCss}</style>
    </div>
  );
}
