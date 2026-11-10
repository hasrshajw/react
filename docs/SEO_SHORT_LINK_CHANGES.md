# Change plan: short links, custom link previews and SEO

Branch: `feature/supabase-connection`
Stack found in this repo: Vite + React 18 + TypeScript, react-router-dom v7, Supabase, deployed on Vercel.

## Status (updated after each push)

Work is done in small batches. One or two changes per commit, each pushed to this branch.

| Batch | Scope | Status |
|---|---|---|
| 1 | Migration SQL (section 4) and `src/lib/reserved.ts` (2.5) | Done. **You must run `supabase/migrations/001_seo_previews.sql` in the Supabase SQL Editor.** |
| 2 | Remove Photos section (section 1) | Done. **You must run `supabase/migrations/002_remove_photo_blocks_from_templates.sql` in the Supabase SQL Editor.** |
| 3 | Types, defaults and validation for SEO fields (2.1, 2.4) | Done. No SQL to run. |
| 4 | SEO section UI and image upload (2.2, 2.3) | To do |
| 5 | Routes and link builders (section 3) | To do |
| 6 | `api/invite.js`, `vercel.json`, `PublicInvitation.tsx` title (section 5) | To do |
| 7 | Main domain SEO: `index.html`, `public/` files (section 6) | To do |
| 8 | Security notes (section 8) and final testing (section 7) | To do |

Notes from batch 1:
- Migration differs slightly from the draft in section 4. Policies are dropped before they are created so the file can be re-run,
  the slug format check ignores case (old links may contain capitals), and `favicon`, `robots`, `sitemap` are in the DB reserved list too, matching `reserved.ts`.
- Run the diagnostic query at the top of the migration first. It lists existing slugs that would break the new constraints.
- No existing app code uses `reserved.ts` yet. It is wired into validation in batch 3 and routes in batch 5.

Notes from batch 2:
- Removed the Photos section from `constants.ts`, `types/invitation.ts`, `CreateForm.tsx`, `Create.tsx` and the token map in `compileInvitation.ts`. `tsc` and `vite build` pass.
- `PhotoPicker.tsx` is kept on purpose. `GalleryPicker` in that file is now unused. Batch 4 reuses the drag-and-drop part for the SEO image.
- `supabase/seed.sql` no longer has the photo and gallery blocks. Because its inserts use `on conflict do nothing`, templates that already exist in your
  database are changed only by running migration `002`. The last query in that file lists custom templates that still use `couple-photo` or `gallery-N`. Edit those by hand.
- Old invitations: `{ ...initial, ...details }` in `Create.tsx` still copies the stored `couplePhoto` and `gallery` into the form, so re-saving an old invitation keeps those
  base64 values in `details`. They are harmless but keep the row large. Optional cleanup for later: drop both keys when loading in `Create.tsx` (line 90).
  Not done yet, because it permanently deletes the stored photos.
- The sidebar (`Sidebar.tsx`) still has an unrelated `ImageIcon` for the Hero Section page. It was left alone.
- Until batch 4 lands, the Create page has no Photos and no SEO section.

Notes from batch 3:
- `InvitationData` has `seoTitle`, `seoDescription`, `seoImage`; `initial` sets them to `""`. Old invitations that lack the keys get `""` through `{ ...initial, ...details }` in `Create.tsx`.
- `SectionId` now includes `"seo"`. `Create.tsx` got the matching `done.seo` and `sectionLoading.seo` entries (needed to keep `tsc` passing).
- The `seo` entry is **not** added to `SECTIONS` yet. If it were, the nav would show a Link preview item with no section in the form. It is added in batch 4 together with `SeoSection.tsx`, and `Search` is already exported from `Icons.tsx`.
- `validate.ts`: `customId` must be 3 to 30 characters of letters, numbers, `-` or `_`, and not in `RESERVED` (`isReserved` from `reserved.ts`). The letter check ignores case, same as the DB constraint, so old slugs with capitals can still be saved. Differs from the plan text, which says lowercase only.
  Lowercase is not forced anywhere yet; the DB lookup is case-insensitive. Optional: lowercase the slug when saving.
