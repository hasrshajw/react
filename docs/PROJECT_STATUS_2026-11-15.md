# Project status

Last updated: 15 Nov 2026 · Branch: `preview`

## In short
The app is an invitation maker with an admin area and a client area. The code work on the list is finished. The owner says all the
pending Vercel and database (Supabase) steps are done.

## What was finished recently (data-use / "egress" fixes)
| Area | What changed | Database step |
|---|---|---|
| Enquiries, first load | Reads one small summary, then pages of 10 rows when a panel opens | included in 01_schema.sql |
| Invitation lists | Rows carry only the link ID; full details are read only when needed (preview, duplicate, edit link) | included in 01_schema.sql |
| Dashboard "Auto" refresh | Checks one short change marker each minute and re-reads the list only if it changed | included in 01_schema.sql |
| Client area | Reads a light list, and only the invitation on screen in full | included in 01_schema.sql |
| Preview images | Cached for a year (the URL changes when the picture changes); editor previews load lazily | none |

Checks at the last change: type check clean, build passes, 645 tests pass.

## Done by the owner (reported, not checked by Claude)
- Secrets rotated and the GitHub token revoked.
- Migrations run in Supabase.
- Vercel settings in place.

## Worth a quick look yourself
- Open the Dashboard, turn "Auto" on after a search, and confirm the list still updates when you change something.
- Open `/my` as a client with two invitations and switch between them.
- Run the browser checks in `docs/RELEASE_CHECKLIST.md`, then promote `preview` to `main` when you are happy.

## Not done on purpose
- Serving invitations from a separate origin (not blocking release).
- Per-IP rate limits and captcha (H-4, H-5) need Vercel/Supabase settings, not code.

## Where to find things
- Release steps: `docs/RELEASE_CHECKLIST.md`
- Short-link and SEO notes: `docs/SEO_SHORT_LINK_CHANGES.md`
- Database setup for a new project: `supabase/01_schema.sql`, `02_seed_templates.sql`, `03_make_admin.sql` (run in that order; see README, "Set up Supabase")
