import React, { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Loader2, MapPin, Plus, Save, Trash2, X } from "lucide-react";
import morphdom from "morphdom";
import { supabase } from "../lib/supabase";

const emptyEvent = () => ({ id: crypto.randomUUID(), name: "", date: "", time: "", venue: "" });
const emptyContact = () => ({ id: crypto.randomUUID(), nameEn: "", nameTe: "", phone: "" });
const initial = {
  customId: "", templateId: "", categoryId: "ALL", surnameEn: "", surnameTe: "", weddingDate: "", muhurthamTime: "",
  groomEn: "", groomTe: "", groomFatherEn: "", groomFatherTe: "", groomFatherPhone: "", groomMotherEn: "", groomMotherTe: "", groomMotherPhone: "",
  brideEn: "", brideTe: "", brideFatherEn: "", brideFatherTe: "", brideFatherPhone: "", brideMotherEn: "", brideMotherTe: "", brideMotherPhone: "",
  receptionEnabled: false, receptionDate: "", receptionTime: "", venueEn: "", venueTe: "", venueAddress: "", venueMaps: "", events: [], groomContacts: [], brideContacts: []
};

const esc = (v = "") => String(v).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const dateText = (v) => v ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${v}T00:00:00`)) : "";
const timeText = (v) => { if (!v) return ""; const [h, m] = v.split(":").map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(d); };

function compile(source, data) {
  if (!source) return "";
  const values = {
    "surname-en": data.surnameEn, "surname-te": data.surnameTe, "bride-en": data.brideEn, "bride-te": data.brideTe,
    "groom-en": data.groomEn, "groom-te": data.groomTe, "groom-father-en": data.groomFatherEn, "groom-father-te": data.groomFatherTe,
    "groom-father-phone": data.groomFatherPhone, "groom-mother-en": data.groomMotherEn, "groom-mother-te": data.groomMotherTe,
    "groom-mother-phone": data.groomMotherPhone, "bride-father-en": data.brideFatherEn, "bride-father-te": data.brideFatherTe,
    "bride-father-phone": data.brideFatherPhone, "bride-mother-en": data.brideMotherEn, "bride-mother-te": data.brideMotherTe,
    "bride-mother-phone": data.brideMotherPhone, "wedding-date": data.weddingDate, "event-wedding-date": dateText(data.weddingDate),
    "muhurtham-time": timeText(data.muhurthamTime), "reception-date": dateText(data.receptionDate), "reception-time": timeText(data.receptionTime),
    "venue-en": data.venueEn, "venue-te": data.venueTe, "venue-address": data.venueAddress, "venue-maps": data.venueMaps
  };
  let html = source;
  Object.entries(values).forEach(([key, value]) => { const safe = esc(value); html = html.replaceAll(`{{${key}}}`, safe).replaceAll(`{{${key.replaceAll("-", "_")}}}`, safe); });
  html = html.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, content) => values[key.trim().replaceAll("_", "-")] ? content : "");
  html = html.replace(/\{\{[^}]+\}\}/g, "");
  const events = data.events.map((e, i) => `<div data-schedy-event="${i}"><div>${esc(e.name)}</div><div>${esc(dateText(e.date))}</div><div>${esc(timeText(e.time))}</div><div>${esc(e.venue)}</div></div>`).join("");
  return html.replace(/<!--\s*SCHEDY_EVENTS\s*-->/g, events);
}

function sectionFor(field) {
  if (/^bride/.test(field)) return "couple";
  if (/^groom/.test(field)) return "couple";
  if (/venue|reception/.test(field)) return "venue";
  if (/wedding|muhurtham|surname/.test(field)) return "couple";
  return "couple";
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
  const editId = new URLSearchParams(window.location.search).get("edit");

  useEffect(() => {
    (async () => {
      const [{ data: cats, error: ce }, { data: temps, error: te }] = await Promise.all([
        supabase.from("template_categories").select("*").order("name"),
        supabase.from("templates").select("*").order("created_at", { ascending: false })
      ]);
      if (ce || te) setMessage((ce || te).message);
      setCategories(cats || []); setTemplates(temps || []); setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!editId) return;
    (async () => {
      const { data: row, error } = await supabase.from("invitations").select("*").eq("id", editId).single();
      if (error) return setMessage(error.message);
      setData((current) => ({ ...current, ...(row.details || {}), templateId: row.template_id || row.details?.templateId || "", brideEn: row.bride_name || row.details?.brideEn || "", groomEn: row.groom_name || row.details?.groomEn || "", weddingDate: row.event_date || row.details?.weddingDate || "" }));
    })();
  }, [editId]);

  const selected = useMemo(() => templates.find((t) => String(t.id) === String(data.templateId)), [templates, data.templateId]);
  const filtered = useMemo(() => data.categoryId === "ALL" ? templates : templates.filter((t) => String(t.category_id) === String(data.categoryId)), [templates, data.categoryId]);
  const html = useMemo(() => compile(selected?.html_code || selected?.html || "", data), [selected, data]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !html) return;
    const render = () => {
      const doc = frame.contentDocument;
      if (!doc?.body) return;
      const parsed = new DOMParser().parseFromString(html, "text/html");
      if (!doc.body.children.length) { doc.open(); doc.write(html); doc.close(); return; }
      morphdom(doc.body, parsed.body, { childrenOnly: true, getNodeKey: (node) => node.id || node.getAttribute?.("data-preview-key") || undefined });
    };
    if (frame.contentDocument?.readyState === "complete") render(); else frame.addEventListener("load", render, { once: true });
    return () => frame.removeEventListener("load", render);
  }, [html]);

  useEffect(() => {
    if (!activeField || !frameRef.current) return;
    const doc = frameRef.current.contentDocument;
    if (!doc) return;
    const target = doc.querySelector(`[data-preview-field="${activeField}"]`) || doc.querySelector(`[data-preview-section="${sectionFor(activeField)}"]`);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("schedy-focus");
    const timer = setTimeout(() => target.classList.remove("schedy-focus"), 1200);
    return () => clearTimeout(timer);
  }, [activeField]);

  const set = (field, value) => setData((d) => ({ ...d, [field]: value }));
  const add = (field, factory) => setData((d) => ({ ...d, [field]: [...d[field], factory()] }));
  const patch = (field, id, value) => setData((d) => ({ ...d, [field]: d[field].map((x) => x.id === id ? { ...x, ...value } : x) }));
  const remove = (field, id) => setData((d) => ({ ...d, [field]: d[field].filter((x) => x.id !== id) }));
  const focus = (field) => { setActiveField(field); if (window.innerWidth < 1000) setPreviewOpen(true); };

  async function save(e) {
    e.preventDefault(); setSaving(true); setMessage("");
    const payload = { bride_name: data.brideEn, groom_name: data.groomEn, event_date: data.weddingDate || null, template_id: data.templateId || null, details: data };
    const result = editId ? await supabase.from("invitations").update(payload).eq("id", editId).select().single() : await supabase.from("invitations").insert(payload).select().single();
    if (result.error) setMessage(result.error.message); else { setMessage(editId ? "Invitation updated." : "Invitation created."); if (!editId && result.data?.id) history.replaceState({}, "", `/create?edit=${result.data.id}`); }
    setSaving(false);
  }

  const Input = ({ label, field, type = "text" }) => <label className="field"><span>{label}</span><input type={type} value={data[field] || ""} onFocus={() => focus(field)} onChange={(e) => set(field, e.target.value)} /></label>;

  return <div className="create-page">
    <div className="create-head"><div><small>INVITATION BUILDER</small><h1>{editId ? "Edit invitation" : "Create invitation"}</h1><p>Complete form on the left. Live template preview on the right.</p></div><div className="actions"><button type="button" className="secondary" onClick={() => setPreviewOpen(true)}><Eye size={17}/> Preview</button><button form="create-form" className="primary" disabled={saving}>{saving ? <Loader2 className="spin" size={17}/> : <Save size={17}/>} {saving ? "Saving..." : editId ? "Update" : "Create"}</button></div></div>
    {message && <div className="message">{message}</div>}
    <div className="builder">
      <form id="create-form" className="form" onSubmit={save}>
        <section><h2>Template Options</h2><div className="grid two"><label className="field"><span>Category</span><select value={data.categoryId} onChange={(e) => setData((d) => ({ ...d, categoryId: e.target.value, templateId: "" }))}><option value="ALL">All Categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="field"><span>Template</span><select value={data.templateId} onChange={(e) => set("templateId", e.target.value)}><option value="">{loading ? "Loading templates..." : "Select template"}</option>{filtered.map((t) => <option key={t.id} value={t.id}>{t.name || t.title || `Template ${t.id}`}</option>)}</select></label></div><Input label="Custom Link ID" field="customId" /></section>
        <section><h2>Family & Wedding</h2><div className="grid two"><Input label="Family Surname EN" field="surnameEn"/><Input label="Family Surname తెలుగు" field="surnameTe"/><Input label="Wedding Date" field="weddingDate" type="date"/><Input label="Muhurtham Time" field="muhurthamTime" type="time"/></div></section>
        <section><h2>Groom's Details</h2><div className="grid two"><Input label="Groom Name EN" field="groomEn"/><Input label="Groom Name తెలుగు" field="groomTe"/></div><div className="grid three"><Input label="Father EN" field="groomFatherEn"/><Input label="Father తెలుగు" field="groomFatherTe"/><Input label="Father Phone" field="groomFatherPhone" type="tel"/><Input label="Mother EN" field="groomMotherEn"/><Input label="Mother తెలుగు" field="groomMotherTe"/><Input label="Mother Phone" field="groomMotherPhone" type="tel"/></div>{data.groomContacts.map((c)=><div className="repeat" key={c.id}><button type="button" onClick={()=>remove("groomContacts",c.id)}><Trash2 size={15}/></button><div className="grid three"><input placeholder="Name EN" value={c.nameEn} onChange={(e)=>patch("groomContacts",c.id,{nameEn:e.target.value})}/><input placeholder="Name తెలుగు" value={c.nameTe} onChange={(e)=>patch("groomContacts",c.id,{nameTe:e.target.value})}/><input placeholder="Phone" value={c.phone} onChange={(e)=>patch("groomContacts",c.id,{phone:e.target.value})}/></div></div>)}<button type="button" className="outline" onClick={()=>add("groomContacts",emptyContact)}><Plus size={15}/> Add contact</button></section>
        <section><h2>Bride's Details</h2><div className="grid two"><Input label="Bride Name EN" field="brideEn"/><Input label="Bride Name తెలుగు" field="brideTe"/></div><div className="grid three"><Input label="Father EN" field="brideFatherEn"/><Input label="Father తెలుగు" field="brideFatherTe"/><Input label="Father Phone" field="brideFatherPhone" type="tel"/><Input label="Mother EN" field="brideMotherEn"/><Input label="Mother తెలుగు" field="brideMotherTe"/><Input label="Mother Phone" field="brideMotherPhone" type="tel"/></div>{data.brideContacts.map((c)=><div className="repeat" key={c.id}><button type="button" onClick={()=>remove("brideContacts",c.id)}><Trash2 size={15}/></button><div className="grid three"><input placeholder="Name EN" value={c.nameEn} onChange={(e)=>patch("brideContacts",c.id,{nameEn:e.target.value})}/><input placeholder="Name తెలుగు" value={c.nameTe} onChange={(e)=>patch("brideContacts",c.id,{nameTe:e.target.value})}/><input placeholder="Phone" value={c.phone} onChange={(e)=>patch("brideContacts",c.id,{phone:e.target.value})}/></div></div>)}<button type="button" className="outline" onClick={()=>add("brideContacts",emptyContact)}><Plus size={15}/> Add contact</button></section>
        <section><h2>Reception & Venue</h2><label className="check"><input type="checkbox" checked={data.receptionEnabled} onChange={(e)=>set("receptionEnabled",e.target.checked)}/> Include reception</label>{data.receptionEnabled&&<div className="grid two"><Input label="Reception Date" field="receptionDate" type="date"/><Input label="Reception Time" field="receptionTime" type="time"/></div>}<div className="grid two"><Input label="Venue EN" field="venueEn"/><Input label="Venue తెలుగు" field="venueTe"/></div><Input label="Venue Address" field="venueAddress"/><label className="field"><span>Google Maps Link</span><input type="url" value={data.venueMaps} onFocus={()=>focus("venueMaps")} onChange={(e)=>set("venueMaps",e.target.value)}/></label></section>
        <section><h2>Additional Events</h2>{data.events.map((e)=><div className="repeat" key={e.id}><button type="button" onClick={()=>remove("events",e.id)}><Trash2 size={15}/></button><div className="grid two"><input placeholder="Event name" value={e.name} onChange={(x)=>patch("events",e.id,{name:x.target.value})}/><input placeholder="Venue" value={e.venue} onChange={(x)=>patch("events",e.id,{venue:x.target.value})}/><input type="date" value={e.date} onChange={(x)=>patch("events",e.id,{date:x.target.value})}/><input type="time" value={e.time} onChange={(x)=>patch("events",e.id,{time:x.target.value})}/></div></div>)}<button type="button" className="outline" onClick={()=>add("events",emptyEvent)}><Plus size={15}/> Add event</button></section>
      </form>
      <aside className={`preview ${previewOpen ? "mobile" : ""}`}><div className="preview-head"><div><strong>Live Preview</strong><small>{selected?.name || selected?.title || "Select a template"}</small></div><button type="button" onClick={()=>setPreviewOpen(false)}><X size={18}/></button></div><div className="frame">{selected ? <iframe ref={frameRef} title="Invitation preview" srcDoc={html} sandbox="allow-scripts allow-same-origin allow-forms allow-popups"/> : <div className="empty"><Eye size={28}/><strong>Select a template</strong><span>Your live invitation appears here.</span></div>}</div></aside>
    </div>
    <style>{`.create-page{font-family:"DM Sans",Inter,sans-serif;color:#18181a;max-width:1800px;margin:auto}.create-head{display:flex;justify-content:space-between;gap:20px;align-items:end;margin-bottom:18px}.create-head small{color:#673de6;font-weight:700;letter-spacing:.1em}.create-head h1{margin:5px 0;font-size:28px}.create-head p{margin:0;color:#71717a;font-size:13px}.actions{display:flex;gap:9px}.primary,.secondary,.outline{height:40px;border-radius:9px;padding:0 14px;border:0;display:inline-flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;font-weight:600}.primary{background:#673de6;color:#fff}.secondary,.outline{background:#fff;border:1px solid #e4e4e7;color:#3f3f46}.message{margin-bottom:14px;background:#f4f0fa;color:#5b32d4;border-radius:9px;padding:11px 13px;font-size:13px}.builder{display:grid;grid-template-columns:minmax(480px,720px) minmax(420px,1fr);gap:18px}.form{display:flex;flex-direction:column;gap:13px}.form section{background:#fff;border:1px solid #e5e7eb;border-radius:13px;padding:18px}.form h2{font-size:16px;margin:0 0 16px}.grid{display:grid;gap:11px}.grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}.grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}.field{display:flex;flex-direction:column;gap:6px;margin-bottom:11px}.field span{font-size:12px;font-weight:600;color:#52525b}.field input,.field select,.repeat input{height:40px;border:1px solid #dedee3;border-radius:8px;padding:0 11px;outline:0;font:500 13px inherit;background:#fff}.field input:focus,.field select:focus,.repeat input:focus{border-color:#9b82ef;box-shadow:0 0 0 3px #673de614}.repeat{position:relative;background:#fafafa;border:1px solid #e4e4e7;border-radius:9px;padding:12px;margin:10px 0}.repeat>button{position:absolute;right:7px;top:7px;border:0;background:transparent;color:#71717a;cursor:pointer}.repeat .grid{padding-top:18px}.outline{height:36px;font-size:12px}.check{display:flex;gap:8px;align-items:center;font-size:13px;margin-bottom:12px}.preview{position:sticky;top:15px;height:calc(100vh - 125px);min-height:580px;background:#fff;border:1px solid #e5e7eb;border-radius:13px;overflow:hidden}.preview-head{height:56px;border-bottom:1px solid #e5e7eb;padding:0 14px;display:flex;align-items:center;justify-content:space-between}.preview-head strong,.preview-head small{display:block}.preview-head strong{font-size:13px}.preview-head small{font-size:11px;color:#a1a1aa;margin-top:2px}.preview-head button{display:none;border:0;background:transparent;cursor:pointer}.frame{height:calc(100% - 56px);background:#f5f5f5}.frame iframe{width:100%;height:100%;border:0;background:#fff}.empty{height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:7px;color:#a1a1aa}.empty strong{font-size:13px;color:#52525b}.empty span{font-size:11px}.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.check input{accent-color:#673de6}@media(max-width:1050px){.builder{grid-template-columns:1fr}.preview{display:none}.preview.mobile{display:block;position:fixed;inset:0;z-index:3000;height:100vh;border-radius:0}.preview.mobile .preview-head button{display:block}}@media(max-width:700px){.create-head{align-items:flex-start;flex-direction:column}.create-head h1{font-size:24px}.actions{width:100%}.actions .secondary{flex:1}.actions .primary{display:none}.grid.two,.grid.three{grid-template-columns:1fr}.form section{padding:15px}}`}</style>
  </div>;
}
