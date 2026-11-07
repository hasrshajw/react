import type { ErrorMap, InvitationData } from "../types/invitation";

export const has = (v: unknown): boolean => String(v ?? "").trim() !== "";

export const okPhone = (v: string): boolean => {
  if (!/^[+\d\s()-]+$/.test(v)) return false;
  const n = v.replace(/\D/g, "").length;
  return n >= 10 && n <= 13;
};

export const okUrl = (v: string): boolean => {
  try { const u = new URL(String(v).trim()); return u.protocol === "http:" || u.protocol === "https:"; }
  catch { return false; }
};

export const PHONE_MSG = "Enter a valid phone number (10 digits, optional +91)";
export const URL_MSG = "Enter a full link starting with https://";

export function validateInvitation(data: InvitationData): ErrorMap {
  const e: ErrorMap = {};
  const add = (key: string, section: ErrorMap[string]["section"], msg: string) => { e[key] = { section, msg }; };
  if (!data.templateId) add("templateId", "template", "Choose a template to continue");
  if (has(data.customId) && !/^[a-z0-9-]+$/i.test(data.customId.trim())) add("customId", "template", "Use letters, numbers and hyphens only");
  if (!has(data.weddingDate)) add("weddingDate", "family", "Wedding date is required");
  if (!has(data.groomEn)) add("groomEn", "groom", "Groom's name is required");
  (["groomFatherPhone", "groomMotherPhone"] as const).forEach((k) => { if (has(data[k]) && !okPhone(data[k])) add(k, "groom", PHONE_MSG); });
  data.groomContacts.forEach((c) => { if (has(c.phone) && !okPhone(c.phone)) add(`contact-${c.id}-phone`, "groom", PHONE_MSG); });
  if (!has(data.brideEn)) add("brideEn", "bride", "Bride's name is required");
  (["brideFatherPhone", "brideMotherPhone"] as const).forEach((k) => { if (has(data[k]) && !okPhone(data[k])) add(k, "bride", PHONE_MSG); });
  data.brideContacts.forEach((c) => { if (has(c.phone) && !okPhone(c.phone)) add(`contact-${c.id}-phone`, "bride", PHONE_MSG); });
  if (data.receptionEnabled && !has(data.receptionDate)) add("receptionDate", "venue", "Add the reception date");
  if (has(data.venueMaps) && !okUrl(data.venueMaps)) add("venueMaps", "venue", URL_MSG);
  data.events.forEach((ev) => {
    if (has(ev.name) && !has(ev.date)) add(`event-${ev.id}-date`, "events", "Add a date for this event");
    if (has(ev.maps) && !okUrl(ev.maps)) add(`event-${ev.id}-maps`, "events", URL_MSG);
  });
  return e;
}
