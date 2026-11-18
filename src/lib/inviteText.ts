import type { InvitationData } from "../types/invitation";

/* The invitation of a template, in two editable parts: the message paragraph, and WHO invites, shown at the bottom after "ఇట్లు"
   (family surname, groom's family, bride's family, both, or a custom name). */

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
type Src = Partial<InvitationData>;
const t = (v?: string) => (v || "").trim();

export const inviterMode = (d: Src): InviterMode => (INVITER_OPTIONS.some((o) => o.id === d.inviterMode) ? (d.inviterMode as InviterMode) : "surname");

/** Father and mother on their own lines ("శ్రీ <father>", "శ్రీమతి <mother>"); the person's own name when both parents are empty. */
const parents = (father: string, mother: string, own: string): string[] => {
  const f = t(father), m = t(mother);
  if (!f && !m) return t(own) ? [t(own)] : [];
  return [f && `శ్రీ ${f}`, m && `శ్రీమతి ${m}`].filter(Boolean) as string[];
};

/** The lines printed after "ఇట్లు" (at most four: groom's father, mother, then bride's father, mother). */
export function inviterLinesTe(d: Src): string[] {
  const groom = parents(d.groomFatherTe || "", d.groomMotherTe || "", d.groomTe || "");
  const bride = parents(d.brideFatherTe || "", d.brideMotherTe || "", d.brideTe || "");
  switch (inviterMode(d)) {
    case "groom": return groom;
    case "bride": return bride;
    case "both": return [...groom, ...bride];
    case "custom": return [t(d.inviterTe) || t(d.inviterEn)].filter(Boolean);
    default: return t(d.surnameTe) ? [`${t(d.surnameTe)} కుటుంబము`] : [];
  }
}

/** The message paragraph (the standard text when none was written). */
export const inviteMessageTe = (d: Src) => t(d.inviteMessageTe) || DEFAULT_INVITE_MESSAGE_TE;
