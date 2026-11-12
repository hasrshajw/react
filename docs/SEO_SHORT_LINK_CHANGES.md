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
| 4 | SEO section UI and image upload (2.2, 2.3) | Done. Needs migration `001` (bucket `invitation-previews`) to be applied, which batch 1 already asked for. |
| 5 | Routes and link builders (section 3) | Done. No SQL to run. After deploy, `example.com/<slug>` opens the invitation. Previews still show the generic card until batch 6. |
| 6 | `api/invite.js`, `vercel.json`, `PublicInvitation.tsx` title (section 5) | Done. **You must redeploy on Vercel and check the env vars (see notes).** No SQL beyond migration `001`. |
| 7 | Main domain SEO: `index.html`, `public/` files (section 6) | Done. **You must replace `https://example.com` with your real domain in 3 files (see notes).** No SQL to run. |
| 7b | Public landing page at `/`, dashboard moved to `/dashboard` (section 6) | Done. No SQL to run. |
| 6b | Debug header `x-invite-status` in `api/invite.js` | Done. Redeploy, then follow "If previews still show Vercel's card" below. |
| 9 | Fix: Vercel login page shown at `/<slug>` (see "Update 2026-11-10" below) | Done. `api/invite.js` now serves only link-preview crawlers. **Redeploy, and turn off Vercel Authentication for sharing.** |
| 8 | Security notes (section 8) and final testing (section 7) | Done. `.env.local` was restored afterwards (see the update in the notes). No SQL to run. |

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

Notes from batch 4:
- New section "Link Preview & Custom Link" (`SeoSection.tsx`, after Venue). It holds the Custom Link ID field (moved out of the Template section), preview title (60), preview description (160), preview image and a live preview card. `customId` errors now point to section `seo`.
- `compressToOg(file)` in `image.ts`: center-crops to 1200 x 630, JPEG, lowers quality and then size until it is under 300 KB. Fails with a clear message if it cannot get under the limit.
- `uploadPreviewImage(blob, invitationId)` in `api.ts`: uploads to `invitation-previews/<userId>/<invitationId>.jpg` with `upsert`, returns the public URL with a `?v=<time>` stamp so a replaced image is not served from cache. If the bucket is missing, the user sees "Run supabase/migrations/001_seo_previews.sql first".
- `Create.tsx` now creates the id of a new invitation up front (`pendingId`), so the image can be uploaded before the first save, and the save uses the same id. "Create another" gets a fresh id.
- Empty title and description fall back to `"{Groom} & {Bride} Wedding Invitation"` and `"{date}, {venue}. Tap to view the invitation."` They show as placeholders and in the preview card. `seoFallbacks()` in `SeoSection.tsx` is the one place for this wording; `api/invite.js` (batch 6) must use the same text.
- `Field` got optional `placeholder`, `maxLength` and `counter` props. `DropButton` in `PhotoPicker.tsx` is now exported and reused for the upload.
- The help text still shows `/i/<link>`, because short links are not live until batch 5. Batch 5 changes `LINK_PREFIX` in `SeoSection.tsx`.
- Removing the image only clears `seoImage`. The file stays in storage until it is replaced (same path), so an unsaved removal cannot break a saved invitation. Files of deleted invitations are not cleaned up yet; optional later.
- If the user saves while an upload is still running, the save uses the old image. Rare; not handled.
- Not tested in a browser here (no Supabase project available). `tsc` and `vite build` pass. Please try: upload an image, save, reload, replace it, remove it.

Notes from batch 5:
- Routes (`App.tsx`): differs from the plan text. Instead of adding `{ path: "/:slug" }` and declaring every shell route, the `*` route now renders a small `Gate` component.
  A path with exactly one segment that is not in `RESERVED` shows `PublicInvitation`; everything else shows `<Protected />` (the admin shell).
  Reason: the shell is one mounted component, and separate route objects for each page could remount it and lose its state. `Gate` keeps returning the same element, so it stays mounted.
  `/i/:slug` and `/login` are unchanged. Multi-segment paths such as `/customize/popup` still go to the shell.
