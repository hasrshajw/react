/* The requests a wedding guest's browser makes, through Supabase's plain REST endpoint with fetch() so the page does not
   need the SDK. get_public_invitation() only reads (published, non-deleted invitations only, enforced inside the SQL
   function). Counting a view is a separate call, record_invitation_view(), made after the page has loaded (task H-4). */
import { SUPABASE_KEY, SUPABASE_URL } from "./config";
import type { InvitationRow } from "../types/dashboard";

export interface PublicInvitation { invitation: InvitationRow; html: string }

function rpcHeaders(): Record<string, string> {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase is not configured");
  const headers: Record<string, string> = { "Content-Type": "application/json", apikey: SUPABASE_KEY };
  /* Legacy anon keys are JWTs and go in Authorization too; the new sb_publishable_ keys must not. */
  if (SUPABASE_KEY.startsWith("eyJ")) headers.Authorization = `Bearer ${SUPABASE_KEY}`;
  return headers;
}

export async function fetchPublicInvitation(slug: string): Promise<PublicInvitation | null> {
  const headers = rpcHeaders();

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_public_invitation`, {
    method: "POST", headers, body: JSON.stringify({ p_slug: slug }),
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const data = (await res.json()) as (Record<string, unknown> & { html_code?: string | null }) | null;
  if (!data) return null;
  const { html_code, ...invitation } = data;
  return { invitation: invitation as unknown as InvitationRow, html: html_code || "" };
}

const VISITOR_KEY = "schedy_visitor";

/** A random id for this browser, kept in localStorage so a returning guest counts once a day. It identifies nobody: it is
 *  not tied to a person, and the database keeps it only for a day or two. If storage is blocked, a fresh id is used for
 *  this page load (a reload then counts again, which is the safer mistake). */
export function visitorId(): string {
  const make = () => {
    const c = globalThis.crypto;
    if (c?.randomUUID) return c.randomUUID().replace(/-/g, "");
    const b = new Uint8Array(16);
    c?.getRandomValues?.(b);
    return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("") || `${Date.now()}${Math.random()}`.replace(/\D/g, "").padEnd(16, "0");
  };
  try {
    const saved = localStorage.getItem(VISITOR_KEY);
    if (saved && /^[A-Za-z0-9_-]{16,64}$/.test(saved)) return saved;
    const fresh = make();
    localStorage.setItem(VISITOR_KEY, fresh);
    return fresh;
  } catch {
    return make();
  }
}

/** Tell the database that this browser opened the invitation. Fire and forget: a failure never affects the page. */
export async function recordInvitationView(slug: string): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/record_invitation_view`, {
      method: "POST", headers: rpcHeaders(), keepalive: true,
      body: JSON.stringify({ p_slug: slug, p_visitor: visitorId() }),
    });
    return res.ok ? (await res.json()) === true : false;
  } catch {
    return false;
  }
}
