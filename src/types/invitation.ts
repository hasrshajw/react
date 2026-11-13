import type { IconComponent } from "../components/Icons";
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
  events: EventItem[];
  groomContacts: ContactItem[];
  brideContacts: ContactItem[];
  /* Link preview (WhatsApp / Instagram). Stored inside the `details` JSON column. */
  seoTitle: string;        // max 60 chars
  seoDescription: string;  // max 160 chars
  seoImage: string;        // public https URL from Supabase Storage (NOT a base64 data URL)
  /* Client access. Form-only mirror of the top-level `client_email` column (not stored in details). */
  clientEmail: string;
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
  icon: IconComponent;
  hint: "required" | "recommended" | "optional";
}

export type SectionId = "template" | "family" | "groom" | "bride" | "venue" | "seo" | "events" | "client";

export interface FieldError { section: SectionId; msg: string }
export type ErrorMap = Record<string, FieldError>;