- The friendly 404 is the existing "This invitation isn't available" page, which `PublicInvitation` shows for any unknown one-segment path such as `/foo`.
  A signed-out user who opens a shell page that is not reserved still gets that page instead of the login redirect. All current shell pages start with a reserved word, so this does not happen today.
  Rule for the future: every new top-level admin route goes into `RESERVED` (`src/lib/reserved.ts`), the DB constraint and the `vercel.json` rewrite.
- `PublicInvitation` takes an optional `slug` prop (the short-link route has no `:slug` param). The `/i/:slug` route still uses the URL param.
- Link builder: new `src/lib/links.ts` with `invitationPath(slug)` and `invitationUrl(slug)`. The plan suggested `features/invitations/utils.ts`, but that file imports `dashboardData.ts`, which needs the builder too, so it would be a circular import.
- Changed to `invitationUrl`: `getInviteLink` in `dashboardData.ts` (used by the dashboard, invitations table, CSV export, `QrModal`, invitations `ShareModal` and WhatsApp share), `getLink` in `Create.tsx` (create `ShareModal`, copy link, WhatsApp text), and the help text in `SeoSection.tsx`.
  The create `ShareModal` only receives the link as a prop, so it needed no change. `RowActions.tsx` has no `/i/` link.
- Invitations `ShareModal` (quick edit of the Custom link ID) did not use the new slug rules. It allowed 40 characters, no underscore and reserved words. It now uses `okSlug` and `isReserved`, with the same 3 to 30 limit and the same messages as the Create page.
- Not changed on purpose: invitations without a custom link now get `example.com/<invitation id>` (a UUID) instead of `example.com/i/<id>`. This matches the plan (`/${slug}`) and the DB check (`slug = id` is allowed). The `vercel.json` rewrite in batch 6 must allow hyphens, which it does.
- `vercel.json` is not touched yet. The current SPA fallback already serves `index.html` for `/harshajw`, so short links work after deploy. Social previews need batch 6.
- `tsc` and `vite build` pass. Not tested in a browser. Please try after deploy: `/harshajw`, `/i/harshajw`, `/invitations`, `/create`, `/customize/popup`, `/login`, `/nonexistent`, and copy a link from the dashboard.

Notes from batch 6 (**superseded by "Update 2026-11-10" below**: the function no longer fetches or returns `index.html`, and real visitors no longer go through it):
- New `api/invite.js` (plain ESM JavaScript, no dependency). Steps: lowercase the slug, fetch `${origin}/index.html`, return it unchanged for reserved or invalid slugs,
  call `get_invitation_meta` over REST, build the tags, strip the shell's own `<title>`, `description`, `robots`, `canonical`, `og:*` and `twitter:*` tags, insert ours before `</head>`.
  Tags added: `title`, `description`, `robots noindex`, `canonical`, `og:type/url/title/description/image/image:width/image:height`, `twitter:card=summary_large_image` and `twitter:title/description/image`. Everything is HTML-escaped.
- Fallback text is the same as `seoFallbacks()` in `SeoSection.tsx`, including the date format (`5 December 2026`). If you change one wording, change the other. The date is formatted by hand so it does not depend on the server's locale data.
- `og:image` must be an `https` URL. If `seoImage` is empty or is not `https` (for example an old base64 value), the function uses `${origin}/og-main.jpg`. **That file does not exist until batch 7**, so until then invitations without their own image have no preview image.
- `og:url` and `canonical` always use the short link `/<slug>`, also when the request came in as `/i/<slug>`.
- Failure behaviour: if the database call fails, times out (4 s) or the env vars are missing, the plain shell is returned, so the page still loads and only the preview is generic. If `index.html` itself cannot be fetched the function answers 502 with a refresh message.
- Env vars: the function reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (also accepts `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`). Check in Vercel > Settings > Environment Variables that they are enabled for **Production**.
  New `sb_publishable_...` keys are sent in the `apikey` header only. Legacy JWT keys (`eyJ...`) are also sent as `Authorization: Bearer`.
