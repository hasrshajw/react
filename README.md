# Schedy Demo

This build runs entirely in the browser and does not require Supabase, API keys, environment variables, or a backend.

## Run locally

```bash
npm install
npm run dev
```

## Demo behavior

- The invitation builder includes two built-in sample templates.
- Invitations are saved to browser `localStorage` and appear on the Dashboard and All Invitations pages.
- Editing an invitation uses its local demo record.
- Data stays in the current browser profile. Clearing browser site data removes the demo records.
- Telugu fields fill in automatically as you type English names. It uses Google Input Tools when reachable and falls back to built-in offline rules (approximate), so the field never stays empty.
- The Photos section accepts a couple photo and up to 4 gallery photos (JPG/PNG/WebP). Images are resized in the browser and stored inside the invitation, so templates can use `{{couple-photo}}` and `{{gallery-1}}` to `{{gallery-4}}`.

This is a frontend demonstration, not a production multi-user data store.

## Code layout

- `src/pages/` route components (`Create.tsx` is the page shell only)
- `src/features/create/` Create page: `formReducer.ts`, `CreateForm.tsx`, `components/`, `hooks/`, `create.css`
- `src/components/dashboard/`, `src/hooks/`, `src/lib/dashboardData.js`, `src/styles/dashboard.css` shared Dashboard / Invitations pieces
- `src/lib/` pure helpers (`validate.ts`, `transliterate.ts`, `telugu.ts`, `image.ts`, `storage.ts`)
- `src/types/` shared TypeScript types

## Skeleton loading

Every page shows a skeleton while its server data loads. The rules:

- Static UI (page titles, column headers, tab labels, search box, buttons that always exist) renders immediately.
- Only server data (names, dates, counts, plan text, user name, template cards, form values) is replaced by a placeholder.
- Placeholders reuse the real element's box (`SkText` inside the real element, or the `sk-bg` ghost class), so nothing shifts when data arrives.
- Components that may not exist (e.g. "Needs attention") only get a placeholder if they were there on the last visit.
- `useRowHint` remembers how many rows the last visit had, so the skeleton has the same height as the real list.

Building blocks: `src/components/Skeleton.tsx` and `src/styles/skeleton.css`.

## Data layer (connect the database here)

All server reads go through `src/lib/api.ts` (`fetchAccount`, `fetchTemplates`, `fetchInvitation`, `fetchEnquiries`).
They currently read demo data after a simulated delay (`SIMULATED_LATENCY_MS`). Replace their bodies with real calls and set the delay to 0; the pages already handle `loading` and errors.

## Scripts

- `npm run dev` start the dev server
- `npm run typecheck` TypeScript check (`.ts`/`.tsx` files are strict-null checked; `.jsx` files are not yet converted)
- `npm run build` type-check, then production build
