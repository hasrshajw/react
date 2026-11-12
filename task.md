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

### Where things stand (12 Nov 2026, 8th update)

| Phase | Done | In progress | To do | Notes |
| --- | --- | --- | --- | --- |
| Phase 0 | 0 | 4 | 1 | C-2 (public iframe), H-1 and **C-3** (profile lockdown, SQL coded and tested) are coded; C-1's sign-up switch is still a dashboard action. Only the token rotation is untouched. **The GitHub token pasted in chat on 12 Nov (pasted again for the 6th update) must be revoked** (see the first Phase 0 row). |
| Phase 1 – Authorization and data safety | 1 | 4 | 1 | H-2 compiler part done, H-2 database part written (not yet run in Supabase). C-2 `LivePreview` coded; CSP part still report-only. **H-5** database half coded and tested on local Postgres (`004_enquiry_hardening.sql`, not yet run in Supabase); captcha and per-IP rate limit are not done. **C-1** database half coded and tested on local Postgres (`005_admin_role.sql`, not yet run in Supabase). Nothing in Phase 1 authorization is untouched any more. |
| Phase 1 – Setup and schema | 2 | 2 | 0 | M-11 and the README sign-up/admin step are done. H-3 is coded and tested on local Postgres, but not yet on a clean Supabase project. M-12 untracked from git; secret scanning is still a GitHub setting. |
| Phase 1 – App correctness | 0 | 2 | 0 | **H-6** coded and tested with a fake client (not yet on real Supabase or in a browser). **M-8** coded; needs `SITE_URL` set on Vercel. M-12 is counted in the "Setup and schema" row. |
| Phase 2 | 1 | 7 | 3 | **M-10** done (compiler placeholder handling; tested in jsdom). **M-5** data layer coded (explicit columns, stable order, reads past the 1,000-row cap); the "load more" UI is not done. M-13 coded (awaiting a check). **M-9** coded and tested with a mock handler (needs a check on a deployment). **M-1** (session hygiene) and **M-6** (enquiry badge and refresh) coded and tested with a fake client and jsdom (need a browser check). **M-3** (client-side QR codes) and **M-7** (login fixes, forgot password) coded and tested the same way (need a browser check; M-7 also needs the Supabase redirect URL). Still untouched: H-4, M-4, M-2. |
| Phases 2–3, Track B | 0 | 0 | all | Track B only has the `VITE_ADMIN_EMAIL` env placeholder (B4). |

### 12 Nov 2026 (8th update) – M-10 compiler placeholder handling, M-5 paged reads and column lists

**What was done**

1. **M-10 – template compiler (`src/lib/compileInvitation.ts`, `PreviewPanel.tsx`, `TemplatePicker.tsx`, `Templates.tsx`, `src/types/dashboard.ts`)**
   - **Values live in a null-prototype object.** `valuesFor()` returns `Object.assign(Object.create(null), {...})`. Before, `{{constructor}}`, `{{toString}}`, `{{hasOwnProperty}}` printed text such as `function Object() { [native code] }`, and `{{#if constructor}}…{{/if}}` always showed its body (a function is truthy). Now they resolve to nothing, like any unknown key.
   - **Only the compiler's own syntax is stripped.** The old last step ran `.replace(/\{\{[^}]+\}\}/g, "")` over the finished HTML. That also deleted text a person had typed into a field (a name containing `{{x}}`) and any `{{ … }}` inside template CSS or JavaScript. It is replaced by `stripLeftoverSyntax(doc)`, which works on the parsed document, removes only `{{key}}`, `{{#if key}}` and `{{/if}}` (placeholders in `<head>` that are not walked, unmatched control tags), and skips the `span[data-schedy-field]` elements that hold filled-in values. Attributes need no extra pass: every `{{key}}` in them was already replaced.
   - **`tpl.html` fallback removed** in `PreviewPanel`, `TemplatePicker` and `Templates`, and the unused `html?` field removed from `TemplateRecord`. `fetchTemplates` selects only `html_code`, so `html` was never present; the preview showed "No preview available" only when `html_code` was empty, as it still does.
   - **Verified (ad hoc, throwaway scripts in `/tmp`, not saved in the repo):** `npm run typecheck` and `npm run build` pass. A jsdom script, 18 checks: `{{constructor}}`, `{{toString}}`, `{{__proto__}}`, `{{hasOwnProperty}}` in text give an empty string; `{{#if constructor}}` and `{{#if toString}}` hide their body; `title="{{constructor}}"` gives an empty attribute; normal fill (`{{groom-en}} & {{bride_en}}` with an underscore key) still works and an unknown key gives an empty string; `{{#if}}` true and false still work; a name `{{secret}} {{#if x}} {x}` is kept exactly, in text and in an attribute; template `<style>` (including `@media` nesting) and a `<script>` with nested braces are kept; a placeholder in `<title>` is removed and stray `{{/if}}` / `{{#if zz}}` are removed; the H-2 cases still hold (`javascript:` href removed, `onerror` removed). **Not run in a browser.**
