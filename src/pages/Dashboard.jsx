import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import {
  FilePlus2, RefreshCw, CalendarDays, ArrowUpRight, Users, Inbox, Eye, Pencil, Link2, Check,
  Plus, Search, Smartphone, MoreHorizontal, Trash2, X, MessageCircle, QrCode, Globe, EyeOff,
  ChevronLeft, ChevronRight, ChevronDown, Phone, Mail, PhoneCall, Clock, Ban,
  Download, Copy, AlertTriangle, RotateCcw, Archive,
} from "../components/Icons";
import * as demo from "../lib/demoData";
import { compile } from "../lib/compileInvitation";

/* =========================================================
   DEMO DATA – replace with your real sources
   ========================================================= */
/* Guest activity per range. Replace with real analytics. */
const ACTIVITY = {
  "7": { label: "7 days", views: 312, rsvps: 18, shares: 41 },
  "30": { label: "30 days", views: 1284, rsvps: 86, shares: 203 },
  all: { label: "All time", views: 5420, rsvps: 342, shares: 812 },
};

const H = 3600000;
const DAY = 24 * H;
const ago = (h) => new Date(Date.now() - h * H).toISOString();
const isoDay = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/* Enquiries submitted through the public website's "get a website" form.
   status: "new" | "followup" | "called" | "cancelled"
   createdAt is an ISO timestamp; history is [{ status, at }]. */
const INITIAL_ENQUIRIES = [
  { id: "e1", name: "Ravi Kumar", phone: "+91 98765 43210", email: "ravi.kumar@example.com", message: "I run a wedding planning business and want a website with invitation templates and an enquiry form.", createdAt: ago(2), status: "new", note: "", followUpDate: "", history: [] },
  { id: "e2", name: "Lakshmi Devi", phone: "+91 91234 56780", email: "lakshmi.devi@example.com", message: "Need a Telugu and English website for my catering service. What is the price?", createdAt: ago(26), status: "new", note: "", followUpDate: "", history: [] },
  { id: "e3", name: "Sai Prasad", phone: "+91 99887 66554", email: "sai.prasad@example.com", message: "Interested in an online invitation website. Please call after 6 PM.", createdAt: ago(28), status: "followup", note: "Prefers evening calls.", followUpDate: isoDay(0), history: [{ status: "followup", at: ago(20) }] },
  { id: "e4", name: "Anitha Reddy", phone: "+91 90000 11223", email: "anitha.reddy@example.com", message: "Looking for a website for my photography studio with a gallery.", createdAt: ago(50), status: "called", note: "", followUpDate: "", history: [{ status: "called", at: ago(46) }] },
  { id: "e5", name: "Mahesh Babu", phone: "+91 98480 12345", email: "mahesh.babu@example.com", message: "Want to know the delivery time for a 5 page website.", createdAt: ago(74), status: "followup", note: "", followUpDate: isoDay(-1), history: [{ status: "followup", at: ago(70) }] },
  { id: "e6", name: "Priya Varma", phone: "+91 97012 34567", email: "priya.varma@example.com", message: "Need a website for my boutique with WhatsApp ordering.", createdAt: ago(122), status: "called", note: "", followUpDate: "", history: [{ status: "called", at: ago(118) }] },
];

/* =========================================================
   HELPERS
   ========================================================= */
const LS_PUB = "schedy_published";
const LS_DEL = "schedy_deleted_ids";
const LS_NOTE = "schedy_hide_demo_note";
const LS_AUTO = "schedy_auto_refresh";
const readJSON = (k, f) => { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };
/* Older versions stored deleted ids as an array; now it is { id: deletedAtMs }. */
const normDeleted = (v) =>
  Array.isArray(v) ? Object.fromEntries(v.map((id) => [id, Date.now()])) : v && typeof v === "object" ? v : {};

const PAGE_SIZE = 8;
const TRASH_DAYS = 30;

const fmt = (n) => Number(n || 0).toLocaleString("en-IN");
const fmtDate = (d) => {
  if (d === null || d === undefined || d === "") return "";
  const dt = typeof d === "number" ? new Date(d) : /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + "T00:00:00") : new Date(d);
  return isNaN(dt) ? String(d) : dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};
const fmtDateTime = (iso) => {
  const dt = new Date(iso);
  return isNaN(dt) ? "" : dt.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
};
const timeAgo = (iso, now) => {
  const t = typeof iso === "number" ? iso : Date.parse(iso);
  if (isNaN(t)) return "";
  const m = Math.floor((now - t) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 30) return `${d}d ago`;
  return fmtDate(t);
};

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
const isPast = (x) => { const d = dayDiff(x.event_date); return d !== null && d < 0; };

/* Table filters (set by the KPI cards and the "Needs attention" strip). */
const FILTER_LABEL = {
  published: "Published",
  draft: "Drafts",
  draftSoon: "Drafts with an event in the next 7 days",
  noViews: "Published with no views",
};

