import React, { useEffect, useMemo, useRef, useState } from "react";
import { getTransliterateSuggestions } from "@ai4bharat/indic-transliterate";
import "@ai4bharat/indic-transliterate/dist/index.css";
import { Eye, Loader2, MapPin, Plus, Save, Trash2, X } from "lucide-react";
import morphdom from "morphdom";
import { supabase } from "../lib/supabase";

const makeId = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const emptyEvent = () => ({ id: makeId(), name: "", date: "", time: "", venue: "" });
const emptyContact = () => ({ id: makeId(), nameEn: "", nameTe: "", phone: "" });
const initial = {
  customId: "", templateId: "", categoryId: "ALL", surnameEn: "", surnameTe: "", weddingDate: "", muhurthamTime: "",
  groomEn: "", groomTe: "", groomFatherEn: "", groomFatherTe: "", groomFatherPhone: "", groomMotherEn: "", groomMotherTe: "", groomMotherPhone: "",
  brideEn: "", brideTe: "", brideFatherEn: "", brideFatherTe: "", brideFatherPhone: "", brideMotherEn: "", brideMotherTe: "", brideMotherPhone: "",
  receptionEnabled: false, receptionDate: "", receptionTime: "", venueEn: "", venueTe: "", venueAddress: "", venueMaps: "", events: [], groomContacts: [], brideContacts: []
};

