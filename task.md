# Schedy – Task List (QA & Security Remediation)

Source: QA & Security Audit Report, 11 Nov 2026 (audited commit `c29cd97`, verified against `preview` HEAD `2148f02`).
Replaces all previous tasks. Finding IDs (C-, H-, M-, L-) refer to that report.

Legend: `[ ]` to do · `[~]` in progress · `[x]` done · **Owner** column is for you to fill in.

## How to use this file (read first, for any person or new chat)

When asked to "update based on task.md", follow these steps.

1. **Repo and branch:** `github.com/hasrshajw/react`, branch **`preview`**. All work goes to `preview`; `main` only after Track B milestone B-M7. Run `npm ci` once.
2. **Access:** ask the owner for a short-lived, repo-scoped GitHub token when you need to push. Never paste tokens into chat, files or commit messages, and ask for it to be revoked afterwards.
3. **Pick the work:** read this whole file, then the latest "Progress log" entry and its **Next steps**. Take items in order Phase 0 → 1 → 2 → 3. Track B starts only after milestone B-M0. If the owner names a phase or item, do that one. Do one or two items per update.
   - Status on 11 Nov 2026: the owner asked to start with Phase 1, so **Phase 0 is still untouched**. C-1, C-3 and the token rotation need Supabase or GitHub dashboard access, so they cannot be done from code alone. Say so instead of guessing.
4. **Terms:** C- / H- / M- / L- are Critical / High / Medium / Low findings from the QA & Security Audit Report (11 Nov 2026), which is **not in this repo**. Each task line already names the files and has a "Verify" line, which is enough to work from.
5. **Tick boxes honestly:** `[x]` only when the acceptance check passed. Use `[~]` with a short note for partial work. Never tick a box for something that needs a dashboard action you did not see completed.
6. **Verify:** run `npm run typecheck` and `npm run build`. There is no test suite yet (Phase 3), so run ad-hoc checks for the change and write the cases into the Progress log so others can repeat them.
7. **Record:** update the checkbox, the status table, and add a new Progress log entry at the top of the log with: what changed and in which files, how it affects other tasks, behaviour changes to check, and ordered next steps.
8. **Commit and push to `preview`:** one commit per update, message `type(ID): summary` with a body that explains the change. Check that the push landed (`git ls-remote origin preview`).

> Ground rule: tasks in Phase 0 and 1 are security fixes and come before any new feature work.
> The **Client Self-Service Editing** feature (Track B, below) depends on C-1, C-2, C-3 and H-2 and must not ship before them.

---

## Progress log (newest first)

### Where things stand (12 Nov 2026)

| Phase | Done | In progress | To do | Notes |
| --- | --- | --- | --- | --- |
| Phase 0 | 0 | 2 | 3 | C-2 (public iframe) and H-1 are coded, awaiting a browser check. C-1, C-3 and the token rotation are dashboard/SQL actions for someone with Supabase/GitHub access. **The GitHub token pasted in chat on 12 Nov must be revoked** (see the first Phase 0 row). |
| Phase 1 – Authorization and data safety | 1 | 3 | 2 | H-2 compiler part done, H-2 database part written (not yet run in Supabase). C-2 `LivePreview` coded; CSP part still report-only. |
| Phase 1 – Setup and schema | 0 | 1 | 2 | M-12 untracked from git; secret scanning is still a GitHub setting. |
| Phase 1 – App correctness | 0 | 0 | 3 | – |
| Phase 2 | 0 | 1 | rest | M-13 coded (awaiting a check). |
| Phases 2–3, Track B | 0 | 0 | all | Track B only has the `VITE_ADMIN_EMAIL` env placeholder (B4). |

### 12 Nov 2026 – C-2 `LivePreview` sandbox, H-2 database rule, M-13 profile fallback

**What was done**

1. **C-2 – `LivePreview` no longer shares an origin with the app** (`src/features/create/components/LivePreview.tsx`, new `src/features/create/previewBridge.ts`)
   - The iframe sandbox is now `allow-scripts allow-popups allow-popups-to-escape-sandbox` (same as the public page; `allow-same-origin` and `allow-forms` removed). The editor can therefore no longer touch the frame's `contentDocument`.
   - Replacement: the editor sends `postMessage({schedy:"patch", html})` and `({schedy:"focus", target})`. A small bridge script (with morphdom inlined from `morphdom-umd.min.js?raw`) is appended to the template's `srcDoc` and applies them. The bridge ignores messages whose `source` is not `window.parent`, and the frame never posts anything back. `targetOrigin` has to be `"*"` because the frame's origin is opaque; the payload is only this user's own compiled preview.
   - Same behaviour as before: the frame loads the raw template once and is patched in place (no reload while typing); a new frame sends the latest compiled HTML on `load`. The "scroll to the field being edited" logic now runs inside the frame.
   - Small side effect: the `.schedy-focus` highlight style lives in the app's CSS, which never reached the frame, so the flash was invisible before. The bridge now injects the same style, so the highlight appears.
   - **Verified (ad hoc):** `npm run typecheck`, `npm run build`, and a throwaway jsdom script (not saved): the bridge patched `<h1 id=a>{{x}}</h1>` to the new body, ignored a message from a foreign `source`, and ignored a non-string payload. **Not run in a browser.**
