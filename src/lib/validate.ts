import type { ErrorMap, InvitationData } from "../types/invitation";
import { isEmail } from "./auth";
import { isReserved } from "./reserved";
import { isOwnPreviewImage } from "./previewUrl";

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

export const SEO_TITLE_MAX = 60;
export const SEO_DESC_MAX = 160;
export const SLUG_MIN = 3;
export const SLUG_MAX = 30;
/* Letters (any case, matching the DB check which ignores case), numbers, hyphen and underscore. */
export const okSlug = (v: string): boolean => new RegExp(`^[a-z0-9_-]{${SLUG_MIN},${SLUG_MAX}}$`, "i").test(v.trim());

export function validateInvitation(data: InvitationData): ErrorMap {
  const e: ErrorMap = {};
  const add = (key: string, section: ErrorMap[string]["section"], msg: string) => { e[key] = { section, msg }; };
  if (!data.templateId) add("templateId", "template", "Choose a template to continue");
  if (has(data.customId)) {
    const slug = data.customId.trim();
    if (!okSlug(slug)) add("customId", "seo", `Use ${SLUG_MIN} to ${SLUG_MAX} letters, numbers, hyphens or underscores`);
    else if (isReserved(slug)) add("customId", "seo", "This link name is reserved");
  }
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
  /* Soft warnings: the inputs also have maxLength, so these only appear for pasted or old data. */
  if (data.seoTitle.length > SEO_TITLE_MAX) add("seoTitle", "seo", `Keep the title under ${SEO_TITLE_MAX} characters`);
  if (data.seoDescription.length > SEO_DESC_MAX) add("seoDescription", "seo", `Keep the description under ${SEO_DESC_MAX} characters`);
  if (has(data.seoImage) && !isOwnPreviewImage(data.seoImage)) add("seoImage", "seo", "Preview image must be uploaded here. Remove it and upload the picture again");
  /* Optional client email: empty is fine; otherwise must look like an email (DB also lower-cases and trims). */
  if (has(data.clientEmail) && !isEmail(data.clientEmail)) add("clientEmail", "client", "Enter a valid email address");
  return e;
}