2. **M-5 – data layer (`src/lib/api.ts`)**
   - **Reads go past the 1,000-row cap.** Supabase answers a plain `select` with at most 1,000 rows and does not say when it cuts the list, so the oldest rows of a long list would have vanished without an error. `readAllPages()` reads `fetchInvitations` and `fetchEnquiries` in pages of 500 with `.range()`, orders by `created_at` then `id` (so equal timestamps never swap places between pages), drops a row that arrives twice (an insert between two pages), rejects the whole read if any page fails (no half list), and stops at 10,000 rows with a console warning.
   - **Explicit column lists** replace `select("*")` for invitations (`INVITATION_COLUMNS`: no `slug`, no `owner`) and enquiries (`ENQUIRY_COLUMNS`), including `fetchInvitation` and the row `saveInvitation` returns. A column added later (Track B's `client_email`) does not reach the lists until it is added on purpose. `details` is still read for every row on the lists: the preview panel and the couple names need it.
   - **Not done (why M-5 stays `[~]`):** there is still no "load more" in the UI and no server-side search, filter or sort, because filters, search, sort and bulk selection run in the browser over the whole list. Downloading up to 10,000 rows with their `details` is the cost until that is built. The 60 s refresh (H-6, M-6) re-reads the whole list through the same paged read.
   - **Verified (ad hoc):** a fake Supabase client that enforces the 1,000-row cap, 18 checks: 2,300 invitations arrive complete, unique, newest first, in 5 requests (`0-499 … 2000-2499`); the column list has no `*`, `slug` or `owner`; every request has the `id` tie-break; the `published` and `deleted` maps are right; exactly 1,000 rows ends after one empty extra page; empty and 3-row lists; 1,200 rows with one identical `created_at` come back once each; an error on page 2 rejects, and the flag queue still works for the next read; the duplicate drop; 1,500 enquiries; a 10,500-row table stops at 10,000 rows (20 requests) and warns. **Not run on real Supabase or in a browser.**

**How this affects other tasks**

- **M-5 / H-6 / M-6:** `fetchInvitations` and `fetchEnquiries` keep their return types, so `useInvitationStore`, `useEnquiries` and the 60 s refresh are unchanged. `knownPub` / `knownDel` are still set from the full list. When real pagination is added, the flag maps must work per loaded page (3rd update note still stands).
- **M-4 / Track B:** the invitation column list is the place to add `client_email` (or a `client_invitations` view) later.
- **H-2 / C-2:** nothing changed. The compiler still sanitizes attributes after filling them.
- **L-9** (stop executing template scripts in the editor) is still open. Note: `{{x}}` placeholders inside a `<script>` in `<body>` are still turned into spans by the existing text walker; this update did not change that.
- **Seen, not changed:** `PreviewPanel`'s iframe uses `sandbox="allow-scripts allow-forms allow-popups"`. It has no `allow-same-origin` (so the C-2 risk is covered), but it differs from the other two frames (`allow-forms` present, `allow-popups-to-escape-sandbox` missing). Align it when the strict CSP is enforced.

**Behaviour changes to check**

- A guest or client who types `{{…}}` into a name field now sees it as typed; before it vanished.
- A template with `{{constructor}}` or similar no longer prints function text.
- Lists with more than 1,000 invitations or enquiries now show all rows. With a few hundred rows nothing looks different, but the first load makes one request per 500 rows.
- Template CSS or JS that contains a double brace such as `{{a:1}}` is no longer cut. (If `{{a}}`-style words, with only letters, digits, `_` or `-` between the braces, appear in a `<head>` script, they are still removed as placeholders.)

**Checks to repeat (for `[~]` → `[x]`)**

1. M-10, browser: open a template in Create, type `{{hello}} {{#if x}}` in the groom name: the preview and the public page show the text as typed. Open the Templates page and the template picker: thumbnails still render. Dashboard → preview an invitation: it renders.
2. M-5, browser, Network tab: Dashboard load makes `invitations?...&offset=0&limit=500` requests (one per 500 rows) and the Invitations count matches `select count(*) from invitations`. To test the cap without real data, in the SQL Editor run `insert into public.invitations(id, slug, details) select 'bulk'||g, 'bulk'||g, '{}' from generate_series(1,1200) g;` (set `owner` if the default `auth.uid()` is null in the editor), reload: all 1,200 rows are listed; then `delete from public.invitations where id like 'bulk%';`.
3. M-5, enquiries: with more than 1,000 test rows the Enquiries list shows all of them (same method), then delete them.

**Next steps, in order**

1. Owner actions: everything in the 6th and 7th updates' lists (including the Supabase redirect URL for password reset). **Revoke the GitHub token pasted in chat (used again for this push) and use a new short-lived one next time.**
2. Run the browser checks from the 6th, 7th and 8th updates plus the older ones (C-2 `LivePreview`, H-1, M-13, H-6) and the M-8/M-9 curl checks; then tick those items.
3. Deploy `preview`, list `Content-Security-Policy-Report-Only` violations, enforce the strict CSP (narrow `img-src`, align the `PreviewPanel` sandbox).
4. H-5 remainder (captcha, per-IP limit).
5. Next code items, two at a time: **M-4** (storage limits and cleanup) with **M-2** (transliteration error handling), or **H-4** (view counting) on its own, since it touches the database; also the *Duplicate* gap from the 3rd update, and the M-5 "load more" UI.
6. **Testing env file stays:** `.env.local` was not touched in this update.

---

### 12 Nov 2026 (7th update) – M-3 client-side QR codes, M-7 login fixes and forgot password

**What was done**

1. **M-3 – the QR code is drawn in the browser, the link is no longer sent to another site** (`src/lib/qr.ts` new, `src/hooks/useQr.ts` new, `src/features/dashboard/components/QrModal.tsx`, `src/features/invitations/components/ShareModal.tsx`, `package.json`, `package-lock.json`)
   - New dependency **`qrcode`** (+ `@types/qrcode`), loaded with a dynamic `import()` only when a QR dialog opens, so the main bundle does not grow. `qrDataUrl(text, size)` gives a PNG data URL (error correction level M, 2-module margin); `qrPngBlob()` makes the 720 px file for **Download**. `dataUrlToBlob()` avoids `fetch()` on a `data:` URL, which the CSP `connect-src` would refuse.
   - Both dialogs now show the generated image. The old "Couldn't load the QR code. Check your connection." became "Couldn't create the QR code." The old fallback that opened `api.qrserver.com` in a new tab on download failure is removed.
   - Side effect: the strict CSP (report-only) never allowed `api.qrserver.com` in `connect-src`, so the old Download button would have failed once the policy is enforced. That problem is gone. `img-src` still lists `https:`; tighten it when the CSP is enforced (Phase 1, C-2).
2. **M-7 – login fixes** (`src/lib/auth.ts`, `src/hooks/useAuth.tsx`, `src/pages/Login.tsx`)
   - **Google button no longer stays on "Signing in…"** after the Back button: a `pageshow` listener clears the busy state when the page comes from the back/forward cache (`event.persisted`).
   - **The page you came from is kept through the Google redirect.** The target waits in `sessionStorage` (this tab, 10 minutes, read once) rather than as `?from=` on `redirectTo`, because a query string would have to be added to Supabase's allowed redirect list. Only in-app paths are accepted (`isSafeTarget`: starts with a single `/`, no `//`, no backslash, not `/login`, under 300 characters); anything else falls back to `/dashboard`.
   - **No password-length check on sign-in.** The client now only requires a non-empty password; the server's message is shown. The 6-character rule (`MIN_PASSWORD`) is kept only for choosing a new password.
   - **"Forgot password?" works.** It uses the email typed above (asks for it if empty or invalid), calls `resetPasswordForEmail` with `redirectTo = <origin>/login`, and shows the same neutral message whether or not an account exists. The link in the email returns to `/login` with `type=recovery`; the page then shows **Set a new password** (new + repeat, minimum 6 characters, `updateUser`) instead of redirecting into the app, and goes to the dashboard after saving. "Back to sign in" leaves that form.
   - **Known limit:** the recovery link signs the person in (that is how Supabase recovery sessions work). If they close the page before saving a new password they stay signed in with the old one.
   - **Verified (ad hoc, throwaway scripts in the session scratchpad, not saved in the repo):** `npm run typecheck` and `npm run build` pass. Script 1 (jsdom, fake Supabase client, the real `Login` component with a stubbed router), 60 checks over two runs (normal address, and an address with `#…&type=recovery`): *QR (4):* data URL is a PNG, the download blob is a real PNG, the 720 px image and the 240 px image **both decode back to the exact link** (decoded with jsQR). *Helpers (17):* 10 target cases (`/dashboard`, `/create?edit=abc` accepted; `//evil.com`, `/\evil.com`, `https://…`, `/login`, `/login?x=1`, empty, null, 400 characters rejected), redirectTo stays the plain `/login`, target readable once, unsafe target not stored, a target older than 10 minutes ignored, a 3-character password reaches the server and the server's message is shown, empty password still asks for one, reset with an invalid email sends nothing, reset requested with the trimmed email and `/login` redirect, new password under 6 refused, valid one sent, `RECOVERY_LINK` true only with the recovery address. *Login page (7 + 3):* Google busy after click, `pageshow` without bfcache leaves it, `pageshow` from bfcache frees it, forgot password with no email asks for one and sends nothing, with an email it requests the reset and shows the neutral message, a 3-character password shows no length error and shows the server message; with the recovery address the set-password form replaces the sign-in form, mismatched passwords are refused without a request, matching ones are saved and the form closes. The earlier 36-check script (M-1, M-6) still passes. **Not run in a browser, with a real reset email, or on real Supabase.**

**How this affects other tasks**

- **Supabase dashboard (new owner action):** Authentication → URL Configuration must allow `https://YOUR-DOMAIN/login` (and `http://localhost:5173/login` for testing) as a redirect URL, or the reset email link is refused. The reset email template can stay the default.
- **C-1 (sign-ups off):** password reset still works for existing users; it does not create accounts.
- **M-1:** `signInWithGoogle(from?)` and `useAuth().signInGoogle(from?)` take an optional page path. The target in `sessionStorage` is not cleared by `resetUserData()` (it only holds a path, expires in 10 minutes and is read once).
- **Track B:** the client edit flow can reuse `takeLoginTarget()` to send a client back to the page they opened from an email link.
- **C-2 CSP:** the QR change removes the only third-party image/fetch use in the admin; `img-src https:` can then be narrowed to `'self' data: blob:` plus the Supabase storage host, once the public invitation page's own images are checked.

**Behaviour changes to check**

- "Forgot password?" now sends a real email; before it showed "isn't available yet".
- Signing in with a very short password now shows Supabase's message ("Invalid login credentials") instead of a length message.
- The QR image is slightly different in look (library output, 2-module margin) and appears instantly with no network request.
- The admin bundle gains the `qrcode` code as a separate chunk loaded when a QR dialog opens.

**Checks to repeat (for `[~]` → `[x]`)**

1. M-3, browser: Dashboard → a published invitation → QR code. DevTools → Network shows no request to `qrserver.com`. Scan the screen QR with a phone: it opens the invitation link. Download PNG: a PNG file is saved (not a new tab) and scans too. Same in the Invitations page → Share dialog; change the custom link ID and see the QR change.
2. M-7, Google: open `/create?edit=<id>` while signed out, sign in with Google: you land on that page, not the dashboard. Start Google sign-in, press Back from the Google page: the button is usable again.
3. M-7, reset: add the redirect URL (see above), type your email on the login page, click Forgot password: the neutral message appears and an email arrives. Open its link: the "Set a new password" form shows. Save: you reach the dashboard and can sign in with the new password after logging out. Try an expired or reused link: saving shows an error and "Back to sign in" works.
4. M-7, short password: sign in with a 3-character password: the message comes from Supabase, not from the form.

**Next steps, in order**

1. Owner actions: everything in the 6th update's list, plus the redirect URL above. **Revoke the GitHub token pasted in chat (used again for this push) and use a new short-lived one next time.**
2. Run the browser checks from the 6th and 7th updates plus the older ones (C-2 `LivePreview`, H-1, M-13, H-6) and the M-8/M-9 curl checks; then tick those items.
3. Deploy `preview`, list `Content-Security-Policy-Report-Only` violations, enforce the strict CSP (narrow `img-src` as noted).
4. H-5 remainder (captcha, per-IP limit).
5. Next code items, two at a time: **M-10** (compiler placeholder handling) with **M-5** (pagination and column lists), or **M-4** (storage limits and cleanup); also the *Duplicate* gap from the 3rd update.

---

### 12 Nov 2026 (6th update) – M-1 session hygiene, M-6 enquiry badge and refresh

**What was done**

1. **M-1 – signing out (or losing the login) leaves nothing of the previous person behind** (`src/lib/auth.ts`, `src/lib/userData.ts` new, `src/lib/storageKeys.ts` new, `src/lib/storage.ts`, `src/lib/api.ts`, `src/hooks/useAuth.tsx`, `src/pages/Login.tsx`, `src/features/create/constants.ts`)
   - **Cleanup registry.** `resetUserData()` removes every `schedy_create_draft_*` key and runs reset functions that modules register with `onUserDataReset()`. `api.ts` registers one that empties `knownPub` / `knownDel`. Other user settings (`schedy_auto_refresh`) are kept. `LS_DRAFT` moved to `storageKeys.ts` (no imports) and is re-exported from `constants.ts`, so `Create.tsx` is unchanged.
   - **`signOut()` replaces `clearSession()`.** It removes the cached session and runs `resetUserData()` first (so the app is signed out at once), then awaits Supabase. If the server answers with an error or the network fails, it falls back to `signOut({ scope: "local" })` so the login is still removed from this browser. `useAuth().logout` now returns that promise.
   - **`onAuthStateChange` is subscribed** (`watchAuthChanges`, used by `AuthProvider`). `SIGNED_OUT` (refresh token failed, signed out in another tab) clears the cached session, drafts and caches and sets the session to null. A `SIGNED_IN` for a different email while a session is cached (another tab switched account) swaps to the new person and clears the old drafts. A normal sign-in in this tab, `TOKEN_REFRESHED` and a same-email `SIGNED_IN` are ignored. The callback only touches localStorage and never awaits a Supabase call (awaiting one inside it can dead-lock the client).
   - **Expired login on startup:** `syncSupabaseSession()` now also clears drafts when a cached person exists but Supabase has no login. `AuthProvider` also runs `resetUserData()` whenever the session email changes to null or to someone else.
   - **Login form locks until sign-out has finished** (`Login.tsx`: `signingOut` state, `locked` replaces `busy` for the buttons and inputs). Before, "Log out" navigated to `/login` and fired the sign-out without waiting, so a quick sign-in could be ended by the late sign-out.
   - The "Save your changes?" flow is unchanged: Log out still navigates to `/login` first and the sign-out runs on arrival, so cancelling the dialog keeps the person signed in. The draft the dialog saves ("Leave") is written before navigation and is then removed by the sign-out, as intended.
2. **M-6 – the new-enquiry count is right on every admin page, and the Dashboard list stays current** (`src/features/dashboard/hooks/useEnquiryBadge.ts` new, `useEnquiries.ts`, `src/lib/api.ts`, `src/AdminApp.tsx`, `src/components/Sidebar.tsx`)
   - **`fetchNewEnquiryCount()`** asks the server for a count of `status = 'new'` rows (`head: true`, no rows downloaded). `useEnquiryBadge` (used in `Shell`) polls it every 60 s while the tab is visible and again when the tab becomes visible or gets focus. `report(n)` lets the Dashboard set the number at once; a poll that started before a `report` is ignored.
   - **Sidebar:** new `enquiryCount` prop. The bell's red dot is shown only when it is above 0 (before, it was always on) and the button's `aria-label` says how many. The tab title prefix `(n)` moved from `useEnquiries` to `useEnquiryBadge`, so it also shows on Invitations, Create and Templates.
   - **Bug fixed on the way:** `useEnquiries` reported a count of 0 on mount, before its list had loaded. It now reports only after the first load.
   - **Dashboard list refresh:** `useEnquiries` re-reads the list every 60 s and when the tab becomes visible. A result is dropped if the person changed something after the request started or a save is still in flight (same rule as H-6); the next refresh picks up the server state. A failed refresh is silent.
   - **Not done:** Realtime (push) updates; the bell still opens nothing when clicked. The 60 s poll is the chosen "polling" option from the task.
   - **Verified (ad hoc, throwaway scripts in the session scratchpad, not saved in the repo):** `npm ci`, `npm run typecheck` and `npm run build` pass. A jsdom + React 18 script with a fake Supabase client, 36 checks. *Sign-out (11):* session, all drafts removed, auto-refresh setting kept, one global `signOut` call, flag caches cleared (the same maps cause 2 writes afterwards), fallback to local scope on a server error and on a network exception, double reset is safe, a throwing reset function does not stop the others. *Auth events (7):* same-email sign-in ignored (any case), `TOKEN_REFRESHED` ignored, different person switches the session and clears their draft, a normal sign-in with no cached session is untouched, `SIGNED_OUT` clears everything, unsubscribe works. *Expired login (2).* *Badge (8):* first load and title, poll updates without stacking the prefix, an older in-flight poll cannot overwrite `report(7)`, the next poll applies the server count, no requests while the tab is hidden, refresh when it is shown again, a failed poll keeps the last number, title restored on unmount. *Enquiries hook (8):* no false 0 before the first load, count reported after load, an enquiry added elsewhere appears with the count, a refresh that started before a local change does not overwrite it, a refresh during a pending save is skipped, the next refresh after the save adopts the server state, a failed save puts the value back and shows the message. **Not run in a browser, on real Supabase, or through the real `Login` component (no render test for the locked form).**

**How this affects other tasks**

- **Track B (client self-service):** the shared-device session risk named in B is now handled (sign-out clears drafts and caches). B's draft key is still not per user; add that when B is built.
- **H-6:** `knownPub` / `knownDel` are now cleared on sign-out, which closes the "M-1 still needed" note in the 3rd update.
- **M-5 (pagination):** `fetchEnquiries` still selects `*`; the new count query selects only `id`. When M-5 is done, the Dashboard refresh should use the same page size.
- **M-7 (login fixes):** `Login.tsx` now has a `locked` flag (`busy` or signing out); M-7's Google busy-state reset on `pageshow` should clear `busy` only.
- **`clearSession()` is gone** (replaced by `signOut()`); nothing else in `src` used it.

**Behaviour changes to check**

- The bell's red dot is gone when there are no new enquiries.
- After "Log out" the sign-in form is disabled for a moment (until Supabase confirms), then usable.
- Create-form drafts do not survive a sign-out. A person who logs out with unsaved changes and signs in again will not see the "Restore draft" card.
- The tab title count `(n)` now appears on every admin page, not only the Dashboard.

**Checks to repeat (for `[~]` → `[x]`)**

1. M-1, browser: sign in, open Create, type a name (do not save), wait 1 s so the draft is stored (DevTools → Application → Local Storage shows `schedy_create_draft_new`). Log out via the profile menu and choose to leave. The key is gone. Sign in again: no "Restore draft" card.
2. M-1, two tabs: sign in on both. Log out in tab A. Tab B goes to the login page without a reload, and its drafts are gone.
3. M-1, expired login: in DevTools delete the Supabase `sb-…-auth-token` key but keep `schedy_session`, reload: you land on the login page and drafts are gone.
4. M-1, quick re-login: log out and sign in again as fast as you can. The form is disabled until the sign-out finishes, and you stay signed in.
5. M-6, browser: insert a test enquiry (SQL Editor, or the public form). Within 60 s (or on switching back to the tab) the bell dot and the tab title `(1)` appear on the Invitations page, not only the Dashboard. Mark it as called in the Dashboard: the dot and title count go away at once. Delete the test row.
6. M-6: leave the Dashboard open, add an enquiry in another tab; it appears in the list within 60 s. Change a status while a slow refresh runs: your change is kept.

**Next steps, in order**

1. Owner actions (unchanged from the 5th update): run `005` (with your email) in Supabase and do its checks; turn off public sign-ups; **revoke the GitHub token pasted in chat (used again for this push) and use a new short-lived one next time**; run `003` and `004` on the live project; set `SITE_URL` on Vercel; enable GitHub secret scanning.
2. Run the browser checks (C-2 `LivePreview`, H-1, M-13, H-6, and the two new lists above) and the M-8/M-9 curl checks; then tick those items.
3. Deploy `preview`, list `Content-Security-Policy-Report-Only` violations, enforce the strict CSP.
4. H-5 remainder (captcha, per-IP limit).
5. Next code items, two at a time: **M-10** (compiler placeholder handling) with **M-7** (login fixes), or **M-3** (client-side QR codes); also the *Duplicate* gap from the 3rd update.
6. **Testing env file stays:** the owner asked on 12 Nov (6th update) not to delete the testing env file, and renamed it on GitHub from `env.local` to `.env.local` (commit `4bc0ffb`). It is still tracked in git even though `.gitignore` lists `.env.local`. Leave it in place: the "delete `env.local`" note in the 5th update's step 6 and the `git rm --cached` step of M-12 are on hold while it is the testing file. It holds only the public `VITE_` values. Never upload a file containing the `service_role` key.

---

### 12 Nov 2026 (5th update) – C-3 profile lockdown, C-1 admin role (database half)

**What was done**

1. **C-3 – a signed-in user can change only their own display name** (`supabase/schema.sql`, `supabase/migrations/005_admin_role.sql`)
   - `REVOKE UPDATE ON public.profiles FROM anon, authenticated; GRANT UPDATE (name) ON public.profiles TO authenticated;` The `self update` row policy stays (own row only). So `plan_status`, `role`, `plan_name` and `trial_ends_at` can no longer be set from the browser. The app never writes to `profiles` (only reads), so nothing in the UI changes.
2. **C-1 – templates, categories and enquiries are admin-only** (same two files, plus `supabase/reset.sql`, `README.md`)
   - New table **`public.admins`** (`user_id`, `email`). RLS on, no policies, all privileges revoked from `anon`/`authenticated`: it cannot be read or written through the API, only in the SQL Editor.
   - New **`is_admin()`** (`security definer`, `stable`, `search_path` pinned; EXECUTE for `authenticated` only, revoked from `public` and `anon`). Revoking from `anon` explicitly matters: Supabase grants new functions to `anon` by default and `revoke … from public` does not remove that.
   - Policies `categories: admin all`, `templates: admin all`, `enquiries: admin read`, `enquiries: admin update` now use `is_admin()` (old `signed-in all` policies dropped). `invitations: owner all` is unchanged (per-owner rule kept, as the task says). The public enquiry insert and `get_public_invitation` are unchanged.
   - **Migration `005` is lock-out safe:** step 1 adds the admin by email (you must replace `CHANGE-ME@example.com` in the file first). If no admin row exists and users exist, it raises `No admin found…` **before any policy is changed**. Safe to run twice. A fresh project gets everything from `schema.sql`; the first admin is added with the one-line `insert` in README step 3.
   - **Verified (ad hoc, throwaway scripts in `/tmp`, not saved in the repo)** on local Postgres 16 with stub `auth`/`storage` schemas and roles. (a) Fresh `schema.sql` + `seed.sql`, and `schema.sql` run again: no errors. (b) As a signed-in **non-admin**: template update/delete = 0 rows, template insert and category insert = RLS error, enquiries read = 0 rows, enquiries update = 0 rows, `profiles` update of `plan_status`, `role`, `trial_ends_at` = `permission denied`, own `name` update = 1 row, another user's `name` = 0 rows, reading or inserting into `admins` = `permission denied`, own invitation insert works, an invitation owned by someone else is refused. (c) As **admin**: `is_admin()` true, templates readable and updatable, category insert, enquiries read and update, own profile readable, `admins` still unreadable. (d) As **anon**: `is_admin()` = `permission denied`, templates 0 rows, the public enquiry insert and `get_public_invitation` still work. (e) **Upgrade path:** an old-schema database (previous commit's `schema.sql`) with two users: `005` with the placeholder email fails with the guard message and leaves the old `templates: signed-in all` policy in place; with a real email (matched case-insensitively) it succeeds, a second run is harmless, and the stranger/admin checks above then pass. `npm ci`, `npm run typecheck`, `npm run build` pass (no TypeScript change). **Not run on a real Supabase project.**

