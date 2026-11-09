# Schedy Demo

Admin app for creating digital wedding invitations and sharing them as links. It runs in the browser with no setup (demo mode), or against a Supabase database for real use (see **Data layer** below).

## Run locally

```bash
npm install
npm run dev
```

## Demo behavior (when Supabase is not configured)

- The invitation builder includes two built-in sample templates.
- Invitations are saved to browser `localStorage` and appear on the Dashboard and All Invitations pages.
- Editing an invitation uses its local demo record.
- Data stays in the current browser profile. Clearing browser site data removes the demo records.
- Telugu fields fill in automatically as you type English names. It uses Google Input Tools when reachable and falls back to built-in offline rules (approximate), so the field never stays empty.
- The Photos section accepts a couple photo and up to 4 gallery photos (JPG/PNG/WebP). Images are resized in the browser and stored inside the invitation, so templates can use `{{couple-photo}}` and `{{gallery-1}}` to `{{gallery-4}}`.

Demo mode is a frontend demonstration, not a production data store. Use Supabase mode for real customers.

## Code layout

- `src/pages/` route components (`Create.tsx` is the page shell only)
- `src/features/create/` Create page: `formReducer.ts`, `CreateForm.tsx`, `components/`, `hooks/`, `create.css`
- `src/components/dashboard/`, `src/hooks/`, `src/lib/dashboardData.js`, `src/styles/dashboard.css` shared Dashboard / Invitations pieces
- `src/lib/` pure helpers (`validate.ts`, `transliterate.ts`, `telugu.ts`, `image.ts`, `storage.ts`)
- `src/types/` shared TypeScript types

## Skeleton loading

Every page shows a skeleton while its server data loads (most visible in Supabase mode, where requests take real time). The rules:

- Static UI (page titles, column headers, tab labels, search box, buttons that always exist) renders immediately.
- Only server data (names, dates, counts, plan text, user name, template cards, form values) is replaced by a placeholder.
- Placeholders reuse the real element's box (`SkText` inside the real element, or the `sk-bg` ghost class), so nothing shifts when data arrives.
- Components that may not exist (e.g. "Needs attention") only get a placeholder if they were there on the last visit.
- `useRowHint` remembers how many rows the last visit had, so the skeleton has the same height as the real list.

Building blocks: `src/components/Skeleton.tsx` and `src/styles/skeleton.css`.

## Data layer (demo or Supabase)

All server reads and writes go through `src/lib/api.ts` (`fetchInvitations`, `saveInvitation`, `savePublished`, `saveDeleted`, `deleteInvitation`, `fetchTemplates`, `fetchEnquiries`, `saveEnquiry`, `fetchAccount`, `fetchPublicInvitation`). There are two backends, chosen at start-up:

- **Demo (default):** browser `localStorage`, no setup. Links only open in the same browser.
- **Supabase:** real database and login, no artificial delay. Turn it on with environment variables (see `.env.example`):

```
VITE_DATA_SOURCE=supabase
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

### Set up Supabase

1. Create a Supabase project.
2. In **SQL Editor**, run `supabase/schema.sql`, then `supabase/seed.sql` (the two starter templates).
3. In **Authentication**, create your admin user (email + password). Optionally enable the Google provider and add `https://YOUR-DOMAIN/login` as a redirect URL.
4. Put the three variables above in `.env.local` for local work, and in **Vercel → Project Settings → Environment Variables** for the live site, then redeploy.

The anon key is meant to be public (it ships in the browser bundle); the data is protected by the row-level-security rules in `schema.sql`. Never put the `service_role` key in this project.

### Share links

Each invitation is served at `/i/<link-id>` (for example `/i/ravi-weds-priya`), with no login. The link ID is the "Custom Link ID" field, or the invitation id if it is empty. Only **published**, non-deleted invitations open; others show a "not available" page. The page is read through the `get_public_invitation` database function, so customers can never list or browse other invitations. Each open counts as a view.

Limits to know about:

- Photos are still stored inside the invitation record (resized in the browser). Fine for a couple photo and a few gallery photos; if invitations grow heavy, move photos to Supabase Storage.
- The Dashboard "Activity" numbers and the Billing page are still placeholders.
- WhatsApp link previews (title and image) need server-side tags; the page does not set them yet.

## Deep links on Vercel

`vercel.json` sends every path that is not a file (`/i/abc123`, `/create`, `/invitations`) to `index.html`, so refreshing or opening a shared link works. Real files and `/assets/*` are never rewritten, so a missing file returns a proper 404 instead of the app. Hashed assets are cached for a year; the HTML is always revalidated so new deploys show up immediately.

## Scripts

- `npm run dev` start the dev server
- `npm run typecheck` TypeScript check (the whole project is TypeScript, including `vite.config.ts`)
- `npm run build` type-check, then production build
