import { CalendarPlus, FileText, Heart, LayoutTemplate, Mail, MapPin, Search, User, Users } from "../../components/Icons";
import type { ContactItem, EventItem, InvitationData, InviterName, SectionDef } from "../../types/invitation";
import { uid } from "../../lib/uid";


/* Where "Go to dashboard" leads. Change if your dashboard route is different. */
export const DASHBOARD_PATH = "/dashboard";
export { LS_DRAFT } from "../../lib/storageKeys";

export { uid };
export const newEvent = (): EventItem => ({ id: uid(), name: "", nameTe: "", date: "", time: "", venue: "", venueTe: "", maps: "", type: "", endTime: "", descEn: "", descTe: "", dress: "" });
export { MAX_EVENTS } from "../../lib/eventTypes";
export { MAX_INVITER_NAMES } from "../../lib/inviteText";
export const newInviterName = (): InviterName => ({ id: uid(), prefix: "", nameEn: "", nameTe: "", relationEn: "", relationTe: "" });
export const newContact = (): ContactItem => ({ id: uid(), nameEn: "", nameTe: "", phone: "", roleEn: "", roleTe: "" });
export { MAX_CONTACTS } from "../../lib/contactLimits";

export const initial: InvitationData = {
  customId: "", templateId: "",
  surnameEn: "", surnameTe: "", weddingDate: "", muhurthamTime: "",
  groomEn: "", groomTe: "", groomFatherEn: "", groomFatherTe: "", groomFatherPhone: "", groomMotherEn: "", groomMotherTe: "", groomMotherPhone: "",
  brideEn: "", brideTe: "", brideFatherEn: "", brideFatherTe: "", brideFatherPhone: "", brideMotherEn: "", brideMotherTe: "", brideMotherPhone: "",
  groomSurnameEn: "", groomSurnameTe: "", brideSurnameEn: "", brideSurnameTe: "",
  groomGotramEn: "", groomGotramTe: "", brideGotramEn: "", brideGotramTe: "", coupleHonorific: "", groomOrder: "", brideOrder: "", showParentage: "",
  groomFatherStatus: "", groomMotherStatus: "", brideFatherStatus: "", brideMotherStatus: "",
  receptionEnabled: false, receptionDate: "", receptionTime: "",
  venueEn: "", venueTe: "", venueAddress: "", venueMaps: "",
  receptionSameVenue: true, receptionVenueEn: "", receptionVenueTe: "", receptionVenueAddress: "", receptionVenueMaps: "",
  events: [], groomContacts: [], brideContacts: [],
  inviterMode: "surname", inviterEn: "", inviterTe: "", inviteMessageTe: "",
  closingTitleMode: "", closingTitleEn: "", closingTitleTe: "", inviterSources: "", inviterNames: [],
  seoTitle: "", seoDescription: "", seoImage: "",
  clientEmail: "",
};

/** English field -> the Telugu field that is filled in automatically. */
export const EN_TO_TE = {
  surnameEn: "surnameTe", groomEn: "groomTe", groomFatherEn: "groomFatherTe", groomMotherEn: "groomMotherTe",
  brideEn: "brideTe", brideFatherEn: "brideFatherTe", brideMotherEn: "brideMotherTe", venueEn: "venueTe", receptionVenueEn: "receptionVenueTe", inviterEn: "inviterTe", closingTitleEn: "closingTitleTe",
  groomSurnameEn: "groomSurnameTe", brideSurnameEn: "brideSurnameTe", groomGotramEn: "groomGotramTe", brideGotramEn: "brideGotramTe",
} as const satisfies Partial<Record<keyof InvitationData, keyof InvitationData>>;

/** Field -> element inside the live preview that should scroll into view. */
export const TARGETS: Record<string, string> = {
  surnameEn: "surname-te", surnameTe: "surname-te", groomEn: "groom-te", groomTe: "groom-te",
  groomFatherEn: "groom-father-te", groomFatherTe: "groom-father-te", groomMotherEn: "groom-mother-te", groomMotherTe: "groom-mother-te",
  brideEn: "bride-te", brideTe: "bride-te", brideFatherEn: "bride-father-te", brideFatherTe: "bride-father-te",
  brideMotherEn: "bride-mother-te", brideMotherTe: "bride-mother-te",
  weddingDate: "event-wedding-date", muhurthamTime: "event-wedding-time", receptionDate: "event-reception-date", receptionTime: "event-reception-time",
  venueEn: "venue-te", venueTe: "venue-te", venueAddress: "venue-te", venueMaps: "venue-te",
  receptionVenueEn: "reception-venue-te", receptionVenueTe: "reception-venue-te", receptionVenueAddress: "reception-venue-te", receptionVenueMaps: "reception-venue-te",
  inviteMessageTe: "invite-text", inviterMode: "invite-text", inviterEn: "invite-text", inviterTe: "invite-text",
  groomSurnameEn: "groom-te", groomSurnameTe: "groom-te", groomGotramEn: "groom-te", groomGotramTe: "groom-te",
  brideSurnameEn: "bride-te", brideSurnameTe: "bride-te", brideGotramEn: "bride-te", brideGotramTe: "bride-te", coupleHonorific: "groom-te", groomOrder: "groom-te", brideOrder: "bride-te", showParentage: "groom-te",
  closingTitleMode: "invite-text", closingTitleEn: "invite-text", closingTitleTe: "invite-text", inviterSources: "invite-text", inviterNames: "invite-text",
  groomFatherStatus: "groom-father-te", groomMotherStatus: "groom-mother-te", brideFatherStatus: "bride-father-te", brideMotherStatus: "bride-mother-te",
  groomFatherPhone: "groom-father-phone", groomMotherPhone: "groom-mother-phone", brideFatherPhone: "bride-father-phone", brideMotherPhone: "bride-mother-phone",
  groomContacts: "groom-extra-1-phone", brideContacts: "bride-extra-1-phone",
};

const sampleDate = () => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10); };
export const SAMPLE: InvitationData = { ...initial, groomEn: "Groom", brideEn: "Bride", weddingDate: sampleDate() };

export const SECTIONS: SectionDef[] = [
  { id: "template", label: "Template", icon: LayoutTemplate, hint: "required" },
  { id: "family", label: "Family", icon: Users, hint: "required" },
  { id: "groom", label: "Groom", icon: User, hint: "required" },
  { id: "bride", label: "Bride", icon: Heart, hint: "required" },
  { id: "message", label: "Invitation text", icon: FileText, hint: "optional" },
  { id: "venue", label: "Venue", icon: MapPin, hint: "recommended" },
  { id: "events", label: "Events", icon: CalendarPlus, hint: "optional" },
  { id: "seo", label: "Link preview", icon: Search, hint: "recommended" },
  { id: "client", label: "Client access", icon: Mail, hint: "optional" },
];
/* Optional sections do not count towards progress. */
export const PROGRESS_IDS = ["template", "family", "groom", "bride", "venue"] as const;