**How this affects other tasks**

- **Track B / B-M0:** the C-1 and C-3 database halves are now coded. B2's "Admin role" item is done early, so **Track B's migration is `006_client_edit.sql`** (B2 heading updated); it must reuse `admins` and `is_admin()` and fold itself into `schema.sql` in the same commit. B-M0 still needs the dashboard actions below.
- **B2 signup trigger:** `handle_new_user()` still creates profiles with `role = 'Administrator'` by default. That is now display-only (permissions come from `admins`), but Track B must still change it to a non-admin default.
- **C-1 dashboard half is still open:** until public sign-ups are off in Supabase, a stranger can still register and create their own invitations (the owner rule allows it) and read their own profile, but they can no longer touch templates, categories or enquiries.
- **Google sign-in:** a Google user who is not in `admins` can sign in but sees empty template, category and enquiry lists. Add them with the `insert` in README step 3 if they should be an admin.
- **H-5 / M-6:** the enquiry rules and column grants from the 4th update are untouched; the read and update policies now also require `is_admin()`.
- **M-13:** the Dashboard still shows the profile's `role` text; it is not a permission.
- **`reset.sql`** now also drops `admins` and `is_admin()`; **an admin row is lost on reset** (and `auth.users` is kept), so re-add it afterwards.

**Behaviour changes to check**

