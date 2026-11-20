/** Human labels for InvitationData keys shown in the review diff. Unknown keys fall back to the key itself. */
export const FIELD_LABELS: Record<string, string> = {
  customId: "Custom link",
  templateId: "Template",
  surnameEn: "Surname (EN)",
  surnameTe: "Surname (TE)",
  weddingDate: "Wedding date",
  muhurthamTime: "Muhurtham time",
  groomEn: "Groom (EN)",
  groomTe: "Groom (TE)",
  groomFatherEn: "Groom's father (EN)",
  groomFatherTe: "Groom's father (TE)",
  groomFatherPhone: "Groom's father phone",
  groomMotherEn: "Groom's mother (EN)",
  groomMotherTe: "Groom's mother (TE)",
  groomMotherPhone: "Groom's mother phone",
  brideEn: "Bride (EN)",
  brideTe: "Bride (TE)",
  brideFatherEn: "Bride's father (EN)",
  brideFatherTe: "Bride's father (TE)",
  brideFatherPhone: "Bride's father phone",
  brideMotherEn: "Bride's mother (EN)",
  brideMotherTe: "Bride's mother (TE)",
  brideMotherPhone: "Bride's mother phone",
  groomFatherStatus: "Groom's father status",
  groomMotherStatus: "Groom's mother status",
  brideFatherStatus: "Bride's father status",
  brideMotherStatus: "Bride's mother status",
  receptionEnabled: "Reception",
  receptionDate: "Reception date",
  receptionTime: "Reception time",
  venueEn: "Venue (EN)",
  venueTe: "Venue (TE)",
  venueAddress: "Venue address",
  venueMaps: "Maps link",
  receptionSameVenue: "Reception at the wedding venue",
  receptionVenueEn: "Reception venue (EN)",
  receptionVenueTe: "Reception venue (TE)",
  receptionVenueAddress: "Reception venue address",
  receptionVenueMaps: "Reception maps link",
  events: "Events",
  groomContacts: "Groom contacts",
  brideContacts: "Bride contacts",
  inviterMode: "Invited by",
  inviterEn: "Inviter name (EN)",
  inviterTe: "Inviter name (TE)",
  inviteMessageTe: "Invitation message (TE)",
  groomSurnameEn: "Groom's house name (EN)",
  groomSurnameTe: "Groom's house name (TE)",
  brideSurnameEn: "Bride's house name (EN)",
  brideSurnameTe: "Bride's house name (TE)",
  groomGotramEn: "Groom's gotram (EN)",
  groomGotramTe: "Groom's gotram (TE)",
  brideGotramEn: "Bride's gotram (EN)",
  brideGotramTe: "Bride's gotram (TE)",
  coupleHonorific: "Honorific before names",
  groomOrder: "Groom's position among children",
  brideOrder: "Bride's position among children",
  showParentage: "Show 'son / daughter of' line",
  closingTitleMode: "Closing title",
  closingTitleEn: "Closing title (EN)",
  closingTitleTe: "Closing title (TE)",
  inviterSources: "Who is inviting",
  inviterNames: "Custom inviter names",
  familyMembers: "Relatives (siblings, grandparents, uncles)",
  seoTitle: "Link preview title",
  seoDescription: "Link preview description",
  seoImage: "Link preview image",
  clientEmail: "Client email",
};

export const fieldLabel = (key: string) => FIELD_LABELS[key] || key;

export function formatDiffValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return value.trim() === "" ? "—" : value;
  if (typeof value === "number") return String(value);
  try {
    return JSON.stringify(value, null, 0);
  } catch {
    return String(value);
  }
}
