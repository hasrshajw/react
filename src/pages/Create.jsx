import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useBlocker, useSearchParams } from "react-router-dom";
import {
  AlertCircle, CalendarPlus, Check, CheckCircle2, Copy, Eye, Heart, LayoutDashboard, LayoutTemplate,
  Loader2, MapPin, MessageCircle, Plus, Save, Trash2, User, Users, X,
} from "../components/Icons";
import morphdom from "morphdom";
import { demoCategories, demoTemplates, getDemoInvitations, saveDemoInvitation } from "../lib/demoData";
import { compile } from "../lib/compileInvitation";

/* =========================================================
   CONFIG
   ========================================================= */
/* Where "Go to dashboard" leads. Change if your dashboard route is different. */
const DASHBOARD_PATH = "/";
const LS_DRAFT = "schedy_create_draft_";

/* =========================================================
   DATA + HELPERS
   ========================================================= */
const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const newEvent = () => ({ id: uid(), name: "", nameTe: "", date: "", time: "", venue: "", venueTe: "", maps: "" });
const newContact = () => ({ id: uid(), nameEn: "", nameTe: "", phone: "" });

const initial = {
  customId: "", templateId: "",
  surnameEn: "", surnameTe: "", weddingDate: "", muhurthamTime: "",
  groomEn: "", groomTe: "", groomFatherEn: "", groomFatherTe: "", groomFatherPhone: "", groomMotherEn: "", groomMotherTe: "", groomMotherPhone: "",
  brideEn: "", brideTe: "", brideFatherEn: "", brideFatherTe: "", brideFatherPhone: "", brideMotherEn: "", brideMotherTe: "", brideMotherPhone: "",
  receptionEnabled: false, receptionDate: "", receptionTime: "",
  venueEn: "", venueTe: "", venueAddress: "", venueMaps: "",
  events: [], groomContacts: [], brideContacts: [],
};

const EN_TO_TE = { surnameEn: "surnameTe", groomEn: "groomTe", groomFatherEn: "groomFatherTe", groomMotherEn: "groomMotherTe", brideEn: "brideTe", brideFatherEn: "brideFatherTe", brideMotherEn: "brideMotherTe", venueEn: "venueTe" };

const TARGETS = {
  surnameEn: "surname-te", surnameTe: "surname-te", groomEn: "groom-te", groomTe: "groom-te",
  groomFatherEn: "groom-father-te", groomFatherTe: "groom-father-te", groomMotherEn: "groom-mother-te", groomMotherTe: "groom-mother-te",
  brideEn: "bride-te", brideTe: "bride-te", brideFatherEn: "bride-father-te", brideFatherTe: "bride-father-te",
  brideMotherEn: "bride-mother-te", brideMotherTe: "bride-mother-te",
  weddingDate: "event-wedding-date", muhurthamTime: "event-wedding-time", receptionDate: "event-reception-date", receptionTime: "event-reception-time",
  venueEn: "venue-te", venueTe: "venue-te", venueAddress: "venue-te", venueMaps: "venue-te",
  groomContacts: "groom-extra-1-phone", brideContacts: "bride-extra-1-phone",
};

function jsonpTransliterate() { return Promise.resolve(""); }

const has = (v) => String(v ?? "").trim() !== "";
const okPhone = (v) => {
  if (!/^[+\d\s()-]+$/.test(v)) return false;
  const n = v.replace(/\D/g, "").length;
  return n >= 10 && n <= 13;
};
const okUrl = (v) => {
  try { const u = new URL(String(v).trim()); return u.protocol === "http:" || u.protocol === "https:"; }
  catch { return false; }
};
const PHONE_MSG = "Enter a valid phone number (10 digits, optional +91)";
const URL_MSG = "Enter a full link starting with https://";

const readJSON = (k, f) => { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };
const removeKey = (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } };

const sampleDate = () => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10); };
export const SAMPLE = { ...initial, groomEn: "Groom", brideEn: "Bride", weddingDate: sampleDate() };

const SECTIONS = [
  { id: "template", label: "Template", icon: LayoutTemplate, hint: "required" },
  { id: "family", label: "Family", icon: Users, hint: "required" },
  { id: "groom", label: "Groom", icon: User, hint: "required" },
  { id: "bride", label: "Bride", icon: Heart, hint: "required" },
  { id: "venue", label: "Venue", icon: MapPin, hint: "recommended" },
  { id: "events", label: "Events", icon: CalendarPlus, hint: "optional" },
];
/* Optional "Events" does not count towards progress. */
const PROGRESS_IDS = ["template", "family", "groom", "bride", "venue"];

const copyText = async (text) => {
  try { await navigator.clipboard.writeText(text); }
  catch { window.prompt("Copy", text); }
};

/* =========================================================
   SMALL COMPONENTS
   ========================================================= */
function Input({ label, name, type = "text", value, onChange, onFocus, onBlur, error, required, help, lang, inputMode }) {
  const id = `f-${name}`;
  return (
    <label className={`f${lang === "te" ? " te" : ""}${error ? " has-err" : ""}`} htmlFor={id}>
      <span>{label}{required && <b className="req" aria-hidden="true"> *</b>}</span>
      <input
        id={id} type={type} lang={lang} inputMode={inputMode} autoComplete="off" value={value ?? ""}
        aria-invalid={!!error} aria-describedby={error ? `${id}-err` : help ? `${id}-help` : undefined}
        onFocus={onFocus} onBlur={onBlur} onChange={(e) => onChange(e.target.value)}
      />
      {error ? <em className="err" id={`${id}-err`}>{error}</em> : help ? <em className="help" id={`${id}-help`}>{help}</em> : null}
    </label>
  );
}

function Bilingual({ enLabel, teLabel, enField, teField, data, set, fp, required }) {
  return (
    <div className="grid two">
      <Input label={enLabel} required={required} {...fp(enField)} value={data[enField]} onChange={(v) => set(enField, v)} />
      <Input label={teLabel} lang="te" {...fp(teField)} value={data[teField]} onChange={(v) => set(teField, v)} />
    </div>
  );
}

function Contacts({ field, items, add, patch, remove, focus, vis, touch }) {
  return (
    <>
      {items.map((x) => {
        const key = `contact-${x.id}-phone`;
        const err = vis(key);
        return (
          <div className="repeat" key={x.id}>
            <button type="button" className="del" aria-label="Remove contact" onClick={() => remove(field, x.id)}><Trash2 size={15} /></button>
            <div className="grid three">
              <input aria-label="Contact name in English" placeholder="Name EN" value={x.nameEn} onFocus={() => focus(field)} onChange={(e) => patch(field, x.id, { nameEn: e.target.value })} />
              <input aria-label="Contact name in Telugu" lang="te" placeholder="Name తెలుగు" value={x.nameTe} onFocus={() => focus(field)} onChange={(e) => patch(field, x.id, { nameTe: e.target.value })} />
              <input
                id={`f-${key}`} aria-label="Contact phone" aria-invalid={!!err} className={err ? "bad" : ""} inputMode="tel" placeholder="Phone" value={x.phone}
                onFocus={() => focus(field)} onBlur={() => touch(key)} onChange={(e) => patch(field, x.id, { phone: e.target.value })}
              />
            </div>
            {err && <em className="err">{err}</em>}
          </div>
        );
      })}
      {items.length < 1 && <button type="button" className="outline" onClick={() => add(field, newContact)}><Plus size={15} /> Add contact</button>}
    </>
  );
}

function Section({ id, icon: Icon, title, tag, children }) {
  return (
    <section id={`sec-${id}`}>
      <div className="sec-head">
        <h2><i><Icon size={17} /></i>{title}</h2>
        {tag && <span className={`sec-tag ${tag.tone}`}>{tag.text}</span>}
      </div>
      {children}
    </section>
  );
}

function TemplateThumb({ t }) {
  const img = t.thumbnail || t.thumbnail_url || t.image || t.preview_image;
  const src = t.html_code || t.html || "";
  const doc = useMemo(() => {
    if (img || !src) return "";
    try { return compile(src, SAMPLE); } catch { return ""; }
  }, [img, src]);
  if (img) return <img src={img} alt="" loading="lazy" />;
  /* No scripts in thumbnails: they are static previews only. */
  if (doc) return <iframe title="" srcDoc={doc} sandbox="" loading="lazy" tabIndex={-1} aria-hidden="true" />;
  return <span className="tp-none"><LayoutTemplate size={22} /></span>;
}

