export interface EventItem {
  id: string;
  name: string;
  nameTe: string;
  date: string;
  time: string;
  venue: string;
  venueTe: string;
  maps: string;
}

export interface ContactItem {
  id: string;
  nameEn: string;
  nameTe: string;
  phone: string;
}

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
  receptionEnabled: boolean; receptionDate: string; receptionTime: string;
  venueEn: string; venueTe: string; venueAddress: string; venueMaps: string;
  /** Compressed JPEG data URL, or "" when no photo was added. */
  couplePhoto: string;
  /** Up to MAX_GALLERY compressed JPEG data URLs. */
  gallery: string[];
  events: EventItem[];
  groomContacts: ContactItem[];
  brideContacts: ContactItem[];
}

export type ListField = "events" | "groomContacts" | "brideContacts";

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
  icon: React.ComponentType<{ size?: number }>;
  hint: "required" | "recommended" | "optional";
}

export type SectionId = "template" | "family" | "groom" | "bride" | "venue" | "photos" | "events";

export interface FieldError { section: SectionId; msg: string }
export type ErrorMap = Record<string, FieldError>;
