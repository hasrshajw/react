import type { InvitationData } from "../types/invitation";

/* The invitation paragraph of a template ("<family> కుటుంబము వారి శుభ వివాహ కార్యక్రమమునకు ..."), in two editable parts:
   WHO invites (family surname, groom's family, bride's family, both, or a custom name) and the message itself. */

export type InviterMode = "surname" | "groom" | "bride" | "both" | "custom";

export const INVITER_OPTIONS: { id: InviterMode; label: string }[] = [
  { id: "surname", label: "Family surname" },
  { id: "groom", label: "Groom’s family" },
  { id: "bride", label: "Bride’s family" },
  { id: "both", label: "Both families" },
  { id: "custom", label: "Custom name" },
];

export const INVITE_MESSAGE_MAX = 600;
export const DEFAULT_INVITE_MESSAGE_TE =
  "శుభ వివాహ కార్యక్రమమునకు మీరు సకుటుంబ సపరివార సమేతంగా విచ్చేసి, నూతన వధూవరులను ఆశీర్వదించి మా ఆనందాన్ని రెట్టింపు చేయవలసినదిగా సవినయంగా ప్రార్థిస్తున్నాము.";
const SUFFIX = "కుటుంబము వారి";
const SUFFIX_BOTH = "కుటుంబముల వారి";

type Src = Partial<InvitationData>;
const t = (v?: string) => (v || "").trim();

export const inviterMode = (d: Src): InviterMode => (INVITER_OPTIONS.some((o) => o.id === d.inviterMode) ? (d.inviterMode as InviterMode) : "surname");

/** The name that comes before "కుటుంబము వారి". Groom's / bride's family use the father's name, or the person's own name when there is none. */
export function inviterTe(d: Src): { name: string; plural: boolean } {
  const groom = t(d.groomFatherTe) || t(d.groomTe), bride = t(d.brideFatherTe) || t(d.brideTe);
  switch (inviterMode(d)) {
    case "groom": return { name: groom, plural: false };
    case "bride": return { name: bride, plural: false };
    case "both": return { name: [groom, bride].filter(Boolean).join(" & "), plural: !!groom && !!bride };
    case "custom": return { name: t(d.inviterTe) || t(d.inviterEn), plural: false };
    default: return { name: t(d.surnameTe), plural: false };
  }
}

export const inviteMessageTe = (d: Src) => t(d.inviteMessageTe) || DEFAULT_INVITE_MESSAGE_TE;

/** The whole paragraph: "<name> కుటుంబము వారి <message>", or just the message when there is no name. */
export function inviteTextTe(d: Src): string {
  const { name, plural } = inviterTe(d);
  return `${name ? `${name} ${plural ? SUFFIX_BOTH : SUFFIX} ` : ""}${inviteMessageTe(d)}`;
}