function TemplatePicker({ categories, categoryId, onCategory, templates, value, onSelect, error }) {
  const selected = templates.find((t) => String(t.id) === String(value));
  const visible = categoryId === "ALL" ? templates : templates.filter((t) => String(t.category_id) === String(categoryId));
  const nameOf = (t) => t.name || t.title || `Template ${t.id}`;
  const cats = [{ id: "ALL", name: "All" }, ...categories];
  return (
    <div className={`tp${error ? " has-err" : ""}`} id="f-templateId" tabIndex={-1}>
      <div className="tp-cats" role="group" aria-label="Template category">
        {cats.map((c) => (
          <button key={c.id} type="button" aria-pressed={String(categoryId) === String(c.id)} className={`tp-cat${String(categoryId) === String(c.id) ? " on" : ""}`} onClick={() => onCategory(c.id)}>
            {c.name}
          </button>
        ))}
      </div>
      {selected ? (
        <div className="tp-current"><CheckCircle2 size={16} /> Using <b>{nameOf(selected)}</b></div>
      ) : (
        <div className="tp-hint">Pick a design to see your invitation take shape in the live preview.</div>
      )}
      <div className="tp-grid" role="radiogroup" aria-label="Templates">
        {visible.map((t) => {
          const on = String(t.id) === String(value);
          return (
            <button key={t.id} type="button" role="radio" aria-checked={on} className={`tp-card${on ? " on" : ""}`} onClick={() => onSelect(String(t.id))}>
              <span className="tp-thumb">
                <TemplateThumb t={t} />
                {on && <span className="tp-check"><Check size={14} /></span>}
              </span>
              <span className="tp-name">{nameOf(t)}</span>
            </button>
          );
        })}
        {visible.length === 0 && <div className="hint">No templates in this category yet.</div>}
      </div>
      {error && <em className="err">{error}</em>}
    </div>
  );
}