const esc = (v = "") => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const dateText = (v) => v ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${v}T00:00:00`)) : "";
const timeText = (v) => { if (!v) return ""; const [h, m] = v.split(":").map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(d); };

function compile(source, data) {
  if (!source) return "";
  const values = {
    "surname-en": data.surnameEn, "surname-te": data.surnameTe,
    "bride-en": data.brideEn, "bride-te": data.brideTe,
    "groom-en": data.groomEn, "groom-te": data.groomTe,
    "groom-father-en": data.groomFatherEn, "groom-father-te": data.groomFatherTe, "groom-father-phone": data.groomFatherPhone,
    "groom-mother-en": data.groomMotherEn, "groom-mother-te": data.groomMotherTe, "groom-mother-phone": data.groomMotherPhone,
    "bride-father-en": data.brideFatherEn, "bride-father-te": data.brideFatherTe, "bride-father-phone": data.brideFatherPhone,
    "bride-mother-en": data.brideMotherEn, "bride-mother-te": data.brideMotherTe, "bride-mother-phone": data.brideMotherPhone,
    "wedding-date": data.weddingDate, "event-wedding-date": dateText(data.weddingDate),
    "muhurtham-time": timeText(data.muhurthamTime), "reception-date": dateText(data.receptionDate), "reception-time": timeText(data.receptionTime),
    "venue-en": data.venueEn, "venue-te": data.venueTe, "venue-address": data.venueAddress, "venue-maps": data.venueMaps
  };

  let html = source;

  // Mark text placeholders so the preview can reliably find the exact element later.
  Object.entries(values).forEach(([key, value]) => {
    const safe = esc(value);
    const marker = `<span data-schedy-field="${key}">${safe}</span>`;
    html = html.replaceAll(`{{${key}}}`, marker).replaceAll(`{{${key.replaceAll("-", "_")}}}`, marker);
  });

  html = html.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, content) => values[key.trim().replaceAll("_", "-")] ? content : "");
  html = html.replace(/\{\{[^}]+\}\}/g, "");

  const events = data.events.map((e, i) => `
    <div data-schedy-event="${i}">
      <div>${esc(e.name)}</div><div>${esc(dateText(e.date))}</div><div>${esc(timeText(e.time))}</div><div>${esc(e.venue)}</div>
    </div>`).join("");
  return html.replace(/<!--\s*SCHEDY_EVENTS\s*-->/g, events);
}

function sectionFor(field) {
  if (/^bride|^groom/.test(field)) return "couple";
  if (/venue|reception/.test(field)) return "venue";
  return "couple";
}

function Input({ label, field, type = "text", value, onChange, onFocus }) {
  return <label className="f">
    <span>{label}</span>
    <input type={type} value={value ?? ""} onFocus={onFocus} onChange={(e) => onChange(e.target.value)} />
  </label>;
}

function TeluguInput({ label, value, onChange, onFocus }) {
  return <label className="f telugu-field">
    <span>{label}</span>
    <div className="translit-wrap">
      <input value={value ?? ""} onFocus={onFocus} onChange={(e) => onChange(e.target.value)} lang="te" />
    </div>
  </label>;
}

function Bilingual({ enLabel, teLabel, enField, teField, data, set, focus }) {
  return <div className="g two">
    <Input label={enLabel} field={enField} value={data[enField]} onFocus={() => focus(enField)} onChange={(v) => set(enField, v)} />
    <TeluguInput label={teLabel} value={data[teField]} onFocus={() => focus(teField)} onChange={(v) => set(teField, v)} />
  </div>;
}

function RepeatContacts({ field, items, add, patch, remove, focus }) {
  return <>
    {items.map((x) => <div className="repeat" key={x.id}>
      <button type="button" className="icon-delete" aria-label="Remove contact" onClick={() => remove(field, x.id)}><Trash2 size={15} /></button>
      <div className="g three">
        <input placeholder="Name EN" value={x.nameEn ?? ""} onFocus={() => focus(`${field}-${x.id}`)} onChange={(e) => patch(field, x.id, { nameEn: e.target.value })} />
        <input placeholder="Name తెలుగు" value={x.nameTe ?? ""} lang="te" onChange={(e) => patch(field, x.id, { nameTe: e.target.value })} />
        <input placeholder="Phone" value={x.phone ?? ""} onChange={(e) => patch(field, x.id, { phone: e.target.value })} />
      </div>
    </div>)}
    <button type="button" className="outline" onClick={() => add(field, emptyContact)}><Plus size={15} /> Add contact</button>
  </>;
}

export default function Create() {
  const [data, setData] = useState(initial);
  const [categories, setCategories] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeField, setActiveField] = useState("");
  const frameRef = useRef(null);
  const translitTimers = useRef(new Map());
  const translitRequest = useRef(0);
  const editId = new URLSearchParams(window.location.search).get("edit");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: cats, error: ce }, { data: temps, error: te }] = await Promise.all([
        supabase.from("template_categories").select("*").order("name"),
        supabase.from("templates").select("*").order("created_at", { ascending: false })
      ]);
      if (cancelled) return;
      if (ce || te) setMessage((ce || te).message);
      setCategories(cats || []);
      setTemplates(temps || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    (async () => {
      const { data: row, error } = await supabase.from("invitations").select("*").eq("id", editId).single();
      if (cancelled) return;
      if (error) return setMessage(error.message);
      setData((current) => ({
        ...current,
        ...(row.details || {}),
        templateId: row.template_id || row.details?.templateId || "",
        brideEn: row.bride_name || row.details?.brideEn || "",
        groomEn: row.groom_name || row.details?.groomEn || "",
        weddingDate: row.event_date || row.details?.weddingDate || ""
      }));
    })();
    return () => { cancelled = true; };
  }, [editId]);

  const selected = useMemo(() => templates.find((t) => String(t.id) === String(data.templateId)), [templates, data.templateId]);
  const filtered = useMemo(() => data.categoryId === "ALL" ? templates : templates.filter((t) => String(t.category_id) === String(data.categoryId)), [templates, data.categoryId]);
  const source = selected?.html_code || selected?.html || "";
  const compiled = useMemo(() => compile(source, data), [source, data]);

  // First render the complete document, then patch only the changed DOM nodes.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !selected || !compiled) return;
    const render = () => {
      const doc = frame.contentDocument;
      if (!doc?.body) return;
      const parsed = new DOMParser().parseFromString(compiled, "text/html");
      if (!doc.body.children.length) {
        doc.open();
        doc.write(compiled);
        doc.close();
        return;
      }
      morphdom(doc.body, parsed.body, {
        childrenOnly: true,
        getNodeKey: (node) => node.id || node.getAttribute?.("data-preview-key") || node.getAttribute?.("data-schedy-field") || undefined
      });
    };
    if (frame.contentDocument?.readyState === "complete") render();
    frame.addEventListener("load", render);
    return () => frame.removeEventListener("load", render);
  }, [selected?.id]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !compiled || !frame.contentDocument?.body) return;
    const doc = frame.contentDocument;
    const parsed = new DOMParser().parseFromString(compiled, "text/html");
    morphdom(doc.body, parsed.body, {
      childrenOnly: true,
      getNodeKey: (node) => node.id || node.getAttribute?.("data-preview-key") || node.getAttribute?.("data-schedy-field") || undefined
    });
  }, [compiled]);

  // Scroll after the DOM patch, not before it. This fixes the race where the old preview was scrolled and immediately replaced.
  useEffect(() => {
    if (!activeField || !selected) return;
    let cancelled = false;
    let attempts = 0;
    const scroll = () => {
      if (cancelled) return;
      const doc = frameRef.current?.contentDocument;
      if (!doc?.body) return;
      const target = doc.querySelector(`[data-schedy-field="${activeField}"]`) || doc.querySelector(`[data-preview-field="${activeField}"]`) || doc.querySelector(`[data-preview-section="${sectionFor(activeField)}"]`);
      if (!target) {
        if (attempts++ < 12) setTimeout(scroll, 50);
        return;
      }
      target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      target.classList.add("schedy-focus");
      setTimeout(() => target.classList.remove("schedy-focus"), 1200);
    };
    const timer = setTimeout(scroll, 40);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [activeField, compiled, selected?.id]);

  const set = (field, value) => setData((d) => ({ ...d, [field]: value }));
  const focus = (field) => {
    setActiveField(field);
    if (window.innerWidth < 1000) setPreviewOpen(true);
  };
  const add = (field, factory) => setData((d) => ({ ...d, [field]: [...d[field], factory()] }));
  const patch = (field, id, value) => setData((d) => ({ ...d, [field]: d[field].map((x) => x.id === id ? { ...x, ...value } : x) }));
  const remove = (field, id) => setData((d) => ({ ...d, [field]: d[field].filter((x) => x.id !== id) }));

  // Automatically transliterate English names/labels into Telugu without replacing the English input or stealing its focus.
  useEffect(() => {
    const pairs = [
      ["surnameEn", "surnameTe"], ["groomEn", "groomTe"], ["groomFatherEn", "groomFatherTe"], ["groomMotherEn", "groomMotherTe"],
      ["brideEn", "brideTe"], ["brideFatherEn", "brideFatherTe"], ["brideMotherEn", "brideMotherTe"], ["venueEn", "venueTe"]
    ];
    const timers = [];
    pairs.forEach(([en, te]) => {
      const value = String(data[en] || "").trim();
      if (!value) return;
      const timer = setTimeout(async () => {
        const requestId = ++translitRequest.current;
        try {
          const result = await getTransliterateSuggestions(value, {
            numOptions: 1,
            showCurrentWordAsLastSuggestion: false,
            lang: "te"
          });
          if (requestId !== translitRequest.current || !result?.length) return;
          const suggestion = typeof result[0] === "string" ? result[0] : result[0]?.text || result[0]?.suggestion;
          if (suggestion) setData((current) => ({ ...current, [te]: suggestion }));
        } catch {
          // Transliteration is an enhancement; never block normal typing if the remote suggestion service is unavailable.
        }
      }, 350);
      timers.push(timer);
    });
    return () => timers.forEach(clearTimeout);
  }, [data.surnameEn, data.groomEn, data.groomFatherEn, data.groomMotherEn, data.brideEn, data.brideFatherEn, data.brideMotherEn, data.venueEn]);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const payload = {
      bride_name: data.brideEn,
      groom_name: data.groomEn,
      event_date: data.weddingDate || null,
      template_id: data.templateId || null,
      details: data
    };
    const result = editId
      ? await supabase.from("invitations").update(payload).eq("id", editId).select().single()
      : await supabase.from("invitations").insert(payload).select().single();
    if (result.error) setMessage(result.error.message);
    else {
      setMessage(editId ? "Invitation updated." : "Invitation created.");
      if (!editId && result.data?.id) history.replaceState({}, "", `/create?edit=${result.data.id}`);
    }
    setSaving(false);
  }

  return <div className="create">
    <header>
      <div><small>INVITATION BUILDER</small><h1>{editId ? "Edit invitation" : "Create invitation"}</h1><p>Type normally — the preview updates instantly without reloading.</p></div>
      <div className="actions">
        <button className="secondary" type="button" onClick={() => setPreviewOpen(true)}><Eye size={17} /> Preview</button>
        <button className="primary" form="create-form" disabled={saving}>{saving ? <Loader2 className="spin" size={17} /> : <Save size={17} />} {saving ? "Saving..." : editId ? "Update" : "Create"}</button>
      </div>
    </header>

    {message && <div className="msg">{message}</div>}

    <div className="layout">
      <form id="create-form" className="form" onSubmit={save}>
        <section><h2>Template Options</h2>
          <div className="g two">
            <label className="f"><span>Category</span><select value={data.categoryId} onChange={(e) => setData((d) => ({ ...d, categoryId: e.target.value, templateId: "" }))}><option value="ALL">All Categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label className="f"><span>Template</span><select value={data.templateId} onChange={(e) => set("templateId", e.target.value)}><option value="">{loading ? "Loading templates..." : "Select template"}</option>{filtered.map((t) => <option key={t.id} value={t.id}>{t.name || t.title || `Template ${t.id}`}</option>)}</select></label>
          </div>
          <Input label="Custom Link ID" value={data.customId} onChange={(v) => set("customId", v)} />
        </section>

        <section><h2>Family & Wedding</h2>
          <Bilingual enLabel="Family Surname EN" teLabel="Family Surname తెలుగు" enField="surnameEn" teField="surnameTe" data={data} set={set} focus={focus} />
          <div className="g two"><Input label="Wedding Date" value={data.weddingDate} type="date" onFocus={() => focus("weddingDate")} onChange={(v) => set("weddingDate", v)} /><Input label="Muhurtham Time" value={data.muhurthamTime} type="time" onFocus={() => focus("muhurthamTime")} onChange={(v) => set("muhurthamTime", v)} /></div>
        </section>

        <section><h2>Groom's Details</h2>
          <Bilingual enLabel="Groom Name EN" teLabel="Groom Name తెలుగు" enField="groomEn" teField="groomTe" data={data} set={set} focus={focus} />
          <div className="sub">Father's Details</div>
          <Bilingual enLabel="Father EN" teLabel="Father తెలుగు" enField="groomFatherEn" teField="groomFatherTe" data={data} set={set} focus={focus} />
          <Input label="Father Phone" value={data.groomFatherPhone} type="tel" onFocus={() => focus("groomFatherPhone")} onChange={(v) => set("groomFatherPhone", v)} />
          <div className="sub">Mother's Details</div>
          <Bilingual enLabel="Mother EN" teLabel="Mother తెలుగు" enField="groomMotherEn" teField="groomMotherTe" data={data} set={set} focus={focus} />
          <Input label="Mother Phone" value={data.groomMotherPhone} type="tel" onFocus={() => focus("groomMotherPhone")} onChange={(v) => set("groomMotherPhone", v)} />
          <RepeatContacts field="groomContacts" items={data.groomContacts} add={add} patch={patch} remove={remove} focus={focus} />
        </section>

        <section><h2>Bride's Details</h2>
          <Bilingual enLabel="Bride Name EN" teLabel="Bride Name తెలుగు" enField="brideEn" teField="brideTe" data={data} set={set} focus={focus} />
          <div className="sub">Father's Details</div>
          <Bilingual enLabel="Father EN" teLabel="Father తెలుగు" enField="brideFatherEn" teField="brideFatherTe" data={data} set={set} focus={focus} />
          <Input label="Father Phone" value={data.brideFatherPhone} type="tel" onFocus={() => focus("brideFatherPhone")} onChange={(v) => set("brideFatherPhone", v)} />
          <div className="sub">Mother's Details</div>
          <Bilingual enLabel="Mother EN" teLabel="Mother తెలుగు" enField="brideMotherEn" teField="brideMotherTe" data={data} set={set} focus={focus} />
          <Input label="Mother Phone" value={data.brideMotherPhone} type="tel" onFocus={() => focus("brideMotherPhone")} onChange={(v) => set("brideMotherPhone", v)} />
          <RepeatContacts field="brideContacts" items={data.brideContacts} add={add} patch={patch} remove={remove} focus={focus} />
        </section>

        <section><h2>Reception & Venue</h2>
          <label className="check"><input type="checkbox" checked={data.receptionEnabled} onChange={(e) => set("receptionEnabled", e.target.checked)} /> Include reception</label>
          {data.receptionEnabled && <div className="g two"><Input label="Reception Date" value={data.receptionDate} type="date" onFocus={() => focus("receptionDate")} onChange={(v) => set("receptionDate", v)} /><Input label="Reception Time" value={data.receptionTime} type="time" onFocus={() => focus("receptionTime")} onChange={(v) => set("receptionTime", v)} /></div>}
          <Bilingual enLabel="Venue EN" teLabel="Venue తెలుగు" enField="venueEn" teField="venueTe" data={data} set={set} focus={focus} />
          <Input label="Venue Address" value={data.venueAddress} onFocus={() => focus("venueAddress")} onChange={(v) => set("venueAddress", v)} />
          <Input label="Google Maps Link" value={data.venueMaps} onFocus={() => focus("venueMaps")} onChange={(v) => set("venueMaps", v)} />
        </section>

        <section><h2>Additional Events</h2>
          {data.events.map((e) => <div className="event-card" key={e.id}>
            <button type="button" className="icon-delete" aria-label="Remove event" onClick={() => remove("events", e.id)}><Trash2 size={15} /></button>
            <Input label="Event Name" value={e.name} onChange={(v) => patch("events", e.id, { name: v })} />
            <div className="g three"><Input label="Date" type="date" value={e.date} onChange={(v) => patch("events", e.id, { date: v })} /><Input label="Time" type="time" value={e.time} onChange={(v) => patch("events", e.id, { time: v })} /><Input label="Venue" value={e.venue} onChange={(v) => patch("events", e.id, { venue: v })} /></div>
          </div>)}
          <button type="button" className="outline" onClick={() => add("events", emptyEvent)}><Plus size={15} /> Add event</button>
        </section>
      </form>

      <aside className={`preview ${previewOpen ? "mobile-open" : ""}`}>
        <div className="ph"><div><b>Live Preview</b><small>{selected?.name || selected?.title || "Select a template"}</small></div><button type="button" aria-label="Close preview" onClick={() => setPreviewOpen(false)}><X size={18} /></button></div>
        <div className="pf">{selected ? <iframe ref={frameRef} title="Invitation preview" srcDoc={source} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" /> : <div className="empty"><Eye size={28} /><b>Select a template</b><span>Your live invitation appears here.</span></div>}</div>
      </aside>
    </div>

    <style>{`
      .create{font-family:"DM Sans",Inter,system-ui,sans-serif;color:#18181a}.create *{box-sizing:border-box}.create header{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:18px}.create header small{color:#673de6;font-size:11px;font-weight:700;letter-spacing:.1em}.create h1{margin:5px 0;font-size:28px;letter-spacing:-.02em}.create header p{margin:0;color:#71717a;font-size:13px}.actions{display:flex;gap:9px}.primary,.secondary,.outline{min-height:40px;border-radius:9px;padding:0 14px;border:0;display:inline-flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;font-weight:600}.primary{background:#673de6;color:#fff}.primary:disabled{opacity:.65;cursor:not-allowed}.secondary,.outline{background:#fff;border:1px solid #e4e4e7;color:#3f3f46}.msg{background:#f4f0fa;color:#5b32d4;border-radius:9px;padding:11px 13px;font-size:13px;margin-bottom:14px}.layout{display:grid;grid-template-columns:minmax(480px,720px) minmax(420px,1fr);gap:18px;align-items:start}.form{display:flex;flex-direction:column;gap:13px}.form section{background:#fff;border:1px solid #e5e7eb;border-radius:13px;padding:18px}.form h2{margin:0 0 15px;font-size:16px}.sub{font-size:12px;font-weight:700;color:#52525b;margin:8px 0 10px}.g{display:grid;gap:11px}.g.two{grid-template-columns:repeat(2,minmax(0,1fr))}.g.three{grid-template-columns:repeat(3,minmax(0,1fr))}.f{display:flex;flex-direction:column;gap:6px;margin-bottom:11px;min-width:0}.f span{font-size:12px;color:#52525b;font-weight:600}.f input,.f select,.repeat input,.event-card input{width:100%;height:42px;border:1px solid #d4d4d8;border-radius:8px;background:#fff;padding:0 12px;outline:none;font:inherit;color:#18181a}.f input:focus,.f select:focus,.repeat input:focus,.event-card input:focus{border-color:#673de6;box-shadow:0 0 0 3px rgba(103,61,230,.10)}.telugu-field input{font-family:"Noto Sans Telugu","Nirmala UI",sans-serif}.translit-wrap{position:relative}.check{display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:12px}.check input{accent-color:#673de6}.repeat,.event-card{position:relative;border:1px dashed #d4d4d8;border-radius:10px;padding:13px;margin:8px 0}.repeat .g{padding-right:2px}.icon-delete{position:absolute;right:8px;top:8px;border:0;background:#fff;color:#71717a;width:30px;height:30px;border-radius:7px;display:grid;place-items:center;cursor:pointer;z-index:2}.icon-delete:hover{color:#dc2626;background:#fef2f2}.outline{margin-top:4px}.preview{position:sticky;top:18px;height:calc(100vh - 36px);min-height:620px;background:#fff;border:1px solid #e5e7eb;border-radius:13px;overflow:hidden;display:flex;flex-direction:column}.ph{height:58px;flex:0 0 58px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;padding:0 14px}.ph b{display:block;font-size:14px}.ph small{display:block;color:#71717a;font-size:11px;margin-top:2px}.ph button{display:none;border:0;background:#f4f4f5;border-radius:8px;width:34px;height:34px;place-items:center}.pf{position:relative;flex:1;min-height:0;background:#f4f4f5}.pf iframe{display:block;width:100%;height:100%;border:0;background:#fff}.empty{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#71717a;font-size:13px}.empty b{color:#27272a}.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
      @media(max-width:1100px){.layout{grid-template-columns:minmax(420px,1fr) minmax(360px,1fr)}}
      @media(max-width:900px){.create header{align-items:flex-start}.layout{grid-template-columns:1fr}.preview{position:fixed;inset:0;z-index:1000;height:100vh;min-height:0;border-radius:0;display:none}.preview.mobile-open{display:flex}.preview.mobile-open .ph button{display:grid}.g.three{grid-template-columns:1fr 1fr}.actions{flex-shrink:0}}
      @media(max-width:600px){.create header{flex-direction:column}.actions{width:100%}.actions button{flex:1}.g.two,.g.three{grid-template-columns:1fr}.form section{padding:14px}}
    `}</style>
  </div>;
}
