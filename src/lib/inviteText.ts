import type { InvitationData, ParentStatus } from "../types/invitation";

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

/** Telugu prefixes. Kept in one place so they are easy to change. */
export const PREFIX_FATHER_TE = "శ్రీ";
export const PREFIX_MOTHER_TE = "శ్రీమతి";
export const PREFIX_LATE_TE = "కీ.శే.";

/** Reads a stored status; anything unknown counts as alive, so old or damaged records still render. */
export const parentStatus = (v: unknown): ParentStatus => (v === "late" || v === "hidden" ? v : "");

/** The prefix printed before a parent's name: "కీ.శే." when late, otherwise the usual one. */
export const parentPrefixTe = (role: "father" | "mother", status: unknown): string =>
  parentStatus(status) === "late" ? PREFIX_LATE_TE : role === "father" ? PREFIX_FATHER_TE : PREFIX_MOTHER_TE;

/** Father and mother on their own lines ("శ్రీ <father>", "శ్రీమతి <mother>", or "కీ.శే. <name>" when late).
 *  A hidden parent is skipped. The person's own name is used when no parent line is left. */
const parents = (father: string, mother: string, own: string, fatherStatus: unknown, motherStatus: unknown): string[] => {
  const fs = parentStatus(fatherStatus), ms = parentStatus(motherStatus);
  const f = fs === "hidden" ? "" : t(father), m = ms === "hidden" ? "" : t(mother);
  if (!f && !m) return t(own) ? [t(own)] : [];
  return [f && `${parentPrefixTe("father", fs)} ${f}`, m && `${parentPrefixTe("mother", ms)} ${m}`].filter(Boolean) as string[];
};

/** The lines printed after "ఇట్లు" (at most four: groom's father, mother, then bride's father, mother). */
export function inviterLinesTe(d: Src): string[] {
  const groom = parents(d.groomFatherTe || "", d.groomMotherTe || "", d.groomTe || "", d.groomFatherStatus, d.groomMotherStatus);
  const bride = parents(d.brideFatherTe || "", d.brideMotherTe || "", d.brideTe || "", d.brideFatherStatus, d.brideMotherStatus);
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