- Caching: found invitations `s-maxage=300, stale-while-revalidate=3600`, unknown slugs `s-maxage=60`, reserved paths `no-cache`. After you edit a title or image, the preview can take up to 5 minutes to change on our side, and WhatsApp and Instagram add their own cache on top (use `?v=2` to test).
  The existing catch-all header in `vercel.json` (`Cache-Control: no-cache` for everything outside `/assets/`) is unchanged. If Vercel applies it on top of the function's header, previews still work but are not cached at the edge. This is harmless; check with `curl -I` after deploy.
- `vercel.json`: added `/i/:slug` and `/:slug(...)` rewrites to `/api/invite` before the SPA fallback. The reserved words are excluded in the pattern, so admin pages (`/invitations`, `/create`, ...) do not go through the function. Multi-segment paths and anything with a dot (`/robots.txt`, `/favicon.ico`, `/og-main.jpg`) still go straight to static files or the SPA fallback.
  The SPA fallback now also skips `api/`. Also keep this list in sync with `reserved.ts` and the DB constraint.
- `PublicInvitation.tsx`: `document.title` is now `seoTitle` when the owner set one, otherwise `Groom & Bride | Wedding invitation` as before. The slug was already looked up case-insensitively by the database, so nothing else changed there.
- Tested locally with a script that runs the handler against a fake shell and a fake Supabase (16 checks): found, name and date fallbacks, escaping of `"`, `<`, `&`, base64 image fallback, unknown slug, reserved slug, invalid characters, and both key types. `tsc` and `vite build` pass. **Not tested on Vercel.** After deploy run `curl -A "WhatsApp/2" https://example.com/<slug>` and look for the `og:` tags (section 7 steps 3 to 5).
- Turn off Vercel > Settings > Deployment Protection > Vercel Authentication for the production domain, or crawlers will see Vercel's login card (section 7 step 8).

Notes from batch 7:
- `index.html`: title is now `Schedy | Digital Wedding Invitations` (name taken from the README) and the description is real text. Added `canonical`, `og:type/site_name/title/description/url/image/image:width/image:height` and `twitter:card/title/description/image`.
  Edit the wording if you prefer a different product name or text.
- **Domain (changed 12 Nov 2026, M-8):** the real domain is no longer written in the files. `index.html` uses a `%SITE_URL%` placeholder, and `robots.txt` and `sitemap.xml` are generated at build time by `vite.config.ts`. Set the `SITE_URL` environment variable (for example `https://your-domain.com`) in Vercel (Production and Preview) or `.env.local`, then build. On Vercel, if `SITE_URL` is missing, the project's production domain (`VERCEL_PROJECT_PRODUCTION_URL`) is used. Without either, the build prints a warning and leaves out `canonical`, `og:url`, `og:image`, `twitter:image`, the `Sitemap:` line and `sitemap.xml`. WhatsApp and Google need absolute URLs, so a relative path would not work.
- `public/og-main.jpg` is a simple generated placeholder (1200 x 630, about 40 KB, text "Schedy" on a cream background). Replace it with your own artwork, keeping the same file name, size and under 300 KB.
  This is also the fallback image that `api/invite.js` uses for invitations without their own image, so they now get a preview image.
- `public/robots.txt`: as in section 6. It disallows `/login`, `/create` and `/invitations`. Other admin paths (`/templates`, `/inventory`, `/billing`, `/customize/*`) are not listed, as in the plan; add them if you want them out of crawlers.
  Invitation pages are `noindex` through the function.
- `public/sitemap.xml` lists only `/`, because there are no other public pages yet.
- `vercel.json` needed no change: paths with a dot (`/robots.txt`, `/sitemap.xml`, `/og-main.jpg`) skip both the function rewrite and the SPA fallback and are served as static files. `vite build` copies `public/` into `dist/` (checked).
- `index.html` tags apply to every admin shell page, not only `/`. `/` is still the login-protected Dashboard, so Google cannot index real content there. For real SEO, a public landing page is still needed (or move the dashboard to `/app`). Not done, it is a bigger change.
- JSON-LD (`WebSite` or `Organization`) is not added. The plan says to add it once the landing page exists.
- `tsc` and `vite build` pass. After deploy check `https://YOUR-DOMAIN/robots.txt`, `/sitemap.xml`, `/og-main.jpg`, and run the Facebook Sharing Debugger on the main domain.