2. **H-2 – database rule for `details`** (new `supabase/migrations/003_details_validation.sql`)
   - `is_safe_url()` uses the same allow-list as the compiler (`http`, `https`, `tel`, `mailto`; no scheme is fine) and strips spaces and control characters before reading the scheme, so `java<tab>script:` is rejected.
   - `details_problem(jsonb)` returns `NULL` or a reason. Rules: must be an object, ≤ 64 KB, top-level strings ≤ 1000 chars (`seoTitle` ≤ 200, `seoDescription` ≤ 400), lists (`events`, `groomContacts`, `brideContacts`) ≤ 20 objects, `venueMaps` / `seoImage` / `events[].maps` use the URL allow-list, phone fields are `+0-9 ()-` with 10–13 digits, and `receptionEnabled` is a boolean. `details_is_valid()` wraps it.
   - Enforced by a **trigger** (`invitations_check_details`) on insert and when `details` changes, not by a `CHECK`. Reason: a `CHECK` (even `NOT VALID`) is re-evaluated on every update, so the view counter in `get_public_invitation` would start failing for any old row that holds a bad value. The trigger skips updates that leave `details` unchanged.
   - **Verified (ad hoc):** ran on a local Postgres 16 with a stub `auth` schema. All 20 cases pass: valid (`https`, `HTTPS`, `tel:`, `#top`, empty strings, text like `"><script>` and `Note: hall at 5pm`) accepted; `javascript:`, ` Java<tab>Script:`, `vbscript:`, `data:text/html`, bad phones, long text, 21 events, 70 KB and non-object values rejected. The insert and update triggers raise `23514`; a legacy bad row can still have `views` updated; running the file twice is harmless. **Not run on the real Supabase project.**
3. **M-13 – missing profile no longer looks like a paid administrator** (`src/lib/api.ts`)
   - No profile row, or a null `plan_status` → plan status `trial` with 0 days left (was `active`); role label `Member` (was `Administrator`). The role text is display-only; permissions come from RLS.

**How this affects other tasks**

- **H-2:** both halves exist now. The database half only counts once it is run in Supabase. Run first (it should return no rows, otherwise fix those invitations before relying on the rule): `select id, slug, public.details_problem(details) from public.invitations where public.details_problem(details) is not null;` (create the functions first by running the migration). Track B's `submit_change_request` (B2) should call `details_problem()` instead of writing a second copy.
- **Migration numbering:** Track B's `003_client_edit.sql` in B2 is now **`004_client_edit.sql`**. H-3 must fold `003` into `schema.sql` as well as `001` and `002`, or a fresh project will not have the trigger.
- **C-2:** both iframes are now sandboxed without `allow-same-origin`, which removes the blocker for enforcing the strict CSP. Still needed first: review the report-only violations on a `preview` deployment.
- **L-9** (stop executing template scripts in the editor) is still open; the preview frame is now isolated, but template scripts still run in it.
- **M-13:** the Dashboard banner for a user with no profile now reads "0 days left in your Pro trial" instead of "You're on the Pro plan".

**Behaviour changes to check**

- Live preview: templates that use `localStorage`/cookies, `<form>` submit or `alert()` behave like the public page (blocked). Typing in the form must still update the preview without flicker or reload, and the preview must scroll to the field you click.
- Saving an invitation with a bad link or phone via the API now fails with `Invalid invitation details: …`. The app's own validation already blocks these, so normal use should not see it, but the error text is not yet shown in a friendly way (the save path surfaces `error.message`).

**Browser checks to repeat (for `[~]` → `[x]`)**

1. C-2 `LivePreview`: open `/create`, pick a template, type a name → the preview updates without reloading (a template animation does not restart). Click a field in a different section → the preview scrolls to it and the element shows an outline for about a second. Switch template → the new template shows your current values. In devtools, `document.querySelector("iframe").contentDocument` is `null` (cross-origin).
2. H-2 database: in the Supabase SQL Editor run `insert into public.invitations(id,slug,details) values ('t1','t1','{"venueMaps":"javascript:alert(1)"}');` → error `Invalid invitation details: venueMaps has a link type that is not allowed`; with `"https://maps.google.com"` it succeeds (delete the test row).
3. M-13: in a test project delete your row in `public.profiles`, reload the dashboard → banner says `0 days left in your Pro trial` and the profile menu shows role `Member`; restore the row.

**Next steps, in order**

1. Run the browser checks, then tick C-2 (`LivePreview`) and M-13.
2. Run `003_details_validation.sql` in Supabase and check 2 above; then tick H-2.
3. Deploy `preview`, list `Content-Security-Policy-Report-Only` violations, and enforce the strict CSP.
4. H-3: fold migrations `001`–`003` into `schema.sql`; M-11: move the `drop table` block to `reset.sql`.
5. Owner actions still open: C-1 and C-3 in Supabase, **revoke the GitHub token that was pasted in chat on 12 Nov and any earlier one**, enable GitHub secret scanning.

---

### 11 Nov 2026 (2nd update) – C-2 public iframe sandbox, H-1 Create overwrite, M-12 untrack `.env.local`

**What was done**

1. **C-2 (Phase 0 row) – sandbox on the public invitation iframe** (`src/pages/PublicInvitation.tsx`)
   - Added `sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"` (no `allow-same-origin`). Template scripts still run, but the frame now has an opaque origin, so it cannot read the app's `localStorage`/cookies or the Supabase session.
   - Status `[~]`: the attribute is in place and the build passes, but no browser was available to run the acceptance check.
2. **H-1 – Create no longer reuses an old form** (`src/AdminApp.tsx`, `src/pages/Create.tsx`)
   - New `CreateRoute` wrapper renders `<Create key={location.key}>`, so every router navigation to `/create` remounts the page with fresh state.
   - **Why `location.key` and not `location.search`:** after a save, `Create` rewrites the address bar with `history.replaceState`, which the router does not see. Its `search` stays `""`, so keying on `search` would not remount when the user clicks "Create Invitation" again after saving, and the next Save would overwrite the invitation that was just saved. `location.key` changes on every navigation, even to the same URL.
   - The unsaved-changes blocker now compares `location.key` instead of `pathname`. Without this, a remount triggered by a same-path navigation (for example `/create?edit=A` → `/create`) would silently drop unsaved edits.
   - **Verified (ad hoc):** `npm run typecheck`, `npm run build`, and a throwaway jsdom + `MemoryRouter` script (not saved). It showed the keyed component mounts once initially, again for `/create?edit=A` → `/create`, and again for `/create` → `/create` (3 mounts total). The full UI flow was **not** run in a browser.
