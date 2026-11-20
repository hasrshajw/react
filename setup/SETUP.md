# Schedy – Fresh project setup

This folder contains everything needed to set up a **brand-new** Supabase project for Schedy.

## Folder layout

```
setup/
├── SETUP.md                 ← this guide
├── sql/
│   ├── 00_master_fresh.sql  ← optional one-file schema (same as 01)
│   ├── 01_schema.sql        ← complete schema (tables, RLS, functions, storage, purge)
│   ├── 02_seed_templates.sql← optional starter templates
│   ├── 03_make_admin.sql    ← grant first admin (edit email first)
│   └── updates/             ← only for older existing projects
│       ├── 01_T1_…sql
│       └── …
└── templates/
    └── telugu-traditional.html  ← full Telugu traditional invitation template
```

## Fresh project (recommended)

1. Create a new Supabase project.
2. Open **SQL Editor → New query**.
3. Run the files **in order**:

   | Order | File | Required? | What it does |
   |-------|------|-----------|--------------|
   | 1 | `sql/01_schema.sql` (or `00_master_fresh.sql`) | **Yes** | All tables, RLS, RPCs, storage bucket, view counters, trash purge |
   | 2 | `sql/02_seed_templates.sql` | Optional | Two simple starter templates (Classic Floral, Modern Minimal) |
   | 3 | Create user | **Yes** | Authentication → Users → Add user (email + password, **Auto Confirm**) |
   | 4 | `sql/03_make_admin.sql` | **Yes** | Edit the email, then run. Makes that user an admin |

4. (Optional but recommended) In the Schedy admin UI later: **Admin → Templates** → paste the contents of `templates/telugu-traditional.html` into a new or existing Telugu traditional template.

5. Copy your project URL and **publishable** (or anon) key into `.env.local` (see root `.env.example`) and into Vercel environment variables.

### One-command style

You can paste the entire contents of `sql/00_master_fresh.sql` (or `01_schema.sql`) in one go.  
Then still do steps 3–4 above for the admin user.

## Existing project (created before the Create-form features)

If your database was set up with an older schema:

1. Run the files in `sql/updates/` **in numeric order** (`01_T1_…` → `09_enquiry_rate_limit.sql`).  
   Each file is safe to re-run.
2. In Admin → Templates, re-paste `templates/telugu-traditional.html` so the new placeholders (parent status, closing names, house names, birth order, reception, events, contacts, relatives) work.

## First admin (important)

Admin rights come **only** from a row in the `public.admins` table.

- Nobody can become admin through the app or by signing up.
- `VITE_ADMIN_EMAIL` is display-only (mailto link).
- The only supported way is running `03_make_admin.sql` after the user exists.

## After setup

- Enable **pg_cron** (Database → Extensions) if the schema printed a notice about the trash purge.
- Turn on Google auth (optional) and add your login redirect URL.
- Set `SITE_URL` in Vercel for correct Open-Graph / short-link behaviour.
- Follow `docs/RELEASE_CHECKLIST.md` before promoting to production.

## Security notes

- Never put the service-role key in any `VITE_*` variable or in the frontend.
- If any personal access token was ever pasted into a chat, revoke it immediately.