Notes from batch 7b:
- New public landing page at `/` (`src/pages/Landing.tsx`, styles in `src/features/landing/landing.css`, injected the same way as the Login page). Top nav has the Schedy logo, Features and How it works anchor links and a **Login** button that goes to `/login`. Below it: hero, four feature cards, three steps, a closing call to action and a footer. The text is placeholder copy based on the README and the Login page; edit it freely.
- If the visitor is already signed in, the nav button and the two call-to-action buttons say "Dashboard" / "Go to dashboard" and open `/dashboard` instead of the login page.
- **The dashboard moved from `/` to `/dashboard`.** `dashboard` was already in `RESERVED`, the DB constraint and the `vercel.json` rewrite, so no list needs changing. Updated: the route in `App.tsx`, the sidebar menu item, breadcrumb key and the three logo links in `Sidebar.tsx`, `DASHBOARD_PATH` in `create/constants.ts` ("Go to dashboard" in the share modal), and the default redirect after login in `Login.tsx`. Bookmarks to the old `/` now show the landing page.
- `index.html` already holds the main-domain title, description and Open Graph tags from batch 7, so the landing page needs no extra head tags. It is still a client-rendered page, but Google runs JavaScript, so the text is indexable.
- `public/robots.txt` now also has `Disallow: /dashboard`.
- Still not added: JSON-LD (`WebSite`/`Organization`). It can go into `index.html` now that a landing page exists. Add `/privacy` and `/terms` pages later if you want them in the footer (both are already reserved words).
- `tsc` and `vite build` pass. Not tested in a browser. Please try: `/` (signed out and signed in), the Login button, `/dashboard`, the sidebar logo, sign in from `/login` (should land on `/dashboard`), and `/create` then "Go to dashboard".

