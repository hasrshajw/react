/**
 * Words that cannot be used as a short link (example.com/<word>) because they are app routes
 * or static files. Add every new top-level route here.
 *
 * Keep in sync with:
 *   - supabase/migrations/001_seo_previews.sql (invitations_slug_reserved)
 *   - api/invite.js and the vercel.json rewrite (added in a later step)
 */
export const RESERVED: readonly string[] = [
  "login", "invitations", "templates", "create", "inventory", "billing", "customize",
  "dashboard", "api", "assets", "i", "admin", "privacy", "terms", "pricing", "about", "contact",
  "favicon", "robots", "sitemap", "my", "reviews",
];

/** True when `slug` is a reserved word (case-insensitive). */
export const isReserved = (slug: string): boolean => RESERVED.includes(slug.trim().toLowerCase());
