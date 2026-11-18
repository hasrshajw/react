import type { InvitationData, EventItem, ContactItem } from "../types/invitation";
import { HONORIFIC_BRIDE_TE, HONORIFIC_GROOM_TE, honorificOn, parentageLineTe, closingTitleEn, closingTitleMode, closingTitleTe, inviteMessageTe, inviterLinesTe, parentPrefixTe, parentStatus } from "./inviteText";
// Shared by the Create page and the Dashboard preview.
/** Invitation fields the template compiler reads. Every field is optional so partial records (e.g. dashboard rows) can be previewed. */
export type CompileData = Partial<InvitationData>;
const dateText=(v?:string)=>{if(!v)return "";const d=new Date(`${v}T00:00:00`);return Number.isNaN(d.getTime())?"":new Intl.DateTimeFormat("en-IN",{day:"numeric",month:"long",year:"numeric"}).format(d)};
const dayText=(v?:string)=>{if(!v)return "";const d=new Date(`${v}T00:00:00`);return Number.isNaN(d.getTime())?"":new Intl.DateTimeFormat("en-IN",{weekday:"long"}).format(d)};
const timeText=(v?:string)=>{if(!v)return "";const [h,m]=v.split(":").map(Number);if(!Number.isFinite(h)||!Number.isFinite(m))return "";const d=new Date();d.setHours(h,m,0,0);return new Intl.DateTimeFormat("en-IN",{hour:"numeric",minute:"2-digit"}).format(d)};

/** wa.me wants digits only, with the country code: "+91 98765 43210", "98765-43210" and "919876543210" all become "919876543210". */
export const waNumber=(phone?:string)=>{const d=(phone||"").replace(/\D/g,"");return d.length===10?`91${d}`:d};