Notes from batch 8:
- **Update:** `.env.local` was put back in git on request (commit after `ae08d6f`), so the next bullet about removing it and about `git pull` deleting it no longer applies. `.env.example` stays as the placeholder template. `.gitignore` still lists `.env.local`, so the file stays tracked only because it was added with `git add -f`. Because it is tracked, any edit to it will show up in `git status`. The key is a publishable key; still check RLS and never put a secret key in it.
- `.env.local` was committed on this branch with a real Supabase project URL and a real publishable key (`sb_publishable_...`). It is now removed from git (`git rm --cached`) and `.gitignore` already lists it. A placeholder `.env.example` was added (this is the name the README and the file's own comment already refer to).
- **Warning:** because the file was tracked, `git pull` or switching to this commit **deletes your local `.env.local`**. Before pulling, copy it somewhere, or copy the two values from Vercel > Settings > Environment Variables (or Supabase > Project Settings > API). After pulling run `cp .env.example .env.local` and fill it in.
- **Git history still contains the old values** (commits `9910a21`, `a475153`, `b6a448b` and later). A publishable key is meant to be public, because it ships in the browser bundle, and what protects the data is Row Level Security. So rotating is optional, but do check that RLS is enabled on every table (Supabase > Authentication > Policies) and that the key is not a `service_role` or secret key (`sb_secret_...`). If it ever was, rotate it now. Rewriting history is not done here; it would break everyone's clone.
- Never put a service-role key in `VITE_` variables or in this repo. `api/invite.js` needs only the publishable key.
- **The GitHub personal access token was pasted into a chat again.** Delete it in GitHub > Settings > Developer settings > Fine-grained tokens, and create a new one with access to this repo only (Contents: read and write) if you need one.

Final testing status (section 7):
- Done here: step 1 (`npm run build`, which runs `tsc --noEmit`, passes), and the handler checks for `api/invite.js` (found, not found, reserved slug, env missing, RPC error, non-app shell).
- Cannot be done from here, please run them after deploy (steps 2 to 9 below): the live page, `curl` with a WhatsApp user agent, the Facebook Sharing Debugger, `?v=2` cache test, admin routes and old `/i/<slug>` links, Deployment Protection off, and an image that is public, `https`, 1200 x 630 and under 300 KB.
- If a preview is wrong, use the `x-invite-status` table in "If previews still show Vercel's card or the generic card" above.
- Extra checks for the new landing page: `/` signed out shows the landing page and its Login button opens `/login`; signed in, `/dashboard` opens and the sidebar logo returns to `/dashboard`.

## Update 2026-11-10: Vercel login page shown instead of the invitation

### Symptom
Opening an invitation link (for example `https://react-3ydskhiw4-hasrshajws-projects.vercel.app/harshajww`):
- Incognito or signed out: redirected to `https://vercel.com/login?next=/sso-api?...`.
- Same browser, signed in to Vercel: blank page titled "Login - Vercel" with only "Skip to content", and the console full of 404s for `_next/static/immutable/chunks/*.js`, `*.css`, `logo-github-color-*.svg`, `logo-google-color-*.svg` and `logo-open-ai-color-*.svg`.
Commit `fdd5c16` on `main` (before short links) worked.

### Root cause (two parts)
1. **Vercel Deployment Protection.** `*.vercel.app` deployment URLs have Vercel Authentication on by default, so anyone not signed in to the owner's Vercel account is redirected to `vercel.com/login`. This is a project setting, not code.
2. **`api/invite.js` returned Vercel's login page to everyone.** Every `/<slug>` request went through the function, and the function did `fetch(`${origin}/index.html`)`. That server-side request carries no Vercel login, so on a protected deployment it received Vercel's login HTML (a Next.js page). The function returned it with status 200, which explains the "Login - Vercel" title and the `_next/...` and `logo-*.svg` 404s: those files belong to Vercel's login page, not to this app. `fdd5c16` had no function, so it did not have this problem.

### What was changed
| Commit | Change |
|---|---|
| `a4069d5` | Merged `main` into `feature/supabase-connection` (only added `temp/cartoon.html` and `temp/dark.html`, no conflicts). Then `main` was fast-forwarded to the feature branch, so both branches hold the same code. |
| `09000e5` | First attempt: `api/invite.js` read `dist/index.html` from the function bundle (`includeFiles` in `vercel.json`) instead of fetching it over HTTP. Superseded by the next commit because Vercel bundling `dist/` into the function is not guaranteed. |
| `a0ad39b` | **Final fix.** See below. |

Final fix details:
- `vercel.json`: the two invitation rewrites (`/i/:slug` and `/:slug(...)`) now have a `has` rule on the `user-agent` header. Only link-preview crawlers are routed to `/api/invite`: `facebookexternalhit`, `Facebot`, `WhatsApp`, `Twitterbot`, `TelegramBot`, `Slackbot`, `LinkedInBot`, `Discordbot`, `Googlebot`, `bingbot`, `Pinterest`, `SkypeUriPreview`, `Applebot`. Everyone else falls through to the SPA rewrite (`/index.html`), exactly like `fdd5c16`. The `includeFiles` entry from `09000e5` was removed.
- `api/invite.js`: no longer fetches or reads `index.html`. It returns a minimal standalone HTML page containing the title, description, `canonical`, `og:*` and `twitter:*` tags, plus a link to the invitation. The slug rules, reserved list, Supabase RPC call, 4 s timeout, key handling, caching headers and `x-invite-status` header are unchanged. Reserved or unknown slugs return the minimal page without preview tags. The 502 "shell-fetch-failed" case and the `shell-not-app-deployment-protection?` status no longer exist.
- Not changed: the app code, the migrations, the slug rules, the share links.

### What you still need to do
1. Redeploy from the latest commit on `main` (or `feature/supabase-connection`) and open `/<slug>` on the new deployment. Signed in to Vercel it should show the invitation.
2. For other people (and incognito) to open links, turn off Vercel > Settings > Deployment Protection > Vercel Authentication, or share your production domain. Protection is a setting and code cannot bypass it. It also hides the preview from WhatsApp and Facebook.
3. Check which deployment you are testing: Vercel > Deployments > the one for the latest commit. Old preview URLs keep running old code.
4. Test the preview as a crawler (real domain): `curl -s -A "WhatsApp/2" https://YOUR-DOMAIN/<slug> | grep -i "og:"` and `curl -s https://YOUR-DOMAIN/<slug> | grep -c 'id="root"'` (a normal visitor should get the app shell, so the count is 1).

### Known limits
- Not tested on Vercel from here. The handler was only run locally against an empty environment (reserved slug and missing env vars).
- A crawler whose user agent is not in the list gets the plain app, so its preview is the generic main-domain card. Add its name to the `has` value in `vercel.json` (both rewrites).
- Crawlers do not run JavaScript, so the minimal page is all they see. Real visitors never see it.

## If previews still show Vercel's card or the generic card

Run this against your **real domain** (not `*.vercel.app`) after redeploying, using a published invitation:

```
curl -s -A "WhatsApp/2" -D - -o /dev/null https://YOUR-DOMAIN/<slug> | grep -i -E "^HTTP|x-invite-status|x-vercel"
curl -s -A "WhatsApp/2" https://YOUR-DOMAIN/<slug> | grep -i "og:"
```

Read the `x-invite-status` header:

| Value | Meaning and fix |
|---|---|
| (header missing, or HTTP 401/403, or the HTML says "Vercel Authentication") | The function did not run or the request was blocked. Vercel > Settings > Deployment Protection > turn **Vercel Authentication** off for Production. Redeploy. Check the project was deployed from this branch, and that `api/invite.js` is in the deployment (Vercel > Deployment > Source / Functions). |
| `shell-not-app-deployment-protection?` | Old versions only (before 2026-11-10). The function fetched its own `/index.html` and got Vercel's login page. The function no longer reads `index.html`, so this value is gone; if you still see it, the deployment is running old code, redeploy. |
| `env-missing` | `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` is not set for **Production**. Add them and redeploy (env changes apply only to new deployments). |
| `rpc-http-404` | Migration `001_seo_previews.sql` was not run, so `get_invitation_meta` does not exist. Run it in the Supabase SQL Editor. |
| `rpc-http-401` / `403` | Wrong key, or the function was not granted to `anon`. Re-run the grant lines of migration `001`. |
| `not-found-or-unpublished` | No published, non-deleted invitation has that slug. Publish it, and check the slug spelling. |
| `rpc-timeout-or-network` | Supabase did not answer within 4 s. Retry; check the Supabase URL. |
| `reserved-or-invalid-slug` | The path is an app route or has invalid characters. |
| `found` | The function works. If WhatsApp or Instagram still show an old card, it is their cache: test `?v=2` or use the Facebook Sharing Debugger > Scrape Again. |

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

Use the separate migration file below. (When this was written `supabase/schema.sql` dropped every table. Since the H-3 / M-11 change it no longer deletes anything and already contains this migration; the drop block now lives in `supabase/reset.sql`.)

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

> Updated 2026-11-10: steps 2, 3, 5 and 7 below describe the first version. The function now returns a small standalone HTML page (no `index.html`) and only link-preview crawlers reach it. See "Update 2026-11-10".

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

~~Real visitors still get the normal React app because the function returns the same `index.html`.~~ Wrong in practice, see "Update 2026-11-10": real visitors are now routed straight to the SPA and never reach the function.

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
- **Link-preview function (changed 12 Nov 2026, M-9):** `api/invite.js` no longer builds the site address from the `Host` / `X-Forwarded-Host` headers (anyone can send any value, and the response is cached by the CDN). It uses the same `SITE_URL` rule as the build, shared in `api/_siteUrl.js` (the underscore keeps Vercel from making it a function). With no usable address, the canonical, `og:url` and fallback `og:image` tags are left out. The slug check now matches the database: 3 to 30 letters, numbers, `-` or `_`, or the invitation's own uuid id. The "Open the invitation" link is written only for a valid slug.
