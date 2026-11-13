import { CalendarPlus, Heart, LayoutTemplate, Mail, MapPin, Search, User, Users } from "../../components/Icons";
import type { ContactItem, EventItem, InvitationData, SectionDef } from "../../types/invitation";
import { uid } from "../../lib/uid";


/* Where "Go to dashboard" leads. Change if your dashboard route is different. */
export const DASHBOARD_PATH = "/dashboard";
export { LS_DRAFT } from "../../lib/storageKeys";

export { uid };
export const newEvent = (): EventItem => ({ id: uid(), name: "", nameTe: "", date: "", time: "", venue: "", venueTe: "", maps: "" });
export const newContact = (): ContactItem => ({ id: uid(), nameEn: "", nameTe: "", phone: "" });

export const initial: InvitationData = {
  customId: "", templateId: "",
  surnameEn: "", surnameTe: "", weddingDate: "", muhurthamTime: "",
  groomEn: "", groomTe: "", groomFatherEn: "", groomFatherTe: "", groomFatherPhone: "", groomMotherEn: "", groomMotherTe: "", groomMotherPhone: "",
  brideEn: "", brideTe: "", brideFatherEn: "", brideFatherTe: "", brideFatherPhone: "", brideMotherEn: "", brideMotherTe: "", brideMotherPhone: "",
  receptionEnabled: false, receptionDate: "", receptionTime: "",
  venueEn: "", venueTe: "", venueAddress: "", venueMaps: "",
  events: [], groomContacts: [], brideContacts: [],
  seoTitle: "", seoDescription: "", seoImage: "",
  clientEmail: "",
};

/** English field -> the Telugu field that is filled in automatically. */
export const EN_TO_TE = {
  surnameEn: "surnameTe", groomEn: "groomTe", groomFatherEn: "groomFatherTe", groomMotherEn: "groomMotherTe",
  brideEn: "brideTe", brideFatherEn: "brideFatherTe", brideMotherEn: "brideMotherTe", venueEn: "venueTe",
} as const satisfies Partial<Record<keyof InvitationData, keyof InvitationData>>;

/** Field -> element inside the live preview that should scroll into view. */
export const TARGETS: Record<string, string> = {
  surnameEn: "surname-te", surnameTe: "surname-te", groomEn: "groom-te", groomTe: "groom-te",
  groomFatherEn: "groom-father-te", groomFatherTe: "groom-father-te", groomMotherEn: "groom-mother-te", groomMotherTe: "groom-mother-te",
  brideEn: "bride-te", brideTe: "bride-te", brideFatherEn: "bride-father-te", brideFatherTe: "bride-father-te",
  brideMotherEn: "bride-mother-te", brideMotherTe: "bride-mother-te",
  weddingDate: "event-wedding-date", muhurthamTime: "event-wedding-time", receptionDate: "event-reception-date", receptionTime: "event-reception-time",
  venueEn: "venue-te", venueTe: "venue-te", venueAddress: "venue-te", venueMaps: "venue-te",
  groomContacts: "groom-extra-1-phone", brideContacts: "bride-extra-1-phone",
};

const sampleDate = () => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10); };
export const SAMPLE: InvitationData = { ...initial, groomEn: "Groom", brideEn: "Bride", weddingDate: sampleDate() };

export const SECTIONS: SectionDef[] = [
  { id: "template", label: "Template", icon: LayoutTemplate, hint: "required" },
  { id: "family", label: "Family", icon: Users, hint: "required" },
  { id: "groom", label: "Groom", icon: User, hint: "required" },
  { id: "bride", label: "Bride", icon: Heart, hint: "required" },
  { id: "venue", label: "Venue", icon: MapPin, hint: "recommended" },
  { id: "seo", label: "Link preview", icon: Search, hint: "recommended" },
  { id: "events", label: "Events", icon: CalendarPlus, hint: "optional" },
  { id: "client", label: "Client access", icon: Mail, hint: "optional" },
];
/* Optional sections do not count towards progress. */
export const PROGRESS_IDS = ["template", "family", "groom", "bride", "venue"] as const;