3. **M-12 – `.env.local` removed from git tracking** (`git rm --cached`; `.gitignore` already lists it, `.env.example` stays). The file is untouched in your working copy.

**How this affects other tasks**

- **C-2:** the public-page half of C-2 is now coded. Still open: `LivePreview` (`allow-same-origin` + morphdom) and enforcing the strict CSP. Do the CSP enforcement only after both iframes are sandboxed and the report-only violations are reviewed.
- **Behaviour change to check (public page):** a sandboxed frame cannot use `localStorage`/`sessionStorage`/cookies, and `document.domain` is not shared. Templates that store a "muted music" flag or RSVP state in `localStorage` will throw. Open a few live invitations and check the console. Forms are blocked (no `allow-forms`) and `allow-modals` is not set, so `alert()` does nothing; add only the flag a template really needs.
- **Behaviour change to check (Create):** clicking "Create Invitation" (or any in-app link to `/create`) while you have unsaved changes now shows the leave dialog, even if you are already on `/create`. Browser back/forward is covered too.
- **Track B:** B-M0 still needs C-1, C-3, the `LivePreview` part of C-2 and the H-2 database rule. The client editor reuses `Create`, so the `key` remount also stops one client's form state leaking into the next invitation they open.

**Browser checks to repeat (for `[~]` → `[x]`)**

1. Public sandbox: temporarily save a template containing `<script>try{document.title=localStorage.getItem("sb-x")}catch(e){document.title="blocked"}</script>`, open it at `/<slug>`; expect the tab title `blocked` and a normal-looking page otherwise.
2. H-1, case 1: edit invitation A → click sidebar "Create Invitation" → form is empty, Save creates a new row (A is unchanged).
3. H-1, case 2: create and save a new invitation, then click "Create Invitation" again → form is empty, Save creates another row.
4. H-1, case 3: type in the form, click "Create Invitation" → the leave dialog appears; "Stay" keeps your text.
5. M-12: `git ls-files .env.local` prints nothing; `git status` shows no `.env.local` changes.

**Next steps, in order**

1. Run the browser checks above, then tick C-2 (public) and H-1.
2. C-2: `LivePreview` without `allow-same-origin` (use `postMessage` to update the frame), then review CSP report-only violations and enforce.
3. H-2: database constraint using the same protocol allow-list (`http`, `https`, `tel`, `mailto`).
4. Owner actions still needed: C-1 and C-3 in Supabase, rotating the GitHub token used for this push, enabling GitHub secret scanning.

---

### 11 Nov 2026 – Phase 1 / Authorization and data safety: H-2 compiler hardening and C-2 CSP header

**What was done**

1. **H-2 – template compiler now blocks script-carrying links and event handlers** (`src/lib/compileInvitation.ts`)
   - Added `SAFE_PROTOCOLS` (`http`, `https`, `tel`, `mailto`), an exported `isSafeUrl(value, attr)` helper and a `sanitizeAttributes(doc)` step.
   - `sanitizeAttributes` removes every `on*` attribute (`onclick`, `onerror`, `onload`, …). It also removes any URL attribute (`href`, `src`, `action`, `formaction`, `poster`, `background`, `xlink:href`, `data`, `ping`) whose scheme is not on the allow-list. Relative links, `#anchors` and `//host` links are still allowed.
   - **Order matters:** the step runs *after* placeholders are filled in attributes. A value such as `venueMaps = javascript:alert(1)` only exists in the DOM at that point, so checking earlier would have missed it.
   - **Obfuscation is handled:** spaces, tabs, newlines and other control characters are stripped before the scheme is read (browsers ignore them, so `java<tab>script:` would otherwise slip through), and the check is case-insensitive.
   - **One deliberate exception:** inline raster images (`data:image/png|jpeg|gif|webp|avif|bmp`) are allowed on `src`, `poster` and `background`, because templates embed base64 images. `data:image/svg+xml` and `data:text/html` are *not* allowed.
   - A name such as `"><script>` was already safe in text (inserted with `textContent`) and in attributes (the browser escapes quotes when serializing). The tests now lock that behaviour in.
   - **Where it takes effect:** `compile()` is used by the public invitation (`PublicInvitation.tsx`, what guests see), the Create live preview, the dashboard `PreviewPanel`, `TemplatePicker` and the Templates page, so all of them now render the same sanitized output.
   - **Verified:** 16 jsdom checks all pass, plus green `npm run typecheck` and `npm run build`. The test script was a throwaway and is **not saved in the repo**, so the cases are listed here to repeat by hand (or as the first Vitest tests in Phase 3). Compile a template containing `<a href="{{venue-maps}}">`, `<h1 title="{{groom-en}}">{{groom-en}}</h1>`, `<button onclick="x()">`, `<img src="https://x.test/a.png" onerror="alert(1)">` and the links below, then parse the output and expect:
     - `venueMaps = javascript:alert(1)`, ` Java<tab>Script:alert(1)` → the `href` is removed. `https://maps.google.com/?q=hall` and `HTTPS://…` → kept.
     - `groomEn = "><script>alert(1)</script>` → no `<script>` element exists; the text and the `title` attribute hold the literal string.
     - `onclick` and `onerror` are gone; the `https:` `src` next to `onerror` stays.
     - Kept: `tel:`, `mailto:`, `#top`, `/about`, `//cdn.x/y.png`, `data:image/png;base64,…` on `src`.
     - Removed: `vbscript:`, `data:text/html,…` on `href`, `data:image/svg+xml,…` on `src`, `javascript:` in `<form action>` and `formaction`.