/* Enquiry helpers */
const ENQ_LABEL = { new: "New", followup: "Follow-up", called: "Called", cancelled: "Cancelled" };
const followDue = (e) => {
  if (e.status !== "followup" || !e.followUpDate) return null;
  const today = isoDay(0);
  return e.followUpDate < today ? "overdue" : e.followUpDate === today ? "today" : "upcoming";
};
const waLink = (e) => {
  let n = e.phone.replace(/\D/g, "");
  if (n.length === 10) n = "91" + n;
  const first = e.name.split(" ")[0];
  const text = `Hi ${first}, thanks for your enquiry about a website with Schedy. When is a good time to talk?`;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
};
const csvCell = (v) => {
  let s = String(v ?? "");
  if (/^[=+\-@]/.test(s) && !/^\+?[\d\s]+$/.test(s)) s = "'" + s; // avoid spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};
const exportCsv = (rows, notify) => {
  const head = ["Name", "Phone", "Email", "Status", "Received", "Follow-up date", "Message", "Note"];
  const lines = [head, ...rows.map((e) => [e.name, e.phone, e.email, ENQ_LABEL[e.status], e.createdAt, e.followUpDate || "", e.message, e.note || ""])]
    .map((r) => r.map(csvCell).join(","));
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `site-enquiries-${isoDay(0)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify(`Exported ${rows.length} enquiries`);
};
const copyText = async (text, okMsg, notify) => {
  try { await navigator.clipboard.writeText(text); }
  catch { window.prompt("Copy", text); }
  notify(okMsg);
};

/* Escape closes only the top-most layer (modal > panel). */
const escStack = [];
const useEscape = (active, fn) => {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!active) return;
    const token = {};
    escStack.push(token);
    const h = (e) => {
      if (e.key === "Escape" && escStack[escStack.length - 1] === token) ref.current();
    };
    window.addEventListener("keydown", h);
    return () => {
      window.removeEventListener("keydown", h);
      const i = escStack.indexOf(token);
      if (i > -1) escStack.splice(i, 1);
    };
  }, [active]);
};

/* Keeps Tab inside a dialog and restores focus when it closes. */
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
const useFocusTrap = (ref) => {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const prev = document.activeElement;
    const items = () => [...root.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null);
    (items()[0] || root).focus();
    const onKey = (e) => {
      if (e.key !== "Tab") return;
      const els = items();
      if (!els.length) { e.preventDefault(); return; }
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === root)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    root.addEventListener("keydown", onKey);
    return () => {
      root.removeEventListener("keydown", onKey);
      if (prev && prev !== document.body && prev.isConnected) prev.focus?.();
    };
  }, []);
};

/* =========================================================
   SMALL COMPONENTS
   ========================================================= */
function Modal({ title, subtitle, onClose, children, width = 440, headExtra }) {
  const ref = useRef(null);
  useEscape(true, onClose);
  useFocusTrap(ref);
  return createPortal(
    <div className="dx-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dx-modal" ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} style={{ width }}>
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
    </div>,
    document.body
  );
}

function PreviewPanel({ slot, row, published, onClose }) {
  const asideRef = useRef(null);
  useEscape(true, onClose);
  useEffect(() => { asideRef.current?.focus({ preventScroll: true }); }, []);
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

  if (!slot) return null;
  return createPortal(
    <aside className="dash-side-panel" aria-label="Invitation preview" ref={asideRef} tabIndex={-1}>
      <div className="dp-head">
        <div className="dp-title">
          <b><span className="live-dot" />{coupleName(row)}</b>
          <small>{published ? "Published" : "Draft"} · mobile preview</small>
        </div>
        <div className="dp-actions">
          <Link to={`/create?edit=${row.id}`} className="act-btn"><Pencil size={14} /> Edit</Link>
          <button type="button" className="icon-btn" aria-label="Close preview" onClick={onClose}><X size={16} /></button>
        </div>
      </div>
      <div className="dp-body">
        {html ? (
          /* No allow-same-origin: invitation code must not reach the app's storage or cookies. */
          <iframe key={row.id} title="Invitation preview" srcDoc={html} sandbox="allow-scripts allow-forms allow-popups" />
        ) : (
          <div className="dx-empty-mini"><Smartphone size={22} /><b>No preview available</b><span>This invitation has no template yet.</span></div>
        )}
      </div>
    </aside>,
    slot
  );
}

function QrModal({ row, onClose, onCopy }) {
  const link = getInviteLink(row);
  const api = (size) => `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(link)}`;
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileName = `${coupleName(row).replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}-qr.png`;

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
    <Modal title="QR code" subtitle={coupleName(row)} width={360} onClose={onClose}>
      <div className="dx-qr">
        <div className="dx-qr-ph">
          {failed ? (
            "Couldn't load the QR code. Check your connection."
          ) : (
            <>
              {!loaded && <i className="sk" />}
              <img
                src={api(240)} alt={`QR code for ${coupleName(row)}`} width="220" height="220"
                style={loaded ? undefined : { display: "none" }}
                onLoad={() => setLoaded(true)} onError={() => setFailed(true)}
              />
            </>
          )}
        </div>
        <code>{link}</code>
        <div className="dx-qr-actions">
          <button type="button" className="act-btn wide" onClick={() => onCopy(row)}><Link2 size={14} /> Copy link</button>
          <button type="button" className="act-btn wide solid" disabled={!loaded || busy} onClick={download}>
            <Download size={14} /> Download PNG
          </button>
        </div>
      </div>
    </Modal>
  );
}

function TrashModal({ items, onRestore, onClose }) {
  return (
    <Modal title="Trash" subtitle={`Deleted invitations are kept for ${TRASH_DAYS} days`} width={440} onClose={onClose}>
      <div className="dx-trash">
        {items.length === 0 ? (
          <div className="dx-empty-mini"><Trash2 size={22} /><b>Trash is empty</b><span>Deleted invitations show up here.</span></div>
        ) : items.map(({ row, at }) => (
          <div className="dx-trash-row" key={row.id}>
            <div className="row-avatar">{initials(row)}</div>
            <div className="dx-req-main">
              <b>{coupleName(row)}</b>
              <small>Deleted {fmtDate(at)} · removed for good {fmtDate(at + TRASH_DAYS * DAY)}</small>
            </div>
            <button type="button" className="act-btn" onClick={() => onRestore(row.id)}><RotateCcw size={14} /> Restore</button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function EnquiriesPanel({ slot, enquiries, now, tab, onTab, onClose, onSetStatus, onSaveNote, onSetFollowDate, notify }) {
  const [openId, setOpenId] = useState(null);
  const [search, setSearch] = useState("");
  const asideRef = useRef(null);
  const tabRefs = useRef([]);
  useEscape(true, onClose);
  useEffect(() => { asideRef.current?.focus({ preventScroll: true }); }, []);
  if (!slot) return null;

  const count = (s) => enquiries.filter((e) => e.status === s).length;
  const newCount = count("new");
  const tabs = [
    { key: "new", label: "New", count: newCount },
    { key: "followup", label: "Follow-up", count: count("followup") },
    { key: "cancelled", label: "Cancelled", count: count("cancelled") },
    { key: "all", label: "All", count: enquiries.length },
  ];
  const idx = Math.max(0, tabs.findIndex((t) => t.key === tab));
  const term = search.trim().toLowerCase();
  const list = enquiries.filter(
    (e) =>
      (tab === "all" || e.status === tab) &&
      (!term || [e.name, e.phone, e.email, e.message, e.note || ""].some((s) => s.toLowerCase().includes(term)))
  );
  const empty = term
    ? ["No matches", "Try a different name, phone or email."]
    : {
        new: ["All caught up", "No new enquiries."],
        followup: ["Nothing pending", "No enquiries need a follow-up."],
        cancelled: ["No cancelled enquiries", "Cancelled enquiries will appear here."],
        all: ["No enquiries yet", "Website enquiries will show up here."],
      }[tab];

  const onTabKey = (ev) => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(ev.key)) return;
    ev.preventDefault();
    let n = idx;
    if (ev.key === "ArrowRight") n = (idx + 1) % tabs.length;
    else if (ev.key === "ArrowLeft") n = (idx - 1 + tabs.length) % tabs.length;
    else if (ev.key === "Home") n = 0;
    else n = tabs.length - 1;
    onTab(tabs[n].key);
    tabRefs.current[n]?.focus();
  };

  return createPortal(
    <aside className="dash-side-panel" aria-label="Site enquiries" ref={asideRef} tabIndex={-1}>
      <div className="dp-head">
        <div className="dp-title">
          <b><span className="live-dot red" />Site enquiries</b>
          <small><span className="red">{newCount} new</span> of {enquiries.length} enquiries</small>
        </div>
        <div className="dp-actions">
          <button type="button" className="icon-btn" aria-label="Close enquiries" onClick={onClose}><X size={16} /></button>
        </div>
      </div>

      <div className="dx-seg" role="tablist" aria-label="Filter enquiries" style={{ "--i": idx, "--n": tabs.length }} onKeyDown={onTabKey}>
        <span className="dx-seg-thumb" aria-hidden="true" />
        {tabs.map((t, i) => (
          <button
            key={t.key} type="button" role="tab" id={`enq-tab-${t.key}`} aria-selected={tab === t.key} aria-controls="enq-tabpanel"
            tabIndex={tab === t.key ? 0 : -1} ref={(el) => (tabRefs.current[i] = el)}
            className={`t-${t.key}${tab === t.key ? " on" : ""}`} onClick={() => onTab(t.key)}
          >
            {t.label} <em>{t.count}</em>
          </button>
        ))}
      </div>

      <label className="dx-enq-search">
        <Search size={15} />
        <input type="search" placeholder="Search name, phone or email" aria-label="Search enquiries" value={search} onChange={(e) => setSearch(e.target.value)} />
      </label>

      <div className="dx-req-list" role="tabpanel" id="enq-tabpanel" aria-labelledby={`enq-tab-${tab}`}>
        {list.length === 0 && (
          <div className="dx-empty-mini"><Check size={22} /><b>{empty[0]}</b><span>{empty[1]}</span></div>
        )}
        {list.map((e) => {
          /* On the New tab, new enquiries are always fully shown. Everywhere else (All, search) they collapse like the rest. */
          const pinned = e.status === "new" && tab === "new";
          const open = pinned || openId === e.id;
          const avatar = e.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
          const due = followDue(e);
          const chips = (
            <>
              {(due === "overdue" || due === "today") && (
                <span className={`chip enq-due ${due}`}>{due === "overdue" ? "Overdue" : "Due today"}</span>
              )}
              <span className={`chip enq-${e.status}`}>{ENQ_LABEL[e.status]}</span>
            </>
          );
          return (
            <div className={`dx-enq ${e.status}${open ? " open" : ""}`} key={e.id}>
              {pinned ? (
                <div className="dx-enq-top static">
                  <div className="row-avatar">{avatar}</div>
                  <b className="dx-enq-name">{e.name}</b>
                  {chips}
                </div>
              ) : (
                <button
                  type="button" className="dx-enq-top" aria-expanded={open} aria-controls={`enq-body-${e.id}`}
                  onClick={() => setOpenId(open ? null : e.id)}
                >
                  <div className="row-avatar">{avatar}</div>
                  <b className="dx-enq-name">{e.name}</b>
                  {chips}
                  <ChevronDown size={18} className="dx-chev" />
                </button>
              )}

              <div className="dx-enq-collapse" id={`enq-body-${e.id}`}>
                <div>
                  <div className="dx-enq-body">
                    <small className="dx-enq-time" title={fmtDateTime(e.createdAt)}><Clock size={11} /> {timeAgo(e.createdAt, now)}</small>
                    <p className="dx-enq-msg">{e.message}</p>

                    <div className="dx-enq-meta">
                      <span className="dx-meta-row">
                        <span className="dx-meta-text"><Phone size={13} /> {e.phone}</span>
                        <button type="button" className="mini-btn" aria-label={`Copy ${e.name}'s phone number`} title="Copy phone" onClick={() => copyText(e.phone, "Phone copied", notify)}>
                          <Copy size={13} />
                        </button>
                      </span>
                      <a href={`mailto:${e.email}`}><Mail size={13} /> {e.email}</a>
                    </div>

                    <div className="dx-enq-actions">
                      <a className="act-btn" href={`tel:${e.phone.replace(/\s/g, "")}`}><Phone size={14} /> Call</a>
                      <a className="act-btn wa" href={waLink(e)} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} /> WhatsApp</a>
                    </div>

                    {e.status === "followup" && (
                      <label className="dx-field">
                        <span>Follow up on</span>
                        <input type="date" value={e.followUpDate || ""} onChange={(ev) => onSetFollowDate(e.id, ev.target.value)} />
                      </label>
                    )}

                    <label className="dx-field">
                      <span>Internal note</span>
                      <textarea
                        key={`${e.id}-${e.note || ""}`} rows={2} defaultValue={e.note || ""} placeholder="Only visible to you"
                        onBlur={(ev) => onSaveNote(e.id, ev.target.value)}
                      />
                    </label>

                    {e.history?.length > 0 && (
                      <ul className="dx-hist" aria-label="Activity">
                        {[...e.history].reverse().map((h, i) => (
                          <li key={i}><span className={`dot ${h.status}`} /> {ENQ_LABEL[h.status]} · {fmtDateTime(h.at)}</li>
                        ))}
                      </ul>
                    )}

                    <div className="dx-enq-actions">
                      {e.status !== "called" && (
                        <button type="button" className="act-btn solid" onClick={() => onSetStatus(e.id, "called")}>
                          <PhoneCall size={14} /> Mark called
                        </button>
                      )}
                      {e.status !== "followup" && (
                        <button type="button" className="act-btn" onClick={() => onSetStatus(e.id, "followup")}>
                          <Clock size={14} /> Need follow-up
                        </button>
                      )}
                      {e.status !== "cancelled" && (
                        <button type="button" className="act-btn cancel" onClick={() => onSetStatus(e.id, "cancelled")}>
                          <Ban size={14} /> Cancelled
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dx-drawer-foot">
        <button type="button" className="act-btn" onClick={() => exportCsv(enquiries, notify)}><Download size={14} /> Export CSV</button>
        <Link to="/analytics" className="head-link">Open analytics <ArrowUpRight size={14} /></Link>
      </div>
    </aside>,
    slot
  );
}

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
                    <button type="button" className="head-link as-btn" onClick={() => { setShowAll(true); setPage(1); }}>
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

      <style>{`
        :root { --dx-new-tint: #fffafb; --dx-surface: #f5f6fa; --dx-sk1: #eceef3; --dx-sk2: #f6f7fa; --dx-toast-bg: #1f2233; --dx-warn-text: #9a6700; --dx-info-text: #0b86a8; }

        .dashboard-page { max-width: 1400px; margin: auto; font-family: "DM Sans", Inter, sans-serif; color: var(--dark); }
        .dashboard-page * { box-sizing: border-box; }
        .dashboard-page button:disabled { cursor: not-allowed; opacity: .5; }
        .dashboard-page :focus-visible, .dash-side-panel :focus-visible, .dx-overlay :focus-visible, .row-menu :focus-visible, .dx-toast :focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
        .dash-side-panel:focus, .dx-modal:focus { outline: none; }

        /* ---------- header ---------- */
        .page-head { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 16px; }
        .dashboard-page h1 { margin: 0 0 3px; font-size: 26px; line-height: 1.15; font-weight: 700; color: var(--dark); }
        .page-head p { margin: 0; color: var(--gray); font-size: 14px; }
        .head-actions { display: flex; align-items: center; gap: 10px; }
        .updated { font-size: 12px; color: var(--gray); white-space: nowrap; }
        .refresh, .create-btn { height: 40px; padding: 0 16px; display: inline-flex; align-items: center; gap: 8px; border-radius: 14px; font-size: 14px; font-weight: 600; cursor: pointer; text-decoration: none; white-space: nowrap; transition: background .2s, border-color .2s, box-shadow .2s; }
        .refresh { border: 1px solid var(--gray-border); background: var(--white); color: var(--gray-dark); font-family: inherit; }
        .refresh:hover { background: var(--gray-light); border-color: var(--periwinkle); }
        .refresh svg { transition: transform .35s ease; }
        .refresh:active svg { transform: rotate(180deg); }
        .auto-btn { height: 28px; padding: 0 11px; border: 1px solid var(--gray-border); border-radius: 999px; background: var(--white); color: var(--gray); font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; transition: background .2s, color .2s, border-color .2s; }
        .auto-btn.on { background: var(--primary-light); border-color: var(--primary); color: var(--primary); }
        .create-btn { border: 0; background: var(--primary); color: #fff; box-shadow: 0 4px 12px rgba(103, 61, 230, .25); }
        .create-btn:hover { background: var(--primary-dark); }

        .demo-note { display: flex; align-items: center; gap: 10px; padding: 10px 12px 10px 14px; margin-bottom: 16px; border-radius: 14px; background: var(--primary-light); color: var(--primary-dark); font-size: 13px; font-weight: 500; line-height: 1.4; }
        .demo-text { flex: 1; }
        .demo-dot { width: 8px; height: 8px; flex-shrink: 0; border-radius: 50%; background: var(--primary); box-shadow: 0 0 0 4px rgba(103, 61, 230, .16); }
        .note-x { width: 26px; height: 26px; display: grid; place-items: center; border: 0; border-radius: 50%; background: transparent; color: var(--primary-dark); cursor: pointer; }
        .note-x:hover { background: rgba(103, 61, 230, .14); }

        /* ---------- KPI row ---------- */
        .dashboard-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
        .stat-card { position: relative; min-height: 96px; min-width: 0; display: flex; align-items: center; gap: 14px; padding: 16px 18px; background: var(--white); border: 1px solid var(--gray-border); border-radius: 20px; transition: border-color .2s, box-shadow .2s; }
        .stat-card:hover { border-color: var(--periwinkle); box-shadow: 0 6px 18px rgba(54, 52, 77, .06); }
        .stat-icon { width: 44px; height: 44px; flex-shrink: 0; display: grid; place-items: center; border-radius: 14px; background: var(--primary-light); color: var(--primary); }
        .stat-card.blue .stat-icon { background: var(--info-light); color: var(--dx-info-text); }
        .stat-card.green .stat-icon { background: var(--success-light); color: var(--success-dark); }
        .stat-body { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .stat-body > span { font-size: 13px; font-weight: 600; color: var(--gray); white-space: nowrap; }
        .stat-body strong { font-size: 28px; line-height: 1.1; font-weight: 700; letter-spacing: -.02em; color: var(--dark); }
        .stat-line { display: flex; align-items: center; gap: 8px; }
        .stat-sub { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--gray); white-space: nowrap; }
        .stat-sub i { font-style: normal; }
        .stat-sub button { padding: 0; border: 0; background: none; color: var(--gray); font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
        .stat-sub button:hover { color: var(--primary); text-decoration: underline; }

        .seg { position: absolute; top: 12px; right: 12px; display: flex; padding: 3px; gap: 2px; border-radius: 999px; background: var(--gray-light); }
        .seg button { height: 24px; padding: 0 9px; border: 0; border-radius: 999px; background: transparent; color: var(--gray); font: inherit; font-size: 11.5px; font-weight: 700; cursor: pointer; }
        .seg button.on { background: var(--white); color: var(--primary); box-shadow: 0 1px 3px rgba(54, 52, 77, .14); }

        .req-count .pending { color: var(--danger-dark); }
        .req-count .clear { color: var(--success-dark); }
        .req-count .total { margin-left: 1px; font-size: 20px; font-weight: 600; color: var(--gray); letter-spacing: 0; }

        .round-btn { position: absolute; top: 12px; right: 12px; width: 32px; height: 32px; display: grid; place-items: center; padding: 0; border-radius: 50%; border: 1px solid var(--gray-border); background: var(--white); color: var(--gray-dark); cursor: pointer; transition: background .2s, color .2s, border-color .2s; }
        .round-btn.on, .round-btn:hover { background: var(--primary); border-color: var(--primary); color: #fff; }

        /* ---------- needs attention ---------- */
        .attn { margin-top: 14px; padding: 12px 16px; display: flex; flex-wrap: wrap; align-items: center; gap: 10px 16px; border: 1px solid var(--gray-border); border-radius: 18px; background: var(--white); }
        .attn > b { font-size: 13px; font-weight: 700; color: var(--dark); }
        .attn-list { display: flex; flex-wrap: wrap; gap: 8px; }
        .attn-item { display: inline-flex; align-items: center; gap: 8px; min-height: 32px; padding: 4px 10px 4px 5px; border: 1px solid var(--gray-border); border-radius: 999px; background: var(--ghost-white); color: var(--gray-dark); font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: border-color .2s, background .2s; }
        .attn-item:hover { border-color: var(--primary); background: var(--primary-lightest); }
        .attn-n { min-width: 22px; height: 22px; padding: 0 6px; display: grid; place-items: center; border-radius: 999px; font-size: 12px; font-weight: 700; }
        .attn-item.danger .attn-n { background: var(--danger-light); color: var(--danger-dark); }
        .attn-item.warn .attn-n { background: var(--warning-light); color: var(--dx-warn-text); }
        .attn-item.info .attn-n { background: var(--info-light); color: var(--dx-info-text); }

        /* ---------- recent invitations ---------- */
        .recent-card { margin-top: 14px; overflow: hidden; background: var(--white); border: 1px solid var(--gray-border); border-radius: 22px; scroll-margin-top: 12px; }
        .recent-head { min-height: 64px; padding: 10px 22px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 16px; border-bottom: 1px solid var(--gray-border); }
        .recent-title { display: flex; align-items: center; gap: 10px; }
        .recent-title strong { font-size: 15px; font-weight: 700; }
        .recent-title em { min-width: 22px; height: 22px; padding: 0 7px; display: grid; place-items: center; border-radius: 999px; background: var(--primary-light); color: var(--primary); font-size: 12px; font-style: normal; font-weight: 700; }
        .recent-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
        .search { height: 36px; width: 210px; display: flex; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid var(--gray-border); border-radius: 12px; background: var(--white); color: var(--gray); transition: border-color .2s, box-shadow .2s; }
        .search:focus-within { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-lightest); }
        .search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; font: inherit; font-size: 13px; color: var(--dark); }
        .kbd { min-width: 20px; height: 20px; padding: 0 5px; display: grid; place-items: center; border: 1px solid var(--gray-border); border-radius: 6px; font: inherit; font-size: 11px; font-weight: 700; color: var(--gray); }
        .sort { height: 36px; padding: 0 34px 0 12px; border: 1px solid var(--gray-border); border-radius: 12px; font: inherit; font-size: 13px; font-weight: 600; color: var(--gray-dark); cursor: pointer; outline: 0; appearance: none; -webkit-appearance: none; background-color: var(--white); background-repeat: no-repeat; background-position: right 11px center; background-size: 15px; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236d7081' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); }
        .sort:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-lightest); }
        .head-link { display: inline-flex; align-items: center; gap: 5px; height: 34px; padding: 0 13px; border-radius: 999px; background: var(--primary-lightest); color: var(--primary); font-size: 13px; font-weight: 700; text-decoration: none; transition: background .2s; }
        .head-link:hover { background: var(--primary-light); }
        .head-link.as-btn { border: 0; font-family: inherit; cursor: pointer; }

        .filter-row { padding: 10px 22px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--gray-border); background: var(--ghost-white); }
        .filter-row small { font-size: 12px; color: var(--gray); }
        .filter-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 6px 4px 12px; border-radius: 999px; background: var(--primary-light); color: var(--primary); font-size: 12.5px; font-weight: 700; }
        .filter-pill button { width: 20px; height: 20px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 50%; background: transparent; color: inherit; cursor: pointer; }
        .filter-pill button:hover { background: var(--primary-lightest); }

        .table-scroll { overflow-x: auto; }
        .inv-table { width: 100%; min-width: 760px; border-collapse: collapse; }
        .inv-table thead th { padding: 12px 22px; text-align: left; background: var(--ghost-white); border-bottom: 1px solid var(--gray-border); font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--gray); white-space: nowrap; }
        .inv-table tbody td { padding: 12px 22px; border-bottom: 1px solid var(--gray-border); vertical-align: middle; }
        .inv-table tbody tr:last-child td { border-bottom: 0; }
        .inv-table tbody tr:hover { background: var(--ghost-white); }
        .inv-table tbody tr.active { background: var(--primary-lightest); }
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
        .chip.done { background: var(--info-light); color: var(--dx-info-text); }

        .views { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--dark); }
        .views svg { color: var(--gray); }
        .top { padding: 2px 8px; border-radius: 999px; background: var(--warning-light); color: var(--dx-warn-text); font-size: 11px; font-weight: 700; }

        .row-actions { display: flex; justify-content: flex-end; align-items: center; gap: 8px; }
        .act-btn { height: 34px; padding: 0 14px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid var(--gray-border); border-radius: 12px; background: var(--white); color: var(--gray-dark); font: inherit; font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer; white-space: nowrap; transition: background .2s, border-color .2s, color .2s; }
        .act-btn:hover:not(:disabled) { background: var(--primary-lightest); border-color: var(--primary); color: var(--primary); }
        .act-btn.wide { width: 100%; height: 40px; }
        .act-btn .cnt { min-width: 18px; height: 18px; padding: 0 5px; display: grid; place-items: center; border-radius: 999px; background: var(--primary-light); color: var(--primary); font-size: 11px; font-style: normal; font-weight: 700; }
        .icon-btn { width: 34px; height: 34px; flex-shrink: 0; display: grid; place-items: center; padding: 0; border: 1px solid var(--gray-border); border-radius: 12px; background: var(--white); color: var(--gray-dark); cursor: pointer; transition: background .2s, border-color .2s, color .2s; }
        .icon-btn.on { background: var(--primary-light); border-color: var(--primary); color: var(--primary); }
        .icon-btn:hover:not(:disabled) { background: var(--primary-lightest); border-color: var(--primary); color: var(--primary); }

        .table-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 22px; border-top: 1px solid var(--gray-border); font-size: 13px; color: var(--gray); }
        .pager { display: flex; align-items: center; gap: 8px; }
        .page-no { min-width: 44px; text-align: center; font-weight: 600; color: var(--gray-dark); }

        .empty-state { padding: 40px 24px; display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; color: var(--gray); font-size: 13px; }
        .empty-icon { width: 52px; height: 52px; margin-bottom: 6px; display: grid; place-items: center; border-radius: 50%; background: var(--primary-light); color: var(--primary); }
        .empty-icon.err { background: var(--danger-light); color: var(--danger-dark); }
        .empty-state b { font-size: 15px; color: var(--dark); }
        .empty-state a, .empty-btn { margin-top: 10px; height: 40px; padding: 0 18px; display: inline-flex; align-items: center; border: 0; border-radius: 14px; background: var(--primary); color: #fff; font: inherit; font-size: 14px; font-weight: 600; text-decoration: none; cursor: pointer; box-shadow: 0 4px 12px rgba(103, 61, 230, .25); transition: background .2s; }
        .empty-state a:hover, .empty-btn:hover { background: var(--primary-dark); }

        /* skeleton */
        .sk { display: block; border-radius: 8px; background: linear-gradient(90deg, var(--dx-sk1) 25%, var(--dx-sk2) 37%, var(--dx-sk1) 63%); background-size: 400% 100%; animation: dx-shimmer 1.3s ease infinite; }
        .sk-num { width: 52px; height: 28px; }
        .sk-avatar { width: 40px; height: 40px; border-radius: 50%; }
        .sk-line { width: 160px; height: 12px; }
        .sk-line.short { width: 96px; }
        .sk-btn { width: 70px; height: 34px; border-radius: 12px; }
        @keyframes dx-shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }

        /* sliding pill filter (New / Follow-up / Cancelled / All) */
        .dx-seg { position: relative; display: grid; grid-template-columns: repeat(var(--n, 3), 1fr); margin: 14px 12px 2px; padding: 4px; border-radius: 999px; background: var(--gray-light); }
        .dx-seg-thumb { position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc((100% - 8px) / var(--n, 3)); border-radius: 999px; background: var(--white); box-shadow: 0 1px 4px rgba(54, 52, 77, .18); transform: translateX(calc(var(--i, 0) * 100%)); transition: transform .28s cubic-bezier(.4, 0, .2, 1); }
        .dx-seg button { position: relative; z-index: 1; min-width: 0; height: 34px; padding: 0 2px; display: inline-flex; align-items: center; justify-content: center; gap: 4px; border: 0; border-radius: 999px; background: transparent; color: var(--gray); font: inherit; font-size: 12.5px; font-weight: 700; white-space: nowrap; cursor: pointer; transition: color .2s; }
        .dx-seg button.on { color: var(--primary); }
        .dx-seg button em { font-size: 11.5px; font-style: normal; font-weight: 600; color: var(--gray); }
        .dx-seg button.on em { color: var(--primary); }
        /* only the New count is a badge, since it is the one that needs action */
        .dx-seg button.t-new em { min-width: 18px; height: 18px; padding: 0 5px; display: grid; place-items: center; border-radius: 999px; background: var(--danger-light); color: var(--danger-dark); font-size: 10.5px; font-weight: 700; }

        .dx-enq-search { margin: 10px 12px 0; height: 36px; display: flex; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid var(--gray-border); border-radius: 12px; background: var(--white); color: var(--gray); transition: border-color .2s, box-shadow .2s; }
        .dx-enq-search:focus-within { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-lightest); }
        .dx-enq-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; font: inherit; font-size: 13px; color: var(--dark); }

        /* enquiry cards (collapsible; "new" ones are always open) */
        .dx-enq { margin: 0 0 10px; padding: 0; overflow: hidden; border: 1px solid var(--gray-border); border-radius: 18px; background: var(--white); transition: border-color .2s, box-shadow .2s; }
        .dx-enq.new { border-color: var(--danger-light); background: var(--dx-new-tint); }
        .dx-enq.cancelled { background: var(--ghost-white); }
        .dx-enq.open { border-color: var(--periwinkle); box-shadow: 0 6px 18px rgba(54, 52, 77, .06); }
        .dx-enq.new.open { border-color: var(--danger-light); box-shadow: none; }

        .dx-enq-top { width: 100%; padding: 12px 14px; display: flex; align-items: center; gap: 10px; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; transition: background .2s; }
        .dx-enq-top:hover { background: var(--ghost-white); }
        .dx-enq-top.static { cursor: default; }
        .dx-enq-top.static:hover { background: transparent; }
        .dx-enq-name { flex: 1; min-width: 0; font-size: 14px; font-weight: 700; color: var(--dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dx-chev { flex-shrink: 0; color: var(--gray); transition: transform .25s ease, color .2s; }
        .dx-enq.open .dx-chev { transform: rotate(180deg); color: var(--primary); }

        /* smooth expand / collapse */
        .dx-enq-collapse { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .25s ease; }
        .dx-enq.open .dx-enq-collapse { grid-template-rows: 1fr; }
        .dx-enq-collapse > div { min-height: 0; overflow: hidden; visibility: hidden; transition: visibility 0s .25s; }
        .dx-enq.open .dx-enq-collapse > div { visibility: visible; transition-delay: 0s; }

        .dx-enq-body { padding: 12px 14px 14px; display: flex; flex-direction: column; gap: 10px; border-top: 1px solid var(--gray-border); }
        .dx-enq-time { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--gray); }
        .dx-enq-msg { margin: 0; font-size: 13px; line-height: 1.5; color: var(--gray-dark); }
        .dx-enq-meta { display: flex; flex-direction: column; gap: 5px; }
        .dx-meta-row { display: flex; align-items: center; gap: 8px; }
        .dx-meta-text { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 600; color: var(--gray-dark); }
        .mini-btn { width: 24px; height: 24px; display: grid; place-items: center; padding: 0; border: 1px solid var(--gray-border); border-radius: 8px; background: var(--white); color: var(--gray); cursor: pointer; }
        .mini-btn:hover { border-color: var(--primary); color: var(--primary); }
        .dx-enq-meta a { display: inline-flex; align-items: center; gap: 7px; width: fit-content; max-width: 100%; font-size: 12.5px; font-weight: 600; color: var(--primary); text-decoration: none; overflow-wrap: anywhere; }
        .dx-enq-meta a:hover { text-decoration: underline; }
        .dx-enq-actions { display: flex; flex-wrap: wrap; gap: 8px; }
        .act-btn.solid { background: var(--primary); border-color: var(--primary); color: #fff; }
        .act-btn.solid:hover:not(:disabled) { background: var(--primary-dark); border-color: var(--primary-dark); color: #fff; }
        .act-btn.wa:hover:not(:disabled) { background: var(--success-light); border-color: var(--success-dark); color: var(--success-dark); }
        .act-btn.cancel:hover:not(:disabled) { background: var(--danger-light); border-color: var(--danger-dark); color: var(--danger-dark); }
        .chip.enq-new { background: var(--danger-light); color: var(--danger-dark); }
        .chip.enq-followup { background: var(--warning-light); color: var(--dx-warn-text); }
        .chip.enq-called { background: var(--success-light); color: var(--success-dark); }
        .chip.enq-cancelled { background: var(--gray-light); color: var(--gray); }
        .chip.enq-due.overdue { background: var(--danger-light); color: var(--danger-dark); }
        .chip.enq-due.today { background: var(--warning-light); color: var(--dx-warn-text); }

        .dx-field { display: flex; flex-direction: column; gap: 5px; }
        .dx-field > span { font-size: 11.5px; font-weight: 700; color: var(--gray); }
        .dx-field input, .dx-field textarea { width: 100%; padding: 8px 10px; border: 1px solid var(--gray-border); border-radius: 12px; background: var(--white); color: var(--dark); font: inherit; font-size: 13px; outline: 0; resize: vertical; transition: border-color .2s, box-shadow .2s; }
        .dx-field input { height: 36px; padding: 0 10px; }
        .dx-field input:focus, .dx-field textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-lightest); }
        .dx-hist { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--gray); }
        .dx-hist .dot { display: inline-block; width: 7px; height: 7px; margin-right: 4px; border-radius: 50%; background: var(--gray); }
        .dx-hist .dot.called { background: var(--success); }
        .dx-hist .dot.followup { background: #e0a100; }
        .dx-hist .dot.cancelled { background: var(--danger); }

        .dx-req-list { flex: 1; overflow-y: auto; padding: 12px 12px 12px; }
        .dx-req-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .dx-req-main b { font-size: 14px; }
        .dx-req-main small { font-size: 11.5px; color: var(--gray); }
        .dx-drawer-foot { flex: 0 0 auto; padding: 14px 20px; border-top: 1px solid var(--gray-border); display: flex; align-items: center; justify-content: space-between; gap: 10px; }

        /* portaled to <body>, so they need their own base styles */
        .dx-overlay, .dx-overlay *, .row-menu, .row-menu *, .dx-toast, .dx-toast * { box-sizing: border-box; }
        .dx-overlay, .row-menu, .dx-toast { font-family: "DM Sans", Inter, sans-serif; }
        .dx-overlay { color: var(--dark); }

        /* ---------- row menu ---------- */
        .row-menu { position: fixed; z-index: 9500; width: 220px; padding: 6px; display: flex; flex-direction: column; border: 1px solid var(--gray-border); border-radius: 16px; background: var(--white); box-shadow: 0 16px 40px rgba(24, 28, 45, .18); }
        .row-menu button { height: 38px; padding: 0 12px; display: flex; align-items: center; gap: 10px; border: 0; border-radius: 10px; background: transparent; color: var(--gray-dark); font: inherit; font-size: 13px; font-weight: 600; text-align: left; cursor: pointer; }
        .row-menu button:hover:not(:disabled), .row-menu button:focus-visible { background: var(--gray-light); }
        .row-menu button:disabled { opacity: .45; cursor: not-allowed; }
        .row-menu button.danger { color: var(--danger-dark); }
        .row-menu button.danger:hover { background: var(--danger-light); }
        .menu-sep { height: 1px; margin: 4px 6px; background: var(--gray-border); }

        /* ---------- modals / drawer ---------- */
        .dx-overlay { position: fixed; inset: 0; z-index: 9000; display: grid; place-items: center; padding: 20px; background: rgba(23, 19, 38, .55); backdrop-filter: blur(3px); animation: dx-fade .15s ease; }
        .dx-modal { max-width: 100%; max-height: calc(100vh - 40px); display: flex; flex-direction: column; overflow: hidden; border-radius: 24px; background: var(--white); box-shadow: 0 24px 60px rgba(0, 0, 0, .3); animation: dx-pop .18s ease; }
        .dx-modal-head { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--gray-border); }
        .dx-modal-head b { display: block; font-size: 15px; font-weight: 700; }
        .dx-modal-head small { display: block; margin-top: 3px; font-size: 12px; color: var(--gray); }
        .dx-modal-actions { display: flex; align-items: center; gap: 8px; }

        .dash-side-panel { position: relative; box-sizing: border-box; height: 100%; width: 390px; min-width: 390px; max-width: 390px; flex: 0 0 390px; display: flex; flex-direction: column; overflow: hidden; border-radius: 26px; background: var(--white); animation: dx-slide .22s ease; }
        .dash-side-panel * { box-sizing: border-box; }
        .dp-head { height: 64px; flex: 0 0 64px; padding: 0 14px 0 20px; display: flex; align-items: center; justify-content: space-between; gap: 10px; border-bottom: 1px solid var(--gray-border); }
        .dp-title { min-width: 0; }
        .dp-title b { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dp-title .red { color: var(--danger-dark); font-weight: 700; }
        .live-dot.red { background: var(--danger); box-shadow: 0 0 0 3px var(--danger-light); }
        .dp-title small { display: block; margin: 3px 0 0 16px; font-size: 12px; color: var(--gray); }
        .live-dot { width: 8px; height: 8px; flex-shrink: 0; border-radius: 50%; background: var(--success); box-shadow: 0 0 0 3px var(--success-light); }
        .dp-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .dp-body { flex: 1; min-height: 0; background: var(--dx-surface); }
        .dp-body iframe { display: block; width: 100%; height: 100%; border: 0; background: #fff; }
        .dx-empty-mini { height: 100%; padding: 32px 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; text-align: center; font-size: 13px; color: var(--gray); }
        .dx-empty-mini svg { width: 48px; height: 48px; padding: 12px; border-radius: 50%; background: var(--primary-light); color: var(--primary); }
        .dx-empty-mini b { font-size: 14px; color: var(--dark); }

        .dx-qr { padding: 22px 20px 20px; display: flex; flex-direction: column; align-items: center; gap: 14px; }
        .dx-qr img { border: 1px solid var(--gray-border); border-radius: 16px; background: #fff; }
        .dx-qr-ph { width: 220px; height: 220px; display: grid; place-items: center; text-align: center; font-size: 12px; color: var(--gray); }
        .dx-qr-ph img { display: block; }
        .dx-qr-ph .sk { width: 100%; height: 100%; border-radius: 16px; }
        .dx-qr code { max-width: 100%; padding: 8px 12px; border-radius: 10px; background: var(--gray-light); font-size: 12px; color: var(--gray-dark); overflow-wrap: anywhere; text-align: center; }
        .dx-qr-actions { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

        .dx-trash { padding: 8px 12px 14px; overflow-y: auto; }
        .dx-trash-row { display: flex; align-items: center; gap: 12px; padding: 10px 8px; border-radius: 14px; }
        .dx-trash-row:hover { background: var(--ghost-white); }

        .dx-toast { position: fixed; left: 50%; bottom: 28px; z-index: 9800; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 11px 18px; border-radius: 14px; background: var(--dx-toast-bg); color: #fff; font-size: 13px; font-weight: 600; box-shadow: 0 12px 30px rgba(0, 0, 0, .3); animation: dx-pop .2s ease; }
        .dx-toast svg { color: #5eead4; }
        .dx-toast button { margin-left: 6px; padding: 3px 10px; border: 1px solid rgba(255, 255, 255, .35); border-radius: 8px; background: transparent; color: #fff; font: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; }
        .dx-toast button:hover { background: rgba(255, 255, 255, .14); }

        @keyframes dx-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dx-pop { from { opacity: 0; transform: translate(var(--tx, 0), 8px) scale(.98); } to { opacity: 1; transform: translate(var(--tx, 0), 0) scale(1); } }
        .dx-toast { --tx: -50%; }
        @keyframes dx-slide { from { transform: translateX(40px); opacity: .6; } to { transform: none; opacity: 1; } }

        @media (prefers-reduced-motion: reduce) {
          .dx-enq-collapse, .dx-chev, .dx-seg-thumb, .dash-side-panel, .dx-modal, .dx-overlay, .dx-toast, .sk { transition: none; animation: none; }
        }

        /* ---------- responsive ---------- */
        /* narrow = the page itself is narrow (e.g. preview panel open), not just the screen */
        .narrow .dashboard-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .narrow .stat-card.blue { grid-column: 1 / -1; order: -1; }
        @media (max-width: 900px) {
          .dash-side-panel { position: fixed; inset: 12px; z-index: 4000; width: auto; min-width: 0; max-width: none; height: auto; flex: none; border-radius: 20px; box-shadow: 0 12px 34px rgba(24, 28, 45, .3); }
        }
        @media (max-width: 700px) {
          .page-head { align-items: flex-start; flex-direction: column; }
          .head-actions { width: 100%; flex-wrap: wrap; }
          .head-actions > .refresh, .head-actions > .create-btn { flex: 1; justify-content: center; }
          .updated { display: none; }
          .dashboard-grid { grid-template-columns: 1fr; }
          .recent-head { padding: 12px 16px; }
          .recent-tools { width: 100%; }
          .search { flex: 1; width: auto; min-width: 140px; }
          .filter-row { padding: 10px 16px; }
          .inv-table thead th, .inv-table tbody td { padding-left: 16px; padding-right: 16px; }
          .table-foot { padding: 12px 16px; flex-wrap: wrap; }
        }
      `}</style>
    </div>
  );
}
