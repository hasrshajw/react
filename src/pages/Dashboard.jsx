import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FilePlus2, RefreshCw, CalendarDays, ArrowUpRight, Users, Inbox, Eye, Pencil, Link2, Check,
  Plus, Search, Smartphone, MoreHorizontal, Trash2, X, MessageCircle, QrCode, Globe, EyeOff,
  TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
} from "lucide-react";
import * as demo from "../lib/demoData";
import { compile } from "../lib/compileInvitation";

/* =========================================================
   DEMO DATA – replace with your real sources
   ========================================================= */
const TRAFFIC = {
  "7": { label: "7 days", value: 312, trend: 8.4 },
  "30": { label: "30 days", value: 1284, trend: 12.1 },
  all: { label: "All time", value: 5420, trend: null },
};

const REQUESTS_EARLIER_DONE = 24; // completed requests not shown in the drawer
const INITIAL_REQUESTS = [
  { id: "r1", name: "Ravi Kumar", subject: "Wants to change the muhurtham time", time: "2 hours ago", status: "pending" },
  { id: "r2", name: "Lakshmi Devi", subject: "Asked for a Telugu-only invitation", time: "Yesterday", status: "done" },
  { id: "r3", name: "Sai Prasad", subject: "Needs the venue map link updated", time: "2 days ago", status: "done" },
  { id: "r4", name: "Anitha Reddy", subject: "Requested an extra reception card", time: "3 days ago", status: "done" },
  { id: "r5", name: "Mahesh Babu", subject: "Asked to add a second contact number", time: "4 days ago", status: "done" },
  { id: "r6", name: "Priya Varma", subject: "Wants a different template", time: "5 days ago", status: "done" },
];

/* =========================================================
   HELPERS
   ========================================================= */