function valuesFor(data:CompileData):Record<string,string|undefined>{
 const lines=inviterLinesTe(data);
 /* T5: the reception uses the wedding venue unless receptionSameVenue is false (a record saved before T5 has no such key = same venue). */
 const recSame=data.receptionSameVenue!==false;
 const recV=(k:"te"|"en"|"address"|"maps")=>recSame?{te:data.venueTe,en:data.venueEn,address:data.venueAddress,maps:data.venueMaps}[k]:{te:data.receptionVenueTe,en:data.receptionVenueEn,address:data.receptionVenueAddress,maps:data.receptionVenueMaps}[k];
 const recOwn=!!data.receptionEnabled&&!recSame&&[data.receptionVenueTe,data.receptionVenueEn,data.receptionVenueAddress,data.receptionVenueMaps].some((x)=>(x||"").trim()!=="");
 /* M-10: a null-prototype object, so a placeholder named `constructor`, `toString` or `__proto__` finds nothing instead of an inherited member. */
 const v:Record<string,string|undefined>=Object.assign(Object.create(null),{"surname-en":data.surnameEn,"surname-te":data.surnameTe,"bride-en":data.brideEn,"bride-te":data.brideTe,"groom-en":data.groomEn,"groom-te":data.groomTe,"invite-text-te":inviteMessageTe(data),"invite-message-te":inviteMessageTe(data),"inviter-te":lines.join(" & "),"inviter-title-te":closingTitleTe(data),"inviter-title-en":closingTitleEn(data),"inviter-title-visible":closingTitleMode(data)==="none"?"":"1","groom-father-en":data.groomFatherEn,"groom-father-te":data.groomFatherTe,"groom-father-phone":data.groomFatherPhone,"groom-mother-en":data.groomMotherEn,"groom-mother-te":data.groomMotherTe,"groom-mother-phone":data.groomMotherPhone,"bride-father-en":data.brideFatherEn,"bride-father-te":data.brideFatherTe,"bride-father-phone":data.brideFatherPhone,"bride-mother-en":data.brideMotherEn,"bride-mother-te":data.brideMotherTe,"bride-mother-phone":data.brideMotherPhone,"event-wedding-date":dateText(data.weddingDate),"event-wedding-day":dayText(data.weddingDate),"event-wedding-time":timeText(data.muhurthamTime),"wedding-date":data.weddingDate,"event-reception-date":dateText(data.receptionDate),"event-reception-day":dayText(data.receptionDate),"event-reception-time":timeText(data.receptionTime),"venue-en":data.venueEn,"venue-te":data.venueTe,"venue-address":data.venueAddress,"venue-maps":data.venueMaps,"reception-date":dateText(data.receptionDate),"reception-time":timeText(data.receptionTime),"reception-venue-te":recV("te"),"reception-venue-en":recV("en"),"reception-venue-address":recV("address"),"reception-venue-maps":recV("maps"),"reception-own-venue":recOwn?"1":"","reception-venue-target":recSame?"venue-te":"reception-venue-te","same-venue":data.receptionEnabled&&recSame&&data.venueTe?"1":""});
 for(let n=1;n<=10;n++)v[`inviter-line-${n}-te`]=lines[n-1]||"";
 [0,1].forEach(i=>{const e:Partial<EventItem>=(data.events||[])[i]||{},n=i+1;v[`event-${n}-name-te`]=e.nameTe||"";v[`event-${n}-date`]=dateText(e.date);v[`event-${n}-day`]=dayText(e.date);v[`event-${n}-time`]=timeText(e.time);v[`event-${n}-venue-te`]=e.venueTe||"";v[`event-${n}-maps`]=e.maps||"";v[`event-${n}-name-en`]=e.name||"";v[`event-${n}-venue-en`]=e.venue||""});
 const gc:Partial<ContactItem>=(data.groomContacts||[])[0]||{},bc:Partial<ContactItem>=(data.brideContacts||[])[0]||{};v["groom-extra-1-te"]=gc.nameTe||"";v["groom-extra-1-phone"]=gc.phone||"";v["groom-extra-1-wa"]=waNumber(gc.phone);v["bride-extra-1-te"]=bc.nameTe||"";v["bride-extra-1-phone"]=bc.phone||"";v["bride-extra-1-wa"]=waNumber(bc.phone);
 /* Parent status (T1): hidden = no name, no phone; late = name with "కీ.శే." and no phone. `-late` is "1" for a late parent; `-prefix-te` is the Telugu prefix. */
 (["groom-father","groom-mother","bride-father","bride-mother"] as const).forEach(k=>{
  const st=parentStatus((data as Record<string,unknown>)[`${k.replace(/-(\w)/g,(_,c:string)=>c.toUpperCase())}Status`]);
  if(st==="hidden"){v[`${k}-en`]="";v[`${k}-te`]="";}
  if(st!==""){v[`${k}-phone`]="";}
  v[`${k}-late`]=st==="late"?"1":"";
  v[`${k}-prefix-te`]=parentPrefixTe(k.endsWith("father")?"father":"mother",st);
  v[`${k}-wa`]=waNumber(v[`${k}-phone`]);
 });
 /* House names, gotram and honorific (T3). The house name falls back to the shared surname; `-surname-set` is "1" only when the person's OWN house name was typed,
    so a template can print a house-name line without adding one to old invitations. */
 (["groom","bride"] as const).forEach(k=>{
  const D=data as Record<string,string|undefined>,own=(f:string)=>(D[`${k}${f}`]||"").trim();
  v[`${k}-surname-te`]=own("SurnameTe")||(data.surnameTe||"");v[`${k}-surname-en`]=own("SurnameEn")||(data.surnameEn||"");
  v[`${k}-surname-set`]=own("SurnameTe")||own("SurnameEn")?"1":"";
  v[`${k}-gotram-te`]=own("GotramTe");v[`${k}-gotram-en`]=own("GotramEn");
 });
 const hon=honorificOn(data.coupleHonorific);v["couple-honorific"]=hon?"1":"";v["groom-honorific-te"]=hon?HONORIFIC_GROOM_TE:"";v["bride-honorific-te"]=hon?HONORIFIC_BRIDE_TE:"";
 /* Birth order and parentage line (T4). `-parentage-te` is empty unless the line is on and a parent name is left; `-plain-lines` is "1" while the old "ఆత్మీయ కుమారుడు" lines stay. */
 (["groom","bride"] as const).forEach(k=>{const line=parentageLineTe(k,data);v[`${k}-parentage-te`]=line;v[`${k}-plain-lines`]=line?"":"1";});
 return v;
}

