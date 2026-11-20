import type { IconComponent } from "../components/Icons";
/** "" alive (default) · "late" deceased · "hidden" not shown on the invitation. */
export type ParentStatus = "" | "late" | "hidden";

export interface EventItem {
  id: string;
  name: string;
  nameTe: string;
  date: string;
  time: string;
  venue: string;
  venueTe: string;
  maps: string;
  /* T6 (all optional: a record saved before T6 has none of them). type is a preset id from src/lib/eventTypes.ts; endTime is HH:MM. */
  type?: string;
  endTime?: string;
  descEn?: string;
  descTe?: string;
  dress?: string;
}

export interface ContactItem {
  id: string;
  nameEn: string;
  nameTe: string;
  phone: string;
  /* T7 (optional: a contact saved before T7 has none). Role such as "Coordinator"; empty = the standard label. */
  roleEn?: string;
  roleTe?: string;
}

/** One extra name in the closing block (after the title). `prefix` is "" | "sri" | "smt" | "chi" | "late" | "dr". */
export interface InviterName {
  id: string;
  prefix: string;
  nameEn: string;
  nameTe: string;
  relationEn: string;
  relationTe: string;
}

/** One relative shown on the groom's or bride's card (T8). relation: see FAMILY_RELATIONS in src/lib/inviteText.ts; prefix: same ids as InviterName.prefix.
 *  late "1" = deceased (prints "కీ.శే." instead of the prefix); show "1" = printed on the invitation ("" = kept in the form but hidden). */
export interface FamilyMember {
  id: string;
  side: "groom" | "bride";
  relation: string;
  prefix: string;
  nameEn: string;
  nameTe: string;
  late: string;
  spouseEn: string;
  spouseTe: string;
  show: string;
}

/** Anything that can sit in one of the form's repeatable lists. */
export type ListItem = EventItem | ContactItem | InviterName | FamilyMember;
/** A partial change to a list item (the union of all item keys, so one patch signature serves every list). */
export type ListPatch = Partial<EventItem & ContactItem & InviterName & FamilyMember>;

export interface InvitationData {
  customId: string;
  templateId: string;
  surnameEn: string; surnameTe: string;
  weddingDate: string; muhurthamTime: string;
  groomEn: string; groomTe: string;
  groomFatherEn: string; groomFatherTe: string; groomFatherPhone: string;
  groomMotherEn: string; groomMotherTe: string; groomMotherPhone: string;
  brideEn: string; brideTe: string;
  brideFatherEn: string; brideFatherTe: string; brideFatherPhone: string;
  brideMotherEn: string; brideMotherTe: string; brideMotherPhone: string;
  /* House names and gotram (T3). Empty house name = the shared surname above. coupleHonorific: "" | "chiranjeevi" (చి|| / చి.ల.సౌ||). */
  groomSurnameEn: string; groomSurnameTe: string; brideSurnameEn: string; brideSurnameTe: string;
  groomGotramEn: string; groomGotramTe: string; brideGotramEn: string; brideGotramTe: string;
  coupleHonorific: string;
  /* Birth order and parentage line (T4). groomOrder / brideOrder: "" | only | eldest | second | third | fourth | youngest. showParentage: "" | "1". */
  groomOrder: string; brideOrder: string; showParentage: string;
  /* Parent status: "" = alive (default), "late" = deceased ("కీ.శే." prefix, no phone), "hidden" = not shown at all. */
  groomFatherStatus: ParentStatus; groomMotherStatus: ParentStatus; brideFatherStatus: ParentStatus; brideMotherStatus: ParentStatus;
  receptionEnabled: boolean; receptionDate: string; receptionTime: string;
  venueEn: string; venueTe: string; venueAddress: string; venueMaps: string;
  /* Reception venue (T5). receptionSameVenue (default true) reuses the wedding venue above; when false the four receptionVenue* fields are used. */
  receptionSameVenue: boolean; receptionVenueEn: string; receptionVenueTe: string; receptionVenueAddress: string; receptionVenueMaps: string;
  events: EventItem[];
  groomContacts: ContactItem[];
  brideContacts: ContactItem[];
  /* Link preview (WhatsApp / Instagram). Stored inside the `details` JSON column. */
  /* Invitation paragraph: who invites (surname | groom | bride | both | custom) and the message. Empty message = the standard text. */
  inviterMode: string; inviterEn: string; inviterTe: string; inviteMessageTe: string;
  /* Closing block (T2). Title: "" = "ఇట్లు" (today). Sources: comma-separated ids ("" = use inviterMode, "none" = nobody). Names: any number of extra names. */
  closingTitleMode: string; closingTitleEn: string; closingTitleTe: string;
  inviterSources: string;
  inviterNames: InviterName[];
  /* Relatives (T8): siblings, grandparents, uncles... for both sides in ONE list (each item has a `side`). Optional on disk: a record saved before T8 has none. */
  familyMembers: FamilyMember[];
  seoTitle: string;        // max 60 chars
  seoDescription: string;  // max 160 chars
  seoImage: string;        // public https URL from Supabase Storage (NOT a base64 data URL)
  /* Client access. Form-only mirror of the top-level `client_email` column (not stored in details). */
  clientEmail: string;
}

export type ListField = "events" | "groomContacts" | "brideContacts" | "inviterNames" | "familyMembers";

export interface Template {
  id: string;
  category_id: string;
  name: string;
  html_code: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface SectionDef {
  id: SectionId;
  label: string;
  icon: IconComponent;
  hint: "required" | "recommended" | "optional";
}

export type SectionId = "template" | "family" | "groom" | "bride" | "message" | "venue" | "seo" | "events" | "client";

export interface FieldError { section: SectionId; msg: string }
export type ErrorMap = Record<string, FieldError>;
