import { createContext, useContext } from "react";
import type { MyInvitation } from "../../lib/api";
import { invitationUrl } from "../../lib/links";

/** What the client shell shares with the Dashboard and the editor: one list of the person's invitations, loaded once. */
export interface ClientData {
  list: MyInvitation[] | null;
  loading: boolean;
  error: boolean;
  reload: () => void;
  /** The invitation the Dashboard shows and the Edit link opens. */
  selectedId: string | null;
  select: (id: string) => void;
  /** The editor reports whether its preview panel is open (desktop), so the sidebar floats over it like in the admin Create page. */
  setPanelOpen: (open: boolean) => void;
  /** Where the editor portals its live preview. */
  slot: HTMLElement | null;
}

export const ClientCtx = createContext<ClientData | null>(null);

export function useClientData(): ClientData {
  const v = useContext(ClientCtx);
  if (!v) throw new Error("useClientData must be used inside ClientShell");
  return v;
}

/** The public link of one of the client's invitations (custom short link when set, the id otherwise). */
export const publicUrlOf = (inv: MyInvitation): string => {
  const custom = (inv.details as Record<string, unknown> | null)?.customId;
  return invitationUrl(typeof custom === "string" && custom.trim() ? custom : inv.id);
};
