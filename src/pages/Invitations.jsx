import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useSearchParams } from "react-router-dom";
import {
  FilePlus2, CalendarDays, ArrowUpRight, Eye, Pencil, Link2, Check, Plus, Search, Smartphone,
  MoreHorizontal, Trash2, X, MessageCircle, Globe, EyeOff, ChevronLeft, ChevronRight,
  AlertTriangle, Archive, RefreshCw, Copy, Download, Users, LayoutGrid, ListView, Share,
} from "../components/Icons";
import * as demo from "../lib/demoData";
import { compile } from "../lib/compileInvitation";
import {
  DASHBOARD_CSS, Modal, PreviewPanel, TrashModal, useEscape,
  LS_PUB, LS_DEL, PAGE_SIZE, TRASH_DAYS, DAY,
  readJSON, writeJSON, normDeleted, fmt, fmtDate, fmtDateTime, timeAgo,
  initials, coupleName, getViews, getInviteLink, dayDiff, whenText, isPast, copyText,
} from "./Dashboard";

/* =========================================================
   HELPERS
   ========================================================= */
const GRID_PAGE_SIZE = 12;
const THUMB_W = 390;
const THUMB_H = 560;
const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

/* URL state: ?status=draft&when=week&sort=date&view=grid&template=classic&q=name
   Default values are left out of the URL so it stays short. */
const DEFAULTS = { status: "all", when: "all", sort: "recent", view: "list", template: "all", q: "" };
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

const hashOf = (s, m) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % m;
  return h;
};

/* RSVP numbers per invitation. Uses x.invited / x.rsvps when the record has them,
   otherwise a stable placeholder per invitation (same idea as getViews).
   Replace with your real guest-response data. */
const getRsvp = (x) => {
  const id = String(x.id ?? "");
  const realInvited = Number(x.invited ?? x.details?.guestCount);
  const invited = Number.isFinite(realInvited) && realInvited > 0 ? realInvited : 30 + hashOf(id, 13) * 10;
  const going = x.rsvps != null && Number.isFinite(Number(x.rsvps))
    ? Math.min(Number(x.rsvps), invited)
    : Math.round(invited * (0.2 + hashOf(`${id}r`, 55) / 100));
  return { going, invited };
};

const templateOf = (x) => {
  const t = (demo.demoTemplates || []).find((tpl) => String(tpl.id) === String(x.template_id));
  const name = x.template_name || t?.name || "Custom invitation";
  return { key: String(x.template_id || name), name };
};