- `customId` errors still point to section `template`, because the field is still in the Template section. Batch 4 moves the field and changes this to `seo`.
- `seoTitle` over 60 and `seoDescription` over 160 are reported as errors under section `seo`. Batch 4 adds `maxLength` on the inputs so users normally cannot reach them. The plan calls these soft warnings; if you want them to not block saving, that is handled in batch 4 when the UI exists.
- Exported helpers: `okSlug`, `SEO_TITLE_MAX`, `SEO_DESC_MAX`, `SLUG_MIN`, `SLUG_MAX`.

## Goals

1. Invitation links on the same domain: `example.com/harshajw` (today: `/i/harshajw`).
2. Each invitation has its own WhatsApp / Instagram preview image and text.
3. Main domain has its own fixed SEO title, description and preview image.
4. Remove the **Photos** section from the Create page.
5. Add an **SEO** section to the Create page.

## Why previews show the Vercel/generic card today

WhatsApp and Instagram crawlers read the raw HTML and do not run JavaScript. `index.html` is the same for every URL
(`<title>Dashboard</title>`, no Open Graph tags) and `PublicInvitation.tsx` only sets `document.title` in the browser.
So the server must return per-invitation `<meta property="og:...">` tags. This needs one Vercel serverless function.

## Summary of files

| Action | File |
|---|---|
| Add | `api/invite.js` (serverless function that injects OG tags) |
| Add | `supabase/migrations/001_seo_previews.sql` (storage bucket, meta RPC, slug rules) |
| Add | `src/lib/reserved.ts` (words that cannot be used as a short link) |
| Add | `src/features/create/components/SeoSection.tsx` (new SEO section + live preview card) |
| Add | `public/og-main.jpg`, `public/robots.txt`, `public/sitemap.xml` |
| Edit | `vercel.json`, `index.html` |
| Edit | `src/App.tsx` (routes) |
| Edit | `src/types/invitation.ts`, `src/features/create/constants.ts` |
| Edit | `src/features/create/CreateForm.tsx`, `src/pages/Create.tsx` |
| Edit | `src/lib/validate.ts`, `src/lib/image.ts`, `src/lib/api.ts` |
| Edit | `src/pages/PublicInvitation.tsx` |
| Edit (data) | templates in Supabase / `supabase/seed.sql` that use `couple-photo` and `gallery-N` |

Do NOT re-run `supabase/schema.sql`. It drops every table. Use the separate migration file below.

---

## 1. Remove the Photos section

1. `src/features/create/constants.ts`
   - Delete `{ id: "photos", label: "Photos", ... }` from `SECTIONS`.
   - Delete `couplePhoto: "", gallery: []` from `initial`.
   - Delete `couplePhoto: "couple-photo", gallery: "gallery"` from `TARGETS`.
   - Remove the unused `Image as ImageIcon` import.
2. `src/types/invitation.ts`
   - Remove `"photos"` from `SectionId`.
   - Remove `couplePhoto` and `gallery` from `InvitationData` (or make them optional if you want old records to type-check).
3. `src/features/create/CreateForm.tsx`
   - Delete the `<Section id="photos" ...>` block (about lines 105 to 116).
   - Remove `photos = fx("photos")` (line 45) and the `PhotoPicker, GalleryPicker` import (line 8).
4. `src/pages/Create.tsx`
   - Remove `photos: has(data.couplePhoto) || data.gallery.length > 0` (line 171).
   - Remove `data.couplePhoto, data.gallery.length` from the dependency list (line 173).
   - Remove `photos: recordLoading` (line 180).
   - Change the save error text on line 225, it mentions "remove a large photo".
5. `src/lib/compileInvitation.ts`
   - Remove `"couple-photo"` and `"gallery-1..4"` from the token map.
6. `src/components/` nav (`SectionNav.tsx`) reads `SECTIONS`, so it updates automatically.
7. **Templates:** the HTML in the `templates` table uses the `couple-photo` and `gallery-N` tokens.
   Edit those templates (or `supabase/seed.sql`) so those image blocks are removed, otherwise they render as empty boxes.