const LS_PUB = "schedy_published";
const LS_DEL = "schedy_deleted_ids";
const LS_NOTE = "schedy_hide_demo_note";
const readJSON = (k, f) => { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

const PAGE_SIZE = 8;

const initials = (x) =>
  `${(x.groom_name || "G").trim().charAt(0)}${(x.bride_name || "B").trim().charAt(0)}`.toUpperCase();
const coupleName = (x) => `${x.groom_name || "Groom"} & ${x.bride_name || "Bride"}`;

/* Uses x.views when present, otherwise a stable fake number per invitation. */
const getViews = (x) => {
  if (typeof x.views === "number") return x.views;
  const s = String(x.id ?? "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return 40 + h;
};

/* Public link of an invitation. Change this if your live route is different. */
const getInviteLink = (x) => `${window.location.origin}/${x.details?.customId || x.id}`;

const dayDiff = (d) => {
  if (!d) return null;
  const a = new Date(d + "T00:00:00");
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((a - t) / 86400000);
};
const whenText = (n) =>
  n === null ? "" : n === 0 ? "Today" : n === 1 ? "Tomorrow" : n === -1 ? "Yesterday" : n > 0 ? `In ${n} days` : `${-n} days ago`;

const useEscape = (active, fn) => {
  useEffect(() => {
    if (!active) return;
    const h = (e) => e.key === "Escape" && fn();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [active, fn]);
};

/* =========================================================
   SMALL COMPONENTS
   ========================================================= */
function Modal({ title, subtitle, onClose, children, width = 440, headExtra }) {
  useEscape(true, onClose);
  return (
    <div className="dx-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dx-modal" role="dialog" aria-modal="true" aria-label={title} style={{ width }}>
        <div className="dx-modal-head">
          <div>
            <b>{title}</b>
            {subtitle && <small>{subtitle}</small>}
          </div>
          <div className="dx-modal-actions">
            {headExtra}
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><X size={16} /></button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function PreviewModal({ row, onClose, published }) {
  const html = useMemo(() => {
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
  }, [row]);

  return (
    <Modal
      title={coupleName(row)}
      subtitle={published ? "Published · mobile preview" : "Draft · mobile preview"}
      width={420}
      onClose={onClose}
      headExtra={<Link to={`/create?edit=${row.id}`} className="act-btn"><Pencil size={14} /> Edit</Link>}
    >
      <div className="dx-preview-body">
        {html ? (
          <iframe title="Invitation preview" srcDoc={html} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
        ) : (
          <div className="dx-empty-mini"><Smartphone size={22} /><b>No preview available</b><span>This invitation has no template yet.</span></div>
        )}
      </div>
    </Modal>
  );
}

function QrModal({ row, onClose, onCopy }) {
  const link = getInviteLink(row);
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(link)}`;
  return (
    <Modal title="QR code" subtitle={coupleName(row)} width={360} onClose={onClose}>
      <div className="dx-qr">
        <img src={src} alt={`QR code for ${coupleName(row)}`} width="220" height="220" />
        <code>{link}</code>
        <button type="button" className="act-btn wide" onClick={() => onCopy(row)}><Link2 size={14} /> Copy link</button>
      </div>
    </Modal>
  );
}

function ConfirmDelete({ row, onCancel, onConfirm }) {
  return (
    <Modal title="Delete invitation?" width={380} onClose={onCancel}>
      <div className="dx-confirm">
        <p>
          <b>{coupleName(row)}</b> will be removed from your dashboard. Anyone with its link will no longer see it.
        </p>
        <div className="dx-confirm-actions">
          <button type="button" className="act-btn" onClick={onCancel}>Cancel</button>
          <button type="button" className="act-btn danger" onClick={() => onConfirm(row)}><Trash2 size={14} /> Delete</button>
        </div>
      </div>
    </Modal>
  );
}

function RequestsDrawer({ requests, total, pending, onClose, onDone }) {
  const [tab, setTab] = useState("pending");
  useEscape(true, onClose);
  const list = tab === "pending" ? requests.filter((r) => r.status === "pending") : requests;
  return (
    <div className="dx-overlay drawer" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="dx-drawer" role="dialog" aria-modal="true" aria-label="Site requests">
        <div className="dx-modal-head">
          <div>
            <b>Site requests</b>
            <small><span className="red">{pending} pending</span> of {total} requests</small>
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="dx-tabs">
          <button type="button" className={tab === "pending" ? "on" : ""} onClick={() => setTab("pending")}>Pending <em>{pending}</em></button>
          <button type="button" className={tab === "all" ? "on" : ""} onClick={() => setTab("all")}>Recent <em>{requests.length}</em></button>
        </div>
        <div className="dx-req-list">
          {list.length === 0 && (
            <div className="dx-empty-mini"><Check size={22} /><b>All caught up</b><span>No pending requests.</span></div>
          )}
          {list.map((r) => (
            <div className="dx-req" key={r.id}>
              <div className="row-avatar">{r.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}</div>
              <div className="dx-req-main">
                <b>{r.name}</b>
                <span>{r.subject}</span>
                <small>{r.time}</small>
              </div>
              {r.status === "pending"
                ? <button type="button" className="act-btn" onClick={() => onDone(r.id)}><Check size={14} /> Mark done</button>
                : <span className="chip ok">Done</span>}
            </div>
          ))}
        </div>
        <div className="dx-drawer-foot">
          <Link to="/analytics" className="head-link">Open analytics <ArrowUpRight size={14} /></Link>
        </div>
      </aside>
    </div>
  );
}

/* =========================================================
   PAGE
   ========================================================= */
export default function Dashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const timer = useRef();

  const [pub, setPub] = useState(() => readJSON(LS_PUB, {}));
  const [deleted, setDeleted] = useState(() => readJSON(LS_DEL, []));
  const [hideNote, setHideNote] = useState(() => readJSON(LS_NOTE, false));

  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState(1);

  const [range, setRange] = useState("30");
  const [reqs, setReqs] = useState(INITIAL_REQUESTS);
  const [drawer, setDrawer] = useState(false);

  const [menu, setMenu] = useState(null);
  const [preview, setPreview] = useState(null);
  const [qr, setQr] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef();

  const notify = (msg) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  const load = () => {
    clearTimeout(timer.current);
    setLoading(true);
    timer.current = setTimeout(() => { setRows(demo.getDemoInvitations()); setLoading(false); }, 350);
  };
  useEffect(() => {
    load();
    return () => { clearTimeout(timer.current); clearTimeout(toastTimer.current); };
  }, []);

  const visible = useMemo(() => rows.filter((r) => !deleted.includes(r.id)), [rows, deleted]);
  const isPub = (x) => pub[x.id] !== false;

  /* ---------- table data ---------- */
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    let r = term ? visible.filter((x) => coupleName(x).toLowerCase().includes(term)) : [...visible];
    if (sort === "date") r.sort((a, b) => (a.event_date || "9999").localeCompare(b.event_date || "9999"));
    if (sort === "views") r.sort((a, b) => getViews(b) - getViews(a));
    return r;
  }, [visible, q, sort]);

  const expanded = showAll || q.trim() !== "";
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const shown = expanded ? list.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE) : list.slice(0, 5);
  const topId = useMemo(() => {
    if (visible.length < 2) return null;
    return visible.reduce((best, x) => (getViews(x) > getViews(best) ? x : best), visible[0]).id;
  }, [visible]);

  /* ---------- requests ---------- */
  const reqPending = reqs.filter((r) => r.status === "pending").length;
  const reqTotal = REQUESTS_EARLIER_DONE + reqs.length;
  const markDone = (id) => {
    setReqs((p) => p.map((r) => (r.id === id ? { ...r, status: "done" } : r)));
    notify("Request marked as done");
  };

  /* ---------- row actions ---------- */
  const copyLink = async (x) => {
    const link = getInviteLink(x);
    try { await navigator.clipboard.writeText(link); }
    catch { window.prompt("Copy invitation link", link); }
    notify("Link copied");
  };
  const shareWhatsApp = (x) => {
    const text = `You are invited! ${coupleName(x)}\n${getInviteLink(x)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };
  const togglePublish = (x) => {
    const next = { ...pub, [x.id]: !isPub(x) };
    setPub(next);
    writeJSON(LS_PUB, next);
    notify(next[x.id] ? "Invitation published" : "Invitation moved to draft");
  };
  const doDelete = (x) => {
    if (typeof demo.deleteDemoInvitation === "function") {
      demo.deleteDemoInvitation(x.id);
      setRows(demo.getDemoInvitations());
    } else {
      const ids = [...deleted, x.id];
      setDeleted(ids);
      writeJSON(LS_DEL, ids);
    }
    setConfirm(null);
    notify("Invitation deleted");
  };
  const dismissNote = () => { setHideNote(true); writeJSON(LS_NOTE, true); };

  /* ---------- row menu (fixed, so the scroll area never clips it) ---------- */
  const openMenu = (e, x) => {
    if (menu?.x.id === x.id) { setMenu(null); return; }
    const r = e.currentTarget.getBoundingClientRect();
    const up = window.innerHeight - r.bottom < 240;
    setMenu({
      x,
      right: window.innerWidth - r.right,
      top: up ? undefined : r.bottom + 6,
      bottom: up ? window.innerHeight - r.top + 6 : undefined,
    });
  };
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const down = (e) => { if (!e.target.closest(".row-menu") && !e.target.closest(".menu-trigger")) close(); };
    const key = (e) => e.key === "Escape" && close();
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  const closeAll = () => { setPreview(null); setQr(null); setConfirm(null); setDrawer(false); };
  const traffic = TRAFFIC[range];

  return (
    <div className="dashboard-page">
      {/* ---------- page header ---------- */}
      <div className="page-head">
        <div>
          <div className="eyebrow">SCHEDY · DEMO WORKSPACE</div>
          <h1>Dashboard</h1>
          <p>Manage and preview invitations using sample templates.</p>
        </div>
        <div className="head-actions">
          <button className="refresh" onClick={load}><RefreshCw size={16} /> Refresh</button>
          <Link to="/create" className="create-btn"><Plus size={16} /> Create invitation</Link>
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
            {loading ? <i className="sk sk-num" /> : <strong>{visible.length}</strong>}
          </div>
        </div>

        <div className="stat-card blue">
          <div className="stat-icon"><Users size={19} /></div>
          <div className="stat-body">
            <span>Total site visitors</span>
            <div className="stat-line">
              <strong>{traffic.value.toLocaleString()}</strong>
              {traffic.trend !== null && (
                <em className={`trend ${traffic.trend >= 0 ? "up" : "down"}`} title={`vs previous ${traffic.label}`}>
                  {traffic.trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {Math.abs(traffic.trend)}%
                </em>
              )}
            </div>
          </div>
          <div className="seg" role="tablist" aria-label="Visitor range">
            {Object.entries({ "7": "7D", "30": "30D", all: "All" }).map(([k, l]) => (
              <button key={k} type="button" className={range === k ? "on" : ""} onClick={() => setRange(k)}>{l}</button>
            ))}
          </div>
        </div>

        <div className="stat-card green">
          <div className="stat-icon"><Inbox size={19} /></div>
          <div className="stat-body">
            <span>Site requests</span>
            <strong className="req-count" title={`${reqPending} pending of ${reqTotal} requests`}>
              <span className={reqPending > 0 ? "pending" : "clear"}>{reqPending}</span>
              <span className="total">/{reqTotal}</span>
            </strong>
          </div>
          <button type="button" className="round-btn" aria-label="View site requests" onClick={() => setDrawer(true)}>
            <ArrowUpRight size={16} />
          </button>
        </div>
      </div>

      {/* ---------- recent invitations (table) ---------- */}
      <div className="recent-card">
        <div className="recent-head">
          <div className="recent-title">
            <strong>Recent invitations</strong>
            {!loading && visible.length > 0 && <em>{visible.length}</em>}
          </div>
          <div className="recent-tools">
            <label className="search">
              <Search size={15} />
              <input
                type="search" placeholder="Search couple" value={q} aria-label="Search invitations"
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
              />
            </label>
            <select className="sort" value={sort} aria-label="Sort invitations" onChange={(e) => { setSort(e.target.value); setPage(1); }}>
              <option value="recent">Recently added</option>
              <option value="date">Event date</option>
              <option value="views">Most viewed</option>
            </select>
            <Link to="/analytics" className="head-link">View analytics <ArrowUpRight size={14} /></Link>
          </div>
        </div>

        {loading ? (
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
            <b>No invitations match “{q}”</b>
            <span>Try a different name.</span>
            <button type="button" className="empty-btn" onClick={() => setQ("")}>Clear search</button>
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
                    const when = whenText(dayDiff(x.event_date));
                    return (
                      <tr key={x.id}>
                        <td>
                          <div className="cell-couple">
                            <div className="row-avatar">{initials(x)}</div>
                            <div className="cell-stack">
                              <b>{coupleName(x)}</b>
                              <span className={`chip ${live ? "ok" : "draft"}`}>{live ? "Published" : "Draft"}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="cell-stack">
                            <span className="cell-date"><CalendarDays size={14} /> {x.event_date || "Date not set"}</span>
                            {when && <small className="when">{when}</small>}
                          </div>
                        </td>
                        <td>
                          <span className="views">
                            <Eye size={15} /> {getViews(x).toLocaleString()}
                            {topId === x.id && <span className="top">Top</span>}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button type="button" className="icon-btn" title="Preview" aria-label="Preview invitation" onClick={() => setPreview(x)}>
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
                            <button type="button" className="icon-btn menu-trigger" aria-label="More actions" onClick={(e) => openMenu(e, x)}>
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
                      {showAll && !q.trim() && <button type="button" className="act-btn" onClick={() => { setShowAll(false); setPage(1); }}>Show less</button>}
                      <button type="button" className="icon-btn" aria-label="Previous page" disabled={cur === 1} onClick={() => setPage(cur - 1)}><ChevronLeft size={16} /></button>
                      <span className="page-no">{cur} / {pages}</span>
                      <button type="button" className="icon-btn" aria-label="Next page" disabled={cur === pages} onClick={() => setPage(cur + 1)}><ChevronRight size={16} /></button>
                    </div>
                  </>
                ) : !expanded ? (
                  <>
                    <span>Showing 5 of {visible.length}</span>
                    <button type="button" className="head-link as-btn" onClick={() => { setShowAll(true); setPage(1); }}>
                      View all invitations <ArrowUpRight size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <span>Showing all {list.length}</span>
                    <button type="button" className="act-btn" onClick={() => setShowAll(false)}>Show less</button>
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
        return (
          <div className="row-menu" style={{ right: menu.right, top: menu.top, bottom: menu.bottom }} role="menu">
            <button type="button" role="menuitem" disabled={!live} onClick={() => { shareWhatsApp(x); setMenu(null); }}>
              <MessageCircle size={15} /> Share on WhatsApp
            </button>
            <button type="button" role="menuitem" disabled={!live} onClick={() => { setQr(x); setMenu(null); }}>
              <QrCode size={15} /> QR code
            </button>
            <button type="button" role="menuitem" onClick={() => { togglePublish(x); setMenu(null); }}>
              {live ? <><EyeOff size={15} /> Move to draft</> : <><Globe size={15} /> Publish</>}
            </button>
            <i className="menu-sep" />
            <button type="button" role="menuitem" className="danger" onClick={() => { setConfirm(x); setMenu(null); }}>
              <Trash2 size={15} /> Delete
            </button>
          </div>
        );
      })()}

      {/* ---------- overlays ---------- */}
      {preview && <PreviewModal row={preview} published={isPub(preview)} onClose={closeAll} />}
      {qr && <QrModal row={qr} onClose={closeAll} onCopy={copyLink} />}
      {confirm && <ConfirmDelete row={confirm} onCancel={closeAll} onConfirm={doDelete} />}
      {drawer && <RequestsDrawer requests={reqs} total={reqTotal} pending={reqPending} onClose={closeAll} onDone={markDone} />}
      {toast && <div className="dx-toast" role="status"><Check size={15} /> {toast}</div>}

      <style>{`
        .dashboard-page { max-width: 1400px; margin: auto; font-family: "DM Sans", Inter, sans-serif; color: var(--dark); }
        .dashboard-page * { box-sizing: border-box; }
        .dashboard-page button:disabled { cursor: not-allowed; opacity: .5; }

        /* ---------- header ---------- */
        .page-head { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 16px; }
        .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .12em; color: var(--primary); }
        .dashboard-page h1 { margin: 5px 0 3px; font-size: 26px; line-height: 1.15; font-weight: 700; color: var(--dark); }
        .page-head p { margin: 0; color: var(--gray); font-size: 14px; }
        .head-actions { display: flex; align-items: center; gap: 10px; }
        .refresh, .create-btn { height: 40px; padding: 0 16px; display: inline-flex; align-items: center; gap: 8px; border-radius: 14px; font-size: 14px; font-weight: 600; cursor: pointer; text-decoration: none; white-space: nowrap; transition: background .2s, border-color .2s, box-shadow .2s; }
        .refresh { border: 1px solid var(--gray-border); background: var(--white); color: var(--gray-dark); }
        .refresh:hover { background: var(--gray-light); border-color: var(--periwinkle); }
        .refresh svg { transition: transform .35s ease; }
        .refresh:active svg { transform: rotate(180deg); }
        .create-btn { border: 0; background: var(--primary); color: #fff; box-shadow: 0 4px 12px rgba(103, 61, 230, .25); }
        .create-btn:hover { background: var(--primary-dark); }

        .demo-note { display: flex; align-items: center; gap: 10px; padding: 10px 12px 10px 14px; margin-bottom: 16px; border-radius: 14px; background: var(--primary-light); color: var(--primary-dark); font-size: 13px; font-weight: 500; line-height: 1.4; }
        .demo-text { flex: 1; }
        .demo-dot { width: 8px; height: 8px; flex-shrink: 0; border-radius: 50%; background: var(--primary); box-shadow: 0 0 0 4px rgba(103, 61, 230, .16); }
        .note-x { width: 26px; height: 26px; display: grid; place-items: center; border: 0; border-radius: 50%; background: transparent; color: var(--primary-dark); cursor: pointer; }
        .note-x:hover { background: rgba(103, 61, 230, .14); }

        /* ---------- KPI row ---------- */
        .dashboard-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
        .stat-card { position: relative; min-height: 84px; min-width: 0; display: flex; align-items: center; gap: 14px; padding: 16px 18px; background: var(--white); border: 1px solid var(--gray-border); border-radius: 20px; transition: border-color .2s, box-shadow .2s; }
        .stat-card:hover { border-color: var(--periwinkle); box-shadow: 0 6px 18px rgba(54, 52, 77, .06); }
        .stat-icon { width: 44px; height: 44px; flex-shrink: 0; display: grid; place-items: center; border-radius: 14px; background: var(--primary-light); color: var(--primary); }
        .stat-card.blue .stat-icon { background: var(--info-light); color: #0b86a8; }
        .stat-card.green .stat-icon { background: var(--success-light); color: var(--success-dark); }
        .stat-body { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .stat-body > span { font-size: 13px; font-weight: 600; color: var(--gray); white-space: nowrap; }
        .stat-body strong { font-size: 28px; line-height: 1.1; font-weight: 700; letter-spacing: -.02em; color: var(--dark); }
        .stat-line { display: flex; align-items: center; gap: 8px; }

        .trend { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 999px; font-size: 12px; font-style: normal; font-weight: 700; }
        .trend.up { background: var(--success-light); color: var(--success-dark); }
        .trend.down { background: var(--danger-light); color: var(--danger-dark); }

        .seg { position: absolute; top: 12px; right: 12px; display: flex; padding: 3px; gap: 2px; border-radius: 999px; background: var(--gray-light); }
        .seg button { height: 24px; padding: 0 9px; border: 0; border-radius: 999px; background: transparent; color: var(--gray); font: inherit; font-size: 11.5px; font-weight: 700; cursor: pointer; }
        .seg button.on { background: var(--white); color: var(--primary); box-shadow: 0 1px 3px rgba(54, 52, 77, .14); }

        .req-count .pending { color: var(--danger-dark); }
        .req-count .clear { color: var(--success-dark); }
        .req-count .total { margin-left: 1px; font-size: 20px; font-weight: 600; color: var(--gray); letter-spacing: 0; }

        .round-btn { position: absolute; top: 12px; right: 12px; width: 32px; height: 32px; display: grid; place-items: center; padding: 0; border-radius: 50%; border: 1px solid var(--gray-border); background: var(--white); color: var(--gray-dark); cursor: pointer; transition: background .2s, color .2s, border-color .2s; }
        .round-btn:hover { background: var(--primary); border-color: var(--primary); color: #fff; }

        /* ---------- recent invitations ---------- */
        .recent-card { margin-top: 14px; overflow: hidden; background: var(--white); border: 1px solid var(--gray-border); border-radius: 22px; }
        .recent-head { min-height: 64px; padding: 10px 22px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 16px; border-bottom: 1px solid var(--gray-border); }
        .recent-title { display: flex; align-items: center; gap: 10px; }
        .recent-title strong { font-size: 15px; font-weight: 700; }
        .recent-title em { min-width: 22px; height: 22px; padding: 0 7px; display: grid; place-items: center; border-radius: 999px; background: var(--primary-light); color: var(--primary); font-size: 12px; font-style: normal; font-weight: 700; }
        .recent-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
        .search { height: 36px; width: 210px; display: flex; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid var(--gray-border); border-radius: 12px; background: var(--white); color: var(--gray); transition: border-color .2s, box-shadow .2s; }
        .search:focus-within { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-lightest); }
        .search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; font: inherit; font-size: 13px; color: var(--dark); }
        .sort { height: 36px; padding: 0 34px 0 12px; border: 1px solid var(--gray-border); border-radius: 12px; font: inherit; font-size: 13px; font-weight: 600; color: var(--gray-dark); cursor: pointer; outline: 0; appearance: none; -webkit-appearance: none; background-color: var(--white); background-repeat: no-repeat; background-position: right 11px center; background-size: 15px; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236d7081' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); }
        .sort:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-lightest); }
        .head-link { display: inline-flex; align-items: center; gap: 5px; height: 34px; padding: 0 13px; border-radius: 999px; background: var(--primary-lightest); color: var(--primary); font-size: 13px; font-weight: 700; text-decoration: none; transition: background .2s; }
        .head-link:hover { background: var(--primary-light); }
        .head-link.as-btn { border: 0; font-family: inherit; cursor: pointer; }

        .table-scroll { overflow-x: auto; }
        .inv-table { width: 100%; min-width: 760px; border-collapse: collapse; }
        .inv-table thead th { padding: 12px 22px; text-align: left; background: var(--ghost-white); border-bottom: 1px solid var(--gray-border); font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--gray); white-space: nowrap; }
        .inv-table tbody td { padding: 12px 22px; border-bottom: 1px solid var(--gray-border); vertical-align: middle; }
        .inv-table tbody tr:last-child td { border-bottom: 0; }
        .inv-table tbody tr:hover { background: var(--ghost-white); }
        .inv-table .th-actions { text-align: right; }

        .cell-couple { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .cell-stack { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; min-width: 0; }
        .cell-stack b { font-size: 14px; font-weight: 700; white-space: nowrap; }
        .row-avatar { width: 40px; height: 40px; flex-shrink: 0; display: grid; place-items: center; border-radius: 50%; background: var(--primary-light); color: var(--primary); font-size: 12px; font-weight: 700; letter-spacing: .02em; }
        .cell-date { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; color: var(--gray-dark); white-space: nowrap; }
        .cell-date svg { color: var(--gray); flex-shrink: 0; }
        .when { margin-left: 22px; font-size: 12px; color: var(--gray); }

        .chip { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
        .chip::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
        .chip.ok { background: var(--success-light); color: var(--success-dark); }
        .chip.draft { background: var(--gray-light); color: var(--gray); }

        .views { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--dark); }
        .views svg { color: var(--gray); }
        .top { padding: 2px 8px; border-radius: 999px; background: var(--warning-light); color: #9a6700; font-size: 11px; font-weight: 700; }

        .row-actions { display: flex; justify-content: flex-end; align-items: center; gap: 8px; }
        .act-btn { height: 34px; padding: 0 14px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid var(--gray-border); border-radius: 12px; background: var(--white); color: var(--gray-dark); font: inherit; font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer; white-space: nowrap; transition: background .2s, border-color .2s, color .2s; }
        .act-btn:hover:not(:disabled) { background: var(--primary-lightest); border-color: var(--primary); color: var(--primary); }
        .act-btn.wide { width: 100%; height: 40px; }
        .act-btn.danger { background: var(--danger-dark); border-color: var(--danger-dark); color: #fff; }
        .act-btn.danger:hover { background: var(--danger); border-color: var(--danger); color: #fff; }
        .icon-btn { width: 34px; height: 34px; flex-shrink: 0; display: grid; place-items: center; padding: 0; border: 1px solid var(--gray-border); border-radius: 12px; background: var(--white); color: var(--gray-dark); cursor: pointer; transition: background .2s, border-color .2s, color .2s; }
        .icon-btn:hover:not(:disabled) { background: var(--primary-lightest); border-color: var(--primary); color: var(--primary); }

        .table-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 22px; border-top: 1px solid var(--gray-border); font-size: 13px; color: var(--gray); }
        .pager { display: flex; align-items: center; gap: 8px; }
        .page-no { min-width: 44px; text-align: center; font-weight: 600; color: var(--gray-dark); }

        .empty-state { padding: 40px 24px; display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; color: var(--gray); font-size: 13px; }
        .empty-icon { width: 52px; height: 52px; margin-bottom: 6px; display: grid; place-items: center; border-radius: 50%; background: var(--primary-light); color: var(--primary); }
        .empty-state b { font-size: 15px; color: var(--dark); }
        .empty-state a, .empty-btn { margin-top: 10px; height: 40px; padding: 0 18px; display: inline-flex; align-items: center; border: 0; border-radius: 14px; background: var(--primary); color: #fff; font: inherit; font-size: 14px; font-weight: 600; text-decoration: none; cursor: pointer; box-shadow: 0 4px 12px rgba(103, 61, 230, .25); transition: background .2s; }
        .empty-state a:hover, .empty-btn:hover { background: var(--primary-dark); }

        /* skeleton */
        .sk { display: block; border-radius: 8px; background: linear-gradient(90deg, #eceef3 25%, #f6f7fa 37%, #eceef3 63%); background-size: 400% 100%; animation: dx-shimmer 1.3s ease infinite; }
        .sk-num { width: 52px; height: 28px; }
        .sk-avatar { width: 40px; height: 40px; border-radius: 50%; }
        .sk-line { width: 160px; height: 12px; }
        .sk-line.short { width: 96px; }
        .sk-btn { width: 70px; height: 34px; border-radius: 12px; }
        @keyframes dx-shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }

        /* ---------- row menu ---------- */
        .row-menu { position: fixed; z-index: 6000; width: 208px; padding: 6px; display: flex; flex-direction: column; border: 1px solid var(--gray-border); border-radius: 16px; background: var(--white); box-shadow: 0 16px 40px rgba(24, 28, 45, .18); }
        .row-menu button { height: 38px; padding: 0 12px; display: flex; align-items: center; gap: 10px; border: 0; border-radius: 10px; background: transparent; color: var(--gray-dark); font: inherit; font-size: 13px; font-weight: 600; text-align: left; cursor: pointer; }
        .row-menu button:hover:not(:disabled) { background: var(--gray-light); }
        .row-menu button:disabled { opacity: .45; cursor: not-allowed; }
        .row-menu button.danger { color: var(--danger-dark); }
        .row-menu button.danger:hover { background: var(--danger-light); }
        .menu-sep { height: 1px; margin: 4px 6px; background: var(--gray-border); }

        /* ---------- modals / drawer ---------- */
        .dx-overlay { position: fixed; inset: 0; z-index: 5000; display: grid; place-items: center; padding: 20px; background: rgba(23, 19, 38, .55); backdrop-filter: blur(3px); animation: dx-fade .15s ease; }
        .dx-overlay.drawer { place-items: stretch end; padding: 0; }
        .dx-modal { max-width: 100%; max-height: calc(100vh - 40px); display: flex; flex-direction: column; overflow: hidden; border-radius: 24px; background: var(--white); box-shadow: 0 24px 60px rgba(0, 0, 0, .3); animation: dx-pop .18s ease; }
        .dx-modal-head { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--gray-border); }
        .dx-modal-head b { display: block; font-size: 15px; font-weight: 700; }
        .dx-modal-head small { display: block; margin-top: 3px; font-size: 12px; color: var(--gray); }
        .dx-modal-head .red { color: var(--danger-dark); font-weight: 700; }
        .dx-modal-actions { display: flex; align-items: center; gap: 8px; }

        .dx-preview-body { height: min(76vh, 760px); background: #f5f6fa; }
        .dx-preview-body iframe { display: block; width: 100%; height: 100%; border: 0; background: #fff; }
        .dx-empty-mini { height: 100%; padding: 32px 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; text-align: center; font-size: 13px; color: var(--gray); }
        .dx-empty-mini svg { width: 48px; height: 48px; padding: 12px; border-radius: 50%; background: var(--primary-light); color: var(--primary); }
        .dx-empty-mini b { font-size: 14px; color: var(--dark); }

        .dx-qr { padding: 22px 20px 20px; display: flex; flex-direction: column; align-items: center; gap: 14px; }
        .dx-qr img { border: 1px solid var(--gray-border); border-radius: 16px; }
        .dx-qr code { max-width: 100%; padding: 8px 12px; border-radius: 10px; background: var(--gray-light); font-size: 12px; color: var(--gray-dark); overflow-wrap: anywhere; text-align: center; }

        .dx-confirm { padding: 18px 20px 20px; }
        .dx-confirm p { margin: 0 0 18px; font-size: 14px; line-height: 1.55; color: var(--gray-dark); }
        .dx-confirm-actions { display: flex; justify-content: flex-end; gap: 10px; }

        .dx-drawer { width: 420px; max-width: 100%; height: 100%; display: flex; flex-direction: column; background: var(--white); box-shadow: -20px 0 50px rgba(0, 0, 0, .25); animation: dx-slide .22s ease; }
        .dx-tabs { display: flex; gap: 6px; padding: 12px 20px 0; }
        .dx-tabs button { height: 34px; padding: 0 14px; display: inline-flex; align-items: center; gap: 8px; border: 0; border-radius: 999px; background: transparent; color: var(--gray); font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
        .dx-tabs button.on { background: var(--primary-light); color: var(--primary); }
        .dx-tabs em { min-width: 20px; height: 20px; padding: 0 6px; display: grid; place-items: center; border-radius: 999px; background: var(--white); font-size: 11px; font-style: normal; }
        .dx-req-list { flex: 1; overflow-y: auto; padding: 12px 12px 12px; }
        .dx-req { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 16px; }
        .dx-req:hover { background: var(--ghost-white); }
        .dx-req-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .dx-req-main b { font-size: 14px; }
        .dx-req-main span { font-size: 12.5px; color: var(--gray-dark); }
        .dx-req-main small { font-size: 11.5px; color: var(--gray); }
        .dx-drawer-foot { padding: 14px 20px; border-top: 1px solid var(--gray-border); display: flex; justify-content: flex-end; }

        .dx-toast { position: fixed; left: 50%; bottom: 28px; z-index: 7000; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 11px 18px; border-radius: 14px; background: var(--dark); color: #fff; font-size: 13px; font-weight: 600; box-shadow: 0 12px 30px rgba(0, 0, 0, .3); animation: dx-pop .2s ease; }
        .dx-toast svg { color: #5eead4; }

        @keyframes dx-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dx-pop { from { opacity: 0; transform: translate(var(--tx, 0), 8px) scale(.98); } to { opacity: 1; transform: translate(var(--tx, 0), 0) scale(1); } }
        .dx-toast { --tx: -50%; }
        @keyframes dx-slide { from { transform: translateX(40px); opacity: .6; } to { transform: none; opacity: 1; } }

        /* ---------- responsive ---------- */
        @media (max-width: 1100px) { .dashboard-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 700px) {
          .page-head { align-items: flex-start; flex-direction: column; }
          .head-actions { width: 100%; }
          .head-actions > * { flex: 1; justify-content: center; }
          .dashboard-grid { grid-template-columns: 1fr; }
          .recent-head { padding: 12px 16px; }
          .recent-tools { width: 100%; }
          .search { flex: 1; width: auto; min-width: 140px; }
          .inv-table thead th, .inv-table tbody td { padding-left: 16px; padding-right: 16px; }
          .table-foot { padding: 12px 16px; flex-wrap: wrap; }
          .dx-drawer { width: 100%; }
        }
      `}</style>
    </div>
  );
}
