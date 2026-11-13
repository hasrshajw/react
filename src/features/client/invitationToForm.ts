import type { MyInvitation } from "../../lib/api";
import type { ContactItem, EventItem, InvitationData } from "../../types/invitation";
import { initial } from "../create/constants";

const list = <T,>(v: unknown, fallback: T[]): T[] => (Array.isArray(v) ? (v as T[]) : fallback);

/** Map a `my_invitations` row into CreateForm state. Prefer top-level columns for the couple/date. */
export function invitationToForm(inv: MyInvitation, preferProposed = false): InvitationData {
  const useProposed = preferProposed
    && inv.request
    && (inv.request.status === "pending" || (inv.request.status === "rejected" && !inv.request.acknowledgedAt))
    && inv.request.proposedDetails
    && typeof inv.request.proposedDetails === "object";
  const d = (useProposed ? inv.request!.proposedDetails! : inv.details) as Partial<InvitationData> & Record<string, unknown>;

  return {
    ...initial,
    ...d,
    templateId: String(inv.templateId || d.templateId || ""),
    /* Live view: top-level columns win over details. Proposed view: proposed fields win, then top-level. */
    brideEn: String(useProposed ? (d.brideEn || inv.brideName || "") : (inv.brideName || d.brideEn || "")),
    groomEn: String(useProposed ? (d.groomEn || inv.groomName || "") : (inv.groomName || d.groomEn || "")),
    weddingDate: String(useProposed ? (d.weddingDate || inv.eventDate || "") : (inv.eventDate || d.weddingDate || "")),
    events: list<EventItem>(d.events, initial.events),
    groomContacts: list<ContactItem>(d.groomContacts, initial.groomContacts),
    brideContacts: list<ContactItem>(d.brideContacts, initial.brideContacts),
    clientEmail: "",
  };
}

export type ClientStatus = "live" | "pending" | "rejected" | "up_to_date" | "draft" | "superseded";

export function clientStatus(inv: MyInvitation): ClientStatus {
  const r = inv.request;
  if (r?.status === "pending") return "pending";
  if (r?.status === "rejected" && !r.acknowledgedAt) return "rejected";
  if (r?.status === "superseded") return "superseded";
  if (inv.published) return "live";
  return "up_to_date";
}

export const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  live: "Live",
  pending: "Pending review",
  rejected: "Rejected",
  up_to_date: "Up to date",
  draft: "Draft",
  superseded: "Cancelled",
};

export const CLIENT_STATUS_CHIP: Record<ClientStatus, string> = {
  live: "done",
  pending: "pending",
  rejected: "bad",
  up_to_date: "muted",
  draft: "muted",
  superseded: "muted",
};