2. **C-2 – Content-Security-Policy headers** (`vercel.json`, new rule for every path except `/assets/` and `/api/`)
   - **Enforced now:** `object-src 'none'; frame-ancestors 'none'`. This blocks plugin content and stops other sites from framing the app (clickjacking). Nothing in the app depends on either.
   - **Report-only (not enforced yet):** a strict policy (`script-src 'self'`, styles/fonts from Google Fonts, `connect-src` limited to Supabase and `inputtools.google.com`, `base-uri 'self'`, `form-action 'self'`). Browsers only log violations to the console for this header.
   - **Why the strict policy is not enforced yet:** invitations render in an iframe with `srcDoc`, and a `srcDoc` frame *inherits the parent page's CSP*. Enforcing `script-src 'self'` today would stop every template's inline script and likely its CDN fonts and images, so live invitations would break. Because this cannot be tested without a browser session, it is staged as report-only first.

**How this affects other tasks**

- **H-2 is only half done.** `compile()` runs in the browser, so it is defence in depth; someone calling the Supabase API directly can still store a bad `details` value. The database `check`/trigger (line above) is still needed and must use the **same allow-list** (`http`, `https`, `tel`, `mailto`). Track B's `submit_change_request` RPC (B2) and `validate.ts` should reuse it too; import `isSafeUrl` rather than writing a second copy.
- **C-2 is not closed by this.** The `sandbox` attribute on `PublicInvitation` (Phase 0) and removing `allow-same-origin` from `LivePreview` (Phase 1) are still the real fix for "a template script reads app storage". Template `<script>` tags still run; this change only removes the handler and link routes.
- **Behaviour change to check:** a template that uses inline handlers (for example `onclick` for a music button or RSVP) or links with other schemes (`sms:`, `whatsapp:`, `intent:`) will stop working. The repo's own templates and seed data contain none, but templates saved in the database were not scanned. Run in Supabase: `select id from public.templates where html_code ~* '\son[a-z]+\s*=' or html_code ~* '(href|src)\s*=\s*["'']\s*(javascript|vbscript|data:text)';`
- **Enforcing the strict CSP depends on:** the sandbox work above and L-9 (stop executing template scripts in the editor). The long-term item "serve invitations from a separate origin" removes the clash completely, because the invitation page could then have its own looser policy.
- **Track B:** B-M0 requires C-1, C-2, C-3 and H-2. After this update, only the compile-side of H-2 and the baseline CSP are ready; the rest of B-M0 is unchanged.

**Next steps, in order**

1. Run the SQL check above; fix or whitelist any template it finds.
2. Deploy `preview`, open an invitation and the admin pages with the browser console open, and list the `Content-Security-Policy-Report-Only` violations.
3. Finish C-2 (`sandbox` on both iframes), then move the strict policy from report-only to enforced.
4. Do the H-2 database constraint using the same allow-list.

---

## Phase 0 – Now (hours, ~0.5–1 day)

| Done | ID | Task | Where | Acceptance check |
| --- | --- | --- | --- | --- |
| [ ] | – | Rotate any GitHub / Supabase token that was pasted in chat, email or tickets. Use short-lived, repo-scoped tokens only | GitHub settings, Supabase dashboard | Old tokens show as revoked |
| [ ] | C-1 | **Supabase dashboard:** disable public sign-ups (Auth → Providers → Email), and restrict or disable Google sign-in until the admin role exists. *Temporary: Track B re-opens sign-up only after B1 (admin role + least-privilege RLS) is live* | Supabase dashboard | A new email cannot register; Google login by a stranger is blocked |
| [~] | C-2 | Add `sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"` (no `allow-same-origin`) to the public invitation iframe. *Coded 11 Nov (see Progress log); needs the browser check below.* | `src/pages/PublicInvitation.tsx:37` | A template with `<script>localStorage.getItem(...)</script>` cannot read app storage |
| [ ] | C-3 | Revoke self-update on profiles: `REVOKE UPDATE ON public.profiles FROM authenticated; GRANT UPDATE (name) ON public.profiles TO authenticated;` | `supabase/schema.sql` policy `profiles: self update` (line ~121) | Console call setting `plan_status='active'` is rejected |
| [~] | H-1 | *Coded 11 Nov, needs the browser check below.* Fix Create overwriting an existing invitation: add `key={location.search}` to the Create route, or read `edit` via `useSearchParams()` and re-run the load effect; treat a search change as navigation for the unsaved-changes blocker | `src/AdminApp.tsx:210`, `src/pages/Create.tsx:35` | Edit A → click sidebar "Create Invitation" → form is empty and Save creates a new row |

---

## Phase 1 – This sprint (~3–4 days)

### Authorization and data safety
- [ ] **C-1** Add an `is_admin` flag (or role claim) and gate the `templates`, `categories`, `enquiries` policies on it. Keep the per-owner rule on `invitations`. (`schema.sql` lines ~101–116)
  - Verify: a second non-admin account cannot update a template, write a category, or read/update enquiries.
- [~] **C-2** `LivePreview`: remove `allow-same-origin`; update the frame via `postMessage` instead of morphdom on `contentDocument`. (`src/features/create/components/LivePreview.tsx`) *Coded 12 Nov: sandbox is now `allow-scripts allow-popups allow-popups-to-escape-sandbox`; updates and scroll-to-field go through `postMessage` (see Progress log). Bridge tested in jsdom only; needs the browser check below.*
- [~] **C-2** Add a Content-Security-Policy header in `vercel.json`. *Partly done (11 Nov): `object-src 'none'; frame-ancestors 'none'` is enforced; the strict policy runs as `Content-Security-Policy-Report-Only`. To finish: review console violations on the `preview` deployment, then enforce it (see Progress log).*
- [~] **H-2** Enforce URL, phone, length and type rules for `details` in the database (trigger or `check`). *Written 12 Nov as `supabase/migrations/003_details_validation.sql` and tested on a local Postgres 16 (20 cases). Still to do: run it in the Supabase SQL Editor (dashboard action) and fold it into `schema.sql` with H-3.*
- [x] **H-2** In `compile()`, allow-list protocols (http, https, tel, mailto) on `href`/`src`-like attributes and strip `on*` handler attributes from templates. (`src/lib/compileInvitation.ts`) *Done 11 Nov, verified with 16 automated checks (see Progress log). The database rule in the line above is still open.*
  - Verify: `venueMaps = javascript:alert(1)` and a name containing `"><script>` render as inert text.
- [ ] **H-5** Harden enquiry inserts: route through an Edge Function with captcha and rate limit, add `check (char_length(message) <= 2000)`, and restrict insertable columns (`note`, `history`, `follow_up_date`, `status`). (`schema.sql` line ~112)
  - Verify: anon insert with `note`, 1 MB `message`, or `status='called'` is rejected.

### Setup and schema
- [ ] **H-3** Fold migrations `001` and `002` into `schema.sql` (or adopt Supabase CLI migrations): `get_invitation_meta()`, the `invitation-previews` bucket and policies, slug format and reserved-word constraints.
  - Verify: on a clean project, `x-invite-status: found` and preview image upload both work.
- [ ] **M-11** Move the `drop table … cascade` block (`schema.sql` lines 12–16) into a separate explicit `reset.sql`; make `schema.sql` idempotent. Update the README warning in "Set up Supabase".
- [ ] **README** Add "disable public sign-ups" and the admin-user setup step to Set up Supabase step 3.

### App correctness
- [ ] **H-6** Take `pub`/`deleted` flags from each refreshed row, not only on first load; send publish/trash writes serially or as one batch RPC and reconcile with the server response. (`src/features/dashboard/hooks/useInvitationStore.ts`, `src/lib/api.ts`)
  - Verify: unpublish on device 1, refresh on device 2 → status updates; rapid publish/unpublish ×10 ends in the same state on server and UI; bulk publish of 50 rows with one forced failure leaves UI and server in agreement.
- [ ] **M-8** Replace `https://example.com` with the real domain in `index.html` (lines 18, 27, 28, 38), `public/robots.txt`, `public/sitemap.xml`; inject at build time from an env var.
- [~] **M-12** `git rm --cached .env.local`; keep only `.env.example`; enable GitHub secret scanning. *Untracked 11 Nov. Still open: enable secret scanning (GitHub setting); the file remains in git history (it holds only `VITE_` values, which ship in the browser bundle anyway, but rotate the Supabase key if it ever held anything private).*

---

## Phase 2 – Next sprint (~1 week)

- [ ] **H-4** Separate view counting from `get_public_invitation` (rate-limited or deduped per visitor); return only fields the template needs; add Vercel/Supabase rate limiting; consider longer random default slugs.
- [ ] **M-5** Server-side pagination for invitations and enquiries; select only needed columns instead of `select("*")`. (`src/lib/api.ts:63,167`)
- [ ] **M-4** Storage: bucket limits (≤300 KB, `image/jpeg`); delete the object when an invitation is purged or deleted; scheduled job to clean orphans; restrict `seoImage` to the app's own bucket.
- [ ] **M-3** Generate QR codes client-side with a small library and remove `api.qrserver.com`. (`QrModal.tsx:18`, `ShareModal.tsx:35`)
- [ ] **M-1** Session hygiene: subscribe to `onAuthStateChange` (no usage exists today); on sign-out clear create-form drafts and module caches (`knownPub`/`knownDel`) and call `signOut` before navigating.
- [ ] **M-6** Wire `onEnquiryCountChange` from `AdminApp` to the sidebar badge (currently passed by `Dashboard` but never supplied); refresh enquiries by polling or Realtime.
- [ ] **M-7** Login: reset the Google button's busy state on `pageshow`; persist `from` in `redirectTo`; drop the client password-length check on login; implement "Forgot password". (`src/lib/auth.ts:48–52`, `Login.tsx`)
- [~] **M-13** Default to `trial` (or show an explicit error) when the profile row is missing. (`src/lib/api.ts:33`) *Coded 12 Nov: missing row or null `plan_status` → `trial` with 0 days left, role label `Member` instead of `Administrator`. Checked by build/typecheck and code reading only.*
- [ ] **M-9** `api/invite.js`: take the site URL from an env var instead of `Host`/`X-Forwarded-Host`; render the stub link only for valid slugs; align `SLUG_RE` (1–64) with the DB rule (3–30).
- [ ] **M-10** Template compiler: use `Object.create(null)` or a `Map` for values; strip only known placeholder syntax instead of every `{{…}}`; fix `PreviewPanel` fallback to the non-existent `tpl.html`.
- [ ] **M-2** Transliteration: separate "no suggestion" from network errors so one miss does not disable online mode for 60 s; decide on a documented API; disclose in the privacy policy. (`src/lib/transliterate.ts:12–37`)

---

## Phase 3 – Ongoing

### Test and tooling baseline (**M-14**, nothing exists today)
- [ ] ESLint with `react-hooks` and `@typescript-eslint`; add `npm run lint`.
- [ ] Vitest unit tests for `compile`, `validate`, `slug`, `dashboardData` helpers.
- [ ] Playwright e2e: login → create → publish → public view.
- [ ] RLS tests (pgTAP or Supabase CLI) covering the authorization checklist in the audit, section 6.
- [ ] GitHub Actions: typecheck, build, tests, `npm audit`; add Dependabot.
- [ ] Tighten types: remove `[key: string]: any` on core types, enable `noImplicitAny`, align `@types/react` (^19) with `react` (^18.3.1), pin TypeScript instead of using a caret.

### Cleanup and low-priority fixes
- [ ] **L-1** Replace `href="#"` Docs/Support links, add handlers for profile-menu items, add a catch-all route for unknown admin URLs.
- [ ] **L-2** Remove or relocate repo-root `assets/` (~4.4 MB, not shipped), `src/assets/1.html`, `src/assets/test.html`, `src/assets/txt`. (`temp/*.html` was already deleted in the last two commits.)
- [ ] **L-3** CSV formula guard: also cover values starting with tab or carriage return; tighten the `^\+?[\d\s]+$` exemption; avoid prefixing harmless text beginning with `-`.
- [ ] **L-4** `waLink`: handle 11-digit numbers with a leading 0; avoid "Hi , thanks…" when the name is empty.
- [ ] **L-5** `uid()` fallback: remove the `.` from the generated id (breaks the `/<slug>` rewrite on Vercel).
- [ ] **L-6** Merge duplicate `readJSON`/`writeJSON` in `lib/storage.ts` and `lib/dashboardData.ts`.
- [ ] **L-7** `saveEnquiry`: append to `history` server-side instead of overwriting the array.
- [ ] **L-8** Use a server timestamp for `deleted_at`; run the 30-day trash purge as a scheduled job.
- [ ] **L-9** Live preview: render the compiled document so `<head>`/`<style>` changes show; stop executing template scripts in the editor.
- [ ] Longer term: serve invitations from a separate origin or subdomain.

---

# Track B – Client self-service editing with admin approval

## B0. Goal and flow

Admin creates an invitation and records the **client's email** on it. The client signs up or logs in with that email, sees only their own invitation(s), edits them on a separate client page, and submits. The change **does not go live**: it becomes a *pending change request*, the admin is notified, reviews a diff, and approves or rejects. Approved → applied to the live invitation. Rejected → client sees "Rejected" (with the admin's note) until they acknowledge it.