- After `005` runs, only the email you put in step 1 sees templates, categories and enquiries. If the dashboard looks empty after logging in, the signed-in email is not in `admins`.
- A non-admin signed-in user can still create their own invitations but cannot choose templates (the template list is empty for them).

**Checks to repeat (for `[~]` → `[x]`)**

1. In the Supabase SQL Editor, edit step 1 of `005_admin_role.sql` (your email), run it, then `select email from public.admins;` shows your address.
2. Log in as the admin → Templates, Categories and Enquiries load as before.
3. Create a second user (Authentication → Users → Add user, auto-confirm), sign in as them via the app or the REST API with their JWT: `GET /rest/v1/enquiries` returns `[]`; `PATCH /rest/v1/templates?id=eq.<id>` with `{"name":"x"}` returns `[]` (0 rows) and the name is unchanged; `POST /rest/v1/categories` is refused (`42501`).
4. Same second user: `PATCH /rest/v1/profiles?id=eq.<their id>` with `{"plan_status":"active"}` → `permission denied`; with `{"name":"New"}` → succeeds.
5. In the browser console as that user, `supabase.from('profiles').update({plan_status:'active'}).eq('id', '<their id>')` is rejected. Delete the test user afterwards.

**Next steps, in order**

1. Owner actions: run `005` (with your email) in Supabase and do the checks above; turn off public sign-ups (C-1 switch); **revoke the GitHub token pasted in chat on 12 Nov (used again for this push); use a new short-lived one next time**; run `003` and `004` on the live project (after the public form check); set `SITE_URL` on Vercel; enable GitHub secret scanning.
2. Run the earlier browser checks (C-2 `LivePreview`, H-1, M-13, H-6) and the M-8/M-9 curl checks; then tick those items.
3. Deploy `preview`, list `Content-Security-Policy-Report-Only` violations, enforce the strict CSP.
4. H-5 remainder (captcha, per-IP limit).
5. Next code items, two at a time: **M-1** (session hygiene) with **M-6** (enquiry badge wiring), or **M-10** (compiler placeholder handling); also the *Duplicate* gap from the 3rd update.
6. **Stray file in the repo:** commit `07b49ac` ("Add files via upload", made on GitHub, not by this update) added `env.local` (no leading dot) at the repo root. It holds only `VITE_SUPABASE_URL` and the publishable key (public by design), so it is not a secret leak, but `.gitignore` only covers `.env.*`, so it is tracked. Delete it (`git rm env.local`) and add `env.local` to `.gitignore`; keep real values only in the untracked `.env.local`. Never upload a file that contains the `service_role` key.

---

### 12 Nov 2026 (4th update) – H-5 enquiry insert hardening (database half), M-9 link-preview function uses `SITE_URL`

