import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarPlus, Check, Eye, Heart, LayoutTemplate, Loader2, MapPin, Plus, Save, Trash2, User, Users, X } from "lucide-react";
import morphdom from "morphdom";
import { demoCategories, demoTemplates, getDemoInvitations, saveDemoInvitation } from "../lib/demoData";
import { compile } from "../lib/compileInvitation";

const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const newEvent = () => ({ id: uid(), name: "", nameTe: "", date: "", time: "", venue: "", venueTe: "", maps: "" });
const newContact = () => ({ id: uid(), nameEn: "", nameTe: "", phone: "" });
const initial = { customId:"",templateId:"",categoryId:"ALL",surnameEn:"",surnameTe:"",weddingDate:"",muhurthamTime:"",groomEn:"",groomTe:"",groomFatherEn:"",groomFatherTe:"",groomFatherPhone:"",groomMotherEn:"",groomMotherTe:"",groomMotherPhone:"",brideEn:"",brideTe:"",brideFatherEn:"",brideFatherTe:"",brideFatherPhone:"",brideMotherEn:"",brideMotherTe:"",brideMotherPhone:"",receptionEnabled:false,receptionDate:"",receptionTime:"",venueEn:"",venueTe:"",venueAddress:"",venueMaps:"",events:[],groomContacts:[],brideContacts:[] };
const EN_TO_TE={surnameEn:"surnameTe",groomEn:"groomTe",groomFatherEn:"groomFatherTe",groomMotherEn:"groomMotherTe",brideEn:"brideTe",brideFatherEn:"brideFatherTe",brideMotherEn:"brideMotherTe",venueEn:"venueTe"};
function Input({label,type="text",value,onChange,onFocus}){return <label className="f"><span>{label}</span><input type={type} value={value??""} onFocus={onFocus} onChange={e=>onChange(e.target.value)}/></label>}
function TeluguInput({label,value,onChange,onFocus}){return <label className="f te"><span>{label}</span><input lang="te" value={value??""} onFocus={onFocus} onChange={e=>onChange(e.target.value)}/></label>}
function Bilingual({enLabel,teLabel,enField,teField,data,set,focus}){return <div className="grid two"><Input label={enLabel} value={data[enField]} onFocus={()=>focus(enField)} onChange={v=>set(enField,v)}/><TeluguInput label={teLabel} value={data[teField]} onFocus={()=>focus(teField)} onChange={v=>set(teField,v)}/></div>}
function Contacts({field,items,add,patch,remove,focus}){return <>{items.map(x=><div className="repeat" key={x.id}><button type="button" className="del" aria-label="Remove contact" onClick={()=>remove(field,x.id)}><Trash2 size={15}/></button><div className="grid three"><input placeholder="Name EN" value={x.nameEn} onFocus={()=>focus(field)} onChange={e=>patch(field,x.id,{nameEn:e.target.value})}/><input lang="te" placeholder="Name తెలుగు" value={x.nameTe} onChange={e=>patch(field,x.id,{nameTe:e.target.value})}/><input placeholder="Phone" value={x.phone} onFocus={()=>focus(field)} onChange={e=>patch(field,x.id,{phone:e.target.value})}/></div></div>)}{items.length<1&&<button type="button" className="outline" onClick={()=>add(field,newContact)}><Plus size={15}/> Add contact</button>}</>}

function jsonpTransliterate(){return Promise.resolve("");}
const TARGETS={surnameEn:"surname-te",surnameTe:"surname-te",groomEn:"groom-te",groomTe:"groom-te",groomFatherEn:"groom-father-te",groomFatherTe:"groom-father-te",groomMotherEn:"groom-mother-te",groomMotherTe:"groom-mother-te",brideEn:"bride-te",brideTe:"bride-te",brideFatherEn:"bride-father-te",brideFatherTe:"bride-father-te",brideMotherEn:"bride-mother-te",brideMotherTe:"bride-mother-te",weddingDate:"event-wedding-date",muhurthamTime:"event-wedding-time",receptionDate:"event-reception-date",receptionTime:"event-reception-time",venueEn:"venue-te",venueTe:"venue-te",venueAddress:"venue-te",venueMaps:"venue-te",groomContacts:"groom-extra-1-phone",brideContacts:"bride-extra-1-phone"};

