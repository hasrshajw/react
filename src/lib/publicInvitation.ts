/* The one request a wedding guest's browser makes. It calls the same get_public_invitation() database function
   as before, but through Supabase's plain REST endpoint with fetch(), so the page does not need the SDK.
   Only published, non-deleted invitations are returned (enforced inside the SQL function). */
import { SUPABASE_KEY, SUPABASE_URL } from "./config";
import type { InvitationRow } from "../types/dashboard";

export interface PublicInvitation { invitation: InvitationRow; html: string }

export async function fetchPublicInvitation(slug: string): Promise<PublicInvitation | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase is not configured");
  const headers: Record<string, string> = { "Content-Type": "application/json", apikey: SUPABASE_KEY };
  /* Legacy anon keys are JWTs and go in Authorization too; the new sb_publishable_ keys must not. */
  if (SUPABASE_KEY.startsWith("eyJ")) headers.Authorization = `Bearer ${SUPABASE_KEY}`;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_public_invitation`, {
    method: "POST", headers, body: JSON.stringify({ p_slug: slug }),
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const data = (await res.json()) as Record<string, any> | null;
  if (!data) return null;
  const { html_code, ...invitation } = data;
  return { invitation: invitation as InvitationRow, html: html_code || "" };
}