**What was done**

1. **H-5 – what a stranger can write into `enquiries` is now limited by the database** (new `supabase/migrations/004_enquiry_hardening.sql`, folded into `supabase/schema.sql`; `supabase/reset.sql` drops the new function)
   - **Column grants.** `anon` and signed-in users can insert only `name`, `phone`, `email`, `message`. `note`, `status`, `follow_up_date`, `history`, `id` and `created_at` always take their defaults. Naming any other column, even `status = 'new'`, fails with `permission denied`. Admins still change those columns with `UPDATE` as before.
   - **Insert policy** now also requires `note = ''`, `follow_up_date is null` and `history = '[]'` (a second lock behind the grants).
   - **Trigger `enquiries_check_insert`** (before insert): trims the four fields; `message` ≤ 2000 characters, `name` ≤ 100; `phone` (if given) only `+0-9 ()-`, ≤ 20 characters and 10–13 digits (same rule as `details`); `email` (if given) ≤ 254 characters, lower-cased, basic `a@b.c` shape; and **a 6th enquiry with the same phone or the same email within one hour is refused** (`Too many enquiries from this contact…`). A trigger, not a `CHECK`, so old rows stay updatable. It runs `security definer` because `anon` cannot read the table, so a plain count would always see 0. Two small indexes support the count.
   - **Not done (still open in H-5):** the Edge Function / Vercel route with **captcha** and a **per-IP rate limit**. The database cannot see the visitor's IP, and a captcha needs a provider key and the public form, which is **not in this repo**. The per-contact limit above only slows repeat spam from one phone/email; a bot that varies them is not stopped.
   - **Verified (ad hoc, throwaway scripts in `/tmp`, not saved in the repo):** on a local Postgres 16 with stub `auth`/`storage` schemas, both after running `004` on an old-schema database and on a fresh `schema.sql` + `seed.sql` (and `schema.sql` run twice). 34 cases: normal insert accepted (also one with only a name); `note`, `status` (`called` and `new`), `follow_up_date`, `history`, `id`, `created_at` all `permission denied`; 1 MB message, 2001-char message and 101-char name rejected, 2000-char message accepted; letters-only phone, 5-digit phone, bad emails rejected; as `anon` the table shows 0 rows and an `update` changes 0 rows; `insert … returning` is refused; phone and email throttle: 5 accepted (email compared case-insensitively), 6th refused, a different email unaffected; as `authenticated` read and the admin `update` (status, note, follow-up date, history) still work, while an insert with `note` is denied. **Not run on a real Supabase project.**