export default function Create({onPanelChange}){
 const [data,setData]=useState(initial),[categories,setCategories]=useState(demoCategories),[templates,setTemplates]=useState(demoTemplates),[loading,setLoading]=useState(false),[saving,setSaving]=useState(false),[message,setMessage]=useState(""),[previewOpen,setPreviewOpen]=useState(false),[focusRequest,setFocusRequest]=useState(null),[slot,setSlot]=useState(null),[toast,setToast]=useState(null);
 const frameRef=useRef(null),translitTimers=useRef(new Map()),translitSeq=useRef(0),toastTimer=useRef(),editId=useMemo(()=>new URLSearchParams(window.location.search).get("edit"),[]);

 /* Bottom toast, same as the dashboard. */
 const notify=(msg)=>{clearTimeout(toastTimer.current);setToast({msg});toastTimer.current=setTimeout(()=>setToast(null),2200)};
 useEffect(()=>()=>{clearTimeout(toastTimer.current);translitTimers.current.forEach(t=>clearTimeout(t))},[]);

 useEffect(()=>{setSlot(document.getElementById("preview-slot"))},[]);
 /* The live preview is a permanent right-side panel on desktop (>900px): tell App so the sidebar becomes a rail + overlay menu. */
 useEffect(()=>{if(!slot)return;const report=()=>onPanelChange?.(window.innerWidth>900);report();window.addEventListener("resize",report);return()=>{window.removeEventListener("resize",report);onPanelChange?.(false)}},[slot]);
 useEffect(()=>{if(!editId)return;const row=getDemoInvitations().find(x=>x.id===editId);if(!row){setMessage("Invitation not found. You can create a new one.");return}const details=row.details||{};setData(prev=>({...prev,...details,templateId:row.template_id||details.templateId||"",brideEn:row.bride_name||details.brideEn||"",groomEn:row.groom_name||details.groomEn||"",weddingDate:row.event_date||details.weddingDate||""}))},[editId]);
 const selected=useMemo(()=>templates.find(t=>String(t.id)===String(data.templateId)),[templates,data.templateId]);
 const filtered=useMemo(()=>data.categoryId==="ALL"?templates:templates.filter(t=>String(t.category_id)===String(data.categoryId)),[templates,data.categoryId]);
 const source=selected?.html_code||selected?.html||"",compiled=useMemo(()=>compile(source,data),[source,data]);
 useEffect(()=>{const iframe=frameRef.current;if(!iframe||!compiled||!iframe.contentDocument?.body)return;const parsed=new DOMParser().parseFromString(compiled,"text/html");morphdom(iframe.contentDocument.body,parsed.body,{childrenOnly:true,getNodeKey:node=>node.id||node.dataset?.previewKey||null})},[compiled,slot]);
 useEffect(()=>{if(!focusRequest||!selected)return;let cancelled=false,attempts=0;const targetName=TARGETS[focusRequest.field]||focusRequest.field;const run=()=>{if(cancelled)return;const iframe=frameRef.current,doc=iframe?.contentDocument,win=iframe?.contentWindow;if(!doc?.body||!win){if(attempts++<40)setTimeout(run,50);return}const escaped=CSS.escape(targetName),target=doc.querySelector(`[data-scroll-target="${escaped}"]`)||doc.querySelector(`[data-schedy-field="${escaped}"]`)||doc.getElementById(targetName);if(!target){if(attempts++<40)setTimeout(run,50);return}const rect=target.getBoundingClientRect(),current=win.scrollY||doc.documentElement.scrollTop||doc.body.scrollTop||0,top=Math.max(0,current+rect.top-Math.max(60,(win.innerHeight||700)*.34));win.scrollTo({top,behavior:"smooth"});target.classList.add("schedy-focus");window.setTimeout(()=>target.classList.remove("schedy-focus"),1200)};const timer=setTimeout(run,100);return()=>{cancelled=true;clearTimeout(timer)}},[focusRequest,selected]);
 const scheduleTransliteration=(sourceField,targetField,value,apply)=>{const key=`${sourceField}:${targetField}`,old=translitTimers.current.get(key);if(old)clearTimeout(old);if(!String(value).trim()){apply("");return}const timer=setTimeout(async()=>{const request=++translitSeq.current;try{const result=await jsonpTransliterate(value);if(request===translitSeq.current&&result)apply(result)}catch{}},450);translitTimers.current.set(key,timer)};
 const set=(key,value)=>{setData(prev=>({...prev,[key]:value}));const target=EN_TO_TE[key];if(target)scheduleTransliteration(key,target,value,result=>setData(prev=>({...prev,[target]:result})))};
 const focus=field=>{setFocusRequest({field,id:uid()});if(window.innerWidth<=900)setPreviewOpen(true)};
 const add=(field,maker)=>setData(prev=>({...prev,[field]:[...prev[field],maker()]}));
 const patch=(field,id,patchValue)=>{setData(prev=>({...prev,[field]:prev[field].map(x=>x.id===id?{...x,...patchValue}:x)}));if(field==="events"){if(patchValue.name!==undefined)scheduleTransliteration(`event-${id}-name`,`event-${id}-nameTe`,patchValue.name,result=>setData(prev=>({...prev,events:prev.events.map(x=>x.id===id?{...x,nameTe:result}:x)})));if(patchValue.venue!==undefined)scheduleTransliteration(`event-${id}-venue`,`event-${id}-venueTe`,patchValue.venue,result=>setData(prev=>({...prev,events:prev.events.map(x=>x.id===id?{...x,venueTe:result}:x)})))}};
 const remove=(field,id)=>setData(prev=>({...prev,[field]:prev[field].filter(x=>x.id!==id)}));
 async function save(e){e.preventDefault();setSaving(true);setMessage("");const id=editId||uid();const payload={id,bride_name:data.brideEn,groom_name:data.groomEn,event_date:data.weddingDate||null,template_id:data.templateId||null,template_name:selected?.name||selected?.title||"Custom invitation",details:data};saveDemoInvitation(payload);notify(editId?"Invitation updated":"Invitation saved");if(!editId)history.replaceState({},"",`/create?edit=${id}`);setSaving(false)}
 return <div className="create"><header><div><h1>{editId?"Edit invitation":"Create invitation"}</h1><p>Fill in the details to build your invitation.</p></div><div className="actions"><button className="secondary" type="button" onClick={()=>setPreviewOpen(true)}><Eye size={17}/> Preview</button><button className="primary" form="create-form" disabled={saving}>{saving?<Loader2 className="spin" size={17}/>:<Save size={17}/>} {saving?"Saving...":editId?"Update":"Create"}</button></div></header>{message&&<div className="msg">{message}</div>}
 <div className="create-builder-layout"><form id="create-form" className="create-builder-form" onSubmit={save}>
 <section><h2><i><LayoutTemplate size={17}/></i>Template Options</h2><div className="grid two"><label className="f"><span>Category</span><select value={data.categoryId} onChange={e=>setData(d=>({...d,categoryId:e.target.value,templateId:""}))}><option value="ALL">All Categories</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="f"><span>Template</span><select value={data.templateId} onChange={e=>set("templateId",e.target.value)}><option value="">{loading?"Loading templates...":"Select template"}</option>{filtered.map(t=><option key={t.id} value={t.id}>{t.name||t.title||`Template ${t.id}`}</option>)}</select></label></div><Input label="Custom Link ID" value={data.customId} onChange={v=>set("customId",v)}/></section>
 <section><h2><i><Users size={17}/></i>Family & Wedding</h2><Bilingual enLabel="Family Surname EN" teLabel="Family Surname తెలుగు" enField="surnameEn" teField="surnameTe" data={data} set={set} focus={focus}/><div className="grid two"><Input label="Wedding Date" type="date" value={data.weddingDate} onFocus={()=>focus("weddingDate")} onChange={v=>set("weddingDate",v)}/><Input label="Muhurtham Time" type="time" value={data.muhurthamTime} onFocus={()=>focus("muhurthamTime")} onChange={v=>set("muhurthamTime",v)}/></div></section>
 <section><h2><i><User size={17}/></i>Groom's Details</h2><Bilingual enLabel="Groom Name EN" teLabel="Groom Name తెలుగు" enField="groomEn" teField="groomTe" data={data} set={set} focus={focus}/><div className="sub">Father's Details</div><Bilingual enLabel="Father EN" teLabel="Father తెలుగు" enField="groomFatherEn" teField="groomFatherTe" data={data} set={set} focus={focus}/><Input label="Father Phone" type="tel" value={data.groomFatherPhone} onFocus={()=>focus("groomFatherPhone")} onChange={v=>set("groomFatherPhone",v)}/><div className="sub">Mother's Details</div><Bilingual enLabel="Mother EN" teLabel="Mother తెలుగు" enField="groomMotherEn" teField="groomMotherTe" data={data} set={set} focus={focus}/><Input label="Mother Phone" type="tel" value={data.groomMotherPhone} onFocus={()=>focus("groomMotherPhone")} onChange={v=>set("groomMotherPhone",v)}/><Contacts field="groomContacts" items={data.groomContacts} add={add} patch={patch} remove={remove} focus={focus}/></section>
 <section><h2><i><Heart size={17}/></i>Bride's Details</h2><Bilingual enLabel="Bride Name EN" teLabel="Bride Name తెలుగు" enField="brideEn" teField="brideTe" data={data} set={set} focus={focus}/><div className="sub">Father's Details</div><Bilingual enLabel="Father EN" teLabel="Father తెలుగు" enField="brideFatherEn" teField="brideFatherTe" data={data} set={set} focus={focus}/><Input label="Father Phone" type="tel" value={data.brideFatherPhone} onFocus={()=>focus("brideFatherPhone")} onChange={v=>set("brideFatherPhone",v)}/><div className="sub">Mother's Details</div><Bilingual enLabel="Mother EN" teLabel="Mother తెలుగు" enField="brideMotherEn" teField="brideMotherTe" data={data} set={set} focus={focus}/><Input label="Mother Phone" type="tel" value={data.brideMotherPhone} onFocus={()=>focus("brideMotherPhone")} onChange={v=>set("brideMotherPhone",v)}/><Contacts field="brideContacts" items={data.brideContacts} add={add} patch={patch} remove={remove} focus={focus}/></section>
 <section><h2><i><MapPin size={17}/></i>Reception & Venue</h2><label className="check"><input type="checkbox" checked={data.receptionEnabled} onChange={e=>set("receptionEnabled",e.target.checked)}/> Include reception</label>{data.receptionEnabled&&<div className="grid two"><Input label="Reception Date" type="date" value={data.receptionDate} onFocus={()=>focus("receptionDate")} onChange={v=>set("receptionDate",v)}/><Input label="Reception Time" type="time" value={data.receptionTime} onFocus={()=>focus("receptionTime")} onChange={v=>set("receptionTime",v)}/></div>}<Bilingual enLabel="Venue EN" teLabel="Venue తెలుగు" enField="venueEn" teField="venueTe" data={data} set={set} focus={focus}/><Input label="Venue Address" value={data.venueAddress} onFocus={()=>focus("venueAddress")} onChange={v=>set("venueAddress",v)}/><Input label="Google Maps Link" value={data.venueMaps} onFocus={()=>focus("venueMaps")} onChange={v=>set("venueMaps",v)}/></section>
 <section><h2><i><CalendarPlus size={17}/></i>Additional Events</h2>{data.events.map((event,index)=><div className="repeat" key={event.id}><button type="button" className="del" aria-label="Remove event" onClick={()=>remove("events",event.id)}><Trash2 size={15}/></button><div className="sub">Event {index+1}</div><div className="grid two"><Input label="Event Name EN" value={event.name} onFocus={()=>focus(`event-${index+1}-name-te`)} onChange={v=>patch("events",event.id,{name:v})}/><TeluguInput label="Event Name తెలుగు" value={event.nameTe} onFocus={()=>focus(`event-${index+1}-name-te`)} onChange={v=>patch("events",event.id,{nameTe:v})}/></div><div className="grid three"><Input label="Date" type="date" value={event.date} onFocus={()=>focus(`event-${index+1}-date`)} onChange={v=>patch("events",event.id,{date:v})}/><Input label="Time" type="time" value={event.time} onFocus={()=>focus(`event-${index+1}-time`)} onChange={v=>patch("events",event.id,{time:v})}/><Input label="Venue EN" value={event.venue} onFocus={()=>focus(`event-${index+1}-venue-te`)} onChange={v=>patch("events",event.id,{venue:v})}/></div><TeluguInput label="Venue తెలుగు" value={event.venueTe} onFocus={()=>focus(`event-${index+1}-venue-te`)} onChange={v=>patch("events",event.id,{venueTe:v})}/><Input label="Google Maps Link" value={event.maps} onChange={v=>patch("events",event.id,{maps:v})}/></div>)}{data.events.length<2?<button type="button" className="outline" onClick={()=>add("events",newEvent)}><Plus size={15}/> Add event</button>:<div className="hint">This template supports two additional event slots.</div>}</section>
 </form></div>
 {slot&&createPortal(<aside className={`create-live-preview-panel ${previewOpen?"mobile-open":""}`}><div className="create-live-preview-head"><div><b>Live Preview</b><small>{selected?.name||selected?.title||"Select a template"}</small></div><button type="button" aria-label="Close preview" onClick={()=>setPreviewOpen(false)}><X size={18}/></button></div><div className="create-live-preview-body">{selected?<iframe key={selected.id} ref={frameRef} title="Invitation preview" srcDoc={source} sandbox="allow-scripts allow-same-origin allow-forms allow-popups"/>:<div className="empty"><Eye size={28}/><b>Select a template</b><span>Your live invitation appears here.</span></div>}</div></aside>, slot)}
 {toast&&createPortal(<div className="dx-toast" role="status"><Check size={15}/> {toast.msg}</div>,document.body)}
 <style>{`
  :root { --dx-toast-bg: #1f2233; }
  .create { font-family: "DM Sans", Inter, system-ui, sans-serif; color: var(--dark); }
  .create * { box-sizing: border-box; }

  /* ---------- page header ---------- */
  .create header { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 20px; }
  .create h1 { margin: 0 0 4px; font-size: 28px; line-height: 1.15; color: var(--dark); font-weight: 700; }
  .create header p { margin: 0; color: var(--gray); font-size: 14px; }
  .actions { display: flex; align-items: center; gap: 10px; }
  .actions .secondary { display: none; }

  .primary, .secondary, .outline { height: 44px; border-radius: 14px; padding: 0 18px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; font-size: 14px; font-weight: 600; line-height: 1; white-space: nowrap; transition: background .2s, border-color .2s, color .2s, box-shadow .2s; }
  .primary svg, .secondary svg, .outline svg { flex-shrink: 0; }
  .primary { border: 0; background: var(--primary); color: var(--white); box-shadow: 0 4px 12px rgba(103, 61, 230, .25); }
  .primary:hover:not(:disabled) { background: var(--primary-dark); }
  .primary:disabled { opacity: .65; cursor: not-allowed; box-shadow: none; }
  .secondary { background: var(--white); border: 1px solid var(--gray-border); color: var(--gray-dark); }
  .secondary:hover { background: var(--gray-light); }
  .outline { width: 100%; height: 46px; background: var(--ghost-white); border: 1.5px dashed var(--periwinkle); color: var(--primary); }
  .outline:hover { background: var(--primary-lightest); border-color: var(--primary); }

  .msg { display: flex; align-items: center; gap: 10px; background: var(--primary-light); color: var(--primary-dark); border-radius: 14px; padding: 13px 16px; font-size: 13px; line-height: 1.4; margin-bottom: 12px; }

  /* ---------- form cards ---------- */
  .create-builder-layout { display: block !important; width: 100%; }
  .create-builder-form { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
  .create-builder-form section { display: flex; flex-direction: column; gap: 14px; background: var(--white); border: 1px solid var(--gray-border); border-radius: 22px; padding: 24px; }
  .create-builder-form h2 { display: flex; align-items: center; gap: 12px; margin: 0 0 6px; font-size: 16px; font-weight: 700; color: var(--dark); }
  .create-builder-form h2 i { width: 34px; height: 34px; flex-shrink: 0; border-radius: 12px; background: var(--primary-light); color: var(--primary); display: grid; place-items: center; }

  .sub { display: flex; align-items: center; gap: 12px; margin: 4px 0 0; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--gray); }
  .sub::after { content: ""; flex: 1; height: 1px; background: var(--gray-border); }
  .hint { font-size: 12px; color: var(--gray); }

  .grid { display: grid; gap: 14px 12px; }
  .grid.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .grid.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }

  /* ---------- fields ---------- */
  .f { display: flex; flex-direction: column; gap: 7px; margin: 0; min-width: 0; }
  .f span { font-size: 12.5px; color: var(--gray-dark); font-weight: 600; }
  .f input, .f select, .repeat input { width: 100%; height: 46px; border: 1px solid var(--gray-border); border-radius: 14px; background-color: var(--white); padding: 0 16px; outline: none; font: inherit; font-size: 14px; font-weight: 500; color: var(--dark); transition: border-color .2s, box-shadow .2s, background-color .2s; }
  .f input::placeholder, .repeat input::placeholder { color: #9a9cab; font-weight: 400; }
  .f input:hover, .f select:hover, .repeat input:hover { border-color: var(--periwinkle); }
  .f input:focus, .f select:focus, .repeat input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-lightest); }
  .f input[type="date"], .f input[type="time"] { color-scheme: light; }
  .te input { font-family: "Noto Sans Telugu", "Nirmala UI", sans-serif; }

  .f select { appearance: none; -webkit-appearance: none; padding-right: 40px; cursor: pointer; background-repeat: no-repeat; background-position: right 16px center; background-size: 16px; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236d7081' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); }
  .f select:focus { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23673de6' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); }

  .check { display: flex; align-items: center; gap: 12px; padding: 13px 16px; border: 1px solid var(--gray-border); border-radius: 14px; background: var(--ghost-white); font-size: 14px; font-weight: 600; color: var(--dark); cursor: pointer; user-select: none; }
  .check:hover { border-color: var(--periwinkle); }
  .check input { appearance: none; -webkit-appearance: none; width: 20px; height: 20px; margin: 0; flex-shrink: 0; border: 1.5px solid var(--periwinkle); border-radius: 6px; background: var(--white) center / 13px no-repeat; cursor: pointer; transition: background-color .15s, border-color .15s; }
  .check input:checked { background-color: var(--primary); border-color: var(--primary); background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E"); }
  .check input:focus-visible { box-shadow: 0 0 0 3px var(--primary-lightest); outline: none; }

  /* ---------- repeatable blocks ---------- */
  .repeat { position: relative; display: flex; flex-direction: column; gap: 14px; border: 1px solid var(--gray-border); border-radius: 18px; padding: 20px 18px 18px; margin: 4px 0 0; background: var(--ghost-white); }
  .del { position: absolute; right: -9px; top: -9px; width: 28px; height: 28px; border: 1px solid var(--gray-border); border-radius: 50%; background: var(--white); color: var(--gray); display: grid; place-items: center; padding: 0; cursor: pointer; z-index: 2; box-shadow: 0 2px 6px rgba(24, 28, 45, .08); transition: color .2s, background .2s, border-color .2s; }
  .del:hover { color: var(--danger-dark); background: var(--danger-light); border-color: var(--danger-light); }

  /* ---------- live preview card ---------- */
  .create-live-preview-panel { position: relative; height: 100%; width: 390px; min-width: 390px; max-width: 390px; flex: 0 0 390px; isolation: isolate; background: #ffffff; border-radius: 26px; overflow: hidden; display: flex; flex-direction: column; }
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

  .spin { animation: spin .8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .schedy-focus { outline: 3px solid var(--primary-lightest); outline-offset: 4px; border-radius: 4px; }

  /* ---------- toast (same as dashboard; portaled to <body>) ---------- */
  .dx-toast, .dx-toast * { box-sizing: border-box; }
  .dx-toast { --tx: -50%; position: fixed; left: 50%; bottom: 28px; z-index: 9800; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 11px 18px; border-radius: 14px; background: var(--dx-toast-bg); color: #fff; font-family: "DM Sans", Inter, system-ui, sans-serif; font-size: 13px; font-weight: 600; box-shadow: 0 12px 30px rgba(0, 0, 0, .3); animation: dx-pop .2s ease; }
  .dx-toast svg { color: #5eead4; }
  @keyframes dx-pop { from { opacity: 0; transform: translate(var(--tx, 0), 8px) scale(.98); } to { opacity: 1; transform: translate(var(--tx, 0), 0) scale(1); } }
  @media (prefers-reduced-motion: reduce) { .dx-toast { animation: none; } }

  /* ---------- responsive ---------- */
  @media(max-width: 1500px) { .grid.three { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media(max-width: 1180px) { .grid.two { grid-template-columns: 1fr; } }
  @media(max-width: 900px) {
    .actions .secondary { display: inline-flex; }
    .grid.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .create-live-preview-panel { position: fixed !important; inset: 12px; z-index: 4000; width: auto; min-width: 0; height: auto; max-width: none; flex: none; border-radius: 20px !important; display: none; box-shadow: 0 12px 34px rgba(24, 28, 45, .3); }
    .create-live-preview-panel.mobile-open { display: flex; }
    .create-live-preview-panel.mobile-open .create-live-preview-head button { display: grid; }
  }
  @media(max-width: 600px) {
    .create header { flex-direction: column; align-items: stretch; }
    .actions button { flex: 1; }
    .grid.two, .grid.three { grid-template-columns: 1fr; }
    .create-builder-form section { padding: 18px 16px; }
  }
 `}</style>
 </div>;
}