/** Templates are self-contained. A saved web page can still carry <script src>, <link> and <img> tags with relative or "/_next/..." paths.
 *  Inside the invitation iframe those resolve against our own domain and only produce 404s in the console, so they are removed.
 *  Absolute links to other sites (Google Fonts, CDNs, images) are kept. */
function stripBrokenAssets(doc:Document){
 const own=(value:string|null)=>{if(!value)return false;const v=value.trim();if(!v||/^(data:|blob:|#|mailto:|tel:)/i.test(v))return false;try{return new URL(v,"https://own.invalid/").host==="own.invalid"}catch{return false}};
 doc.querySelectorAll("script[src]").forEach(el=>{if(own(el.getAttribute("src")))el.remove()});
 doc.querySelectorAll("link[href]").forEach(el=>{const rel=(el.getAttribute("rel")||"").toLowerCase();if(/stylesheet|preload|modulepreload|prefetch|preconnect|icon/.test(rel)&&own(el.getAttribute("href")))el.remove()});
 doc.querySelectorAll("img[src],source[src],video[src],audio[src]").forEach(el=>{if(own(el.getAttribute("src")))el.removeAttribute("src")});
 doc.querySelectorAll("[srcset],[imagesrcset]").forEach(el=>["srcset","imagesrcset"].forEach(a=>{const v=el.getAttribute(a);if(v&&v.split(",").some(c=>own(c.trim().split(/\s+/)[0])))el.removeAttribute(a)}));
 const css=(text:string)=>text.replace(/url\(\s*(["']?)([^)"']+)\1\s*\)/gi,(m,_q,u)=>own(u)?'url("data:,")':m);
 doc.querySelectorAll("style").forEach(el=>{if(el.textContent)el.textContent=css(el.textContent)});
 doc.querySelectorAll("[style]").forEach(el=>{const v=el.getAttribute("style");if(v&&/url\(/i.test(v))el.setAttribute("style",css(v))});
 doc.querySelectorAll("script:not([src])").forEach(el=>{if(/__next_f|__next|self\.__RSC|turbopack/i.test(el.textContent||""))el.remove()});
}

/** H-2: the only URL schemes a template or a filled-in value may link to. Keep in sync with the database rule
 *  (H-2 trigger/check) and the Track B `submit_change_request` RPC so every layer accepts and rejects the same values. */
export const SAFE_PROTOCOLS=new Set(["http","https","tel","mailto"]);
/** Attributes that carry a URL and therefore need the scheme check. */
const URL_ATTRS=new Set(["href","src","action","formaction","poster","background","xlink:href","data","ping"]);
/** True when `value` is safe to use in the URL attribute `attr`: no scheme (relative, "#anchor"), an allowed scheme, or an inline raster image on src-like attributes.
 *  Browsers ignore control characters and spaces inside the scheme ("java\tscript:"), so they are removed before the scheme is read. */
export function isSafeUrl(value:string,attr="href"):boolean{
 // eslint-disable-next-line no-control-regex -- the control characters are the point: browsers ignore them inside a scheme
 const v=value.replace(/[\u0000-\u0020\u007f-\u00a0\u1680\u180e\u2000-\u200d\u2028\u2029\u202f\u205f\u2060\u3000\ufeff]/g,"");
 const scheme=/^([a-z][a-z0-9+.-]*):/i.exec(v);
 if(!scheme)return true;
 if(SAFE_PROTOCOLS.has(scheme[1].toLowerCase()))return true;
 return /^(src|poster|background)$/.test(attr)&&/^data:image\/(png|jpe?g|gif|webp|avif|bmp)[;,]/i.test(v);
}
/** H-2: drop every `on*` event-handler attribute and any URL attribute whose scheme is not allowed.
 *  Runs after placeholders are filled, because a value such as venueMaps="javascript:alert(1)" only appears in the DOM at that point. */
function sanitizeAttributes(doc:Document){
 doc.querySelectorAll("*").forEach(el=>[...el.attributes].forEach(attr=>{const name=attr.name.toLowerCase();if(/^on[a-z]+$/.test(name)||(URL_ATTRS.has(name)&&!isSafeUrl(attr.value,name)))el.removeAttribute(attr.name)}));
}

/** M-10: syntax the compiler itself defines: `{{key}}`, `{{#if key}}` and `{{/if}}`. Anything else with braces (template CSS, JS, JSON, a person's text) is left alone. */
const LEFTOVER_SYNTAX=/\{\{\s*(?:#if\s+[\w-]+|\/if|[\w-]+)\s*\}\}/g;
/** Removes placeholders that were not filled (for example one in `<head>`, which is not walked) and unmatched `{{#if}}` / `{{/if}}` tags.
 *  Works on the parsed document and skips the spans that hold filled-in values, so text a person typed (even "{{x}}") is never altered.
 *  Attributes need no pass: every `{{key}}` in them was already replaced above. */
function stripLeftoverSyntax(doc:Document){
 const walker=doc.createTreeWalker(doc.documentElement,NodeFilter.SHOW_TEXT),nodes:Node[]=[];let node:Node|null;
 while((node=walker.nextNode()))nodes.push(node);
 nodes.forEach(n=>{if(n.parentElement?.closest("[data-schedy-field]"))return;const text=n.nodeValue||"";LEFTOVER_SYNTAX.lastIndex=0;if(LEFTOVER_SYNTAX.test(text)){LEFTOVER_SYNTAX.lastIndex=0;n.nodeValue=text.replace(LEFTOVER_SYNTAX,"")}});
}

export function compile(source:string,data:CompileData):string{
 if(!source)return "";const v=valuesFor(data);let html=source;const conditional=/\{\{#if\s+([\w-]+)\}\}((?:(?!\{\{#if\b)[\s\S])*?)\{\{\/if\}\}/g;let previous:string;do{previous=html;html=html.replace(conditional,(_,key,body)=>v[key.trim().replaceAll("_","-")]?body:"")}while(html!==previous&&/\{\{#if\b/.test(html));
 const doc=new DOMParser().parseFromString(html,"text/html"),placeholder=/\{\{\s*([\w-]+)\s*\}\}/g,walker=doc.createTreeWalker(doc.body,NodeFilter.SHOW_TEXT),nodes:Node[]=[];let node:Node|null;while((node=walker.nextNode()))nodes.push(node);
 nodes.forEach(textNode=>{const text=textNode.nodeValue||"";placeholder.lastIndex=0;if(!placeholder.test(text))return;placeholder.lastIndex=0;const frag=doc.createDocumentFragment();let last=0,match;while((match=placeholder.exec(text))){if(match.index>last)frag.appendChild(doc.createTextNode(text.slice(last,match.index)));const key=match[1].replaceAll("_","-"),span=doc.createElement("span");span.dataset.schedyField=key;span.textContent=v[key]??"";frag.appendChild(span);last=match.index+match[0].length}if(last<text.length)frag.appendChild(doc.createTextNode(text.slice(last)));textNode.parentNode?.replaceChild(frag,textNode)});
 stripBrokenAssets(doc);
 doc.querySelectorAll("*").forEach(el=>[...el.attributes].forEach(attr=>{if(attr.value.includes("{{"))attr.value=attr.value.replace(placeholder,(_,key)=>v[key.replaceAll("_","-")]??"")}));
 sanitizeAttributes(doc);
 stripLeftoverSyntax(doc);
 return `<!doctype html>${doc.documentElement.outerHTML}`;
}
