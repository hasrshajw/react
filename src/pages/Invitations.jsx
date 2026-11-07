import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useSearchParams } from "react-router-dom";
import {
  FilePlus2, CalendarDays, Eye, Pencil, Link2, Check, Plus, Search, Smartphone,
  MoreHorizontal, Trash2, X, MessageCircle, Globe, EyeOff, ChevronLeft, ChevronRight,
  AlertTriangle, Archive, RefreshCw, Copy, Download, Share,
} from "../components/Icons";
import * as demo from "../lib/demoData";
import dashboardCss from "../styles/dashboard.css?inline";
import { Modal } from "../components/dashboard/Modal";
import { PreviewPanel } from "../components/dashboard/PreviewPanel";
import { TrashModal } from "../components/dashboard/TrashModal";
import { Select, SORT_OPTIONS } from "../components/dashboard/Select";
import { useEscape } from "../hooks/useEscape";
import {
  LS_PUB, LS_DEL, PAGE_SIZE, TRASH_DAYS, DAY,
  readJSON, writeJSON, normDeleted, fmt, fmtDate, fmtDateTime, timeAgo,
  initials, coupleName, getViews, getInviteLink, dayDiff, whenText, isPast, copyText,
} from "../lib/dashboardData";

/* =========================================================
   HELPERS
   ========================================================= */
const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

/* URL state: ?status=draft&when=week&sort=date&template=classic&q=name
   Default values are left out of the URL so it stays short. */
const DEFAULTS = { status: "all", when: "all", sort: "recent", template: "all", q: "" };
const oneOf = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);

const WHEN_FILTERS = [
  ["upcoming", "Upcoming", "Events in the next 30 days"],
  ["week", "This week", "Events in the next 7 days"],
  ["past", "Past", "Events that have already happened"],
];

/* Invitations without an event date never match a date filter. */
const dateMatch = (x, w) => {
  if (w === "all") return true;
  const d = dayDiff(x.event_date);
  if (d === null) return false;
  if (w === "upcoming") return d >= 0 && d <= 30;
  if (w === "week") return d >= 0 && d <= 7;
  if (w === "past") return d < 0;
  return true;
};

const templateOf = (x) => {
  const t = (demo.demoTemplates || []).find((tpl) => String(tpl.id) === String(x.template_id));
  const name = x.template_name || t?.name || "Custom invitation";
  return { key: String(x.template_id || name), name };
};