```
Admin creates invitation (+ client_email)
        │
Client signs up / logs in (verified email)
        │
   ┌────┴─────────────┬──────────────────────┐
 0 linked           1 linked              2+ linked
 "No invitations    open editor           list → pick one → editor
  linked to this    directly
  account"
        │
Client edits → "Submit for review"  ──►  change_request (pending) ──► notify admin (in-app + email)
        │                                          │
 editor shows pending banner at top        Admin reviews diff
                                          ┌────────┴─────────┐
                                      Approve            Reject (+ note)
                                          │                  │
                         apply to invitation (transaction)   client sees "Rejected" banner
                         notify client                       until they click "Got it" (acknowledge)
```

## B1. Decisions to lock before coding (write the answer next to each)

| # | Decision | Recommendation |
| --- | --- | --- |
| D1 | Column name | Use **`client_email`**, not `owner_email`. The existing `invitations.owner` is the admin's `auth.uid()` that created the row; reusing "owner" would be confusing and dangerous in RLS. |
| D2 | How the admin is identified | **Database table `admins`** (seeded from the admin email), checked by an `is_admin()` function used in RLS. `VITE_ADMIN_EMAIL` ships in the browser bundle, so it may only drive UI hints. Edge Function reads the real address from a server secret `ADMIN_EMAIL`. |
| D3 | Email trust | A client may be linked **only if their email is verified** (`email_confirmed_at` set, or Google with `email_verified`). Otherwise anyone could sign up with a victim's address and take over their invitation. |
| D4 | Sign-up model | Preferred: **invite flow** – admin clicks "Invite client", an Edge Function calls `auth.admin.inviteUserByEmail`, so public sign-up can stay closed. Fallback: open sign-up, which is safe only after B2 least-privilege RLS is deployed and verified. |
| D5 | Pending rules | **One pending request per invitation** (partial unique index). While pending, the client editor is read-only with **Withdraw** (and then re-edit). Avoids merge conflicts and request spam. |
| D6 | What a client may change | Allow-list of `details` keys (names, dates, times, venues, maps, contacts, SEO text). **Never** client-editable: `slug`, `template_id`, `published`, `deleted_at`, `client_email`, `owner`, `views`, `seoImage` unless uploads are separately secured. |
| D7 | Conflicting edits | Each request stores `base_updated_at`. If the admin edited the invitation after the client started, approval shows a conflict warning and requires an explicit choice. |
| D8 | Notification channels | In-app (badge + list, via Realtime) **and** email (Edge Function + Resend/Supabase SMTP). Email must never be the only record. |

