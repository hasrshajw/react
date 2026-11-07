import dashboardCss from "../styles/dashboard.css?inline";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import {
  FilePlus2, RefreshCw, CalendarDays, ArrowUpRight, Users, Inbox, Eye, Pencil, Link2, Check, Plus, Search, Smartphone, MoreHorizontal, Trash2, X, MessageCircle, QrCode, Globe, EyeOff, ChevronLeft, ChevronRight, Copy, AlertTriangle, Archive,
} from "../components/Icons";
import * as demo from "../lib/demoData";
import { ACTIVITY, DAY, FILTER_LABEL, INITIAL_ENQUIRIES, LS_AUTO, LS_DEL, LS_NOTE, LS_PUB, PAGE_SIZE, TRASH_DAYS, ago, copyText, coupleName, dayDiff, fmt, fmtDate, fmtDateTime, followDue, getInviteLink, getViews, initials, isPast, isoDay, normDeleted, readJSON, timeAgo, whenText, writeJSON } from "../lib/dashboardData";
import { useEscape } from "../hooks/useEscape";
import { PreviewPanel } from "../components/dashboard/PreviewPanel";
import { QrModal } from "../components/dashboard/QrModal";
import { TrashModal } from "../components/dashboard/TrashModal";
import { EnquiriesPanel } from "../components/dashboard/EnquiriesPanel";
import { SORT_OPTIONS, Select } from "../components/dashboard/Select";


/* =========================================================
   PAGE
   ========================================================= */