8. Old invitations still have `details.couplePhoto` and `details.gallery` stored. They are ignored. No data migration needed.
9. Keep `PhotoPicker.tsx`. The SEO image upload reuses its drag-and-drop pattern.

A side benefit: photos are currently saved as base64 inside the `details` JSON column, which makes rows very large.
Removing them makes saves and loads faster.

---

## 2. Add the SEO section

### 2.1 Types and defaults

`src/types/invitation.ts`
```ts
export interface InvitationData {
  // ...existing fields
  seoTitle: string;        // max 60 chars
  seoDescription: string;  // max 160 chars
  seoImage: string;        // public URL from Supabase Storage (NOT a base64 data URL)
}
export type SectionId = "template" | "family" | "groom" | "bride" | "venue" | "seo" | "events";
```

`src/features/create/constants.ts`
```ts
export const initial = { ..., seoTitle: "", seoDescription: "", seoImage: "" };
// SECTIONS: replace the photos entry with
{ id: "seo", label: "Link preview", icon: Search /* or Share2 */, hint: "recommended" },
```
Add the icon to `src/components/Icons.tsx`.

### 2.2 The section UI

New `src/features/create/components/SeoSection.tsx`, used from `CreateForm.tsx` where Photos used to be:

- **Custom link** field (move `customId` here from the Template section, keep the same `Field` component).
  Help text: `${window.location.origin}/${slug || "your-link"}`.
- **Preview title** input, `maxLength={60}`, with a character counter.
- **Preview description** textarea, `maxLength={160}`, with a counter.
- **Preview image** upload (1200 x 630), with Replace and Remove buttons.
- A small **live preview card** (image, title, description, domain) so the user sees what WhatsApp will show.
- Auto fallbacks when empty: title = `"{Groom} & {Bride} Wedding Invitation"`,
  description = `"{wedding date}, {venue}. Tap to view the invitation."`. Show these as placeholders.

### 2.3 Image upload (important)

A data URL cannot be used as `og:image`. The crawler needs a public `https` URL.

- `src/lib/image.ts`: add `compressToOg(file)` that center-crops to **1200 x 630**, exports JPEG, target **under 300 KB**
  (WhatsApp ignores larger images). Reuse the existing `compressImage` internals.
- Upload the result to the Supabase Storage bucket `invitation-previews` (see migration), path `${userId}/${invitationId}.jpg`,
  with `upsert: true`, then store the public URL in `seoImage`.
- Add `uploadPreviewImage(file, invitationId)` to `src/lib/api.ts`.
- When the invitation is not saved yet (no id), generate the id first (`uid()` already exists in `constants.ts`) and upload using it.

### 2.4 Validation

`src/lib/validate.ts`
- `customId`: lowercase `a-z 0-9 - _`, length 3 to 30, and not in `RESERVED` (message: "This link name is reserved").
  Current rule is only `/^[a-z0-9-]+$/i`.
- `seoTitle` max 60, `seoDescription` max 160 (soft warnings, not blockers).
- Map `seo` errors to `section: "seo"`.

### 2.5 Reserved words

New `src/lib/reserved.ts`, imported by `validate.ts`, `App.tsx` and `api/invite.js` (copy the list into the function, or keep it in a `.json` both can import):
```ts
export const RESERVED = ["login","invitations","templates","create","inventory","billing","customize",
  "dashboard","api","assets","i","admin","privacy","terms","pricing","about","contact","favicon","robots","sitemap"];
```
Add every new top-level app route to this list, or a user could claim it as a short link.

---

## 3. Short links: `example.com/harshajw`

### 3.1 Routes (`src/App.tsx`, router near line 487)

Today: `{ path: "/i/:slug", element: <PublicInvitation /> }` plus a catch-all for the admin shell.