## B2. Database (new migration, e.g. `supabase/migrations/004_client_edit.sql`; also fold into `schema.sql` per H-3)

- [ ] **Admin role:** `create table admins (user_id uuid primary key references auth.users, email citext unique, created_at)`; `create function is_admin() returns boolean security definer` (stable, `search_path` pinned). Seed with the admin email. *(This is the C-1 fix, reused here.)*
- [ ] **Client link:** `alter table invitations add column client_email citext;` with `check (client_email is null or client_email = lower(btrim(client_email)))`, format check, and index `invitations_client_email_idx`.
- [ ] **Helper:** `current_user_email()` returns `lower(auth.jwt()->>'email')` only when the JWT email is verified.
- [ ] **RLS on invitations** (keep the existing admin/owner rules, add):
  - client **SELECT** where `client_email = current_user_email()` and `deleted_at is null`
  - **no** client INSERT / UPDATE / DELETE policy at all (writes only through RPCs)
  - column-level hardening: expose a view `client_invitations` with only safe columns (no `views`, `owner`, `slug` internals as needed)
- [ ] **Table `change_requests`:** `id uuid pk`, `invitation_id text fk`, `requested_by uuid`, `client_email`, `base_updated_at timestamptz`, `proposed_details jsonb`, `changed_keys text[]`, `status` check in (`pending`,`approved`,`rejected`,`withdrawn`,`superseded`), `admin_note text`, `reviewed_by uuid`, `reviewed_at`, `acknowledged_at` (client dismissed the rejection), `created_at`.
  - partial unique index `(invitation_id) where status='pending'` (D5)
  - RLS: client SELECT own (`requested_by = auth.uid()`), admin SELECT all; **no direct writes** by anyone.
  - cap `pg_column_size(proposed_details)` (e.g. ≤ 64 KB) and reject base64 blobs.