function ShareModal({ name, link, onCopy, onWhatsApp, onClose, onAnother }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.querySelector("button, a")?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      const els = [...ref.current.querySelectorAll("a[href], button:not([disabled])")];
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); if (prev?.isConnected) prev.focus?.(); };
  }, []);
  return createPortal(
    <div className="cx-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cx-modal" ref={ref} role="dialog" aria-modal="true" aria-label="Invitation saved">
        <div className="cx-ok"><CheckCircle2 size={30} /></div>
        <h3>Invitation saved</h3>
        <p><b>{name}</b> is ready. Share it with your guests or keep editing.</p>
        <div className="cx-link">
          <code>{link}</code>
          <button type="button" className="cx-copy" aria-label="Copy link" onClick={onCopy}><Copy size={15} /></button>
        </div>
        <div className="cx-grid">
          <button type="button" className="secondary" onClick={onCopy}><Copy size={15} /> Copy link</button>
          <button type="button" className="secondary wa" onClick={onWhatsApp}><MessageCircle size={15} /> WhatsApp</button>
        </div>
        <div className="cx-foot">
          <Link to={DASHBOARD_PATH} className="primary"><LayoutDashboard size={16} /> Go to dashboard</Link>
          <div className="cx-grid">
            <button type="button" className="secondary" onClick={onClose}>Keep editing</button>
            <button type="button" className="secondary" onClick={onAnother}><Plus size={15} /> Create another</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* Shown when the user tries to open another page with unsaved changes.
   Save    -> saves, then continues to the page they chose.
   Cancel  -> continues without saving; the local draft is kept, so the
              "Restore them?" card shows up when they come back.
   X / Esc -> stays on this page and keeps editing. */
function LeaveModal({ onSave, onCancel, onStay }) {
  const ref = useRef(null);
  const stayRef = useRef(onStay);
  stayRef.current = onStay;
  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.querySelector("[data-autofocus]")?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { stayRef.current(); return; }
      if (e.key !== "Tab") return;
      const els = [...ref.current.querySelectorAll("button:not([disabled])")];
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); if (prev?.isConnected) prev.focus?.(); };
  }, []);
  return createPortal(
    <div className="cx-overlay" onMouseDown={(e) => e.target === e.currentTarget && onStay()}>
      <div className="cx-modal lv" ref={ref} role="alertdialog" aria-modal="true" aria-labelledby="lv-title" aria-describedby="lv-desc">
        <button type="button" className="cx-close" aria-label="Keep editing" onClick={onStay}><X size={17} /></button>
        <div className="cx-ok warn"><AlertCircle size={30} /></div>
        <h3 id="lv-title">Save your changes?</h3>
        <p id="lv-desc">You have unsaved changes on this invitation. Save them before you leave, or cancel and we'll keep a draft you can restore when you come back.</p>
        <div className="cx-grid lv-actions">
          <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
          <button type="button" className="primary" data-autofocus onClick={onSave}><Save size={16} /> Save</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* =========================================================
   PAGE
   ========================================================= */
export default function Create({ onPanelChange }) {
  const categories = demoCategories;
  const templates = demoTemplates;

  const [data, setData] = useState(initial);
  const [snap, setSnap] = useState(() => JSON.stringify(initial));
  const [editId, setEditId] = useState(() => new URLSearchParams(window.location.search).get("edit"));
  const [categoryId, setCategoryId] = useState("ALL");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState(null);
  const [slot, setSlot] = useState(null);
  const [toast, setToast] = useState(null);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [active, setActive] = useState("template");
  const [ready, setReady] = useState(false);
  const [draftOffer, setDraftOffer] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [share, setShare] = useState(null);
  const [navCta, setNavCta] = useState(false);
  const [stuck, setStuck] = useState(false);
  const pillRef = useRef(null);
  const lockRef = useRef(0);
  const sentinelRef = useRef(null);

  const frameRef = useRef(null);
  const navRef = useRef(null);
  const headBtnRef = useRef(null);
  const translitTimers = useRef(new Map());
  const translitSeq = useRef(0);
  const toastTimer = useRef();
  const saveRef = useRef();

  const dirty = useMemo(() => JSON.stringify(data) !== snap, [data, snap]);
  const draftKey = LS_DRAFT + (editId || "new");

  /* ---------- ask before leaving with unsaved changes ---------- */
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;
  const blocker = useBlocker(
    useCallback(({ currentLocation, nextLocation }) => dirtyRef.current && currentLocation.pathname !== nextLocation.pathname, [])
  );

  /* ---------- toast (same look as the dashboard) ---------- */
  const notify = (msg, tone = "ok") => {
    clearTimeout(toastTimer.current);
    setToast({ msg, tone });
    toastTimer.current = setTimeout(() => setToast(null), tone === "error" ? 3500 : 2200);
  };
  useEffect(() => () => {
    clearTimeout(toastTimer.current);
    translitTimers.current.forEach((t) => clearTimeout(t));
  }, []);

  /* ---------- load (edit mode) + look for an unsaved draft ---------- */
  useEffect(() => {
    let base = initial;
    if (editId) {
      const row = getDemoInvitations().find((x) => x.id === editId);
      if (!row) {
        setMessage("Invitation not found. You can create a new one.");
      } else {
        const details = row.details || {};
        base = {
          ...initial, ...details,
          templateId: row.template_id || details.templateId || "",
          brideEn: row.bride_name || details.brideEn || "",
          groomEn: row.groom_name || details.groomEn || "",
          weddingDate: row.event_date || details.weddingDate || "",
        };
      }
    }
    setData(base);
    setSnap(JSON.stringify(base));
    const draft = readJSON(LS_DRAFT + (editId || "new"), null);
    if (draft?.data && JSON.stringify({ ...initial, ...draft.data }) !== JSON.stringify(base)) setDraftOffer(draft);
    setReady(true);
  }, []);

  /* ---------- autosave a local draft while there are unsaved changes ---------- */
  useEffect(() => {
    if (!ready || draftOffer) return;
    if (!dirty) { removeKey(draftKey); return; }
    const t = setTimeout(() => writeJSON(draftKey, { data, at: Date.now() }), 800);
    return () => clearTimeout(t);
  }, [data, dirty, ready, draftOffer, draftKey]);

  /* ---------- warn before closing the tab with unsaved changes ---------- */
  useEffect(() => {
    if (!dirty) return;
    const h = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  /* ---------- Ctrl/Cmd + S ---------- */
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current?.();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  useEffect(() => { setSlot(document.getElementById("preview-slot")); }, []);
  /* The live preview is a permanent right-side panel on desktop (>900px): tell App so the sidebar becomes a rail + overlay menu. */
  useEffect(() => {
    if (!slot) return;
    const report = () => onPanelChange?.(window.innerWidth > 900);
    report();
    window.addEventListener("resize", report);
    return () => { window.removeEventListener("resize", report); onPanelChange?.(false); };
  }, [slot]);

  /* ---------- template + preview ---------- */
  const selected = useMemo(() => templates.find((t) => String(t.id) === String(data.templateId)), [templates, data.templateId]);
  const source = selected?.html_code || selected?.html || "";
  const compiled = useMemo(() => compile(source, data), [source, data]);

  useEffect(() => {
    const iframe = frameRef.current;
    if (!iframe || !compiled || !iframe.contentDocument?.body) return;
    const parsed = new DOMParser().parseFromString(compiled, "text/html");
    morphdom(iframe.contentDocument.body, parsed.body, { childrenOnly: true, getNodeKey: (node) => node.id || node.dataset?.previewKey || null });
  }, [compiled, slot]);

  useEffect(() => {
    if (!focusRequest || !selected) return;
    let cancelled = false, attempts = 0;
    const targetName = TARGETS[focusRequest.field] || focusRequest.field;
    const run = () => {
      if (cancelled) return;
      const iframe = frameRef.current, doc = iframe?.contentDocument, win = iframe?.contentWindow;
      if (!doc?.body || !win) { if (attempts++ < 40) setTimeout(run, 50); return; }
      const escaped = CSS.escape(targetName);
      const target = doc.querySelector(`[data-scroll-target="${escaped}"]`) || doc.querySelector(`[data-schedy-field="${escaped}"]`) || doc.getElementById(targetName);
      if (!target) { if (attempts++ < 40) setTimeout(run, 50); return; }
      const rect = target.getBoundingClientRect();
      const current = win.scrollY || doc.documentElement.scrollTop || doc.body.scrollTop || 0;
      const top = Math.max(0, current + rect.top - Math.max(60, (win.innerHeight || 700) * 0.34));
      win.scrollTo({ top, behavior: "smooth" });
      target.classList.add("schedy-focus");
      window.setTimeout(() => target.classList.remove("schedy-focus"), 1200);
    };
    const timer = setTimeout(run, 100);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [focusRequest, selected]);

  /* ---------- form helpers ---------- */
  const scheduleTransliteration = (sourceField, targetField, value, apply) => {
    const key = `${sourceField}:${targetField}`;
    const old = translitTimers.current.get(key);
    if (old) clearTimeout(old);
    if (!String(value).trim()) { apply(""); return; }
    const timer = setTimeout(async () => {
      const request = ++translitSeq.current;
      try {
        const result = await jsonpTransliterate(value);
        if (request === translitSeq.current && result) apply(result);
      } catch { /* ignore */ }
    }, 450);
    translitTimers.current.set(key, timer);
  };
  /* /create?template=ID (from Manage Templates) preselects that template */
  const [urlParams] = useSearchParams();
  useEffect(() => {
    const t = urlParams.get("template");
    if (t) setData((prev) => ({ ...prev, templateId: String(t) }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (key, value) => {
    setData((prev) => ({ ...prev, [key]: value }));
    const target = EN_TO_TE[key];
    if (target) scheduleTransliteration(key, target, value, (result) => setData((prev) => ({ ...prev, [target]: result })));
  };
  /* Scrolls the live preview to the field being edited (desktop panel). */
  const focus = (field) => setFocusRequest({ field, id: uid() });
  const add = (field, maker) => setData((prev) => ({ ...prev, [field]: [...prev[field], maker()] }));
  const patch = (field, id, patchValue) => {
    setData((prev) => ({ ...prev, [field]: prev[field].map((x) => (x.id === id ? { ...x, ...patchValue } : x)) }));
    if (field === "events") {
      if (patchValue.name !== undefined)
        scheduleTransliteration(`event-${id}-name`, `event-${id}-nameTe`, patchValue.name, (result) =>
          setData((prev) => ({ ...prev, events: prev.events.map((x) => (x.id === id ? { ...x, nameTe: result } : x)) })));
      if (patchValue.venue !== undefined)
        scheduleTransliteration(`event-${id}-venue`, `event-${id}-venueTe`, patchValue.venue, (result) =>
          setData((prev) => ({ ...prev, events: prev.events.map((x) => (x.id === id ? { ...x, venueTe: result } : x)) })));
    }
  };
  const remove = (field, id) => setData((prev) => ({ ...prev, [field]: prev[field].filter((x) => x.id !== id) }));

  /* ---------- validation ---------- */
  const errors = useMemo(() => {
    const e = {};
    const add = (key, section, msg) => { e[key] = { section, msg }; };
    if (!data.templateId) add("templateId", "template", "Choose a template to continue");
    if (has(data.customId) && !/^[a-z0-9-]+$/i.test(data.customId.trim())) add("customId", "template", "Use letters, numbers and hyphens only");
    if (!has(data.weddingDate)) add("weddingDate", "family", "Wedding date is required");
    if (!has(data.groomEn)) add("groomEn", "groom", "Groom's name is required");
    ["groomFatherPhone", "groomMotherPhone"].forEach((k) => { if (has(data[k]) && !okPhone(data[k])) add(k, "groom", PHONE_MSG); });
    data.groomContacts.forEach((c) => { if (has(c.phone) && !okPhone(c.phone)) add(`contact-${c.id}-phone`, "groom", PHONE_MSG); });
    if (!has(data.brideEn)) add("brideEn", "bride", "Bride's name is required");
    ["brideFatherPhone", "brideMotherPhone"].forEach((k) => { if (has(data[k]) && !okPhone(data[k])) add(k, "bride", PHONE_MSG); });
    data.brideContacts.forEach((c) => { if (has(c.phone) && !okPhone(c.phone)) add(`contact-${c.id}-phone`, "bride", PHONE_MSG); });
    if (data.receptionEnabled && !has(data.receptionDate)) add("receptionDate", "venue", "Add the reception date");
    if (has(data.venueMaps) && !okUrl(data.venueMaps)) add("venueMaps", "venue", URL_MSG);
    data.events.forEach((ev) => {
      if (has(ev.name) && !has(ev.date)) add(`event-${ev.id}-date`, "events", "Add a date for this event");
      if (has(ev.maps) && !okUrl(ev.maps)) add(`event-${ev.id}-maps`, "events", URL_MSG);
    });
    return e;
  }, [data]);

  const touch = (key) => setTouched((t) => (t[key] ? t : { ...t, [key]: true }));
  /* An error is only shown after the field was left, or after a save attempt. */
  const vis = (key) => ((submitted || touched[key]) ? errors[key]?.msg : undefined);
  const fpx = (name, focusKey) => ({ name, onFocus: () => focus(focusKey), onBlur: () => touch(name), error: vis(name) });
  const fp = (name) => fpx(name, name);

  const issues = useMemo(() => {
    const n = {};
    Object.entries(errors).forEach(([k, v]) => { if (submitted || touched[k]) n[v.section] = (n[v.section] || 0) + 1; });
    return n;
  }, [errors, touched, submitted]);

  const done = {
    template: has(data.templateId),
    family: has(data.weddingDate),
    groom: has(data.groomEn),
    bride: has(data.brideEn),
    venue: has(data.venueEn) || has(data.venueAddress),
    events: data.events.length > 0,
  };
  const doneCount = PROGRESS_IDS.filter((id) => done[id]).length;
  const pct = Math.round((doneCount / PROGRESS_IDS.length) * 100);

  const tagFor = (s) => {
    if (issues[s.id]) return { tone: "bad", text: `${issues[s.id]} to fix` };
    if (done[s.id]) return { tone: "ok", text: "Done" };
    return { tone: "", text: s.hint === "required" ? "Required" : s.hint === "recommended" ? "Recommended" : "Optional" };
  };

  /* ---------- sticky section nav ---------- */
  const animRef = useRef(0);
  const scrollToSection = (id) => {
    const el = document.getElementById(`sec-${id}`);
    const root = sentinelRef.current?.closest(".main-content");
    if (!el || !root) return;
    setActive(id);
    cancelAnimationFrame(animRef.current);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    const max = root.scrollHeight - root.clientHeight;
    const to = Math.max(0, Math.min(max, el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - margin));
    const from = root.scrollTop;
    const dist = to - from;
    if (reduce || Math.abs(dist) < 2) { lockRef.current = Date.now() + 150; root.scrollTop = to; return; }
    const dur = Math.min(650, 280 + Math.abs(dist) * 0.12);
    const t0 = performance.now();
    const stop = () => { cancelAnimationFrame(animRef.current); lockRef.current = 0; };
    root.addEventListener("wheel", stop, { once: true, passive: true });
    root.addEventListener("touchstart", stop, { once: true, passive: true });
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      lockRef.current = Date.now() + 150;
      root.scrollTop = from + dist * e;
      if (t < 1) animRef.current = requestAnimationFrame(step);
      else { root.removeEventListener("wheel", stop); root.removeEventListener("touchstart", stop); }
    };
    animRef.current = requestAnimationFrame(step);
  };

  /* scroll-spy: the active tab is the last section whose top has passed just under the sticky nav */
  useEffect(() => {
    const root = sentinelRef.current?.closest(".main-content");
    if (!root) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      if (Date.now() < lockRef.current) return;
      const navBottom = (document.querySelector(".sec-nav")?.getBoundingClientRect().bottom || 0) + 24;
      let cur = SECTIONS[0].id;
      for (const sec of SECTIONS) {
        const el = document.getElementById(`sec-${sec.id}`);
        if (el && el.getBoundingClientRect().top <= navBottom) cur = sec.id;
      }
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - 4) cur = SECTIONS[SECTIONS.length - 1].id;
      setActive(cur);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    root.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => { root.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  /* sliding pill behind the active tab */
  useEffect(() => {
    const bar = navRef.current;
    if (!bar) return;
    const measure = () => {
      const chip = bar.querySelector(`[data-id="${active}"]`);
      const pl = pillRef.current;
      if (chip && pl) { pl.style.width = `${chip.offsetWidth}px`; pl.style.transform = `translateX(${chip.offsetLeft}px)`; }
    };
    measure();
    window.addEventListener("resize", measure);
    document.fonts?.ready?.then(measure);
    return () => window.removeEventListener("resize", measure);
  }, [active, issues, done]);

  /* stuck state: true once the nav has stuck under the top navbar, so it can separate from the content */
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const root = el.closest(".main-content");
    const navbarH = document.querySelector(".top-navbar")?.getBoundingClientRect().height || 64;
    const io = new IntersectionObserver(([en]) => setStuck(!en.isIntersecting), { root, rootMargin: `-${Math.round(navbarH)}px 0px 0px 0px`, threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* keep the active chip visible inside the scrollable bar */
  useEffect(() => {
    const bar = navRef.current;
    const chip = bar?.querySelector(`[data-id="${active}"]`);
    if (!bar || !chip) return;
    bar.scrollTo({ left: chip.offsetLeft - bar.clientWidth / 2 + chip.clientWidth / 2, behavior: "smooth" });
  }, [active]);

  /* Show a Create/Update button inside the sticky nav only while the real one in the
     page header is scrolled out of view (hidden under the top navbar or above it). */
  useEffect(() => {
    const btn = headBtnRef.current;
    if (!btn || typeof IntersectionObserver === "undefined") return;
    const root = btn.closest(".main-content");
    const navbarH = document.querySelector(".top-navbar")?.getBoundingClientRect().height || 64;
    const io = new IntersectionObserver(
      ([en]) => setNavCta(!en.isIntersecting),
      { root, rootMargin: `-${Math.round(navbarH)}px 0px 0px 0px`, threshold: 0.01 }
    );
    io.observe(btn);
    return () => io.disconnect();
  }, []);

  const chooseTemplate = () => { setPreviewOpen(false); scrollToSection("template"); };

  /* ---------- save ---------- */
  const getLink = (id) => `${window.location.origin}/${data.customId?.trim() || id}`;
  const coupleName = `${has(data.groomEn) ? data.groomEn.trim() : "Groom"} & ${has(data.brideEn) ? data.brideEn.trim() : "Bride"}`;

  /* Returns true when the invitation is saved (or there was nothing to save).
     { leaving: true } is used by the "Save your changes?" dialog: it skips the share
     popup and the toast, because the user is on their way to another page. */
  const doSave = ({ leaving = false } = {}) => {
    if (saving) return false;
    if (editId && !dirty) return true;
    setSubmitted(true);
    const entries = Object.entries(errors);
    if (entries.length) {
      const [key, { section }] = entries[0];
      scrollToSection(section);
      setTimeout(() => document.getElementById(`f-${key}`)?.focus({ preventScroll: true }), 450);
      notify(`Fix ${entries.length} ${entries.length === 1 ? "field" : "fields"} to continue`, "error");
      return false;
    }
    setSaving(true);
    const id = editId || uid();
    const payload = {
      id,
      bride_name: data.brideEn,
      groom_name: data.groomEn,
      event_date: data.weddingDate || null,
      template_id: data.templateId || null,
      template_name: selected?.name || selected?.title || "Custom invitation",
      details: data,
    };
    saveDemoInvitation(payload);
    setSnap(JSON.stringify(data));
    setLastSaved(Date.now());
    removeKey(LS_DRAFT + "new");
    removeKey(LS_DRAFT + id);
    if (!editId) {
      /* First save: remember the id so the next save updates instead of creating a duplicate. */
      setEditId(id);
      /* Keep history.state: the router stores its position there (needed for back/forward blocking). */
      if (!leaving) history.replaceState(history.state, "", `/create?edit=${id}`);
      if (!leaving) setShare({ id });
    } else if (!leaving) {
      notify("Invitation updated");
    }
    setSaving(false);
    return true;
  };

  /* "Save your changes?" dialog actions */
  const leaveSave = () => {
    if (doSave({ leaving: true })) blocker.proceed?.();
    else blocker.reset?.(); /* validation failed: stay, and show what needs fixing */
  };
  const leaveCancel = () => {
    /* Flush the draft now (autosave is debounced) so the Restore card appears on return. */
    writeJSON(draftKey, { data, at: Date.now() });
    blocker.proceed?.();
  };
  const leaveStay = () => blocker.reset?.();

  saveRef.current = () => (blocker.state === "blocked" ? leaveSave() : doSave());

  const onSubmit = (e) => { e.preventDefault(); doSave(); };

  const createAnother = () => {
    setShare(null);
    setData(initial);
    setSnap(JSON.stringify(initial));
    setEditId(null);
    setTouched({});
    setSubmitted(false);
    setLastSaved(null);
    setCategoryId("ALL");
    history.replaceState(history.state, "", "/create");
    scrollToSection("template");
  };

  const copyShareLink = async () => { await copyText(getLink(share.id)); notify("Link copied"); };
  const shareWhatsApp = () => {
    const text = `You are invited! ${coupleName}\n${getLink(share.id)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };

  const restoreDraft = () => {
    setData({ ...initial, ...draftOffer.data });
    setDraftOffer(null);
    notify("Draft restored");
  };
  const discardDraft = () => { removeKey(draftKey); setDraftOffer(null); };

  const saveDisabled = saving || (!!editId && !dirty);
  const saveLabel = saving ? "Saving..." : editId ? "Update" : "Create";
  const draftTime = draftOffer?.at ? new Date(draftOffer.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";
  const slug = data.customId?.trim();

  return (
    <div className="create">
      <header>
        <div>
          <div className="title-row">
            <h1>{editId ? "Edit invitation" : "Create invitation"}</h1>
            <span aria-live="polite">
              {dirty ? (
                <span className="save-state dirty" title="Changes are also kept as a local draft"><i /> Unsaved changes</span>
              ) : lastSaved ? (
                <span className="save-state saved"><Check size={13} /> All changes saved</span>
              ) : null}
            </span>
          </div>
          <p>Fill in the details to build your invitation.</p>
        </div>
        <div className="actions">
          <button ref={headBtnRef} className="primary" type="submit" form="create-form" disabled={saveDisabled} title="Save (Ctrl+S)">
            {saving ? <Loader2 className="spin" size={17} /> : <Save size={17} />} {saveLabel}
          </button>
        </div>
      </header>

      {message && <div className="msg">{message}</div>}
      {draftOffer && (
        <div className="msg">
          <span>You have unsaved changes from {draftTime}. Restore them?</span>
          <div className="msg-actions">
            <button type="button" className="mini-act" onClick={restoreDraft}>Restore</button>
            <button type="button" className="mini-act ghost" onClick={discardDraft}>Discard</button>
          </div>
        </div>
      )}

      <div className="create-builder-layout">
        <div ref={sentinelRef} className="sec-sentinel" aria-hidden="true" />
        <nav className={`sec-nav${stuck ? " stuck" : ""}`} aria-label="Form sections">
          <div className="sec-chips" ref={navRef}>
            <span className="sec-pill" ref={pillRef} aria-hidden="true" />
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const bad = !!issues[s.id];
              const ok = !bad && done[s.id];
              return (
                <button
                  key={s.id} type="button" data-id={s.id} aria-current={active === s.id ? "step" : undefined}
                  className={`chip-nav${active === s.id ? " on" : ""}${ok ? " ok" : ""}${bad ? " bad" : ""}`}
                  onClick={() => scrollToSection(s.id)}
                >
                  <span className="cn-ic">{bad ? <AlertCircle size={14} /> : ok ? <Check size={14} /> : <Icon size={14} />}</span>
                  {s.label}
                </button>
              );
            })}
          </div>
          <div className="sec-progress" title={`${doneCount} of ${PROGRESS_IDS.length} sections complete`}>
            <span>{doneCount}/{PROGRESS_IDS.length}</span>
            <i><b style={{ width: `${pct}%` }} /></i>
          </div>
          {/* Desktop only. Slides in while the header's Create button is out of view. */}
          <div className={`sec-cta${navCta ? " show" : ""}`}>
            <button className="primary" type="submit" form="create-form" disabled={saveDisabled} title="Save (Ctrl+S)">
              {saving ? <Loader2 className="spin" size={15} /> : <Save size={15} />} {saveLabel}
            </button>
          </div>
        </nav>

        <form id="create-form" className="create-builder-form" onSubmit={onSubmit} noValidate>
          <Section id="template" icon={LayoutTemplate} title="Template Options" tag={tagFor(SECTIONS[0])}>
            <TemplatePicker
              categories={categories} categoryId={categoryId} onCategory={setCategoryId} templates={templates}
              value={data.templateId} onSelect={(v) => set("templateId", v)} error={vis("templateId")}
            />
            <Input
              label="Custom Link ID" {...fp("customId")} value={data.customId} onChange={(v) => set("customId", v)}
              help={`Your link: ${window.location.origin}/${slug || "your-id"}`}
            />
          </Section>

          <Section id="family" icon={Users} title="Family & Wedding" tag={tagFor(SECTIONS[1])}>
            <Bilingual enLabel="Family Surname EN" teLabel="Family Surname తెలుగు" enField="surnameEn" teField="surnameTe" data={data} set={set} fp={fp} />
            <div className="grid two">
              <Input label="Wedding Date" type="date" required {...fp("weddingDate")} value={data.weddingDate} onChange={(v) => set("weddingDate", v)} />
              <Input label="Muhurtham Time" type="time" {...fp("muhurthamTime")} value={data.muhurthamTime} onChange={(v) => set("muhurthamTime", v)} />
            </div>
          </Section>

          <Section id="groom" icon={User} title="Groom's Details" tag={tagFor(SECTIONS[2])}>
            <Bilingual enLabel="Groom Name EN" teLabel="Groom Name తెలుగు" enField="groomEn" teField="groomTe" data={data} set={set} fp={fp} required />
            <div className="sub">Father's Details</div>
            <Bilingual enLabel="Father EN" teLabel="Father తెలుగు" enField="groomFatherEn" teField="groomFatherTe" data={data} set={set} fp={fp} />
            <Input label="Father Phone" type="tel" inputMode="tel" {...fp("groomFatherPhone")} value={data.groomFatherPhone} onChange={(v) => set("groomFatherPhone", v)} />
            <div className="sub">Mother's Details</div>
            <Bilingual enLabel="Mother EN" teLabel="Mother తెలుగు" enField="groomMotherEn" teField="groomMotherTe" data={data} set={set} fp={fp} />
            <Input label="Mother Phone" type="tel" inputMode="tel" {...fp("groomMotherPhone")} value={data.groomMotherPhone} onChange={(v) => set("groomMotherPhone", v)} />
            <Contacts field="groomContacts" items={data.groomContacts} add={add} patch={patch} remove={remove} focus={focus} vis={vis} touch={touch} />
          </Section>

          <Section id="bride" icon={Heart} title="Bride's Details" tag={tagFor(SECTIONS[3])}>
            <Bilingual enLabel="Bride Name EN" teLabel="Bride Name తెలుగు" enField="brideEn" teField="brideTe" data={data} set={set} fp={fp} required />
            <div className="sub">Father's Details</div>
            <Bilingual enLabel="Father EN" teLabel="Father తెలుగు" enField="brideFatherEn" teField="brideFatherTe" data={data} set={set} fp={fp} />
            <Input label="Father Phone" type="tel" inputMode="tel" {...fp("brideFatherPhone")} value={data.brideFatherPhone} onChange={(v) => set("brideFatherPhone", v)} />
            <div className="sub">Mother's Details</div>
            <Bilingual enLabel="Mother EN" teLabel="Mother తెలుగు" enField="brideMotherEn" teField="brideMotherTe" data={data} set={set} fp={fp} />
            <Input label="Mother Phone" type="tel" inputMode="tel" {...fp("brideMotherPhone")} value={data.brideMotherPhone} onChange={(v) => set("brideMotherPhone", v)} />
            <Contacts field="brideContacts" items={data.brideContacts} add={add} patch={patch} remove={remove} focus={focus} vis={vis} touch={touch} />
          </Section>

          <Section id="venue" icon={MapPin} title="Reception & Venue" tag={tagFor(SECTIONS[4])}>
            <label className="check">
              <input type="checkbox" checked={data.receptionEnabled} onChange={(e) => set("receptionEnabled", e.target.checked)} /> Include reception
            </label>
            {data.receptionEnabled && (
              <div className="grid two">
                <Input label="Reception Date" type="date" required {...fp("receptionDate")} value={data.receptionDate} onChange={(v) => set("receptionDate", v)} />
                <Input label="Reception Time" type="time" {...fp("receptionTime")} value={data.receptionTime} onChange={(v) => set("receptionTime", v)} />
              </div>
            )}
            <Bilingual enLabel="Venue EN" teLabel="Venue తెలుగు" enField="venueEn" teField="venueTe" data={data} set={set} fp={fp} />
            <Input label="Venue Address" {...fp("venueAddress")} value={data.venueAddress} onChange={(v) => set("venueAddress", v)} />
            <Input label="Google Maps Link" inputMode="url" {...fp("venueMaps")} value={data.venueMaps} onChange={(v) => set("venueMaps", v)} />
          </Section>

          <Section id="events" icon={CalendarPlus} title="Additional Events" tag={tagFor(SECTIONS[5])}>
            {data.events.map((ev, i) => (
              <div className="repeat" key={ev.id}>
                <button type="button" className="del" aria-label="Remove event" onClick={() => remove("events", ev.id)}><Trash2 size={15} /></button>
                <div className="sub">Event {i + 1}</div>
                <div className="grid two">
                  <Input label="Event Name EN" {...fpx(`event-${ev.id}-name`, `event-${i + 1}-name-te`)} value={ev.name} onChange={(v) => patch("events", ev.id, { name: v })} />
                  <Input label="Event Name తెలుగు" lang="te" {...fpx(`event-${ev.id}-nameTe`, `event-${i + 1}-name-te`)} value={ev.nameTe} onChange={(v) => patch("events", ev.id, { nameTe: v })} />
                </div>
                <div className="grid three">
                  <Input label="Date" type="date" {...fpx(`event-${ev.id}-date`, `event-${i + 1}-date`)} value={ev.date} onChange={(v) => patch("events", ev.id, { date: v })} />
                  <Input label="Time" type="time" {...fpx(`event-${ev.id}-time`, `event-${i + 1}-time`)} value={ev.time} onChange={(v) => patch("events", ev.id, { time: v })} />
                  <Input label="Venue EN" {...fpx(`event-${ev.id}-venue`, `event-${i + 1}-venue-te`)} value={ev.venue} onChange={(v) => patch("events", ev.id, { venue: v })} />
                </div>
                <Input label="Venue తెలుగు" lang="te" {...fpx(`event-${ev.id}-venueTe`, `event-${i + 1}-venue-te`)} value={ev.venueTe} onChange={(v) => patch("events", ev.id, { venueTe: v })} />
                <Input label="Google Maps Link" inputMode="url" {...fpx(`event-${ev.id}-maps`, `event-${i + 1}-venue-te`)} value={ev.maps} onChange={(v) => patch("events", ev.id, { maps: v })} />
              </div>
            ))}
            {data.events.length < 2 ? (
              <button type="button" className="outline" onClick={() => add("events", newEvent)}><Plus size={15} /> Add event</button>
            ) : (
              <div className="hint">This template supports two additional event slots.</div>
            )}
          </Section>
        </form>
      </div>

      {/* mobile action bar */}
      <div className="mbar">
        <button className="secondary" type="button" onClick={() => setPreviewOpen(true)}><Eye size={17} /> Preview</button>
        <button className="primary" type="submit" form="create-form" disabled={saveDisabled}>
          {saving ? <Loader2 className="spin" size={17} /> : <Save size={17} />} {saveLabel}
        </button>
      </div>

      {slot && createPortal(
        <aside className={`create-live-preview-panel ${previewOpen ? "mobile-open" : ""}`}>
          <div className="create-live-preview-head">
            <div>
              <b>Live Preview</b>
              <small>{selected?.name || selected?.title || "No template selected"}</small>
            </div>
            <button type="button" aria-label="Close preview" onClick={() => setPreviewOpen(false)}><X size={18} /></button>
          </div>
          <div className="create-live-preview-body">
            {selected ? (
              <iframe key={selected.id} ref={frameRef} title="Invitation preview" srcDoc={source} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
            ) : (
              <div className="empty">
                <LayoutTemplate size={28} />
                <b>Pick a template to start</b>
                <span>Your invitation appears here and updates as you type.</span>
                <button type="button" className="primary" onClick={chooseTemplate}>Choose a template</button>
              </div>
            )}
          </div>
        </aside>,
        slot
      )}

      {share && (
        <ShareModal
          name={coupleName} link={getLink(share.id)} onCopy={copyShareLink} onWhatsApp={shareWhatsApp}
          onClose={() => setShare(null)} onAnother={createAnother}
        />
      )}

      {blocker.state === "blocked" && (
        <LeaveModal onSave={leaveSave} onCancel={leaveCancel} onStay={leaveStay} />
      )}

      {toast && createPortal(
        <div className="dx-toast" role="status">
          {toast.tone === "error" ? <AlertCircle size={15} className="bad" /> : <Check size={15} />} {toast.msg}
        </div>,
        document.body
      )}

      <style>{`
  :root { --dx-toast-bg: #1f2233; }
  .create { font-family: "DM Sans", Inter, system-ui, sans-serif; color: var(--dark); }
  .create * { box-sizing: border-box; }

  /* ---------- page header ---------- */
  .create header { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 20px; }
  .title-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; margin: 0 0 4px; }
  .create h1 { margin: 0; font-size: 28px; line-height: 1.15; color: var(--dark); font-weight: 700; }
  .create header p { margin: 0; color: var(--gray); font-size: 14px; }
  .actions { display: flex; align-items: center; gap: 10px; }
  .save-state { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
  .save-state.dirty { background: var(--warning-light); color: var(--dx-warn-text, #9a6700); }
  .save-state.dirty i { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
  .save-state.saved { background: var(--success-light); color: var(--success-dark); }

  .primary, .secondary, .outline { height: 44px; border-radius: 14px; padding: 0 18px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 600; line-height: 1; white-space: nowrap; text-decoration: none; transition: background .2s, border-color .2s, color .2s, box-shadow .2s; }
  .primary svg, .secondary svg, .outline svg { flex-shrink: 0; }
  .primary { border: 0; background: var(--primary); color: var(--white); box-shadow: 0 4px 12px rgba(103, 61, 230, .25); }
  .primary:hover:not(:disabled) { background: var(--primary-dark); }
  .primary:disabled { opacity: .55; cursor: not-allowed; box-shadow: none; }
  .secondary { background: var(--white); border: 1px solid var(--gray-border); color: var(--gray-dark); }
  .secondary:hover { background: var(--gray-light); }
  .secondary.wa:hover { background: var(--success-light); border-color: var(--success-dark); color: var(--success-dark); }
  .outline { width: 100%; height: 46px; background: var(--ghost-white); border: 1.5px dashed var(--periwinkle); color: var(--primary); }
  .outline:hover { background: var(--primary-lightest); border-color: var(--primary); }

  .msg { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; background: var(--primary-light); color: var(--primary-dark); border-radius: 14px; padding: 13px 16px; font-size: 13px; line-height: 1.4; margin-bottom: 12px; }
  .msg-actions { margin-left: auto; display: flex; gap: 8px; }
  .mini-act { height: 32px; padding: 0 14px; border: 1px solid var(--primary); border-radius: 10px; background: var(--primary); color: #fff; font: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; }
  .mini-act.ghost { background: var(--white); color: var(--primary); }

  /* ---------- sticky section nav ---------- */
  .create-builder-layout { display: block !important; width: 100%; }
  /* The page scrolls inside .main-content, whose 96px top padding counts as part of the sticky area,
     so a negative top lets the nav sit close under the top navbar (about 12px) instead of 40px below it.
     --sec-scroll-mt keeps a section's heading clear of the nav after a chip click. */
  .create { --sec-top: -20px; --sec-scroll-mt: 138px; }
  .sec-nav { position: sticky; top: var(--sec-top); z-index: 30; display: flex; align-items: center; gap: 10px; margin: 0 -12px 16px; padding: 7px 10px; background: var(--white); border: 1px solid var(--gray-border); border-radius: 20px; box-shadow: 0 6px 18px rgba(54, 52, 77, .07); transition: box-shadow .25s ease, border-color .25s ease, background-color .25s ease; }
  /* once stuck: stronger edge + a page-colored strip above so scrolling cards never show in the gap */
  .sec-nav::before { content: ""; position: absolute; z-index: -1; left: -4px; right: -4px; top: -60px; height: 60px; background: #f5f5f7; opacity: 0; transition: opacity .2s ease; pointer-events: none; }
  .sec-nav.stuck { background: #101011; border-color: #101011; box-shadow: none; }
  .sec-nav.stuck .sec-pill { background: #fff; box-shadow: none; }
  .sec-nav.stuck .chip-nav { color: #fff; }
  .sec-nav.stuck .chip-nav:hover { background: rgba(255, 255, 255, .12); color: #fff; }
  .sec-nav.stuck .chip-nav .cn-ic { background: rgba(255, 255, 255, .14); color: #fff; }
  .sec-nav.stuck .chip-nav.ok .cn-ic { background: var(--success-dark); color: #fff; }
  .sec-nav.stuck .chip-nav.bad .cn-ic { background: var(--danger-dark); color: #fff; }
  .sec-nav.stuck .chip-nav.on, .sec-nav.stuck .chip-nav.on:hover { color: #000; background: transparent; }
  .sec-nav.stuck .chip-nav.on .cn-ic { background: #ececf0; color: #000; }
  .sec-nav.stuck .chip-nav.on.ok .cn-ic { background: var(--success-dark); color: #fff; }
  .sec-nav.stuck .chip-nav.on.bad .cn-ic { background: var(--danger-dark); color: #fff; }
  .sec-nav.stuck .sec-progress { color: #fff; }
  .sec-nav.stuck .sec-progress i { background: rgba(255, 255, 255, .22); }
  .sec-nav.stuck .sec-progress b { background: #fff; }
  .sec-nav.stuck::before { opacity: 1; }
  .sec-chips { position: relative; display: flex; gap: 4px; flex: 1; min-width: 0; overflow-x: auto; scrollbar-width: none; }
  .sec-pill { position: absolute; left: 0; top: 0; height: 36px; border-radius: 999px; background: var(--primary-light); pointer-events: none; z-index: 0; transition: transform .42s cubic-bezier(.22, 1, .36, 1), width .42s cubic-bezier(.22, 1, .36, 1); will-change: transform, width; }
  .sec-sentinel { height: 0; }
  .sec-chips::-webkit-scrollbar { display: none; }
  .chip-nav { flex-shrink: 0; height: 36px; padding: 0 13px 0 7px; display: inline-flex; align-items: center; gap: 7px; border: 0; border-radius: 999px; background: transparent; color: var(--gray); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: background .2s, color .2s; position: relative; z-index: 1; }
  .chip-nav:hover { background: var(--gray-light); color: var(--gray-dark); }
  .chip-nav.on { color: var(--primary); }
  .chip-nav.on:hover { background: transparent; }
  .cn-ic { width: 22px; height: 22px; display: grid; place-items: center; border-radius: 50%; background: var(--gray-light); color: var(--gray); transition: background .2s, color .2s; }
  .chip-nav.on .cn-ic { background: var(--white); color: var(--primary); }
  .chip-nav.ok .cn-ic { background: var(--success-light); color: var(--success-dark); }
  .chip-nav.bad .cn-ic { background: var(--danger-light); color: var(--danger-dark); }
  .sec-progress { display: flex; align-items: center; gap: 8px; padding-right: 8px; font-size: 12px; font-weight: 700; color: var(--gray-dark); white-space: nowrap; }
  .sec-progress i { width: 72px; height: 6px; border-radius: 999px; background: var(--gray-light); overflow: hidden; }
  .sec-progress b { display: block; height: 100%; border-radius: inherit; background: var(--primary); transition: width .3s ease; }

  /* Create/Update button in the nav: grows in from the right while the header one is out of view.
     The negative margin cancels the flex gap while it is collapsed. */
  .sec-cta { --ease: cubic-bezier(.22, 1, .36, 1); flex: 0 0 auto; display: flex; align-items: center; overflow: hidden; max-width: 0; margin-left: -10px; opacity: 0; transform: translateX(12px) scale(.94); transform-origin: right center; visibility: hidden; pointer-events: none; transition: max-width .38s var(--ease), margin-left .38s var(--ease), opacity .26s ease, transform .38s var(--ease), visibility 0s linear .38s; }
  .sec-cta.show { max-width: 170px; margin-left: 0; opacity: 1; transform: none; visibility: visible; pointer-events: auto; transition: max-width .38s var(--ease), margin-left .38s var(--ease), opacity .3s ease .05s, transform .38s var(--ease), visibility 0s; }
  .sec-cta .primary { height: 36px; padding: 0 16px; border-radius: 999px; font-size: 13px; gap: 7px; box-shadow: none; }

  /* ---------- form cards ---------- */
  .create-builder-form { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
  .create-builder-form section { display: flex; flex-direction: column; gap: 14px; background: var(--white); border: 1px solid var(--gray-border); border-radius: 22px; padding: 24px; scroll-margin-top: var(--sec-scroll-mt); }
  .sec-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
  .create-builder-form h2 { display: flex; align-items: center; gap: 12px; margin: 0; font-size: 16px; font-weight: 700; color: var(--dark); }
  .create-builder-form h2 i { width: 34px; height: 34px; flex-shrink: 0; border-radius: 12px; background: var(--primary-light); color: var(--primary); display: grid; place-items: center; }
  .sec-tag { padding: 3px 10px; border-radius: 999px; background: var(--gray-light); color: var(--gray); font-size: 11.5px; font-weight: 700; white-space: nowrap; }
  .sec-tag.ok { background: var(--success-light); color: var(--success-dark); }
  .sec-tag.bad { background: var(--danger-light); color: var(--danger-dark); }

  .sub { display: flex; align-items: center; gap: 12px; margin: 4px 0 0; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--gray); }
  .sub::after { content: ""; flex: 1; height: 1px; background: var(--gray-border); }
  .hint { font-size: 12px; color: var(--gray); }

  .grid { display: grid; gap: 14px 12px; }
  .grid.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .grid.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }

  /* ---------- fields ---------- */
  .f { display: flex; flex-direction: column; gap: 7px; margin: 0; min-width: 0; }
  .f > span { font-size: 12.5px; color: var(--gray-dark); font-weight: 600; }
  .req { color: var(--danger-dark); font-weight: 700; }
  .f input, .f select, .repeat input { width: 100%; height: 46px; border: 1px solid var(--gray-border); border-radius: 14px; background-color: var(--white); padding: 0 16px; outline: none; font: inherit; font-size: 14px; font-weight: 500; color: var(--dark); transition: border-color .2s, box-shadow .2s, background-color .2s; }
  .f input::placeholder, .repeat input::placeholder { color: #9a9cab; font-weight: 400; }
  .f input:hover, .repeat input:hover { border-color: var(--periwinkle); }
  .f input:focus, .repeat input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-lightest); }
  .f input[type="date"], .f input[type="time"] { color-scheme: light; }
  .te input { font-family: "Noto Sans Telugu", "Nirmala UI", sans-serif; }

  .f.has-err input, .repeat input.bad { border-color: var(--danger-dark); }
  .f.has-err input:focus, .repeat input.bad:focus { box-shadow: 0 0 0 3px var(--danger-light); }
  .err { font-size: 12px; font-style: normal; font-weight: 600; color: var(--danger-dark); }
  .help { font-size: 12px; font-style: normal; color: var(--gray); overflow-wrap: anywhere; }

  .check { display: flex; align-items: center; gap: 12px; padding: 13px 16px; border: 1px solid var(--gray-border); border-radius: 14px; background: var(--ghost-white); font-size: 14px; font-weight: 600; color: var(--dark); cursor: pointer; user-select: none; }
  .check:hover { border-color: var(--periwinkle); }
  .check input { appearance: none; -webkit-appearance: none; width: 20px; height: 20px; margin: 0; flex-shrink: 0; border: 1.5px solid var(--periwinkle); border-radius: 6px; background: var(--white) center / 13px no-repeat; cursor: pointer; transition: background-color .15s, border-color .15s; }
  .check input:checked { background-color: var(--primary); border-color: var(--primary); background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E"); }
  .check input:focus-visible { box-shadow: 0 0 0 3px var(--primary-lightest); outline: none; }

  /* ---------- template picker ---------- */
  .tp { display: flex; flex-direction: column; gap: 12px; outline: none; }
  .tp-cats { display: flex; flex-wrap: wrap; gap: 8px; }
  .tp-cat { height: 32px; padding: 0 14px; border: 1px solid var(--gray-border); border-radius: 999px; background: var(--white); color: var(--gray-dark); font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: background .2s, border-color .2s, color .2s; }
  .tp-cat:hover { border-color: var(--periwinkle); }
  .tp-cat.on { background: var(--primary-light); border-color: var(--primary); color: var(--primary); }
  .tp-current { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--success-dark); }
  .tp-current b { color: var(--dark); }
  .tp-hint { font-size: 13px; color: var(--gray); }
  .tp-grid { display: grid; grid-template-columns: repeat(auto-fill, 128px); gap: 14px; max-height: 400px; overflow-y: auto; padding: 4px; }
  .tp.has-err .tp-grid { border-radius: 16px; outline: 2px solid var(--danger-light); outline-offset: 2px; }
  .tp-card { width: 128px; padding: 0; display: flex; flex-direction: column; gap: 8px; border: 0; background: none; font: inherit; text-align: left; cursor: pointer; }
  .tp-thumb { position: relative; display: block; width: 128px; height: 228px; overflow: hidden; border: 2px solid var(--gray-border); border-radius: 14px; background: #f5f6fa; transition: border-color .2s, box-shadow .2s; }
  .tp-card:hover .tp-thumb { border-color: var(--periwinkle); }
  .tp-card.on .tp-thumb { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-lightest); }
  .tp-card:focus-visible .tp-thumb { box-shadow: 0 0 0 3px var(--primary-lightest); border-color: var(--primary); }
  .tp-thumb iframe { position: absolute; top: 0; left: 0; width: 390px; height: 694px; border: 0; background: #fff; transform: scale(.318); transform-origin: 0 0; pointer-events: none; }
  .tp-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .tp-none { position: absolute; inset: 0; display: grid; place-items: center; color: var(--gray); }
  .tp-check { position: absolute; top: 8px; right: 8px; width: 22px; height: 22px; display: grid; place-items: center; border-radius: 50%; background: var(--primary); color: #fff; box-shadow: 0 2px 6px rgba(0, 0, 0, .2); }
  .tp-name { width: 128px; font-size: 12.5px; font-weight: 600; color: var(--gray-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tp-card.on .tp-name { color: var(--primary); }

  /* ---------- repeatable blocks ---------- */
  .repeat { position: relative; display: flex; flex-direction: column; gap: 14px; border: 1px solid var(--gray-border); border-radius: 18px; padding: 20px 18px 18px; margin: 4px 0 0; background: var(--ghost-white); }
  .del { position: absolute; right: -9px; top: -9px; width: 28px; height: 28px; border: 1px solid var(--gray-border); border-radius: 50%; background: var(--white); color: var(--gray); display: grid; place-items: center; padding: 0; cursor: pointer; z-index: 2; box-shadow: 0 2px 6px rgba(24, 28, 45, .08); transition: color .2s, background .2s, border-color .2s; }
  .del:hover { color: var(--danger-dark); background: var(--danger-light); border-color: var(--danger-light); }

  /* ---------- live preview card ---------- */
  /* Phone proportions: 390 x 844 screen area (+64px header). Never taller than that, even on tall monitors; on short screens it shrinks and the invitation scrolls inside. */
  .create-live-preview-panel { position: relative; height: min(100%, 908px); align-self: flex-start; width: 390px; min-width: 390px; max-width: 390px; flex: 0 0 390px; isolation: isolate; background: #ffffff; border-radius: 26px; overflow: hidden; display: flex; flex-direction: column; }
  .create-live-preview-head { height: 64px; flex: 0 0 64px; border-bottom: 1px solid var(--gray-border); display: flex; align-items: center; justify-content: space-between; padding: 0 20px; background: var(--white); }
  .create-live-preview-head b { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--dark); }
  .create-live-preview-head b::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--success); box-shadow: 0 0 0 3px var(--success-light); }
  .create-live-preview-head small { display: block; color: var(--gray); font-size: 12px; margin: 3px 0 0 16px; }
  .create-live-preview-head button { display: none; border: 0; background: var(--gray-light); border-radius: 12px; width: 36px; height: 36px; place-items: center; color: var(--gray-dark); cursor: pointer; }
  .create-live-preview-head button:hover { background: var(--meteorite-light); }
  .create-live-preview-body { position: relative; flex: 1; min-height: 0; background: #f5f6fa; }
  .create-live-preview-body iframe { display: block; width: 100%; height: 100%; border: 0; background: var(--white); }
  .empty { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 24px; text-align: center; color: var(--gray); font-size: 13px; }
  .empty svg { padding: 14px; width: 56px; height: 56px; border-radius: 50%; background: var(--primary-light); color: var(--primary); }
  .empty b { color: var(--dark); font-size: 15px; }
  .empty .primary { margin-top: 10px; height: 40px; }

  .spin { animation: spin .8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .schedy-focus { outline: 3px solid var(--primary-lightest); outline-offset: 4px; border-radius: 4px; }

  /* ---------- mobile action bar ---------- */
  .mbar { display: none; }

  /* ---------- "saved" dialog (portaled to <body>) ---------- */
  .cx-overlay, .cx-overlay * { box-sizing: border-box; }
  .cx-overlay { position: fixed; inset: 0; z-index: 9000; display: grid; place-items: center; padding: 20px; background: rgba(23, 19, 38, .55); backdrop-filter: blur(3px); font-family: "DM Sans", Inter, system-ui, sans-serif; color: var(--dark); animation: cx-fade .15s ease; }
  .cx-modal { width: 420px; max-width: 100%; max-height: calc(100vh - 40px); overflow-y: auto; padding: 28px 24px 22px; border-radius: 24px; background: var(--white); text-align: center; box-shadow: 0 24px 60px rgba(0, 0, 0, .3); animation: dx-pop .18s ease; }
  .cx-ok { width: 56px; height: 56px; margin: 0 auto 14px; display: grid; place-items: center; border-radius: 50%; background: var(--success-light); color: var(--success-dark); }
  .cx-modal h3 { margin: 0 0 6px; font-size: 18px; font-weight: 700; }
  .cx-modal p { margin: 0; font-size: 13.5px; line-height: 1.5; color: var(--gray); }
  .cx-modal p b { color: var(--dark); }
  .cx-link { display: flex; align-items: center; gap: 8px; margin: 18px 0 12px; padding: 6px 6px 6px 12px; border: 1px solid var(--gray-border); border-radius: 14px; background: var(--ghost-white); }
  .cx-link code { flex: 1; min-width: 0; text-align: left; font-size: 12.5px; color: var(--gray-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cx-copy { width: 34px; height: 34px; flex-shrink: 0; display: grid; place-items: center; border: 1px solid var(--gray-border); border-radius: 10px; background: var(--white); color: var(--gray-dark); cursor: pointer; }
  .cx-copy:hover { border-color: var(--primary); color: var(--primary); }
  .cx-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .cx-foot { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--gray-border); }
  .cx-foot .primary { width: 100%; }
  .cx-modal .secondary { padding: 0 12px; }
  @keyframes cx-fade { from { opacity: 0; } to { opacity: 1; } }

  /* ---------- "Save your changes?" dialog ---------- */
  .cx-modal.lv { position: relative; padding-top: 32px; }
  .cx-ok.warn { background: var(--warning-light); color: var(--warning-dark); }
  .cx-close { position: absolute; top: 14px; right: 14px; width: 34px; height: 34px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 12px; background: var(--gray-light); color: var(--gray-dark); cursor: pointer; transition: background .2s; }
  .cx-close:hover { background: var(--meteorite-light); }
  .lv-actions { margin-top: 22px; }

  /* ---------- toast (same as dashboard; portaled to <body>) ---------- */
  .dx-toast, .dx-toast * { box-sizing: border-box; }
  .dx-toast { --tx: -50%; position: fixed; left: 50%; bottom: 28px; z-index: 9800; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 11px 18px; border-radius: 14px; background: var(--dx-toast-bg); color: #fff; font-family: "DM Sans", Inter, system-ui, sans-serif; font-size: 13px; font-weight: 600; box-shadow: 0 12px 30px rgba(0, 0, 0, .3); animation: dx-pop .2s ease; }
  .dx-toast svg { color: #5eead4; }
  .dx-toast svg.bad { color: #fca5a5; }
  @keyframes dx-pop { from { opacity: 0; transform: translate(var(--tx, 0), 8px) scale(.98); } to { opacity: 1; transform: translate(var(--tx, 0), 0) scale(1); } }
  @media (prefers-reduced-motion: reduce) { .dx-toast, .cx-modal, .cx-overlay, .sec-progress b, .sec-cta, .sec-cta.show { animation: none; transition: none; } }

  /* ---------- responsive ---------- */
  @media(max-width: 1500px) { .grid.three { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media(max-width: 1180px) { .grid.two { grid-template-columns: 1fr; } }
  @media(max-width: 900px) {
    .create { padding-bottom: 88px; }
    .actions { display: none; }
    .sec-cta { display: none; } /* phones/tablets already have the bottom action bar */
    .mbar { position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 3500; display: flex; gap: 10px; padding: 10px; background: var(--white); border: 1px solid var(--gray-border); border-radius: 18px; box-shadow: 0 12px 30px rgba(24, 28, 45, .18); }
    .mbar button { flex: 1; }
    .dx-toast { bottom: 92px; }
    .grid.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .create-live-preview-panel { position: fixed !important; inset: 12px; z-index: 4000; width: auto; min-width: 0; height: auto; max-width: none; flex: none; border-radius: 20px !important; display: none; box-shadow: 0 12px 34px rgba(24, 28, 45, .3); }
    .create-live-preview-panel.mobile-open { display: flex; }
    .create-live-preview-panel.mobile-open .create-live-preview-head button { display: grid; }
  }
  @media(max-width: 768px) {
    /* phones: the 72px mobile header replaces the desktop navbar and main-content padding is 88px */
    .create { --sec-top: -4px; --sec-scroll-mt: 146px; }
  }
  @media(max-width: 600px) {
    .create header { flex-direction: column; align-items: stretch; }
    .grid.two, .grid.three { grid-template-columns: 1fr; }
    .create-builder-form section { padding: 18px 16px; }
    .sec-progress i { display: none; }
    .sec-nav { margin-left: -6px; margin-right: -6px; }
    .tp-grid { justify-content: center; }
  }
      `}</style>
    </div>
  );
}
