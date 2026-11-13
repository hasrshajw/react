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
  receptionEnabled: "Reception",
  receptionDate: "Reception date",
  receptionTime: "Reception time",
  venueEn: "Venue (EN)",
  venueTe: "Venue (TE)",
  venueAddress: "Venue address",
  venueMaps: "Maps link",
  events: "Events",
  groomContacts: "Groom contacts",
  brideContacts: "Bride contacts",
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