- [ ] **Table `notifications`:** `id`, `recipient_user_id` or `audience='admin'`, `type`, `payload jsonb`, `read_at`, `created_at`; RLS: recipient reads/updates own `read_at` only; add to Realtime publication.
- [ ] **Table `audit_log`** (append-only): who, what, invitation, before/after hash, timestamp. No update/delete policies.
- [ ] **RPC `submit_change_request(invitation_id, details jsonb)`** `security definer`:
  1. caller's verified email = `invitations.client_email`; invitation not deleted
  2. strip to allow-list (D6) and validate with the same rules as H-2 (URL protocols, phone, lengths, types)
  3. reject if nothing changed; reject if a pending request exists (or supersede, per D5)
  4. rate limit (e.g. 10 submissions/hour/user)
  5. insert request, insert admin notification, return the request
- [ ] **RPC `withdraw_change_request(id)`**: requester only, pending only.
- [ ] **RPC `review_change_request(id, decision, note)`**: `is_admin()` only. In one transaction: lock request + invitation (`FOR UPDATE`), check `base_updated_at` (D7), on approve merge allow-listed keys into `details` and refresh `groom_name`/`bride_name`/`event_date`, mark request, write audit row, notify client.
- [ ] **RPC `acknowledge_rejection(id)`**: requester only; sets `acknowledged_at`.
- [ ] **RPC `my_invitations()`**: returns the caller's linked invitations plus the latest request status per invitation (drives the list screen and the badge).
- [ ] **Link management:** when the admin changes or clears `client_email`, pending requests are marked `superseded` and the old client loses access immediately (RLS is evaluated per request, so no cleanup job is needed).
- [ ] **Signup trigger:** extend `handle_new_user()` so new users get **no** admin role (explicit `role = 'client'` in `profiles`, never `'Administrator'` by default). Today the default is `'Administrator'`, which must change.

## B3. Server side (Edge Functions / Vercel)

- [ ] **`notify-admin`** (Supabase Database Webhook on `change_requests` insert → Edge Function): sends an email to server secret `ADMIN_EMAIL` with client, invitation, changed fields and a deep link to the review page. Idempotent (dedupe by request id).
- [ ] **`notify-client`** (on status change): email the client on approved / rejected (with note).
- [ ] **`invite-client`** (admin only, verifies `is_admin()`): sends the Supabase invite for D4; never exposes the service-role key to the browser.
- [ ] Secrets: `ADMIN_EMAIL`, mail-provider key stored in Supabase/Vercel secrets only. Add a `.env.example` note.
- [ ] Failure handling: if email fails, the in-app notification still exists; log and retry with backoff.

## B4. Frontend – shared groundwork

- [ ] **Env:** `VITE_ADMIN_EMAIL=test@gmail.com` added to `.env.local` (done) and a placeholder to `.env.example` (done). Read it through `src/lib/config.ts`; **use for display only** (e.g. "Contact admin"), never for route or permission decisions.
- [ ] **Role resolution:** `useRole()` calls `is_admin()` once after login and caches in memory (not in a trusted localStorage flag). Returns `admin | client | none`.
- [ ] **Post-login routing** (`Login.tsx`, `lib/auth.ts`): admin → `/dashboard` (existing), client → `/my`. Preserve `from` through the OAuth redirect (this also fixes M-7).
- [ ] **Routing:** add a separate lazy-loaded **`ClientApp`** chunk (same pattern as `AdminApp` in `src/App.tsx`) so clients never download admin code and admins' bundle stays small. Add `my` (and any sub-path words) to `RESERVED` in `src/lib/reserved.ts`, the DB reserved list, and `vercel.json`, per the "keep in sync" rule.
- [ ] **Guards:** `AdminApp` redirects non-admins to `/my`; `ClientApp` redirects admins to `/dashboard` and anonymous users to `/login`. Real enforcement is RLS; guards are UX.
- [ ] **Session:** implement `onAuthStateChange` (M-1) first, since client accounts are on shared devices more often; clear drafts and caches on sign-out.
- [ ] **API layer:** add to `src/lib/api.ts`: `fetchMyInvitations`, `submitChangeRequest`, `withdrawChangeRequest`, `acknowledgeRejection`, `fetchReviewQueue`, `reviewChangeRequest`, `fetchNotifications`, `markNotificationRead`.

## B5. Frontend – admin side

- [ ] **Create / Edit form:** add **"Client email"** field (section "Client access"), optional, trimmed + lower-cased, validated with `isEmail`; add `clientEmail` to `InvitationData`, `formReducer`, `validate.ts`, `saveInvitation`/`fetchInvitations`. Show a warning when the email is changed ("the previous client loses access and any pending request is cancelled").
- [ ] **Invite action:** "Send invite to client" button next to the field (D4), with sent/accepted status.
- [ ] **Invitations list:** column/filter for client email and a "Pending review" chip.
- [ ] **Review queue page** (`/reviews`, add to `RESERVED`): list by status with pending count badge in the sidebar (reuse the unused `onEnquiryCountChange` pattern from M-6, via a shared context).
- [ ] **Review detail:** field-by-field **diff** (current vs proposed, using `changed_keys`), sandboxed live preview of the proposed version (no `allow-same-origin`, per C-2), conflict warning (D7), **Approve** / **Reject** with a required note on reject, and confirmation dialogs.
- [ ] **Notification bell:** unread count via Realtime, list with deep links.

## B6. Frontend – client side

- [ ] **`/my` landing logic** (three cases, in this order):
  - 0 linked → empty state: "No invitations are linked to this account", showing the signed-in email and a "Contact admin" link (`VITE_ADMIN_EMAIL`).
  - 1 linked → redirect straight to `/my/invitations/:id`.
  - 2+ linked → list (couple names, date, status chip: *Live / Pending review / Rejected / Up to date*) → click opens the editor.