const csvCell = (v) => {
  let s = String(v ?? "");
  if (/^[=+\-@]/.test(s) && !/^\+?[\d\s]+$/.test(s)) s = "'" + s; // avoid spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};

const todayStamp = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/* =========================================================
   SMALL COMPONENTS
   ========================================================= */
function Countdown({ x, live }) {
  const d = dayDiff(x.event_date);
  if (d === null) return null;
  if (d < 0) return <small className="when">{whenText(d)}</small>;
  const tone = d <= 7 ? (live ? "warn" : "danger") : "info";
  const title = !live && d <= 7 ? `Still a draft with the event ${whenText(d).toLowerCase()}. Publish it so guests can open the link.` : undefined;
  return <span className={`cd ${tone}`} title={title}>{whenText(d)}</span>;
}

function ShareModal({ row, rows, live, onClose, onCopy, onWhatsApp, onSaveLink, onPublish }) {
  const link = getInviteLink(row);
  const current = row.details?.customId || "";
  const [slug, setSlug] = useState(current);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const clean = slug.trim();
  const taken = !!clean && rows.some((r) => r.id !== row.id && String(r.details?.customId || r.id).toLowerCase() === clean.toLowerCase());
  const problem = clean && !/^[a-z0-9-]+$/i.test(clean) ? "Use letters, numbers and hyphens only"
    : clean.length > 40 ? "Keep it under 40 characters"
    : taken ? "This link ID is already used by another invitation" : "";
  const dirty = clean !== current;
  const api = (size) => `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(link)}`;
  const fileName = `${coupleName(row).replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}-qr.png`;

  useEffect(() => { setLoaded(false); setFailed(false); }, [link]);

  /* Fetch as a blob so the browser saves a file instead of opening the image in a new tab. */
  const download = async () => {
    setBusy(true);
    try {
      const blob = await (await fetch(api(720))).blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      window.open(api(720), "_blank", "noopener");
    }
    setBusy(false);
  };

  return (
    <Modal title="Share invitation" subtitle={coupleName(row)} width={440} onClose={onClose}>
      <div className="share">
        {!live && (
          <div className="share-note">
            <span>This invitation is a draft. Publish it to turn the link on.</span>
            <button type="button" className="act-btn solid" onClick={() => onPublish(row)}><Globe size={14} /> Publish</button>
          </div>
        )}

        <div className="share-link">
          <code title={link}>{link}</code>
          <button type="button" className="act-btn" disabled={!live} onClick={() => onCopy(row)}><Copy size={14} /> Copy</button>
        </div>

        <form
          className="share-custom"
          onSubmit={(e) => { e.preventDefault(); if (!problem && dirty) onSaveLink(row, clean); }}
        >
          <label htmlFor="share-slug">Custom link ID</label>
          <div className="share-row">
            <span className="share-prefix">{window.location.host}/</span>
            <input
              id="share-slug" value={slug} maxLength={60} placeholder={String(row.id).slice(0, 8)} autoComplete="off" spellCheck="false"
              aria-invalid={!!problem} aria-describedby="share-hint"
              onChange={(e) => setSlug(e.target.value)}
            />
            <button type="submit" className="act-btn solid" disabled={!dirty || !!problem}>Save</button>
          </div>
          <small id="share-hint" className={problem ? "bad" : ""}>
            {problem || (dirty && current ? "Saving changes the link. The old link will stop working." : "Short, memorable links are easier to share on WhatsApp.")}
          </small>
        </form>

        <div className="share-qr">
          <div className="share-qr-img">
            {failed ? <span>Couldn’t load the QR code. Check your connection.</span> : (
              <>
                {!loaded && <i className="sk" />}
                <img
                  src={api(240)} alt={`QR code for ${coupleName(row)}`} width="150" height="150"
                  style={loaded && live ? undefined : { display: "none" }}
                  onLoad={() => setLoaded(true)} onError={() => setFailed(true)}
                />
              </>
            )}
          </div>
          <div className="share-actions">
            <button type="button" className="act-btn wa wide" disabled={!live} onClick={() => onWhatsApp(row)}>
              <MessageCircle size={14} /> Share on WhatsApp
            </button>
            <button type="button" className="act-btn wide" disabled={!live || !loaded || busy} onClick={download}>
              <Download size={14} /> Download QR (PNG)
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* =========================================================
   PAGE
   ========================================================= */
/* "All Invitations" page: one flat list with status tabs, date filters, bulk actions
   and shareable URL filters. Deliberately not laid out like the Dashboard. */
export default function Invitations({ onPanelChange }) {
  const [sp, setSp] = useSearchParams();
  const status = oneOf(sp.get("status"), ["all", "published", "draft"], DEFAULTS.status);
  const when = oneOf(sp.get("when"), ["all", "upcoming", "week", "past"], DEFAULTS.when);
  const sort = oneOf(sp.get("sort"), ["recent", "date", "views"], DEFAULTS.sort);
  const tpl = sp.get("template") || DEFAULTS.template;
  const q = sp.get("q") || DEFAULTS.q;

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

  const [page, setPage] = useState(1);
  const [sel, setSel] = useState(() => new Set());

  const [menu, setMenu] = useState(null);
  const [preview, setPreview] = useState(null);
  const [slot, setSlot] = useState(null);
  const [shareId, setShareId] = useState(null);
  const [trash, setTrash] = useState(false);
  const [toast, setToast] = useState(null);
  const menuRef = useRef(null);
  const opener = useRef(null);
  const searchRef = useRef(null);
  const headCheck = useRef(null);
  const toastTimer = useRef();

  const notify = (msg, undo) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, undo });
    toastTimer.current = setTimeout(() => setToast(null), undo ? 6000 : 2200);
  };

  /* Changing a filter resets paging and clears the selection (a selection should only
     ever cover rows the person can currently see). Sort keeps it. */
  const setParams = (patch) => {
    setSp((prev) => {
      const n = new URLSearchParams(prev);
      Object.entries(patch).forEach(([k, v]) => {
        if (!v || v === DEFAULTS[k]) n.delete(k); else n.set(k, v);
      });
      return n;
    }, { replace: true });
    setPage(1);
    if (!("sort" in patch)) setSel(new Set());
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

  const stats = useMemo(() => {
    const live = (x) => pub[x.id] !== false;
    return {
      total: visible.length,
      pub: visible.filter(live).length,
      draft: visible.filter((x) => !live(x)).length,
      upcoming: visible.filter((x) => dateMatch(x, "upcoming")).length,
      week: visible.filter((x) => dateMatch(x, "week")).length,
      past: visible.filter((x) => dateMatch(x, "past")).length,
    };
  }, [visible, pub]);

  const templates = useMemo(() => {
    const m = new Map();
    visible.forEach((x) => {
      const t = templateOf(x);
      const e = m.get(t.key) || { ...t, n: 0 };
      e.n += 1;
      m.set(t.key, e);
    });
    return [...m.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  }, [visible]);
  const topTemplate = templates[0];

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    let r = visible.filter((x) => status === "all" || (status === "published" ? isPub(x) : !isPub(x)));
    r = r.filter((x) => dateMatch(x, when));
    if (tpl !== "all") r = r.filter((x) => templateOf(x).key === tpl);
    if (term) r = r.filter((x) => coupleName(x).toLowerCase().includes(term));
    if (sort === "recent") {
      const t = (x) => Date.parse(x.created_at || x.createdAt || "") || 0;
      r.sort((a, b) => t(b) - t(a));
    }
    if (sort === "date") r.sort((a, b) => (a.event_date || "9999").localeCompare(b.event_date || "9999"));
    if (sort === "views") r.sort((a, b) => getViews(b) - getViews(a));
    return r;
  }, [visible, q, sort, status, when, tpl, pub]);

  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const shown = list.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
  const topId = useMemo(() => {
    if (visible.length < 2) return null;
    return visible.reduce((best, x) => (getViews(x) > getViews(best) ? x : best), visible[0]).id;
  }, [visible]);

  const selectedRows = useMemo(() => list.filter((x) => sel.has(x.id)), [list, sel]);
  const onPageSel = shown.filter((x) => sel.has(x.id)).length;
  const allOnPage = shown.length > 0 && onPageSel === shown.length;
  useEffect(() => {
    if (headCheck.current) headCheck.current.indeterminate = onPageSel > 0 && !allOnPage;
  });

  const toggleSel = (id) => setSel((prev) => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const togglePage = () => setSel((prev) => {
    const n = new Set(prev);
    if (allOnPage) shown.forEach((x) => n.delete(x.id)); else shown.forEach((x) => n.add(x.id));
    return n;
  });

  const shareRow = shareId ? rows.find((r) => r.id === shareId) : null;
  useEffect(() => { if (shareId && !shareRow && !loading) setShareId(null); }, [shareId, shareRow, loading]);

  /* ---------- row actions ---------- */
  const copyLink = (x) => copyText(getInviteLink(x), "Link copied", notify);
  const shareWhatsApp = (x) => {
    const text = `You are invited! ${coupleName(x)}\n${getInviteLink(x)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };
  const commitPub = (n) => {
    pubRef.current = n;
    setPub(n);
    writeJSON(LS_PUB, n);
  };
  const writePub = (id, v) => commitPub({ ...pubRef.current, [id]: v });
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

  const duplicate = (x) => {
    const id = uid();
    // eslint-disable-next-line no-unused-vars
    const { views, created_at, updated_at, ...rest } = x;
    const copy = demo.saveDemoInvitation({
      ...rest,
      id,
      // The copy needs its own link: a custom link ID can only belong to one invitation.
      details: x.details ? { ...x.details, customId: "" } : undefined,
    });
    writePub(copy.id, false);
    setRows(demo.getDemoInvitations());
    notify(`Duplicated ${coupleName(x)} as a draft`, () => writeDeleted({ ...delRef.current, [copy.id]: Date.now() }));
  };

  const saveLink = (x, slug) => {
    demo.saveDemoInvitation({ ...x, details: { ...(x.details || {}), customId: slug } });
    setRows(demo.getDemoInvitations());
    notify(slug ? "Link updated" : "Custom link removed");
  };

  /* ---------- bulk actions ---------- */
  const bulkPublish = (v) => {
    const ids = selectedRows.map((x) => x.id);
    if (!ids.length) return;
    const prev = ids.map((id) => [id, pubRef.current[id]]);
    const n = { ...pubRef.current };
    ids.forEach((id) => { n[id] = v; });
    commitPub(n);
    setSel(new Set());
    notify(
      `${ids.length} ${ids.length === 1 ? "invitation" : "invitations"} ${v ? "published" : "moved to draft"}`,
      () => {
        const back = { ...pubRef.current };
        prev.forEach(([id, was]) => { if (was === undefined) delete back[id]; else back[id] = was; });
        commitPub(back);
      }
    );
  };
  const bulkTrash = () => {
    const ids = selectedRows.map((x) => x.id);
    if (!ids.length) return;
    const stamp = Date.now();
    const n = { ...delRef.current };
    ids.forEach((id) => { n[id] = stamp; });
    writeDeleted(n);
    if (preview && ids.includes(preview.id)) closePanel();
    setSel(new Set());
    notify(
      `${ids.length} ${ids.length === 1 ? "invitation" : "invitations"} moved to trash`,
      () => {
        const back = { ...delRef.current };
        ids.forEach((id) => { delete back[id]; });
        writeDeleted(back);
      }
    );
  };
  const bulkExport = () => {
    const head = ["Couple", "Groom", "Bride", "Event date", "Status", "Template", "Views", "Link", "Created"];
    const body = selectedRows.map((x) => {
      const live = isPub(x);
      const past = isPast(x);
      const statusText = past ? (live ? "Completed" : "Archived") : live ? "Published" : "Draft";
      return [
        coupleName(x), x.groom_name || "", x.bride_name || "", x.event_date || "", statusText, templateOf(x).name,
        getViews(x), live ? getInviteLink(x) : "", x.created_at || "",
      ];
    });
    const lines = [head, ...body].map((r) => r.map(csvCell).join(","));
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invitations-${todayStamp()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify(`Exported ${selectedRows.length} ${selectedRows.length === 1 ? "invitation" : "invitations"}`);
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
    setShareId(null);
    setTrash(false);
    const el = opener.current;
    if (el && el.isConnected) setTimeout(() => el.focus?.(), 0);
  };

  /* "/" focuses the search box */
  useEffect(() => {
    const h = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      if (e.target?.closest?.("input, textarea, select, [contenteditable='true']")) return;
      if (shareId || trash || menu) return;
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [shareId, trash, menu]);

  const tabs = [
    ["all", "All", stats.total],
    ["published", "Published", stats.pub],
    ["draft", "Drafts", stats.draft],
  ];
  const hasFilters = status !== "all" || when !== "all" || tpl !== "all" || q.trim() !== "";
  const clearFilters = () => setParams({ status: "all", when: "all", template: "all", q: "" });

  const statusChip = (x) => {
    const live = isPub(x);
    const past = isPast(x);
    return past ? (live ? ["done", "Completed"] : ["draft", "Archived"]) : live ? ["ok", "Published"] : ["draft", "Draft"];
  };

  return (
    <div className="dashboard-page inv-page">
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

      {/* ---------- status tabs + search ---------- */}
      <div className="inv-tabbar">
        <div className="inv-tabs" role="group" aria-label="Filter by status">
          {tabs.map(([key, label, n]) => (
            <button
              key={key} type="button" aria-pressed={status === key}
              className={`inv-tab${status === key ? " on" : ""}`}
              onClick={() => setParams({ status: key })}
            >
              {label} <em>{loading ? "–" : fmt(n)}</em>
            </button>
          ))}
        </div>
      </div>

      {/* ---------- list ---------- */}
      <div className="inv-panel">
        <div className="inv-toolbar">
          <div className="inv-chips" role="group" aria-label="Filter by event date">
            {WHEN_FILTERS.map(([key, label, hint]) => (
              <button
                key={key} type="button" aria-pressed={when === key} title={hint}
                className={`inv-filter${when === key ? " on" : ""}`}
                onClick={() => setParams({ when: when === key ? "all" : key })}
              >
                {label} <em>{loading ? "–" : fmt(key === "upcoming" ? stats.upcoming : key === "week" ? stats.week : stats.past)}</em>
              </button>
            ))}
            {hasFilters && <button type="button" className="link-btn" onClick={clearFilters}>Clear filters</button>}
          </div>
          <div className="recent-tools">
            <label className="search">
              <Search size={15} />
              <input
                ref={searchRef} type="search" placeholder="Search couple" value={q} aria-label="Search invitations"
                onChange={(e) => setParams({ q: e.target.value })}
              />
              {!q && <kbd className="kbd" aria-hidden="true">/</kbd>}
            </label>
            {templates.length > 1 && (
              <Select
                label="Filter by template" value={tpl} onChange={(v) => setParams({ template: v })}
                options={[{ value: "all", label: "All templates" }, ...templates.map((t) => ({ value: t.key, label: `${t.name} (${t.n})` }))]}
              />
            )}
            <Select label="Sort invitations" value={sort} options={SORT_OPTIONS} onChange={(v) => setParams({ sort: v })} />
            {trashed.length > 0 && (
              <button type="button" className="act-btn" onClick={(e) => { opener.current = e.currentTarget; setTrash(true); }}>
                <Trash2 size={14} /> Trash <em className="cnt">{trashed.length}</em>
              </button>
            )}
          </div>
        </div>

        {selectedRows.length > 0 && (
          <div className="bulk-bar" role="region" aria-label="Bulk actions">
            <b>{selectedRows.length} selected</b>
            {selectedRows.length < list.length && (
              <button type="button" className="link-btn" onClick={() => setSel(new Set(list.map((x) => x.id)))}>Select all {fmt(list.length)}</button>
            )}
            <span className="bulk-spacer" />
            <button type="button" className="act-btn" onClick={() => bulkPublish(true)}><Globe size={14} /> Publish</button>
            <button type="button" className="act-btn" onClick={() => bulkPublish(false)}><EyeOff size={14} /> Move to draft</button>
            <button type="button" className="act-btn" onClick={bulkExport}><Download size={14} /> Export CSV</button>
            <button type="button" className="act-btn danger" onClick={bulkTrash}><Trash2 size={14} /> Move to trash</button>
            <button type="button" className="icon-btn" aria-label="Clear selection" onClick={() => setSel(new Set())}><X size={16} /></button>
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
                    <td colSpan={5}>
                      <div className="cell-couple"><i className="sk sk-avatar" /><i className="sk sk-line" /></div>
                    </td>
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
            <span>{q.trim() ? "Try a different name." : "Nothing matches the current filters."}</span>
            <button type="button" className="empty-btn" onClick={clearFilters}>Clear filters</button>
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th className="th-check">
                      <input ref={headCheck} type="checkbox" checked={allOnPage} aria-label="Select all invitations on this page" onChange={togglePage} />
                    </th>
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
                    const chip = statusChip(x);
                    const checked = sel.has(x.id);
                    return (
                      <tr key={x.id} className={`${preview?.id === x.id ? "active" : ""}${checked ? " sel" : ""}${past ? " is-past" : ""}`.trim()}>
                        <td className="td-check">
                          <input type="checkbox" checked={checked} aria-label={`Select ${coupleName(x)}`} onChange={() => toggleSel(x.id)} />
                        </td>
                        <td>
                          <div className="cell-couple">
                            <div className="row-avatar">{initials(x)}</div>
                            <div className="cell-stack">
                              <b>{coupleName(x)}</b>
                              <span className="cell-line">
                                <span className={`chip ${chip[0]}`}>{chip[1]}</span>
                                <small className="tpl-name">{templateOf(x).name}</small>
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="cell-stack">
                            <span className="cell-date"><CalendarDays size={14} /> {x.event_date ? fmtDate(x.event_date) : "Date not set"}</span>
                            <span className="cd-wrap"><Countdown x={x} live={live} /></span>
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
                {topTemplate && visible.length > 1 && (
                  <span className="insight" title="Template used by the most invitations"> · Most used template: <b>{topTemplate.name}</b> ({topTemplate.n} of {visible.length})</span>
                )}
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
            <button type="button" role="menuitem" onClick={() => { setShareId(x.id); closeMenu(false); }}>
              <Share size={15} /> Share…
            </button>
            <button type="button" role="menuitem" onClick={() => { duplicate(x); closeMenu(true); }}>
              <Copy size={15} /> Duplicate
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
      {shareRow && (
        <ShareModal
          row={shareRow} rows={rows} live={isPub(shareRow)} onClose={closeAll}
          onCopy={copyLink} onWhatsApp={shareWhatsApp} onSaveLink={saveLink}
          onPublish={(x) => writePub(x.id, true)}
        />
      )}
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

      <style>{dashboardCss}</style>
      <style>{`
        /* ---------- tabs + search ---------- */
        .inv-tabbar { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 10px 16px; border-bottom: 1px solid var(--gray-border); }
        .inv-tabs { display: flex; gap: 26px; }
        .inv-tab { margin-bottom: -1px; padding: 10px 2px 12px; display: inline-flex; align-items: center; gap: 8px; border: 0; border-bottom: 2px solid transparent; background: none; color: var(--gray); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; transition: color .2s, border-color .2s; }
        .inv-tab em { min-width: 22px; height: 20px; padding: 0 7px; display: grid; place-items: center; border-radius: 999px; background: var(--gray-light); color: var(--gray); font-size: 11.5px; font-style: normal; font-weight: 700; }
        .inv-tab:hover { color: var(--dark); }
        .inv-tab.on { border-bottom-color: var(--primary); color: var(--primary); }
        .inv-tab.on em { background: var(--primary-light); color: var(--primary); }

        /* ---------- list panel ---------- */
        .inv-panel { margin-top: 14px; overflow: hidden; background: var(--white); border: 1px solid var(--gray-border); border-radius: 18px; }
        .inv-toolbar { padding: 12px 22px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 16px; border-bottom: 1px solid var(--gray-border); }
        .inv-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .inv-filter { height: 30px; padding: 0 12px; display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--gray-border); border-radius: 999px; background: var(--white); color: var(--gray-dark); font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: background .2s, border-color .2s, color .2s; }
        .inv-filter em { font-style: normal; font-size: 11.5px; font-weight: 700; color: var(--gray); }
        .inv-filter:hover { border-color: var(--primary); }
        .inv-filter.on { background: var(--primary-light); border-color: var(--primary); color: var(--primary); }
        .inv-filter.on em { color: var(--primary); }
        .link-btn { padding: 0; border: 0; background: none; color: var(--primary); font: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; }
        .link-btn:hover { text-decoration: underline; }
        .insight { color: var(--gray); }
        .insight b { color: var(--gray-dark); font-weight: 700; }

        .bulk-bar { padding: 10px 22px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; border-bottom: 1px solid var(--gray-border); background: var(--primary-lightest); }
        .bulk-bar > b { font-size: 13px; font-weight: 700; color: var(--primary-dark); }
        .bulk-spacer { flex: 1; }
        .act-btn.danger:hover:not(:disabled) { background: var(--danger-light); border-color: var(--danger-dark); color: var(--danger-dark); }

        /* ---------- table ---------- */
        .inv-table { min-width: 820px; }
        .inv-table .th-check, .inv-table .td-check { width: 44px; padding-right: 0; }
        .inv-table input[type="checkbox"] { width: 16px; height: 16px; margin: 0; accent-color: var(--primary); cursor: pointer; }
        .inv-table tbody tr.sel { background: var(--primary-lightest); }
        .inv-table tbody tr.is-past td:not(.td-check):not(:last-child) { opacity: .6; }
        .inv-table tbody tr.is-past:hover td { opacity: 1; }
        .cell-line { display: flex; align-items: center; gap: 8px; }
        .tpl-name { font-size: 12px; color: var(--gray); white-space: nowrap; }
        .cd-wrap { margin-left: 22px; }
        .cd-wrap .when { margin-left: 0; }
        .cd { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 999px; font-size: 11.5px; font-weight: 700; white-space: nowrap; }
        .cd.info { background: var(--info-light); color: var(--dx-info-text); }
        .cd.warn { background: var(--warning-light); color: var(--dx-warn-text); }
        .cd.danger { background: var(--danger-light); color: var(--danger-dark); }

        /* ---------- share modal ---------- */
        .share { padding: 4px 22px 22px; display: flex; flex-direction: column; gap: 16px; }
        .share-note { padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; border-radius: 12px; background: var(--warning-light); color: var(--dx-warn-text); font-size: 13px; font-weight: 600; }
        .share-link { display: flex; align-items: center; gap: 8px; }
        .share-link code { flex: 1; min-width: 0; padding: 9px 12px; border: 1px solid var(--gray-border); border-radius: 12px; background: var(--ghost-white); font-size: 12.5px; color: var(--gray-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .share-custom { display: flex; flex-direction: column; gap: 6px; }
        .share-custom label { font-size: 13px; font-weight: 700; color: var(--dark); }
        .share-row { display: flex; align-items: center; gap: 8px; }
        .share-prefix { max-width: 40%; font-size: 12.5px; color: var(--gray); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .share-row input { flex: 1; min-width: 0; height: 36px; padding: 0 12px; border: 1px solid var(--gray-border); border-radius: 12px; outline: 0; font: inherit; font-size: 13px; color: var(--dark); }
        .share-row input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-lightest); }
        .share-row input[aria-invalid="true"] { border-color: var(--danger-dark); }
        .share-custom small { font-size: 12px; color: var(--gray); }
        .share-custom small.bad { color: var(--danger-dark); font-weight: 600; }
        .share-qr { display: flex; align-items: center; gap: 16px; }
        .share-qr-img { width: 150px; height: 150px; flex-shrink: 0; display: grid; place-items: center; border: 1px solid var(--gray-border); border-radius: 14px; background: #fff; overflow: hidden; font-size: 12px; color: var(--gray); text-align: center; }
        .share-qr-img .sk { width: 100%; height: 100%; }
        .share-actions { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }

        @media (max-width: 768px) {
          .inv-toolbar, .bulk-bar { padding: 10px 16px; }
          .share-qr { flex-direction: column; align-items: stretch; }
          .share-qr-img { align-self: center; }
        }
      `}</style>
    </div>
  );
}