export default function Dashboard({ onPanelChange, onEnquiryCountChange }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const timer = useRef();

  const [pub, setPub] = useState(() => readJSON(LS_PUB, {}));
  const [deleted, setDeleted] = useState(() => normDeleted(readJSON(LS_DEL, {})));
  const [hideNote, setHideNote] = useState(() => readJSON(LS_NOTE, false));
  const [autoRefresh, setAutoRefresh] = useState(() => readJSON(LS_AUTO, false));
  const pubRef = useRef(pub);
  const delRef = useRef(deleted);

  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const [filter, setFilter] = useState("all");
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState(1);

  const [range, setRange] = useState("30");
  const [enquiries, setEnquiries] = useState(INITIAL_ENQUIRIES);
  const [reqOpen, setReqOpen] = useState(false);
  const [reqTab, setReqTab] = useState("new");

  const [menu, setMenu] = useState(null);
  const [preview, setPreview] = useState(null);
  const [slot, setSlot] = useState(null);
  const pageRef = useRef(null);
  const tableRef = useRef(null);
  const searchRef = useRef(null);
  const menuRef = useRef(null);
  const opener = useRef(null);
  const [narrow, setNarrow] = useState(false);
  const [qr, setQr] = useState(null);
  const [trash, setTrash] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef();

  const notify = (msg, undo) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, undo });
    toastTimer.current = setTimeout(() => setToast(null), undo ? 6000 : 2200);
  };

  const load = (silent = false) => {
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
  };
  useEffect(() => {
    load();
    return () => { clearTimeout(timer.current); clearTimeout(toastTimer.current); };
  }, []);

  /* clock for "x min ago" labels and due dates */
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  /* optional silent auto-refresh */
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => load(true), 60000);
    return () => clearInterval(t);
  }, [autoRefresh]);

  useEffect(() => { setSlot(document.getElementById("preview-slot")); }, []);

  /* Tell the page when it is narrow (e.g. preview open) so the cards can reflow. */
  useEffect(() => {
    const el = pageRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setNarrow(e.contentRect.width < 980));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---------- panels ---------- */
  const rememberOpener = () => { opener.current = document.activeElement; };
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
  const openPreview = (x) => {
    if (preview?.id === x.id) { closePanel(); return; }
    if (!preview && !reqOpen) rememberOpener();
    setReqOpen(false);
    setPreview(x);
  };
  /* Open the enquiries panel on a tab (or just switch tab if it is already open). */
  const showRequests = (tab = "new") => {
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
  useEffect(() => {
    onPanelChange?.(!!(preview || reqOpen));
  }, [preview, reqOpen]);
  useEffect(() => () => onPanelChange?.(false), []);

  /* ---------- derived invitation data ---------- */
  const isPub = (x) => pub[x.id] !== false;
  const visible = useMemo(() => rows.filter((r) => !(r.id in deleted)), [rows, deleted]);
  const trashed = useMemo(() => {
    const cutoff = Date.now() - TRASH_DAYS * DAY;
    return rows
      .filter((r) => r.id in deleted && deleted[r.id] >= cutoff)
      .map((row) => ({ row, at: deleted[row.id] }))
      .sort((a, b) => b.at - a.at);
  }, [rows, deleted]);

  /* hard-delete items that have been in the trash for 30 days (when the data layer supports it) */
  useEffect(() => {
    if (!rows.length || typeof demo.deleteDemoInvitation !== "function") return;
    const cutoff = Date.now() - TRASH_DAYS * DAY;
    const old = rows.filter((r) => r.id in delRef.current && delRef.current[r.id] < cutoff);
    if (!old.length) return;
    old.forEach((r) => demo.deleteDemoInvitation(r.id));
    const keep = { ...delRef.current };
    old.forEach((r) => delete keep[r.id]);
    writeDeleted(keep);
    setRows(demo.getDemoInvitations());
  }, [rows]);

  const matches = (x, f) => {
    if (f === "all") return true;
    const live = isPub(x);
    const d = dayDiff(x.event_date);
    if (f === "published") return live;
    if (f === "draft") return !live;
    if (f === "draftSoon") return !live && d !== null && d >= 0 && d <= 7;
    if (f === "noViews") return live && (d === null || d >= 0) && getViews(x) === 0;
    return true;
  };

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    let r = visible.filter((x) => matches(x, filter));
    if (term) r = r.filter((x) => coupleName(x).toLowerCase().includes(term));
    if (sort === "recent") {
      const t = (x) => Date.parse(x.created_at || x.createdAt || "") || 0;
      r.sort((a, b) => t(b) - t(a));
    }
    if (sort === "date") r.sort((a, b) => (a.event_date || "9999").localeCompare(b.event_date || "9999"));
    if (sort === "views") r.sort((a, b) => getViews(b) - getViews(a));
    return r;
  }, [visible, q, sort, filter, pub]);

  const expanded = showAll || q.trim() !== "" || filter !== "all";
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const shown = expanded ? list.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE) : list.slice(0, 5);
  const topId = useMemo(() => {
    if (visible.length < 2) return null;
    return visible.reduce((best, x) => (getViews(x) > getViews(best) ? x : best), visible[0]).id;
  }, [visible]);

  const pubCount = visible.filter((x) => isPub(x)).length;
  const draftCount = visible.length - pubCount;

  const applyFilter = (f) => {
    setFilter(f);
    setQ("");
    setPage(1);
    setShowAll(false);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    tableRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  /* ---------- site enquiries ---------- */
  const enqNew = enquiries.filter((e) => e.status === "new").length;
  const enqFollow = enquiries.filter((e) => e.status === "followup").length;

  const setEnqStatus = (id, status) => {
    const prev = enquiries.find((e) => e.id === id);
    if (!prev) return;
    const next = {
      ...prev,
      status,
      history: [...(prev.history || []), { status, at: new Date().toISOString() }],
      followUpDate: status === "followup" ? prev.followUpDate || isoDay(1) : prev.followUpDate,
    };
    setEnquiries((p) => p.map((e) => (e.id === id ? next : e)));
    notify(
      status === "called" ? "Marked as called" : status === "cancelled" ? "Marked as cancelled" : "Marked for follow-up",
      () => setEnquiries((p) => p.map((e) => (e.id === id ? prev : e)))
    );
  };
  const saveEnqNote = (id, value) => {
    const v = value.trim();
    const prev = enquiries.find((e) => e.id === id);
    if (!prev || (prev.note || "") === v) return;
    setEnquiries((p) => p.map((e) => (e.id === id ? { ...e, note: v } : e)));
    notify("Note saved");
  };
  const setEnqFollowDate = (id, date) => {
    setEnquiries((p) => p.map((e) => (e.id === id ? { ...e, followUpDate: date } : e)));
  };

  /* unread badge: tab title + callback for the sidebar */
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s/, "");
    document.title = enqNew > 0 ? `(${enqNew}) ${base}` : base;
    return () => { document.title = base; };
  }, [enqNew]);
  useEffect(() => { onEnquiryCountChange?.(enqNew); }, [enqNew]);

  /* ---------- "Needs attention" ---------- */
  const soonDrafts = visible.filter((x) => matches(x, "draftSoon")).length;
  const noViews = visible.filter((x) => matches(x, "noViews")).length;
  const staleNew = enquiries.filter((e) => e.status === "new" && now - Date.parse(e.createdAt) > DAY).length;
  const dueFollow = enquiries.filter((e) => ["today", "overdue"].includes(followDue(e))).length;
  const attention = [
    soonDrafts > 0 && { key: "soon", tone: "danger", count: soonDrafts, label: `draft ${soonDrafts === 1 ? "invitation" : "invitations"} with an event in 7 days`, run: () => applyFilter("draftSoon") },
    staleNew > 0 && { key: "stale", tone: "danger", count: staleNew, label: `new ${staleNew === 1 ? "enquiry" : "enquiries"} waiting over 24h`, run: () => showRequests("new") },
    dueFollow > 0 && { key: "due", tone: "warn", count: dueFollow, label: `follow-up${dueFollow === 1 ? "" : "s"} due or overdue`, run: () => showRequests("followup") },
    noViews > 0 && { key: "views", tone: "info", count: noViews, label: `published with no views`, run: () => applyFilter("noViews") },
  ].filter(Boolean);

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
  function writeDeleted(n) {
    delRef.current = n;
    setDeleted(n);
    writeJSON(LS_DEL, n);
  }
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
  const dismissNote = () => { setHideNote(true); writeJSON(LS_NOTE, true); };

  /* ---------- row menu (fixed, so the scroll area never clips it) ---------- */
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

  /* ---------- keyboard shortcuts: "/" search, "N" new invitation ---------- */
  useEffect(() => {
    const h = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      if (e.target?.closest?.("input, textarea, select, [contenteditable='true']")) return;
      if (qr || trash || menu) return;
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key === "n" || e.key === "N") { e.preventDefault(); navigate("/create"); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [qr, trash, menu, navigate]);

  const activity = ACTIVITY[range];

  return (
    <div className={`dashboard-page${narrow ? " narrow" : ""}`} ref={pageRef}>
      {/* ---------- page header ---------- */}
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Manage and preview invitations using sample templates.</p>
        </div>
        <div className="head-actions">
          {lastUpdated && <span className="updated" title={fmtDateTime(lastUpdated)}>Updated {timeAgo(lastUpdated, now).toLowerCase()}</span>}
          <button
            type="button" className={`auto-btn${autoRefresh ? " on" : ""}`} aria-pressed={autoRefresh} title="Refresh every minute"
            onClick={() => { const v = !autoRefresh; setAutoRefresh(v); writeJSON(LS_AUTO, v); }}
          >
            Auto
          </button>
          <button type="button" className="refresh" onClick={() => load()}><RefreshCw size={16} /> Refresh</button>
          <Link to="/create" className="create-btn" title="Create invitation (N)"><Plus size={16} /> Create invitation</Link>
        </div>
      </div>

      {!hideNote && (
        <div className="demo-note">
          <span className="demo-dot" />
          <span className="demo-text">Demo mode is active. No database or account connection is required.</span>
          <button type="button" className="note-x" aria-label="Dismiss" onClick={dismissNote}><X size={15} /></button>
        </div>
      )}

      {/* ---------- KPI row ---------- */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-icon"><FilePlus2 size={19} /></div>
          <div className="stat-body">
            <span>Total invitations</span>
            {loading ? <i className="sk sk-num" /> : (
              <>
                <div className="stat-line">
                  <strong>{fmt(visible.length)}</strong>
                </div>
                <div className="stat-sub">
                  <button type="button" onClick={() => applyFilter("published")}>{fmt(pubCount)} published</button>
                  <i>·</i>
                  <button type="button" onClick={() => applyFilter("draft")}>{fmt(draftCount)} draft</button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="stat-card blue">
          <div className="stat-icon"><Users size={19} /></div>
          <div className="stat-body">
            <span>Invitation views</span>
            <div className="stat-line">
              <strong>{fmt(activity.views)}</strong>
            </div>
            <div className="stat-sub plain">
              <span>{fmt(activity.rsvps)} RSVPs</span>
              <i>·</i>
              <span>{fmt(activity.shares)} shares</span>
            </div>
          </div>
          <div className="seg" role="group" aria-label="Activity range">
            {Object.entries({ "7": "7D", "30": "30D", all: "All" }).map(([k, l]) => (
              <button key={k} type="button" aria-pressed={range === k} className={range === k ? "on" : ""} onClick={() => setRange(k)}>{l}</button>
            ))}
          </div>
        </div>

        <div className="stat-card green">
          <div className="stat-icon"><Inbox size={19} /></div>
          <div className="stat-body">
            <span>Site enquiries</span>
            <div className="stat-line">
              <strong className="req-count" title={`${enqNew} new of ${enquiries.length} enquiries`}>
                <span className={enqNew > 0 ? "pending" : "clear"}>{enqNew}</span>
                <span className="total">/{enquiries.length}</span>
              </strong>
            </div>
            <div className="stat-sub">
              <button type="button" onClick={() => showRequests("followup")}>{enqFollow} follow-up</button>
            </div>
          </div>
          <button type="button" className={`round-btn${reqOpen ? " on" : ""}`} aria-label="View site enquiries" aria-expanded={reqOpen} onClick={toggleRequests}>
            <ArrowUpRight size={16} />
          </button>
        </div>
      </div>

      {/* ---------- needs attention ---------- */}
      {!loading && attention.length > 0 && (
        <section className="attn" aria-label="Needs attention">
          <b>Needs attention</b>
          <div className="attn-list">
            {attention.map((a) => (
              <button key={a.key} type="button" className={`attn-item ${a.tone}`} onClick={a.run}>
                <span className="attn-n">{a.count}</span>
                {a.label}
                <ChevronRight size={14} />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ---------- recent invitations (table) ---------- */}
      <div className="recent-card" ref={tableRef}>
        <div className="recent-head">
          <div className="recent-title">
            <strong>Recent invitations</strong>
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
            <Select label="Sort invitations" value={sort} options={SORT_OPTIONS} onChange={(v) => { setSort(v); setPage(1); }} />
            {trashed.length > 0 && (
              <button type="button" className="act-btn" onClick={(e) => { opener.current = e.currentTarget; setTrash(true); }}>
                <Trash2 size={14} /> Trash <em className="cnt">{trashed.length}</em>
              </button>
            )}
          </div>
        </div>

        {filter !== "all" && (
          <div className="filter-row">
            <span className="filter-pill">
              {FILTER_LABEL[filter]}
              <button type="button" aria-label="Clear filter" onClick={() => { setFilter("all"); setPage(1); }}><X size={12} /></button>
            </span>
            <small>{fmt(list.length)} shown</small>
          </div>
        )}

        {error ? (
          <div className="empty-state">
            <div className="empty-icon err"><AlertTriangle size={22} /></div>
            <b>Couldn’t load invitations</b>
            <span>Check your connection and try again.</span>
            <button type="button" className="empty-btn" onClick={() => load()}>Retry</button>
          </div>
        ) : loading ? (
          <div className="table-scroll">
            <table className="inv-table">
              <tbody>
                {[0, 1, 2, 3].map((i) => (
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
            <button type="button" className="empty-btn" onClick={() => { setQ(""); setFilter("all"); }}>Clear filters</button>
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

            {(expanded && list.length > PAGE_SIZE) || (!expanded && visible.length > 5) || showAll ? (
              <div className="table-foot">
                {expanded && list.length > PAGE_SIZE ? (
                  <>
                    <span>Showing {(cur - 1) * PAGE_SIZE + 1}–{Math.min(cur * PAGE_SIZE, list.length)} of {list.length}</span>
                    <div className="pager">
                      {showAll && !q.trim() && filter === "all" && <button type="button" className="act-btn" onClick={() => { setShowAll(false); setPage(1); }}>Show less</button>}
                      <button type="button" className="icon-btn" aria-label="Previous page" disabled={cur === 1} onClick={() => setPage(cur - 1)}><ChevronLeft size={16} /></button>
                      <span className="page-no">{cur} / {pages}</span>
                      <button type="button" className="icon-btn" aria-label="Next page" disabled={cur === pages} onClick={() => setPage(cur + 1)}><ChevronRight size={16} /></button>
                    </div>
                  </>
                ) : !expanded ? (
                  <>
                    <span>Showing 5 of {visible.length}</span>
                    <button type="button" className="head-link as-btn" onClick={() => navigate(sort !== "recent" ? `/invitations?sort=${sort}` : "/invitations")}>
                      View all invitations <ArrowUpRight size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <span>Showing all {list.length}</span>
                    {showAll && !q.trim() && filter === "all" && <button type="button" className="act-btn" onClick={() => setShowAll(false)}>Show less</button>}
                  </>
                )}
              </div>
            ) : null}
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
      {reqOpen && (
        <EnquiriesPanel
          slot={slot} enquiries={enquiries} now={now} tab={reqTab} onTab={setReqTab} onClose={closePanel}
          onSetStatus={setEnqStatus} onSaveNote={saveEnqNote} onSetFollowDate={setEnqFollowDate} notify={notify}
        />
      )}
      {toast && createPortal(
        <div className="dx-toast" role="status">
          <Check size={15} /> {toast.msg}
          {toast.undo && (
            <button type="button" onClick={() => { toast.undo(); clearTimeout(toastTimer.current); setToast(null); }}>Undo</button>
          )}
        </div>,
        document.body
      )}

      <style>{dashboardCss}</style>
    </div>
  );
}