- Keep `/i/:slug` so links that were already shared keep working.
- Add `{ path: "/:slug", element: <PublicInvitation /> }`.
- **Careful:** in react-router v7 a dynamic `/:slug` ranks higher than a splat `/*`. If the admin shell is mounted on `/*`,
  `/invitations` or `/create` would be caught by `/:slug`. Fix by declaring the shell routes explicitly
  (`/`, `/invitations`, `/templates`, `/create`, `/inventory`, `/billing`, `/customize/*`) before `/:slug`,
  or by having `PublicInvitation` redirect to the shell when `slug` is in `RESERVED`.
- Add a friendly 404 route.

### 3.2 Link builders

Search the repo for `"/i/"` and change to `/${slug}`. Known places:
- `src/features/create/CreateForm.tsx` line 56 (help text)
- `src/pages/Create.tsx` line 192 (`getLink`)
- also check `ShareModal.tsx` (both copies), `QrModal.tsx`, `RowActions.tsx`, `dashboardData.ts`

Put the builder in one helper, e.g. `invitationUrl(slug)` in `src/features/invitations/utils.ts`.

---

## 4. Database migration (new file, do not edit schema.sql)

`supabase/migrations/001_seo_previews.sql`
```sql
-- 4.1 public bucket for preview images
insert into storage.buckets (id, name, public)
values ('invitation-previews', 'invitation-previews', true)
on conflict (id) do nothing;

create policy "previews: public read" on storage.objects for select
  using (bucket_id = 'invitation-previews');
create policy "previews: owner write" on storage.objects for insert to authenticated
  with check (bucket_id = 'invitation-previews' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "previews: owner update" on storage.objects for update to authenticated
  using (bucket_id = 'invitation-previews' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "previews: owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'invitation-previews' and (storage.foldername(name))[1] = auth.uid()::text);

-- 4.2 lightweight lookup for the link-preview function.
-- get_public_invitation() also increments views, so crawlers must not use it.
create or replace function public.get_invitation_meta(p_slug text) returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'groom_name', groom_name, 'bride_name', bride_name, 'event_date', event_date,
    'seo_title', details->>'seoTitle', 'seo_description', details->>'seoDescription',
    'seo_image', details->>'seoImage', 'venue', details->>'venueEn')
  from public.invitations
  where lower(slug) = lower(p_slug) and published and deleted_at is null
  limit 1;
$$;
revoke all on function public.get_invitation_meta(text) from public;
grant execute on function public.get_invitation_meta(text) to anon, authenticated;

-- 4.3 block reserved words at the database level too
alter table public.invitations
  add constraint invitations_slug_format check (slug ~ '^[a-z0-9_-]{3,30}$' or slug = id),
  add constraint invitations_slug_reserved check (lower(slug) <> all (array[
    'login','invitations','templates','create','inventory','billing','customize',
    'dashboard','api','assets','i','admin','privacy','terms','pricing','about','contact']));
```
Check existing rows first. Any existing slug that breaks the format check must be fixed before running 4.3.

The SEO values live inside the existing `details` JSON column, so no new columns are needed.

---

## 5. Serverless function and Vercel config

### 5.1 `vercel.json`

Put the invitation rewrites **before** the SPA fallback:
```json
{
  "rewrites": [
    { "source": "/i/:slug", "destination": "/api/invite?slug=:slug" },
    { "source": "/:slug((?!api$|assets$|login$|invitations$|templates$|create$|inventory$|billing$|customize$|favicon\\.ico$|robots\\.txt$|sitemap\\.xml$)[a-zA-Z0-9_-]+)", "destination": "/api/invite?slug=:slug" },
    { "source": "/((?!assets/|api/|.*\\.[a-zA-Z0-9]+$).*)", "destination": "/index.html" }
  ],
  "headers": [ ...keep the existing headers ]
}
```
`/` stays static (main-domain SEO). Multi-level paths such as `/customize/popup` go to the SPA fallback.

### 5.2 `api/invite.js` (plain JS, the project is ESM, no extra dependency)

