/* M-4: the link-preview image must be a file this app uploaded to its own Supabase bucket, never a link to another site
   (which would let anyone put a tracking pixel or an unrelated picture into every link preview and into the admin pages).
   Keep in sync with the `seoImage` rule in `details_problem()` (supabase/schema.sql, migration 006) and with PREVIEW_URL in api/invite.js.
   No Supabase SDK is imported here, so this can be used by any page. */
import { SUPABASE_URL } from "./config";

/** Public bucket created by supabase/schema.sql. Files are stored as `<user id>/<invitation id>.jpg`. */
export const PREVIEW_BUCKET = "invitation-previews";

const PATH = new RegExp(`^/storage/v1/object/public/${PREVIEW_BUCKET}/[^/]+/[^/]+\\.jpg$`);

/** True for `https://<this project's host>/storage/v1/object/public/invitation-previews/<user>/<file>.jpg`, optionally with `?v=<digits>`
 *  (what `uploadPreviewImage` returns). Nothing else passes: other hosts, other buckets, other paths, user info, fragments, whitespace.
 *  `base` is the Supabase project URL; it defaults to the configured one and is a parameter only so the rule can be tested. */
export function isOwnPreviewImage(value: string, base: string | undefined = SUPABASE_URL): boolean {
  if (!base || value !== value.trim()) return false;
  try {
    const u = new URL(value), b = new URL(base);
    return u.protocol === "https:" && !u.username && !u.password && u.host === b.host && !u.hash &&
      PATH.test(u.pathname) && (u.search === "" || /^\?v=\d+$/.test(u.search));
  } catch { return false; }
}