/* Same compile step the preview panel uses. */
const buildHtml = (row) => {
  try {
    const tpl = (demo.demoTemplates || []).find((t) => String(t.id) === String(row.template_id));
    const source = tpl?.html_code || tpl?.html || "";
    const data = {
      events: [], groomContacts: [], brideContacts: [],
      ...(row.details || {}),
      brideEn: row.bride_name || row.details?.brideEn || "",
      groomEn: row.groom_name || row.details?.groomEn || "",
      weddingDate: row.event_date || row.details?.weddingDate || "",
    };
    return compile(source, data);
  } catch { return ""; }
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
/* Scaled-down, script-free render of the invitation (sandbox="" blocks scripts and storage). */
function Thumb({ row }) {
  const ref = useRef(null);
  const [scale, setScale] = useState(0.4);
  const html = useMemo(() => buildHtml(row), [row]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fit = () => { if (el.clientWidth) setScale(el.clientWidth / THUMB_W); };
    fit();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="thumb" ref={ref}>
      {html ? (
        <iframe title="" aria-hidden="true" tabIndex={-1} loading="lazy" srcDoc={html} sandbox="" style={{ transform: `scale(${scale})` }} />
      ) : (
        <div className="thumb-empty"><Smartphone size={22} /><span>No preview</span></div>
      )}
    </div>
  );
}

function Countdown({ x, live }) {
  const d = dayDiff(x.event_date);
  if (d === null) return null;
  if (d < 0) return <small className="when">{whenText(d)}</small>;
  const tone = d <= 7 ? (live ? "warn" : "danger") : "info";
  const title = !live && d <= 7 ? `Still a draft with the event ${whenText(d).toLowerCase()}. Publish it so guests can open the link.` : undefined;
  return <span className={`cd ${tone}`} title={title}>{whenText(d)}</span>;
}

function RsvpMeter({ x, live }) {
  if (!live) return <span className="muted">Not live</span>;
  const { going, invited } = getRsvp(x);
  const pct = Math.min(100, Math.round((going / invited) * 100));
  return (
    <div className="rsvp" title={`${going} of ${invited} invited guests are attending (${pct}%)`}>
      <span><b>{fmt(going)}</b> / {fmt(invited)} <small>invited</small></span>
      <i className="bar"><u style={{ width: `${pct}%` }} /></i>
    </div>
  );
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
/* "All Invitations" page: the full list with summary cards, filters, bulk actions,
   a list/grid view and shareable URL filters. */
export default function Invitations({ onPanelChange }) {
  const [sp, setSp] = useSearchParams();
  const status = oneOf(sp.get("status"), ["all", "published", "draft"], DEFAULTS.status);
  const when = oneOf(sp.get("when"), ["all", "upcoming", "week", "past"], DEFAULTS.when);
  const sort = oneOf(sp.get("sort"), ["recent", "date", "views"], DEFAULTS.sort);
  const view = oneOf(sp.get("view"), ["list", "grid"], DEFAULTS.view);
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
     ever cover rows the person can currently see). Sort and view keep it. */
  const setParams = (patch) => {
    setSp((prev) => {
      const n = new URLSearchParams(prev);
      Object.entries(patch).forEach(([k, v]) => {
        if (!v || v === DEFAULTS[k]) n.delete(k); else n.set(k, v);
      });
      return n;
    }, { replace: true });
    setPage(1);
    if (!("view" in patch) && !("sort" in patch)) setSel(new Set());
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
    const soon = visible.filter((x) => { const d = dayDiff(x.event_date); return !live(x) && d !== null && d >= 0 && d <= 7; }).length;
    return {
      total: visible.length,
      pub: visible.filter(live).length,
      draft: visible.filter((x) => !live(x)).length,
      upcoming: visible.filter((x) => dateMatch(x, "upcoming")).length,
      week: visible.filter((x) => dateMatch(x, "week")).length,
      past: visible.filter((x) => dateMatch(x, "past")).length,
      soon,
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

  const perPage = view === "grid" ? GRID_PAGE_SIZE : PAGE_SIZE;
  const pages = Math.max(1, Math.ceil(list.length / perPage));
  const cur = Math.min(page, pages);
  const shown = list.slice((cur - 1) * perPage, cur * perPage);
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
    const { views, rsvps, invited, created_at, updated_at, ...rest } = x;
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
    const head = ["Couple", "Groom", "Bride", "Event date", "Status", "Template", "Views", "RSVPs attending", "Invited", "Link", "Created"];
    const body = selectedRows.map((x) => {
      const live = isPub(x);
      const past = isPast(x);
      const statusText = past ? (live ? "Completed" : "Archived") : live ? "Published" : "Draft";
      const r = live ? getRsvp(x) : null;
      return [
        coupleName(x), x.groom_name || "", x.bride_name || "", x.event_date || "", statusText, templateOf(x).name,
        getViews(x), r ? r.going : "", r ? r.invited : "", live ? getInviteLink(x) : "", x.created_at || "",
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

  const statusFilters = [
    ["all", "All", stats.total],
    ["published", "Published", stats.pub],
    ["draft", "Drafts", stats.draft],
  ];
  const hasFilters = status !== "all" || when !== "all" || tpl !== "all" || q.trim() !== "";
  const clearFilters = () => setParams({ status: "all", when: "all", template: "all", q: "" });

  /* Summary cards double as filters. */
  const cards = [
    { key: "total", label: "Total", n: stats.total, sub: "All invitations", on: status === "all" && when === "all", run: () => setParams({ status: "all", when: "all", template: "all", q: "" }) },
    { key: "pub", label: "Published", n: stats.pub, sub: "Links are live", tone: "ok", on: status === "published" && when === "all", run: () => setParams({ status: "published", when: "all", template: "all", q: "" }) },
    { key: "draft", label: "Drafts", n: stats.draft, sub: stats.soon > 0 ? `${stats.soon} with an event this week` : "Not live yet", tone: stats.soon > 0 ? "danger" : "", on: status === "draft" && when === "all", run: () => setParams({ status: "draft", when: "all", template: "all", q: "" }) },
    { key: "upcoming", label: "Upcoming", n: stats.upcoming, sub: "Next 30 days", tone: "info", on: status === "all" && when === "upcoming", run: () => setParams({ status: "all", when: "upcoming", template: "all", q: "" }) },
    { key: "past", label: "Completed", n: stats.past, sub: "Past events", on: status === "all" && when === "past", run: () => setParams({ status: "all", when: "past", template: "all", q: "" }) },
  ];

  /* ---------- row / card pieces ---------- */
  const statusChip = (x) => {
    const live = isPub(x);
    const past = isPast(x);
    return past ? (live ? ["done", "Completed"] : ["draft", "Archived"]) : live ? ["ok", "Published"] : ["draft", "Draft"];
  };

  const rowActions = (x, live) => (
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
  );

  const colSpan = 6;

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

      {/* ---------- summary cards ---------- */}
      <div className="inv-stats" role="group" aria-label="Invitation summary">
        {cards.map((c) => (
          <button key={c.key} type="button" className={`inv-stat${c.on ? " on" : ""}`} aria-pressed={c.on} onClick={c.run}>
            <span className="inv-stat-label">{c.label}</span>
            {loading ? <i className="sk sk-num" /> : <strong>{fmt(c.n)}</strong>}
            <span className={`inv-stat-sub ${c.tone || ""}`}>{c.sub}</span>
          </button>
        ))}
      </div>

      {/* ---------- invitations ---------- */}
      <div className="recent-card">
        <div className="recent-head">
          <div className="recent-title">
            <strong>Invitations</strong>
            {!loading && visible.length > 0 && <em>{fmt(list.length === visible.length ? visible.length : list.length)}</em>}
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
              <select className="sort" value={tpl} aria-label="Filter by template" onChange={(e) => setParams({ template: e.target.value })}>
                <option value="all">All templates</option>
                {templates.map((t) => <option key={t.key} value={t.key}>{t.name} ({t.n})</option>)}
              </select>
            )}
            <select className="sort" value={sort} aria-label="Sort invitations" onChange={(e) => setParams({ sort: e.target.value })}>
              <option value="recent">Recently added</option>
              <option value="date">Event date</option>
              <option value="views">Most viewed</option>
            </select>
            <div className="view-toggle" role="group" aria-label="View">
              <button type="button" aria-pressed={view === "list"} className={view === "list" ? "on" : ""} title="List view" aria-label="List view" onClick={() => setParams({ view: "list" })}><ListView size={16} /></button>
              <button type="button" aria-pressed={view === "grid"} className={view === "grid" ? "on" : ""} title="Grid view" aria-label="Grid view" onClick={() => setParams({ view: "grid" })}><LayoutGrid size={16} /></button>
            </div>
            {trashed.length > 0 && (
              <button type="button" className="act-btn" onClick={(e) => { opener.current = e.currentTarget; setTrash(true); }}>
                <Trash2 size={14} /> Trash <em className="cnt">{trashed.length}</em>
              </button>
            )}
            <Link to="/analytics" className="head-link">View analytics <ArrowUpRight size={14} /></Link>
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

        {!loading && !error && visible.length > 0 && (
          <div className="filter-row" role="group" aria-label="Filters">
            {statusFilters.map(([key, label, n]) => (
              <button
                key={key} type="button" aria-pressed={status === key}
                className={`inv-filter${status === key ? " on" : ""}`}
                onClick={() => setParams({ status: key })}
              >
                {label} <em>{fmt(n)}</em>
              </button>
            ))}
            <i className="filter-sep" aria-hidden="true" />
            {WHEN_FILTERS.map(([key, label, hint]) => (
              <button
                key={key} type="button" aria-pressed={when === key} title={hint}
                className={`inv-filter${when === key ? " on" : ""}`}
                onClick={() => setParams({ when: when === key ? "all" : key })}
              >
                {label} <em>{fmt(key === "upcoming" ? stats.upcoming : key === "week" ? stats.week : stats.past)}</em>
              </button>
            ))}
            {hasFilters && <button type="button" className="link-btn" onClick={clearFilters}>Clear filters</button>}
            {topTemplate && visible.length > 1 && (
              <span className="insight" title="Template used by the most invitations">
                Most used template: <b>{topTemplate.name}</b> · {topTemplate.n} of {visible.length}
              </span>
            )}
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
          view === "grid" ? (
            <div className="inv-grid">
              {[0, 1, 2, 3].map((i) => <i key={i} className="sk sk-card" />)}
            </div>
          ) : (
            <div className="table-scroll">
              <table className="inv-table">
                <tbody>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <tr key={i}>
                      <td colSpan={colSpan}>
                        <div className="cell-couple"><i className="sk sk-avatar" /><i className="sk sk-line" /></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
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
            {view === "grid" ? (
              <div className="inv-grid">
                {shown.map((x) => {
                  const live = isPub(x);
                  const past = isPast(x);
                  const chip = statusChip(x);
                  const checked = sel.has(x.id);
                  return (
                    <article key={x.id} className={`inv-card${checked ? " sel" : ""}${past ? " is-past" : ""}${preview?.id === x.id ? " active" : ""}`}>
                      <div className="card-thumb">
                        <Thumb row={x} />
                        <label className="card-check">
                          <input type="checkbox" checked={checked} aria-label={`Select ${coupleName(x)}`} onChange={() => toggleSel(x.id)} />
                        </label>
                        <span className={`chip ${chip[0]} card-chip`}>{chip[1]}</span>
                      </div>
                      <div className="card-body">
                        <b className="card-name" title={coupleName(x)}>{coupleName(x)}</b>
                        <div className="card-meta">
                          <span className="cell-date"><CalendarDays size={14} /> {x.event_date ? fmtDate(x.event_date) : "Date not set"}</span>
                          <Countdown x={x} live={live} />
                        </div>
                        <div className="card-stats">
                          <RsvpMeter x={x} live={live} />
                          <span className="views">
                            <Eye size={15} /> {fmt(getViews(x))}
                            {topId === x.id && <span className="top">Top</span>}
                          </span>
                        </div>
                        <small className="card-tpl">{templateOf(x).name}</small>
                      </div>
                      <div className="card-actions">{rowActions(x, live)}</div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="table-scroll">
                <table className="inv-table">
                  <thead>
                    <tr>
                      <th className="th-check">
                        <input ref={headCheck} type="checkbox" checked={allOnPage} aria-label="Select all invitations on this page" onChange={togglePage} />
                      </th>
                      <th>Couple</th>
                      <th>Event date</th>
                      <th>RSVPs</th>
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
                          <td><RsvpMeter x={x} live={live} /></td>
                          <td>
                            <span className="views">
                              <Eye size={15} /> {fmt(getViews(x))}
                              {topId === x.id && <span className="top">Top</span>}
                            </span>
                          </td>
                          <td>{rowActions(x, live)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="table-foot">
              <span>
                {list.length > perPage
                  ? `Showing ${(cur - 1) * perPage + 1}–${Math.min(cur * perPage, list.length)} of ${list.length}`
                  : `Showing all ${list.length}`}
              </span>
              {list.length > perPage && (
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

      <style>{DASHBOARD_CSS}</style>
      <style>{`
        /* ---------- summary cards ---------- */
        .inv-stats { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
        .inv-stat { min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 14px 16px; border: 1px solid var(--gray-border); border-radius: 18px; background: var(--white); color: var(--dark); font: inherit; text-align: left; cursor: pointer; transition: border-color .2s, box-shadow .2s, background .2s; }
        .inv-stat:hover { border-color: var(--periwinkle); box-shadow: 0 6px 18px rgba(54, 52, 77, .06); }
        .inv-stat.on { border-color: var(--primary); background: var(--primary-lightest); box-shadow: 0 0 0 3px var(--primary-lightest); }
        .inv-stat-label { font-size: 13px; font-weight: 600; color: var(--gray); }
        .inv-stat strong { font-size: 28px; line-height: 1.1; font-weight: 700; letter-spacing: -.02em; }
        .inv-stat-sub { max-width: 100%; font-size: 12px; font-weight: 600; color: var(--gray); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .inv-stat-sub.ok { color: var(--success-dark); }
        .inv-stat-sub.info { color: var(--dx-info-text); }
        .inv-stat-sub.danger { color: var(--danger-dark); }

        /* ---------- toolbar ---------- */
        .view-toggle { display: flex; padding: 3px; gap: 2px; border-radius: 12px; background: var(--gray-light); }
        .view-toggle button { width: 30px; height: 30px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 9px; background: transparent; color: var(--gray); cursor: pointer; }
        .view-toggle button.on { background: var(--white); color: var(--primary); box-shadow: 0 1px 3px rgba(54, 52, 77, .14); }

        .link-btn { padding: 0; border: 0; background: none; color: var(--primary); font: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; }
        .link-btn:hover { text-decoration: underline; }

        .bulk-bar { padding: 10px 22px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; border-bottom: 1px solid var(--gray-border); background: var(--primary-lightest); }
        .bulk-bar > b { font-size: 13px; font-weight: 700; color: var(--primary-dark); }
        .bulk-spacer { flex: 1; }
        .act-btn.danger:hover:not(:disabled) { background: var(--danger-light); border-color: var(--danger-dark); color: var(--danger-dark); }

        /* ---------- filters ---------- */
        .filter-row { flex-wrap: wrap; gap: 8px; }
        .filter-sep { width: 1px; height: 20px; background: var(--gray-border); }
        .inv-filter { height: 30px; padding: 0 12px; display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--gray-border); border-radius: 999px; background: var(--white); color: var(--gray-dark); font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: background .2s, border-color .2s, color .2s; }
        .inv-filter em { font-style: normal; font-size: 11.5px; font-weight: 700; color: var(--gray); }
        .inv-filter:hover { border-color: var(--primary); }
        .inv-filter.on { background: var(--primary-light); border-color: var(--primary); color: var(--primary); }
        .inv-filter.on em { color: var(--primary); }
        .insight { margin-left: auto; font-size: 12px; color: var(--gray); }
        .insight b { color: var(--gray-dark); font-weight: 700; }

        /* ---------- table ---------- */
        .inv-table { min-width: 980px; }
        .inv-table .th-check, .inv-table .td-check { width: 44px; padding-right: 0; }
        .inv-table input[type="checkbox"], .card-check input { width: 16px; height: 16px; margin: 0; accent-color: var(--primary); cursor: pointer; }
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
        .muted { font-size: 12.5px; color: var(--gray); }

        .rsvp { min-width: 130px; display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--gray-dark); white-space: nowrap; }
        .rsvp b { font-weight: 700; color: var(--dark); }
        .rsvp small { font-size: 12px; color: var(--gray); }
        .rsvp .bar { display: block; width: 100%; max-width: 140px; height: 6px; border-radius: 999px; background: var(--gray-light); overflow: hidden; }
        .rsvp .bar u { display: block; height: 100%; border-radius: inherit; background: var(--success); text-decoration: none; }

        /* ---------- grid ---------- */
        .inv-grid { padding: 18px 22px; display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 16px; }
        .inv-card { min-width: 0; display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--gray-border); border-radius: 18px; background: var(--white); transition: border-color .2s, box-shadow .2s; }
        .inv-card:hover { border-color: var(--periwinkle); box-shadow: 0 6px 18px rgba(54, 52, 77, .08); }
        .inv-card.sel { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-lightest); }
        .inv-card.active { border-color: var(--primary); }
        .inv-card.is-past .card-thumb, .inv-card.is-past .card-body { opacity: .65; }
        .card-thumb { position: relative; background: var(--gray-light); border-bottom: 1px solid var(--gray-border); }
        .thumb { position: relative; width: 100%; aspect-ratio: ${THUMB_W} / ${THUMB_H}; overflow: hidden; }
        .thumb iframe { position: absolute; top: 0; left: 0; width: ${THUMB_W}px; height: ${THUMB_H}px; border: 0; background: #fff; transform-origin: top left; pointer-events: none; }
        .thumb-empty { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; font-size: 12px; color: var(--gray); }
        .card-check { position: absolute; top: 10px; left: 10px; width: 28px; height: 28px; display: grid; place-items: center; border-radius: 9px; background: rgba(255, 255, 255, .92); box-shadow: 0 1px 4px rgba(54, 52, 77, .2); cursor: pointer; }
        .card-chip { position: absolute; top: 12px; right: 10px; background: rgba(255, 255, 255, .94); box-shadow: 0 1px 4px rgba(54, 52, 77, .16); }
        .card-chip.ok { color: var(--success-dark); }
        .card-chip.draft { color: var(--gray); }
        .card-chip.done { color: var(--dx-info-text); }
        .card-body { padding: 12px 14px 8px; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
        .card-name { font-size: 14.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .card-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; }
        .card-meta .when { margin-left: 0; }
        .card-stats { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .card-stats .rsvp { min-width: 0; flex: 1; }
        .card-tpl { font-size: 12px; color: var(--gray); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .card-actions { margin-top: auto; padding: 8px 14px 14px; }
        .card-actions .row-actions { justify-content: flex-start; flex-wrap: wrap; }
        .sk-card { display: block; height: 340px; border-radius: 18px; }

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

        @media (max-width: 1100px) {
          .inv-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (max-width: 768px) {
          .inv-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .bulk-bar { padding: 10px 16px; }
          .inv-grid { padding: 14px 16px; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
          .insight { margin-left: 0; width: 100%; }
          .share-qr { flex-direction: column; align-items: stretch; }
          .share-qr-img { align-self: center; }
        }
      `}</style>
    </div>
  );
}