Logic:
1. Read `slug` from the query, lowercase it.
2. `fetch(`${origin}/index.html`)` to get the built SPA shell.
3. If `slug` is reserved, return the shell unchanged.
4. Call Supabase REST: `POST ${SUPABASE_URL}/rest/v1/rpc/get_invitation_meta` with headers `apikey` and `Authorization: Bearer <publishable key>`, body `{ "p_slug": slug }`.
5. If nothing is found, return the shell (React shows the "not available" page).
6. Build the tags with HTML-escaping: `og:title`, `og:description`, `og:image` (absolute https URL, fallback `${origin}/og-main.jpg`),
   `og:url`, `og:type`, `og:image:width/height`, `twitter:card=summary_large_image`, and `<meta name="robots" content="noindex">`.
7. Remove the existing `<title>`, `description` and `og:*` tags from the shell, insert the new ones before `</head>`.
8. Respond with `Content-Type: text/html` and `Cache-Control: s-maxage=300, stale-while-revalidate=3600`.

Env vars in Vercel (Project Settings > Environment Variables): reuse `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
(Vercel exposes them to functions at runtime too). No service-role key is needed.

Real visitors still get the normal React app because the function returns the same `index.html`.

### 5.3 `src/pages/PublicInvitation.tsx`

Use `seoTitle` for `document.title` when present (fall back to the current `Groom & Bride | Wedding invitation`).
Also read the slug case-insensitively (the DB lookup already does).

---

## 6. Main domain SEO

Important: right now `/` is the **admin Dashboard**, which sits behind login. Google cannot index it.
For real SEO on `example.com`, add a public landing page (or move the dashboard to `/app`). At minimum:

- `index.html`: replace `<title>Dashboard</title>` and `description "Modern dashboard application"` with real text, and add
  `canonical`, `og:title`, `og:description`, `og:image` (`https://example.com/og-main.jpg`, 1200x630), `og:url`, `og:site_name`, `twitter:card`.
- `public/robots.txt`:
  ```
  User-agent: *
  Allow: /
  Disallow: /login
  Disallow: /create
  Disallow: /invitations
  Sitemap: https://example.com/sitemap.xml
  ```
  Invitation pages are already `noindex` through the function, so private invitations stay out of Google.
  WhatsApp and Instagram still read the preview tags.
- `public/sitemap.xml` with the public URLs only.
- The repo keeps static files in a root `assets/` folder. Vite serves `public/`, so create `public/` for the files above.
- Add JSON-LD (`Organization` or `WebSite`) to `index.html` once the landing page exists.

---

## 7. Testing checklist

1. `npm run build` (it runs `tsc --noEmit`, so leftover `couplePhoto` or `gallery` references show up as errors).
2. Create an invitation with slug `harshajw`, a title, a description and an image. Open `example.com/harshajw` and confirm the page renders.
3. `curl -A "WhatsApp/2" https://example.com/harshajw` and confirm the custom `og:` tags are in the HTML.
4. Facebook Sharing Debugger (developers.facebook.com/tools/debug), press "Scrape Again". It covers WhatsApp and Instagram.
5. WhatsApp and Instagram cache previews. Test a changed link with `?v=2`.
6. Confirm `/invitations`, `/create`, `/login` still open the admin app and `/create` cannot be claimed as a slug.
7. Confirm old `/i/<slug>` links still work.
8. Vercel > Settings > Deployment Protection: turn off "Vercel Authentication" for the production domain.
   Use the real domain, not `*.vercel.app` (protected previews show Vercel's login card to crawlers).
9. Image must be public, `https`, 1200x630, under 300 KB.

## 8. Security notes found while reading the repo

- `.env.local` is committed on this branch. Check that it holds no real values. If it does, rotate the Supabase keys,
  `git rm --cached .env.local`, make sure `.gitignore` lists it, and keep real values only in Vercel settings.
  Rename the committed template to `.env.example`.
- The GitHub personal access token was pasted into a chat. Delete it in GitHub > Settings > Developer settings and create a new one if needed.

## 9. Suggested order of work

1. Migration SQL (section 4)
2. Remove Photos (section 1) and fix templates
3. Types, SEO section, image upload, validation (section 2)
4. Routes and link builders (section 3)
5. `api/invite.js` and `vercel.json` (section 5)
6. Main domain SEO files (section 6)
7. Test (section 7)