- [ ] **Client editor** (`/my/invitations/:id`): reuse `CreateForm` + `formReducer` + `LivePreview` in a **restricted mode** (props `mode="client"` with an allow-list that hides template picker, slug, publish and trash controls and disables nothing silently: hidden fields are simply not rendered).
- [ ] **Pending banner at the top of the editor** when a request is pending: "Your changes are waiting for admin review, submitted <time>", with **View submitted changes**, **Withdraw**. Form is read-only showing the *proposed* values (D5).
- [ ] **Rejected banner** until acknowledged: shows the admin's note, **Edit again** (prefills from the rejected values) and **Got it** (calls `acknowledge_rejection`). Banner survives reloads and devices because state is server-side.
- [ ] **Approved:** toast / banner once ("Your changes are live"), then clears.
- [ ] **Submit button:** label "Submit for review"; disabled when there are no changes; confirm dialog explaining that changes go live only after approval; keep the unsaved-changes blocker and draft autosave, but scope the draft key per user and invitation (and clear on sign-out, M-1).
- [ ] Never call the admin `saveInvitation` path from `ClientApp`; the client editor submits through `submitChangeRequest` only.
- [ ] Mobile-first layout (clients will mostly use phones); skeleton loading per the README rules.

## B7. Edge cases to handle explicitly

- [ ] Email normalisation: case, surrounding spaces; decide whether `+tag` addresses match (recommendation: exact match, no stripping).
- [ ] Client signs up with a different email than the one linked (e.g. Gmail vs. work) → sees the "none linked" state with the signed-in email displayed so they can tell the admin.
- [ ] Unverified email → show "Verify your email to see your invitations"; no data returned (RLS enforces).
- [ ] Invitation trashed, unpublished or deleted while a request is pending → request marked `superseded`, client notified.
- [ ] Admin edits the invitation while a request is pending → conflict path (D7).
- [ ] Double-click / two tabs submitting → unique index + idempotent RPC.
- [ ] Same client email on many invitations; the list must paginate beyond the PostgREST 1,000-row cap (M-5).
- [ ] A user is both admin and linked client → role `admin` wins; provide "view as client" only if needed later.
- [ ] Rejected request pile-up: keep history, show only the latest unacknowledged one in the banner.
- [ ] Data minimisation: client queries never return other invitations, enquiries, templates' other data, `views`, or other clients' emails.

## B8. Security checklist (must pass before release)

- [ ] Client A cannot read, edit or submit for client B's invitation (direct REST, RPC, and by guessing ids/slugs).
- [ ] Client cannot write `invitations`, `change_requests`, `admins`, `profiles.role`, `notifications` of others (anon key + own JWT).
- [ ] Client cannot self-promote to admin by any route (sign-up metadata, profile update, RPC parameters).
- [ ] Non-admin cannot call `review_change_request`, `invite-client`; calling with a forged `decision` or someone else's request id fails.
- [ ] Proposed `details` with `javascript:` URLs, `<script>`, oversized payload, extra keys outside the allow-list are rejected server-side.
- [ ] Unverified-email sign-up cannot see a linked invitation.
- [ ] `VITE_ADMIN_EMAIL` change in the browser (devtools) grants nothing.
- [ ] Rate limits hold (submit, invite, notification emails).
- [ ] Emails contain no secrets and use signed deep links only to pages that re-check auth.

## B9. Test plan

- [ ] **RLS / RPC tests** (pgTAP or Supabase CLI): the matrix in B8 with three personas (admin, client A, client B) plus anon.
- [ ] **Unit (Vitest):** allow-list stripping, diff generation (`changed_keys`), email normalisation, three-case landing logic, banner state machine (none → pending → approved / rejected → acknowledged).
- [ ] **E2E (Playwright):** admin creates invitation with client email → client signs up → edits → admin receives notification → approves → public page shows new data; same flow with reject → client sees rejected until "Got it"; 0-linked and multi-linked accounts; withdraw; conflict path.
- [ ] **Email:** test with a sandbox mail provider; verify deduplication and failure fallback to in-app notification.

## B10. Delivery milestones (each shippable on its own, behind `preview` first)

| Milestone | Scope | Depends on | Exit criteria |
| --- | --- | --- | --- |
| **B-M0** | Decisions D1–D8 recorded; Phase 0 and Phase 1 security items (C-1, C-2, C-3, H-2) done | – | Authorization tests from audit §6 pass |
| **B-M1** | B2 migration: `admins`, `client_email`, `change_requests`, `notifications`, `audit_log`, RPCs, RLS; DB tests | B-M0 | RLS test matrix green on a clean project |
| **B-M2** | B5 "Client email" field + invite action; admin list column | B-M1 | Client email saved, normalised and shown |
| **B-M3** | B4 role resolution, post-login routing, `ClientApp` shell, 0/1/many landing | B-M1 | Each of the 3 cases verified with test accounts |
| **B-M4** | B6 restricted editor, submit, pending and rejected banners | B-M3 | Submit creates a pending request; live data unchanged |
| **B-M5** | B5 review queue, diff, approve/reject, conflict handling | B-M4 | Approve updates live page; reject keeps live data |
| **B-M6** | B3 Edge Functions, notification bell, emails | B-M5 | Admin notified within a minute; client notified on decision |
| **B-M7** | B7 edge cases, B8 checklist, B9 e2e, docs (README sections "Roles", "Client editing", sign-up setting) | B-M6 | All checklists green; promote `preview` → `main` |

---

## Definition of done for the release

- [ ] All Critical and High items closed and verified with a second normal account plus the anon key.
- [ ] Attack chain from the audit (sign up → edit template → script runs for admin) no longer works at steps 1, 2 and 3.
- [ ] `npm run typecheck`, `npm run build`, lint and tests all green in CI.
- [ ] `schema.sql` on a fresh Supabase project produces a fully working app (previews, uploads, slug rules).
- [ ] Track B checklist (B8) fully green, including a client-versus-client isolation test.