2. **M-9 – the link-preview function trusts configuration, not request headers** (`api/invite.js`, new `api/_siteUrl.js`, `vite.config.ts`, `.env.example`, `README.md`, `docs/SEO_SHORT_LINK_CHANGES.md`)
   - **Site address:** the `Host` / `X-Forwarded-Host` code is gone. The function uses `SITE_URL`, then on Vercel `VERCEL_PROJECT_PRODUCTION_URL`, through the same rule as the build. That rule now lives once in `api/_siteUrl.js` (the underscore stops Vercel from making it a function), and `vite.config.ts` imports it. With no usable address the `canonical`, `og:url` and fallback `og:image` / `twitter:image` tags are left out (an own `https` preview image is still used) and `twitter:card` becomes `summary`.
   - **Why it mattered:** the response is cached by Vercel's CDN (`s-maxage`), so a request with a forged `Host` could put the attacker's domain into the cached canonical and `og:url` tags that WhatsApp and Google read.
   - **Slug rule** is now the database rule: 3–30 of `a-z 0-9 _ -` (after lower-casing), or a uuid (an invitation's own id is used when no custom link is set). Before it was 1–64.
   - **Stub link:** "Open the invitation" is written only for a valid slug that is not reserved. Invalid and reserved values get a page with no link and no echo of the input.
   - **Verified (ad hoc):** a mock-request script, 19 checks: `SITE_URL` used and a hostile `Host` header ignored; `VERCEL_PROJECT_PRODUCTION_URL` fallback; nothing configured → no url/image tags and no host guess; own https image kept; slugs `ab`, 31 chars, `bad slug`, `x.y`, `<b>` rejected, `abc`, 30 chars, `AbC-12_x` and a uuid accepted; `login` rejected; unknown valid slug keeps the stub link; `https://example.com` ignored. `npm run typecheck` passes. `npm run build` with `SITE_URL=https://x.test`, with only `VERCEL_PROJECT_PRODUCTION_URL`, and with nothing set gives the same `index.html`, `robots.txt` and `sitemap.xml` results as before, and the "SITE_URL is not set" warning still prints. **Not run on a Vercel deployment.**

**How this affects other tasks**

- **Track B migration numbering:** `004` is now taken. Track B's client-edit migration is **`005_client_edit.sql`** (B2 heading updated; renumbered to 006 in the 5th update). Fold it into `schema.sql` in the same commit.
- **Public enquiry form (outside this repo):** it must send **only** `name`, `phone`, `email`, `message`, and must not ask for the new row back (no `.select()` / `Prefer: return=representation`), because `anon` has no read access. A form that sends `status: "new"` or any other column now gets `permission denied`. Check the form before running `004` on the live project.
- **H-5 / Track B (B3):** a future Edge Function for enquiries can reuse the trigger's rules; keep the column grants so it cannot be bypassed by calling the REST API directly.
- **M-6 / enquiries pagination (M-5):** unchanged; the new indexes do not affect admin reads.
- **M-9 / M-8:** one setting (`SITE_URL`) now drives the HTML tags, `robots.txt`, `sitemap.xml` and the crawler pages. After changing it, redeploy.
- **`vercel.json`:** its slug rewrite still accepts `[a-zA-Z0-9_-]+`; the function does the strict 3–30 check, so nothing changes there.

**Behaviour changes to check**

- Link previews for a **short slug (1–2 characters)** or a 31–64 character one no longer get preview tags (the database never allowed them, so no real invitation is affected).
- Without `SITE_URL` the crawler page has no canonical/`og:url`/`og:image`. Before it silently used whatever `Host` was sent.
- Enquiries: a 6th submission from the same phone or email within an hour is refused with a readable message; the form should show it.

**Checks to repeat (for `[~]` → `[x]`)**

1. H-5, Supabase SQL Editor: run `004_enquiry_hardening.sql`, then check as the anon role (REST with the anon key): `curl -s -X POST "$SUPABASE_URL/rest/v1/enquiries" -H "apikey: $ANON_KEY" -H "Content-Type: application/json" -d '{"name":"t","note":"x"}'` → `permission denied`; same with `"status":"called"` → `permission denied`; `{"name":"t","message":"<2001 characters>"}` → `Enquiry message is longer than 2000 characters`; `{"name":"t","phone":"9876543210"}` → `201`. Delete the test rows. Six posts with the same phone in an hour → the 6th is refused.
2. H-5, public form: submit a real enquiry from the live form → it appears in the dashboard Enquiries list.
3. M-9, after setting `SITE_URL` on Vercel and redeploying: `curl -s -A "WhatsApp/2.0" https://YOUR-DOMAIN/<published slug> | grep -E "canonical|og:url|og:image"` → all show `YOUR-DOMAIN`; `curl -s -A "WhatsApp/2.0" -H "Host: evil.test" https://YOUR-DOMAIN/<published slug>` → no `evil.test`; `curl -sI -A "WhatsApp/2.0" https://YOUR-DOMAIN/ab` → `x-invite-status: reserved-or-invalid-slug`.

**Next steps, in order**

1. Run the browser checks from the earlier entries (C-2 `LivePreview`, H-1, M-13, H-6) and the M-8 curl check, then tick those items.
2. Owner actions: set `SITE_URL` on Vercel; run `003_details_validation.sql` and `004_enquiry_hardening.sql` on the live project (after checking the public form, see above); run the H-3 dashboard checks; **revoke the GitHub token that was pasted in chat on 12 Nov (it was used again for this push; revoke it now and use a new short-lived one next time)**; C-1 and C-3 in Supabase; enable GitHub secret scanning.
3. Deploy `preview`, list `Content-Security-Policy-Report-Only` violations, and enforce the strict CSP.
4. H-5 remainder: captcha plus a per-IP limit in front of the enquiry insert (needs the form and a captcha key).
5. Next code items, two at a time: **M-1** (session hygiene) with **M-6** (enquiry badge wiring), or **M-10** (compiler placeholder handling); also the *Duplicate* gap noted in the 3rd update.

---

### 12 Nov 2026 (3rd update) – H-6 publish/trash sync, M-8 real domain from an env var

**What was done**

1. **H-6 – publish and trash flags now follow the server, and writes go out in order** (`src/lib/api.ts`, `src/features/dashboard/hooks/useInvitationStore.ts`)
   - **Refresh picks up changes from other devices.** Before, the flags were read from the server only on the first load, so unpublishing on device 1 never showed on device 2 until a full page reload. Now every refresh (the 60 s background refresh on the Dashboard and the Refresh buttons) adopts the server's `published` and `deleted_at` values.
   - **Local changes are never overwritten by an older answer.** A refresh result is ignored for a flag map if a change was made after the request started, or a save is still in flight (`adopt(next, since)` in `useOptimisticMap`). The next refresh then picks up the server state.
   - **Writes are serial.** `fetchInvitations`, `savePublished` and `saveDeleted` run through one in-order queue (`inOrder` in `api.ts`). Before, `savePublished` sent one request per row in parallel and two quick toggles overlapped, so the server could end in a different state than the screen. A failed task does not block the ones behind it. A list read is queued behind pending writes, so it always includes them.
   - **Bulk changes are one statement per value.** Ids going to the same value are sent as one `update … in("id", ids)` (split every 100 ids), so a bulk publish of 50 rows is 1 request and is all-or-nothing for that value. Trash writes are grouped by timestamp, restores by `null`. `knownPub` / `knownDel` move forward only for what the server accepted, so a retry sends only what is still missing.
   - **After a failed save** the screen goes back to the last saved state, shows the existing "undone" message, and then does a silent refresh so it shows what the server really holds (a bulk change could have been partly applied).
   - **Verified (ad hoc, throwaway scripts in `/tmp`, not saved in the repo):** `npm run typecheck` and `npm run build` pass. (a) `api.ts` against a fake Supabase client with random delays, 11 checks: bulk of 50 = 1 update; 10 rapid toggles ended in the last value and the writes alternated in order; a read queued behind a slow write saw it; a forced failure rejected, left the server unchanged, did not block the queue and a retry then applied; trash grouping gave 2 statements for 2 timestamps, 0 writes for no change and 1 statement (`null`) for a restore of 2 rows. (b) The hook with React 18 + jsdom and a fake data layer, 9 checks: first load; refresh picks up another device's unpublish and trash; a toggle made during a refresh is kept; a refresh that returns while a save is pending does not overwrite it; 10 rapid toggles leave UI equal to server; a failed save and a failed bulk save leave UI equal to server and show the message. **Not run in a browser or on real Supabase.**
2. **M-8 – the site address comes from an environment variable** (`vite.config.ts`, `index.html`, `.env.example`, `README.md`, `docs/SEO_SHORT_LINK_CHANGES.md`; `public/robots.txt` and `public/sitemap.xml` removed)
   - `index.html` now uses `%SITE_URL%` for `canonical`, `og:url`, `og:image` and `twitter:image`. A small Vite plugin fills it at build time and **generates** `robots.txt` (with the `Sitemap:` line) and `sitemap.xml` in the build output. The dev server serves them too.
   - Source of the address, in order: `SITE_URL`; on Vercel, `VERCEL_PROJECT_PRODUCTION_URL` (the production domain Vercel exposes). The value is reduced to scheme + host (`new URL(...).origin`), so a path, query or quote cannot get into an HTML attribute. `javascript:` values and the old `example.com` placeholder are rejected.
   - **If no usable address exists, the tags that need one are left out** (not guessed), no `sitemap.xml` is written, `robots.txt` has no `Sitemap:` line, and the production build prints a warning. A missing tag is better than a wrong canonical.
   - **Verified (ad hoc):** builds with `SITE_URL=schedy.in` (a test value only, not committed), with only `VERCEL_PROJECT_PRODUCTION_URL`, with nothing set, with `javascript:alert(1)`, with `https://example.com` and with `https://x.test/a"b?q=1` all gave the expected output (`https://x.test/` for the last). `npm run typecheck` passes.
   - **The real domain is not in the repo and was not guessed.** The owner must set `SITE_URL` in Vercel (see below).

**How this affects other tasks**

- **H-6 / M-1:** `knownPub` and `knownDel` are still module-level caches, now kept correct by the queue. M-1 (clear them on sign-out) is still open and still needed.
- **H-6 / M-5:** when invitations are paginated, the flag maps and the adopt logic must work per loaded page. Keep reading `published` and `deleted_at` from each returned row.
- **H-6 / H-4 / M-6:** the 60 s refresh now changes flags on screen, so a row can move to draft or trash while the person is looking at it. That is intended.
- **M-9:** `api/invite.js` should read the same `SITE_URL` instead of the `Host` header (one setting for both).
- **Hosting:** `public/robots.txt` and `public/sitemap.xml` no longer exist in the repo; do not add them back, or the generated ones will clash.
- **Known gap, not changed:** *Duplicate* in `Invitations.tsx` saves the copy first (published by default) and only then flips it to draft, so the copy is public for a moment. Fix it by saving with `published: false` in the same write. Not part of H-6's acceptance check.

**Behaviour changes to check**

- Another device's publish, unpublish, trash or restore now appears after the next refresh. A change you make while a refresh is running is not lost.
- A failed publish/trash shows the "undone" message and then the screen matches the server.
- With no `SITE_URL`, the page `<head>` has no canonical or `og:url`/`og:image`.

**Checks to repeat (for `[~]` → `[x]`)**

1. H-6, two devices: unpublish an invitation on device 1; on device 2 click Refresh (or wait 60 s on the Dashboard) → status updates without reloading. Do the same with trash and restore.
2. H-6, rapid toggles: click publish/unpublish 10 times quickly, wait 2 s, reload → UI and server (`select published from invitations where id = '…'`) show the same state.
3. H-6, bulk with a failure: select 50 invitations, temporarily break the write (for example turn on airplane mode in devtools → Network → Offline just before clicking Publish) → message "undone" and the list matches the database after you go back online and refresh. With the network on, bulk publish of 50 appears as one `PATCH` request in the Network tab.
4. M-8: set `SITE_URL=https://YOUR-DOMAIN` in Vercel for Production and Preview, redeploy, then `curl -s https://YOUR-DOMAIN/ | grep -E "canonical|og:"`, `curl -s https://YOUR-DOMAIN/robots.txt`, `curl -s https://YOUR-DOMAIN/sitemap.xml` → all show the real domain and no `example.com`.

**Next steps, in order**

1. Run the checks above and the earlier browser checks (C-2 `LivePreview`, H-1, M-13), then tick H-6, M-8, C-2, M-13.
2. Owner actions: set `SITE_URL` on Vercel; run the H-3 dashboard checks and `003_details_validation.sql`; **revoke the GitHub token that was pasted in chat (it was pasted again on 12 Nov and was used for this push; revoke it now)**; C-1 and C-3 in Supabase; enable GitHub secret scanning.
3. Deploy `preview`, list `Content-Security-Policy-Report-Only` violations, and enforce the strict CSP.
4. Next code items: **H-5** (enquiry insert hardening) and **M-9** (`api/invite.js` site URL and slug rule), which can reuse `SITE_URL`.

---

### 12 Nov 2026 (2nd update) – H-3 schema consolidation, M-11 `reset.sql`, README sign-up/admin step

**What was done**

1. **M-11 – the destructive reset is now a separate file** (new `supabase/reset.sql`, `supabase/schema.sql`)
   - The `drop … cascade` block moved out of `schema.sql` into `supabase/reset.sql`, which has a loud warning and the run order (`reset.sql` → `schema.sql` → `seed.sql`). `reset.sql` also drops the objects added by migrations `001` and `003` (`get_invitation_meta`, `is_safe_url`, `details_problem`, `details_is_valid`, `invitations_check_details`, the four `previews:` storage policies). It keeps `auth.users` and the `invitation-previews` bucket (Supabase does not allow deleting a bucket with SQL).
   - `schema.sql` no longer deletes anything: tables are `create table if not exists`, functions are `create or replace`, policies and triggers are dropped and recreated, the backfill uses `on conflict do nothing`. It is safe to run any number of times and keeps all data.
2. **H-3 – migrations folded into `schema.sql`** (`supabase/schema.sql`)
   - From `001`: `get_invitation_meta()`, the `invitation-previews` bucket and its four storage policies, and the slug format and reserved-word constraints. The constraints are added only when missing (a `do $$` block checking `pg_constraint`), so re-running the file on a project that already has them does not fail. Consequence: **changing the reserved-word list later needs a new migration** (or dropping the constraint by hand); editing the list in `schema.sql` alone will not update an existing database.
   - From `003`: `is_safe_url`, `details_problem`, `details_is_valid`, `invitations_check_details` and the trigger, unchanged.
   - **Not folded in on purpose: `002`.** It only rewrites old template rows, and `seed.sql` is already clean, so a fresh project does not need it.
   - Comments in `001`, `003`, `seed.sql` and `docs/SEO_SHORT_LINK_CHANGES.md` that said "do not run schema.sql, it drops every table" were corrected.
3. **README – sign-up and admin step** (`README.md`, "Set up Supabase")
   - Step 2 now explains `schema.sql` (safe to re-run), `reset.sql` (only for starting over) and what an existing project should run (the unapplied migrations in order).
   - Step 3 now starts with "turn off public sign-ups" (Authentication → Providers → Email), creating the admin by hand (Authentication → Users → Add user, auto-confirm), keeping Google off until the admin role exists, and a `curl` check against `/auth/v1/signup`. The check uses the API because the app has no sign-up form.
   - **Verified (ad hoc, throwaway scripts, not saved):** `npm ci`, `npm run typecheck`, `npm run build` all pass. SQL was run on a local Postgres 16 with stub `auth` and `storage` schemas. Fresh install of `schema.sql` + `seed.sql`; `schema.sql` run twice more with data kept; 23 behaviour cases pass (slug too short, bad characters, `login` and `DASHBOARD` reserved, duplicate slug ignoring case, `slug = id` allowed; `javascript:`, tab-obfuscated, `data:text/html`, bad phone, non-object and 21-event `details` rejected on insert and on update; a legacy bad row can still update `views` and be read through `get_public_invitation` but is re-checked when `details` changes; `get_invitation_meta` finds a slug ignoring case, returns null for a miss and does not count a view); `reset.sql` run twice leaves no tables, functions or storage policies, keeps `auth.users` and the bucket; `schema.sql` + `seed.sql` rebuild afterwards, the backfill creates a profile for the kept login and the signup trigger still creates one for a new login. **Not run on a real Supabase project.**

**How this affects other tasks**

- **H-3:** the `schema.sql` half is done. It stays `[~]` until it is run on a clean Supabase project and the acceptance check passes (below).
- **`schema.sql` is the source of truth from now on.** Every new migration (Track B's `005_client_edit.sql` in particular; `004` is now the enquiry hardening) must be folded into `schema.sql` in the same commit, or fresh projects will drift from live ones.
- **H-2:** the database rule now also ships with `schema.sql`, so a fresh project gets it. Existing projects still need `003` run once (dashboard action, unchanged).
- **C-1 / C-3:** unchanged and still open. They will be edits to `schema.sql` (admin role, column grants) plus a migration for live projects.
- **Behaviour change to check:** anyone who relied on `schema.sql` to wipe the database now has to run `reset.sql`. Running `schema.sql` on a live project no longer loses data.

**Dashboard checks to repeat (for H-3 `[~]` → `[x]`)**

1. On a new, empty Supabase project: run `schema.sql`, then `seed.sql`. Open `/<slug>` for a published invitation and `curl -sI https://YOUR-DOMAIN/<slug>` → header `x-invite-status: found`.
2. Create an invitation with a link preview image in the app → the upload succeeds and a file appears in Storage → `invitation-previews/<user id>/`.
3. Run `schema.sql` a second time on the same project → no error, data still there.
4. Sign-up check from the README: the `curl` against `/auth/v1/signup` returns `signup_disabled` once the dashboard toggle is off (this is part of C-1, not H-3).

**Next steps, in order**

1. Run the browser checks from the previous entry below, then tick C-2 (`LivePreview`) and M-13.
2. Run the H-3 dashboard checks above, then tick H-3. Run `003_details_validation.sql` on the live project and check it; then tick H-2.
3. Deploy `preview`, list `Content-Security-Policy-Report-Only` violations, and enforce the strict CSP.
4. Phase 1 app correctness: **H-6** (publish/trash sync), **M-8** (real domain in `index.html`, `robots.txt`, `sitemap.xml`).
5. Owner actions still open: C-1 and C-3 in Supabase, **revoke the GitHub token that was pasted in chat (it was pasted again on 12 Nov; this update pushed through the session's own repository connection and did not use it)**, enable GitHub secret scanning.

---

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
| [~] | C-1 | *(Sign-up switch is still a dashboard action; the database role is coded, see Phase 1.)* **Supabase dashboard:** disable public sign-ups (Auth → Providers → Email), and restrict or disable Google sign-in until the admin role exists. *Temporary: Track B re-opens sign-up only after B1 (admin role + least-privilege RLS) is live* | Supabase dashboard | A new email cannot register; Google login by a stranger is blocked |
| [~] | C-2 | Add `sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"` (no `allow-same-origin`) to the public invitation iframe. *Coded 11 Nov (see Progress log); needs the browser check below.* | `src/pages/PublicInvitation.tsx:37` | A template with `<script>localStorage.getItem(...)</script>` cannot read app storage |
| [~] | C-3 | *Coded and tested 12 Nov (5th update) in `schema.sql` and `005_admin_role.sql`; needs `005` run in Supabase.* Revoke self-update on profiles: `REVOKE UPDATE ON public.profiles FROM authenticated; GRANT UPDATE (name) ON public.profiles TO authenticated;` | `supabase/schema.sql` policy `profiles: self update` (line ~121) | Console call setting `plan_status='active'` is rejected |
| [~] | H-1 | *Coded 11 Nov, needs the browser check below.* Fix Create overwriting an existing invitation: add `key={location.search}` to the Create route, or read `edit` via `useSearchParams()` and re-run the load effect; treat a search change as navigation for the unsaved-changes blocker | `src/AdminApp.tsx:210`, `src/pages/Create.tsx:35` | Edit A → click sidebar "Create Invitation" → form is empty and Save creates a new row |

---

## Phase 1 – This sprint (~3–4 days)

### Authorization and data safety
- [~] **C-1** *Coded 12 Nov (5th update): `admins` table, `is_admin()`, admin-only policies on `templates`, `categories`, `enquiries`; migration `005_admin_role.sql`, tested on local Postgres. Still to do: run `005` in Supabase with your email in it, and the dashboard sign-up switch (Phase 0).* Add an `is_admin` flag (or role claim) and gate the `templates`, `categories`, `enquiries` policies on it. Keep the per-owner rule on `invitations`. (`schema.sql` lines ~101–116)
  - Verify: a second non-admin account cannot update a template, write a category, or read/update enquiries.
- [~] **C-2** `LivePreview`: remove `allow-same-origin`; update the frame via `postMessage` instead of morphdom on `contentDocument`. (`src/features/create/components/LivePreview.tsx`) *Coded 12 Nov: sandbox is now `allow-scripts allow-popups allow-popups-to-escape-sandbox`; updates and scroll-to-field go through `postMessage` (see Progress log). Bridge tested in jsdom only; needs the browser check below.*
- [~] **C-2** Add a Content-Security-Policy header in `vercel.json`. *Partly done (11 Nov): `object-src 'none'; frame-ancestors 'none'` is enforced; the strict policy runs as `Content-Security-Policy-Report-Only`. To finish: review console violations on the `preview` deployment, then enforce it (see Progress log).*
- [~] **H-2** Enforce URL, phone, length and type rules for `details` in the database (trigger or `check`). *Written 12 Nov as `supabase/migrations/003_details_validation.sql` and tested on a local Postgres 16 (20 cases). Still to do: run it in the Supabase SQL Editor (dashboard action) and fold it into `schema.sql` with H-3.*
- [x] **H-2** In `compile()`, allow-list protocols (http, https, tel, mailto) on `href`/`src`-like attributes and strip `on*` handler attributes from templates. (`src/lib/compileInvitation.ts`) *Done 11 Nov, verified with 16 automated checks (see Progress log). The database rule in the line above is still open.*
  - Verify: `venueMaps = javascript:alert(1)` and a name containing `"><script>` render as inert text.
- [~] **H-5** *Database half coded 12 Nov (4th update) as `supabase/migrations/004_enquiry_hardening.sql` and in `schema.sql`: column grants (only `name`, `phone`, `email`, `message`), insert policy, trigger with length/format checks and a per-phone/email limit of 5 per hour; tested on local Postgres 16 (34 cases). Still open: Edge Function / route with captcha and per-IP rate limit; run `004` in Supabase (see Progress log).* Harden enquiry inserts: route through an Edge Function with captcha and rate limit, add `check (char_length(message) <= 2000)`, and restrict insertable columns (`note`, `history`, `follow_up_date`, `status`). (`schema.sql` line ~112)
  - Verify: anon insert with `note`, 1 MB `message`, or `status='called'` is rejected.

### Setup and schema
- [~] **H-3** Fold migrations `001` and `002` into `schema.sql` (or adopt Supabase CLI migrations): `get_invitation_meta()`, the `invitation-previews` bucket and policies, slug format and reserved-word constraints.
  - Verify: on a clean project, `x-invite-status: found` and preview image upload both work.
  - *Coded 12 Nov: `schema.sql` now contains `001` and `003` (`002` is a one-off data fix and is not needed on a new project). Tested on local Postgres 16 with stubbed `auth`/`storage` schemas (fresh install, re-run, 23 behaviour cases). Still to do: run it on a clean Supabase project and pass the check above (see Progress log).*
- [x] **M-11** Move the `drop table … cascade` block (`schema.sql` lines 12–16) into a separate explicit `reset.sql`; make `schema.sql` idempotent. Update the README warning in "Set up Supabase". *Done 12 Nov: `supabase/reset.sql` added; `schema.sql` can be re-run without data loss (checked twice on local Postgres); README step 2 rewritten.*
- [x] **README** Add "disable public sign-ups" and the admin-user setup step to Set up Supabase step 3. *Done 12 Nov (`README.md`, step 3, with a `curl` check). This documents C-1; the Supabase toggle itself is still a dashboard action.*

### App correctness
- [~] **H-6** *Coded 12 Nov (3rd update); tested with a fake Supabase client and a jsdom hook test, not yet in a browser or on real Supabase; see Progress log.* Take `pub`/`deleted` flags from each refreshed row, not only on first load; send publish/trash writes serially or as one batch RPC and reconcile with the server response. (`src/features/dashboard/hooks/useInvitationStore.ts`, `src/lib/api.ts`)
  - Verify: unpublish on device 1, refresh on device 2 → status updates; rapid publish/unpublish ×10 ends in the same state on server and UI; bulk publish of 50 rows with one forced failure leaves UI and server in agreement.
- [~] **M-8** *Coded 12 Nov (3rd update): `%SITE_URL%` in `index.html`, generated `robots.txt` and `sitemap.xml`, address from `SITE_URL`; still needs `SITE_URL` set on Vercel and the curl check in the Progress log.* Replace `https://example.com` with the real domain in `index.html` (lines 18, 27, 28, 38), `public/robots.txt`, `public/sitemap.xml`; inject at build time from an env var.
- [~] **M-12** `git rm --cached .env.local`; keep only `.env.example`; enable GitHub secret scanning. *Untracked 11 Nov. Still open: enable secret scanning (GitHub setting); the file remains in git history (it holds only `VITE_` values, which ship in the browser bundle anyway, but rotate the Supabase key if it ever held anything private).*

---

## Phase 2 – Next sprint (~1 week)

- [ ] **H-4** Separate view counting from `get_public_invitation` (rate-limited or deduped per visitor); return only fields the template needs; add Vercel/Supabase rate limiting; consider longer random default slugs.
- [~] **M-5** *Data layer coded 12 Nov (8th update): `fetchInvitations` and `fetchEnquiries` read in pages of 500 (past the 1,000-row cap), with an `id` tie-break, explicit column lists (`INVITATION_COLUMNS`, `ENQUIRY_COLUMNS`), tested with a fake client (18 checks). Still open: a "load more" UI and server-side search/filter/sort, which the lists still do in the browser.* Server-side pagination for invitations and enquiries; select only needed columns instead of `select("*")`. (`src/lib/api.ts`)
- [ ] **M-4** Storage: bucket limits (≤300 KB, `image/jpeg`); delete the object when an invitation is purged or deleted; scheduled job to clean orphans; restrict `seoImage` to the app's own bucket.
- [~] **M-3** *Coded 12 Nov (7th update): `src/lib/qr.ts` + `useQr` draw the QR in the browser with the `qrcode` package (loaded only when a QR dialog opens); `api.qrserver.com` is gone from `src`. The generated PNG was decoded back to the exact link in a test; needs the browser check in the Progress log.* Generate QR codes client-side with a small library and remove `api.qrserver.com`. (`QrModal.tsx:18`, `ShareModal.tsx:35`)
- [~] **M-1** *Coded 12 Nov (6th update): `watchAuthChanges` (Supabase `onAuthStateChange`), `signOut()` that waits for Supabase, `resetUserData()` clears create drafts and the `knownPub`/`knownDel` caches, login form locked until sign-out finishes. Tested with a fake Supabase client and jsdom (36 checks); not yet run in a browser or on real Supabase; see Progress log.* Session hygiene: subscribe to `onAuthStateChange` (no usage exists today); on sign-out clear create-form drafts and module caches (`knownPub`/`knownDel`) and call `signOut` before navigating.
- [~] **M-6** *Coded 12 Nov (6th update): the shell owns the new-enquiry count (`useEnquiryBadge`, server-side count every 60 s and on tab focus), the Dashboard reports into it, the bell dot shows only when the count is above 0, and the Dashboard list refreshes every 60 s without overwriting local edits. Tested with a fake client and jsdom; needs the browser check in the Progress log.* Wire `onEnquiryCountChange` from `AdminApp` to the sidebar badge (currently passed by `Dashboard` but never supplied); refresh enquiries by polling or Realtime.
- [~] **M-7** *Coded 12 Nov (7th update), all four parts: Google button reset on `pageshow` (bfcache), return page kept through the Google redirect, no client password-length check on sign-in, working "Forgot password" with a set-new-password form. Tested with the real `Login` component in jsdom and a fake client; needs a real reset email and the Supabase redirect URL (see Progress log).* Login: reset the Google button's busy state on `pageshow`; persist `from` in `redirectTo`; drop the client password-length check on login; implement "Forgot password". (`src/lib/auth.ts:48–52`, `Login.tsx`)
- [~] **M-13** Default to `trial` (or show an explicit error) when the profile row is missing. (`src/lib/api.ts:33`) *Coded 12 Nov: missing row or null `plan_status` → `trial` with 0 days left, role label `Member` instead of `Administrator`. Checked by build/typecheck and code reading only.*
- [~] **M-9** *Coded 12 Nov (4th update): site URL from `SITE_URL` through `api/_siteUrl.js` (no `Host` header), slug rule 3–30 or uuid, stub link only for valid slugs. Tested with a mock handler (19 checks); needs the curl check on a deployment (see Progress log).* `api/invite.js`: take the site URL from an env var instead of `Host`/`X-Forwarded-Host`; render the stub link only for valid slugs; align `SLUG_RE` (1–64) with the DB rule (3–30).
- [x] **M-10** Template compiler: use `Object.create(null)` or a `Map` for values; strip only known placeholder syntax instead of every `{{…}}`; fix `PreviewPanel` fallback to the non-existent `tpl.html`. *Done 12 Nov (8th update): null-prototype values, `stripLeftoverSyntax()` on the parsed document, the `tpl.html` fallback removed in three places; 18 jsdom checks pass (see Progress log). Not run in a browser.*
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

## B2. Database (new migration, e.g. `supabase/migrations/006_client_edit.sql`; also fold into `schema.sql` per H-3)

- [~] **Admin role** *(done early as part of C-1: `admins` table and `is_admin()` exist from `005_admin_role.sql`; B1 only needs to reuse them and seed nothing new)*: `create table admins (user_id uuid primary key references auth.users, email citext unique, created_at)`; `create function is_admin() returns boolean security definer` (stable, `search_path` pinned). Seed with the admin email. *(This is the C-1 fix, reused here.)*
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
- [~] **Session:** `onAuthStateChange` is coded (M-1, 6th update; needs the browser check). Still to do for Track B: scope the draft key per user. Original note: implement `onAuthStateChange` (M-1) first, since client accounts are on shared devices more often; clear drafts and caches on sign-out.
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
