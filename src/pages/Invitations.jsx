import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  FilePlus2, CalendarDays, ArrowUpRight, Eye, Pencil, Link2, Check, Plus, Search, Smartphone,
  MoreHorizontal, Trash2, X, MessageCircle, QrCode, Globe, EyeOff, ChevronLeft, ChevronRight,
  AlertTriangle, Archive, RefreshCw,
} from "../components/Icons";
import * as demo from "../lib/demoData";
import {
  DASHBOARD_CSS, Modal, PreviewPanel, QrModal, TrashModal, useEscape,
  LS_PUB, LS_DEL, PAGE_SIZE, TRASH_DAYS, DAY,
  readJSON, writeJSON, normDeleted, fmt, fmtDate, fmtDateTime, timeAgo,
  initials, coupleName, getViews, getInviteLink, dayDiff, whenText, isPast, copyText,
} from "./Dashboard";

/* "All Invitations" page: the same table as Dashboard > Recent invitations,
   but always showing the full list with pagination. */
export default function Invitations({ onPanelChange }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const timer = useRef();

  const [pub, setPub] = useState(() => readJSON(LS_PUB, {}));
  const [deleted, setDeleted] = useState(() => normDeleted(readJSON(LS_DEL, {})));
  const pubRef = useRef(pub);
  const delRef = useRef(deleted);

  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const [menu, setMenu] = useState(null);
  const [preview, setPreview] = useState(null);
  const [slot, setSlot] = useState(null);
  const [qr, setQr] = useState(null);
  const [trash, setTrash] = useState(false);
  const [toast, setToast] = useState(null);
  const menuRef = useRef(null);
  const opener = useRef(null);
  const searchRef = useRef(null);
  const toastTimer = useRef();

  const notify = (msg, undo) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, undo });
    toastTimer.current = setTimeout(() => setToast(null), undo ? 6000 : 2200);
  };

  const load = () => {
    clearTimeout(timer.current);
    setLoading(true);
    setError(false);
    timer.current = setTimeout(() => {
      try {
        setRows(demo.getDemoInvitations());
        setLastUpdated(Date.now());
      } catch {
        setError(true);
      }
      setLoading(false);
    }, 350);
  };
  useEffect(() => {
    load();
    return () => { clearTimeout(timer.current); clearTimeout(toastTimer.current); };
  }, []);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { setSlot(document.getElementById("preview-slot")); }, []);

  /* preview panel: tell App so the sidebar switches to overlay mode */
  const closePanel = () => {
    setPreview(null);
    const el = opener.current;
    if (el && el !== document.body && el.isConnected) setTimeout(() => el.focus?.(), 0);
  };
  const openPreview = (x) => {
    if (preview?.id === x.id) { closePanel(); return; }
    if (!preview) opener.current = document.activeElement;
    setPreview(x);
  };
  useEffect(() => { onPanelChange?.(!!preview); }, [preview]);
  useEffect(() => () => onPanelChange?.(false), []);

  /* ---------- derived data ---------- */
  const isPub = (x) => pub[x.id] !== false;
  const visible = useMemo(() => rows.filter((r) => !(r.id in deleted)), [rows, deleted]);
  const trashed = useMemo(() => {
    const cutoff = Date.now() - TRASH_DAYS * DAY;
    return rows
      .filter((r) => r.id in deleted && deleted[r.id] >= cutoff)
      .map((row) => ({ row, at: deleted[row.id] }))
      .sort((a, b) => b.at - a.at);
  }, [rows, deleted]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    let r = visible.filter((x) => status === "all" || (status === "published" ? isPub(x) : !isPub(x)));
    if (term) r = r.filter((x) => coupleName(x).toLowerCase().includes(term));
    if (sort === "recent") {
      const t = (x) => Date.parse(x.created_at || x.createdAt || "") || 0;
      r.sort((a, b) => t(b) - t(a));
    }
    if (sort === "date") r.sort((a, b) => (a.event_date || "9999").localeCompare(b.event_date || "9999"));
    if (sort === "views") r.sort((a, b) => getViews(b) - getViews(a));
    return r;
  }, [visible, q, sort, status, pub]);

  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const shown = list.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
  const topId = useMemo(() => {
    if (visible.length < 2) return null;
    return visible.reduce((best, x) => (getViews(x) > getViews(best) ? x : best), visible[0]).id;
  }, [visible]);
  const pubCount = visible.filter(isPub).length;
  const draftCount = visible.length - pubCount;

  /* ---------- row actions ---------- */
  const copyLink = (x) => copyText(getInviteLink(x), "Link copied", notify);
  const shareWhatsApp = (x) => {
    const text = `You are invited! ${coupleName(x)}\n${getInviteLink(x)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };
  const writePub = (id, v) => {
    const n = { ...pubRef.current, [id]: v };
    pubRef.current = n;
    setPub(n);
    writeJSON(LS_PUB, n);
  };
  const togglePublish = (x) => {
    const wasLive = isPub(x);
    const past = isPast(x);
    writePub(x.id, !wasLive);
    notify(
      wasLive ? (past ? "Invitation archived" : "Invitation moved to draft") : "Invitation published",
      () => writePub(x.id, wasLive)
    );
  };
  const writeDeleted = (n) => {
    delRef.current = n;
    setDeleted(n);
    writeJSON(LS_DEL, n);
  };
  const restoreInvitation = (id) => {
    const n = { ...delRef.current };
    delete n[id];
    writeDeleted(n);
  };
  const doDelete = (x) => {
    writeDeleted({ ...delRef.current, [x.id]: Date.now() });
    if (preview?.id === x.id) closePanel();
    notify("Moved to trash", () => restoreInvitation(x.id));
  };

  /* ---------- row menu ---------- */
  const closeMenu = (refocus = false) => {
    setMenu(null);
    if (refocus) {
      const el = opener.current;
      if (el && el.isConnected) setTimeout(() => el.focus?.(), 0);
    }
  };
  const openMenu = (e, x) => {
    if (menu?.x.id === x.id) { closeMenu(true); return; }
    opener.current = e.currentTarget;
    const r = e.currentTarget.getBoundingClientRect();
    const up = window.innerHeight - r.bottom < 240;
    setMenu({
      x,
      right: window.innerWidth - r.right,
      top: up ? undefined : r.bottom + 6,
      bottom: up ? window.innerHeight - r.top + 6 : undefined,
    });
  };
  useEscape(!!menu, () => closeMenu(true));
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const down = (e) => { if (!e.target.closest(".row-menu") && !e.target.closest(".menu-trigger")) close(); };
    document.addEventListener("mousedown", down);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", down);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menu]);
  useEffect(() => {
    if (menu) menuRef.current?.querySelector("button:not(:disabled)")?.focus();
  }, [menu?.x?.id]);
  const onMenuKey = (e) => {
    const items = [...(menuRef.current?.querySelectorAll("button:not(:disabled)") || [])];
    if (!items.length) return;
    const i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    else if (e.key === "Home") { e.preventDefault(); items[0].focus(); }
    else if (e.key === "End") { e.preventDefault(); items[items.length - 1].focus(); }
    else if (e.key === "Tab") { e.preventDefault(); closeMenu(true); }
  };

  const closeAll = () => {
    setQr(null);
    setTrash(false);
    const el = opener.current;
    if (el && el.isConnected) setTimeout(() => el.focus?.(), 0);
  };

  /* "/" focuses the search box */
  useEffect(() => {
    const h = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      if (e.target?.closest?.("input, textarea, select, [contenteditable='true']")) return;
      if (qr || trash || menu) return;
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [qr, trash, menu]);

  const filters = [
    ["all", "All", visible.length],
    ["published", "Published", pubCount],
    ["draft", "Drafts", draftCount],
  ];

  return (
    <div className="dashboard-page">
      {/* ---------- page header ---------- */}
      <div className="page-head">
        <div>
          <h1>All invitations</h1>
          <p>Every invitation you have created, in one place.</p>
        </div>
        <div className="head-actions">
          {lastUpdated && <span className="updated" title={fmtDateTime(lastUpdated)}>Updated {timeAgo(lastUpdated, now).toLowerCase()}</span>}
          <button type="button" className="refresh" onClick={load}><RefreshCw size={16} /> Refresh</button>
          <Link to="/create" className="create-btn"><Plus size={16} /> Create invitation</Link>
        </div>
      </div>

      {/* ---------- invitations table ---------- */}
      <div className="recent-card">
        <div className="recent-head">
          <div className="recent-title">
            <strong>Invitations</strong>
            {!loading && visible.length > 0 && <em>{fmt(visible.length)}</em>}
          </div>
          <div className="recent-tools">
            <label className="search">
              <Search size={15} />
              <input
                ref={searchRef} type="search" placeholder="Search couple" value={q} aria-label="Search invitations"
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
              />
              {!q && <kbd className="kbd" aria-hidden="true">/</kbd>}
            </label>
            <select className="sort" value={sort} aria-label="Sort invitations" onChange={(e) => { setSort(e.target.value); setPage(1); }}>
              <option value="recent">Recently added</option>
              <option value="date">Event date</option>
              <option value="views">Most viewed</option>
            </select>
            {trashed.length > 0 && (
              <button type="button" className="act-btn" onClick={(e) => { opener.current = e.currentTarget; setTrash(true); }}>
                <Trash2 size={14} /> Trash <em className="cnt">{trashed.length}</em>
              </button>
            )}
            <Link to="/analytics" className="head-link">View analytics <ArrowUpRight size={14} /></Link>
          </div>
        </div>

        {!loading && !error && visible.length > 0 && (
          <div className="filter-row" role="group" aria-label="Filter by status">
            {filters.map(([key, label, n]) => (
              <button
                key={key} type="button" aria-pressed={status === key}
                className={`inv-filter${status === key ? " on" : ""}`}
                onClick={() => { setStatus(key); setPage(1); }}
              >
                {label} <em>{fmt(n)}</em>
              </button>
            ))}
          </div>
        )}

        {error ? (
          <div className="empty-state">
            <div className="empty-icon err"><AlertTriangle size={22} /></div>
            <b>Couldn’t load invitations</b>
            <span>Check your connection and try again.</span>
            <button type="button" className="empty-btn" onClick={load}>Retry</button>
          </div>
        ) : loading ? (
          <div className="table-scroll">
            <table className="inv-table">
              <tbody>
                {[0, 1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    <td><div className="cell-couple"><i className="sk sk-avatar" /><i className="sk sk-line" /></div></td>
                    <td><i className="sk sk-line short" /></td>
                    <td><i className="sk sk-line short" /></td>
                    <td><div className="row-actions"><i className="sk sk-btn" /><i className="sk sk-btn" /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : visible.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><FilePlus2 size={22} /></div>
            <b>No invitations yet</b>
            <span>Create your first invitation to see it here.</span>
            <Link to="/create">Create invitation</Link>
          </div>
        ) : list.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Search size={22} /></div>
            <b>{q.trim() ? `No invitations match “${q}”` : "No invitations in this view"}</b>
            <span>{q.trim() ? "Try a different name." : "Nothing matches the current filter."}</span>
            <button type="button" className="empty-btn" onClick={() => { setQ(""); setStatus("all"); }}>Clear filters</button>
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>Couple</th>
                    <th>Event date</th>
                    <th>Invitation views</th>
                    <th className="th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((x) => {
                    const live = isPub(x);
                    const past = isPast(x);
                    const chip = past ? (live ? ["done", "Completed"] : ["draft", "Archived"]) : live ? ["ok", "Published"] : ["draft", "Draft"];
                    const when = whenText(dayDiff(x.event_date));
                    return (
                      <tr key={x.id} className={preview?.id === x.id ? "active" : ""}>
                        <td>
                          <div className="cell-couple">
                            <div className="row-avatar">{initials(x)}</div>
                            <div className="cell-stack">
                              <b>{coupleName(x)}</b>
                              <span className={`chip ${chip[0]}`}>{chip[1]}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="cell-stack">
                            <span className="cell-date"><CalendarDays size={14} /> {x.event_date ? fmtDate(x.event_date) : "Date not set"}</span>
                            {when && <small className="when">{when}</small>}
                          </div>
                        </td>
                        <td>
                          <span className="views">
                            <Eye size={15} /> {fmt(getViews(x))}
                            {topId === x.id && <span className="top">Top</span>}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button type="button" className={`icon-btn${preview?.id === x.id ? " on" : ""}`} title="Preview" aria-label="Preview invitation" onClick={() => openPreview(x)}>
                              <Smartphone size={16} />
                            </button>
                            <Link to={`/create?edit=${x.id}`} className="act-btn"><Pencil size={14} /> Edit</Link>
                            <button
                              type="button" className="act-btn" disabled={!live}
                              title={live ? "Copy invitation link" : "Publish to enable the link"}
                              onClick={() => copyLink(x)}
                            >
                              <Link2 size={14} /> Link
                            </button>
                            <button
                              type="button" className="icon-btn menu-trigger" aria-label="More actions" aria-haspopup="menu"
                              aria-expanded={menu?.x.id === x.id} onClick={(e) => openMenu(e, x)}
                            >
                              <MoreHorizontal size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="table-foot">
              <span>
                {list.length > PAGE_SIZE
                  ? `Showing ${(cur - 1) * PAGE_SIZE + 1}–${Math.min(cur * PAGE_SIZE, list.length)} of ${list.length}`
                  : `Showing all ${list.length}`}
              </span>
              {list.length > PAGE_SIZE && (
                <div className="pager">
                  <button type="button" className="icon-btn" aria-label="Previous page" disabled={cur === 1} onClick={() => setPage(cur - 1)}><ChevronLeft size={16} /></button>
                  <span className="page-no">{cur} / {pages}</span>
                  <button type="button" className="icon-btn" aria-label="Next page" disabled={cur === pages} onClick={() => setPage(cur + 1)}><ChevronRight size={16} /></button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ---------- row menu ---------- */}
      {menu && (() => {
        const x = menu.x;
        const live = isPub(x);
        const past = isPast(x);
        return createPortal(
          <div
            className="row-menu" ref={menuRef} onKeyDown={onMenuKey} role="menu"
            style={{ right: menu.right, top: menu.top, bottom: menu.bottom }}
          >
            <button type="button" role="menuitem" disabled={!live} onClick={() => { shareWhatsApp(x); closeMenu(true); }}>
              <MessageCircle size={15} /> Share on WhatsApp
            </button>
            <button type="button" role="menuitem" disabled={!live} onClick={() => { setQr(x); closeMenu(false); }}>
              <QrCode size={15} /> QR code
            </button>
            <button type="button" role="menuitem" onClick={() => { togglePublish(x); closeMenu(true); }}>
              {live ? (past ? <><Archive size={15} /> Archive &amp; expire link</> : <><EyeOff size={15} /> Move to draft</>) : <><Globe size={15} /> Publish</>}
            </button>
            <i className="menu-sep" />
            <button type="button" role="menuitem" className="danger" onClick={() => { doDelete(x); closeMenu(true); }}>
              <Trash2 size={15} /> Move to trash
            </button>
          </div>,
          document.body
        );
      })()}

      {/* ---------- overlays ---------- */}
      {preview && <PreviewPanel slot={slot} row={preview} published={isPub(preview)} onClose={closePanel} />}
      {qr && <QrModal row={qr} onClose={closeAll} onCopy={copyLink} />}
      {trash && <TrashModal items={trashed} onRestore={restoreInvitation} onClose={closeAll} />}
      {toast && createPortal(
        <div className="dx-toast" role="status">
          <Check size={15} /> {toast.msg}
          {toast.undo && (
            <button type="button" onClick={() => { toast.undo(); clearTimeout(toastTimer.current); setToast(null); }}>Undo</button>
          )}
        </div>,
        document.body
      )}

      <style>{DASHBOARD_CSS}</style>
      <style>{`
        .filter-row { gap: 8px; }
        .inv-filter { height: 30px; padding: 0 12px; display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--gray-border); border-radius: 999px; background: var(--white); color: var(--gray-dark); font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: background .2s, border-color .2s, color .2s; }
        .inv-filter em { font-style: normal; font-size: 11.5px; font-weight: 700; color: var(--gray); }
        .inv-filter:hover { border-color: var(--primary); }
        .inv-filter.on { background: var(--primary-light); border-color: var(--primary); color: var(--primary); }
        .inv-filter.on em { color: var(--primary); }
      `}</style>
    </div>
  );
}
