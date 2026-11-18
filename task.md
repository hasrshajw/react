# Task plan: complete the Create form (family, closing names, venues, events)

Branch: `preview` · Plan written: 18 Nov 2026 · Status: **T0 to T3 done, next task is T4** (T5, T6 and T7 are independent and can go in any order)

This file replaces the old status page (it is still in git history). It is written so that **any person or AI can pick up
the work at any point**. Read sections 1 to 4 first, then do the next task whose status is `TODO`.

---

## 1. Goal

The Create form (`src/features/create/`) is missing fields that real (Telugu) wedding invitations need. This plan adds them
in small, separately shippable tasks. **Nothing may break existing invitations**: every new field is optional and has a
default that renders exactly what is rendered today.

Missing items, in plain words:

1. A parent can be **late (deceased)**, or should not be shown at all. Today the text always prints "శ్రీ" / "శ్రీమతి".
2. The closing block (after "ఇట్లు") has only 5 fixed choices and **one** custom name. It needs a **closing title**
   (ఇట్లు / ఆహ్వానించువారు / With Best Compliments / custom), a choice of **which people appear** (groom, bride, parents,
   families, all) and **several custom names**.
3. Only one shared **family surname**. Groom and bride families often have different house names (ఇంటి పేరు). No gotram.
4. No **birth order** ("second son", "youngest daughter") and no honorific (చి|| / చి.ల.సౌ||).
5. No **siblings / grandparents / maternal uncle** list.
6. **Wedding venue and reception venue are the same field.** The reception cannot be in a different hall.
7. Only **2 extra events** and no event type, end time or description.
8. Only **1 extra contact** per side.

## 2. How the app works (what you must know before editing)

- Form state: one reducer, `src/features/create/formReducer.ts` (actions `field`, `addItem`, `patchItem`, `removeItem`, `load`...).
- The whole form is saved as JSON in the `details` column of `public.invitations`. `clientEmail` is the only form key that is
  NOT stored inside `details`.
- The invitation page is made by `compile(source, data)` in `src/lib/compileInvitation.ts`. A template is plain HTML with
  `{{key}}` placeholders and `{{#if key}} ... {{/if}}` blocks. The placeholder map is built in `valuesFor()`. A key missing
  from a template is simply ignored, so **old templates keep working** when new keys are added.
- Keys in `valuesFor()` use dashes (`groom-father-te`); a `{{groom_father_te}}` with underscores is also accepted.
- Telugu text for the "ఇట్లు" block is built in `src/lib/inviteText.ts` (`inviterLinesTe`, `inviteMessageTe`).
- The reference template is `docs/templates/telugu-traditional.html` (the live copy of a template is edited in the admin
  app and stored in `public.templates.html_code`; see "Owner steps" in each task).
- The database re-checks every saved `details` object in `public.details_problem()` (in `supabase/01_schema.sql`): text keys
  <= 1000 chars, lists <= 20 items, phones 10 to 13 digits, URLs on an allow-list, whole object <= 64 KB.
- Clients (`/my`) can only change keys listed in `allowed` inside `public.submit_change_request()`. **A new key that is not
  in that list is silently dropped for client edits.**
- Old saved invitations are merged with defaults when loaded (`...initial` in `src/pages/Create.tsx` and
  `src/features/client/invitationToForm.ts`), so a new key only needs a default in `initial`.

## 3. The "add a field" checklist (use it in EVERY task)

For each new form key, touch all of these, or the field will work in the editor and fail somewhere else:

| # | Where | What |
|---|---|---|
| 1 | `src/types/invitation.ts` | add the key to `InvitationData` (and to `EventItem` / `ContactItem` for list items) |
| 2 | `src/features/create/constants.ts` | default in `initial`; add to `EN_TO_TE` if it is an English field with an auto Telugu twin; add to `TARGETS` so the live preview scrolls to it |
| 3 | `src/features/create/CreateForm.tsx` (+ `components/`) | the input; use `fp(name)` / `fpx()` so focus, blur and errors work; keep every control inside the existing `loading` ghost pattern |
| 4 | `src/lib/compileInvitation.ts` | add the placeholder(s) to `valuesFor()` |
| 5 | `docs/templates/telugu-traditional.html` | use the placeholder (wrap optional parts in `{{#if key}}`) |
| 6 | `src/lib/validate.ts` (+ `validate.test.ts`) | format rules and error messages; error `section` must be a valid `SectionId` |
| 7 | `src/features/reviews/fieldLabels.ts` (+ test) | human label for the review diff |
| 8 | `supabase/01_schema.sql` -> `details_problem()` | add to `text_keys` (or a new boolean / list branch) and its sub-keys |
| 9 | `supabase/01_schema.sql` -> `submit_change_request()` | add to `allowed` |
| 10 | `tools/db-test/tests.sql` | a case that accepts a good value and rejects a bad one |
| 11 | tests | `CreateForm.test.tsx`, `formReducer.test.ts`, `inviteText.test.ts`, `teluguTemplate.test.ts` as relevant |
| 12 | this file | fill in the task's "Completion record" |

Database changes: edit `supabase/01_schema.sql` (source of truth, all functions are `create or replace`, so re-running is
safe) AND put only the changed blocks in a new file `supabase/updates/NN_<task-id>.sql` so the owner can run just that on
the live project. State the file name in the completion record.

## 4. Rules for whoever does a task

1. Do tasks **in order** unless the task says it is independent. One task = one commit (or a small series) pushed to `preview`.
2. Start by running the baseline (T0). If it is red, stop and fix or report; do not stack work on a red tree.
3. **Backward compatible**: defaults must reproduce today's output. Add a test that proves an old record (without the new
   keys) compiles to the same HTML as before.
4. Do not rename or remove existing keys (`inviterMode`, `surnameEn`...). Add new keys beside them.
5. English UI labels, Telugu labels where a Telugu twin exists. No new dependencies unless unavoidable.
6. After the task: run `npm run typecheck && npm run lint && npm test && npm run build`. Run `npm run test:db` when SQL changed
   (needs PostgreSQL 14+ binaries; if not available, say so in the record, do not claim it passed).
7. **Update this file before you push** (see the template below). Never leave a task as `DONE` with an empty record.
8. Never paste tokens, keys or passwords into this file, commits or chat. If one was shared, tell the owner to revoke it.

### Completion record template (copy under the task you finish)

```
Status: DONE | PARTIAL | BLOCKED
Finished: <date> by <person / AI name>   Commit(s): <short hashes>
How it was updated:
  - <file>: <what changed and why, one line each>
Tests: typecheck <ok/fail> · lint <ok/fail> · unit <N passed> · build <ok/fail> · db tests <ok / not run + why>
Behaviour check done: <what was tried by hand or in a test>
Pending / not done: <anything left, with the reason>
Owner steps (live project): <SQL file to run, template to re-paste, Vercel setting, or "none">
Notes for the next person: <gotchas, decisions, things that surprised you>
```

## 5. Task list and status

| ID | Task | Depends on | Touches DB? | Status |
|---|---|---|---|---|
| T0 | Baseline check (no code) | none | no | DONE |
| T1 | Parent status: alive / late / hidden | T0 | yes | DONE |
| T2 | Closing title, who-appears selector, custom names | T1 | yes | DONE |
| T3 | Separate house names, gotram, honorific | T0 | yes | DONE |
| T4 | Birth order and the "son / daughter of" line | T3 | yes | TODO |
| T5 | Separate reception venue | T0 | yes | TODO |
| T6 | More events, event types, end time, description | T0 | yes | TODO |
| T7 | More contacts per side, contact role | T0 | yes | TODO |
| T8 | Family members list (siblings, grandparents, uncle) | T1, T4 | yes | TODO |
| T9 | Cross-field validation, progress tags, docs, final pass | T1 to T8 | maybe | TODO |

T3, T5, T6 and T7 are independent of each other and can be done in any order after T0. T1 -> T2 is the user's first
priority (closing names). Backlog (do NOT start) is in section 7.

---

## T0. Baseline check (no code)

**Goal:** know the tree is green before changing anything, so later failures are attributable.

**Steps**
1. `npm ci` then `npm run typecheck`, `npm run lint:install && npm run lint`, `npm test`, `npm run build`.
2. If PostgreSQL 14+ is installed: `npm run test:db`.
3. Record the numbers (test count, which commands ran) in the record below. The previous status page said 645 tests
   passed; confirm or update that number.
4. Read `src/features/create/CreateForm.tsx`, `src/lib/compileInvitation.ts`, `src/lib/inviteText.ts` and
   `supabase/01_schema.sql` lines 355 to 460 (`details_problem`) and 640 to 700 (`submit_change_request`).

**Acceptance:** record filled in; commit only this file.

**Completion record**
```
Status: DONE
Finished: 18 Nov 2026 by Claude   Commit(s): see git log for the commit that touches only task.md
How it was updated:
  - task.md: status table row T0 set to DONE, this record, handoff log line. No application code, SQL or tests were changed.
Environment used: Node v22.23.5, npm 10.9.9, PostgreSQL 16 (installed with apt-get in the working container; CI installs it
  the same way in .github/workflows/ci.yml). Branch `preview` at 6fe4f28 (the plan commit) on top of 24012f9.
Tests (baseline numbers, use these to spot regressions later):
  - npm ci: ok (165 packages)
  - npm run typecheck: ok, 0 errors
  - npm run lint (after npm run lint:install): ok, 0 errors, 2 warnings that already exist and are NOT part of this plan:
      src/ClientApp.tsx 229:6   react-hooks/exhaustive-deps (missing dependency 'draftKey')
      src/pages/Invitations.tsx 61:68  react-hooks/exhaustive-deps (missing 'selecting', 'selection')
  - npm test: 50 test files, 690 tests passed, 0 failed (about 61 s). The old status page said 645; it was out of date.
  - npm run build: ok (tsc + vite build, about 7 s). Largest chunk index-*.js 316 kB (103 kB gzip).
  - npm run test:db: 233 passed, 0 failed (runs the real supabase/01_schema.sql + 02_seed_templates.sql in a throwaway PostgreSQL).
  - npm run test:e2e: not run (needs a deployed preview URL and Playwright browsers; not required for T1 to T9 unless a task says so).
Behaviour check done: read the files named in the T0 steps (CreateForm.tsx, compileInvitation.ts, inviteText.ts, details_problem and
  submit_change_request in 01_schema.sql). Facts confirmed while reading, which later tasks rely on:
  - Old saved invitations are merged with defaults via `...initial` (src/pages/Create.tsx and src/features/client/invitationToForm.ts).
  - Events are limited by `data.events.length < 2` in CreateForm.tsx and by `[0,1].forEach` in compileInvitation.ts.
  - Contacts are limited by `items.length < 1` in components/Contacts.tsx and valuesFor() reads only index 0.
  - The inviter block prints at most 4 lines (inviter-line-1..4-te) and the template uses exactly those four placeholders.
  - details_problem() has a text branch, a boolean branch (receptionEnabled only) and an object-list branch; there is no array-of-strings branch.
  - The repo has no supabase/updates/ folder yet; the first task that changes SQL (T1) must create it.
Pending / not done: nothing for T0. The two lint warnings are left alone on purpose (outside this plan).
Owner steps (live project): none.
Notes for the next person:
  - Start T1 from a clean `git pull` of preview. If any baseline number above changes before you start, note why.
  - `npm run test:db` as root needs a `postgres` OS user; installing the `postgresql` apt package creates it.
  - Never paste a GitHub token into chat or files. Push with your own credentials.
```

---

## T1. Parent status: alive / late / hidden

**Goal:** each of the four parents can be marked Alive, Late (deceased) or Hidden. The invitation prints the right Telugu
prefix, and hides the phone number of a late or hidden parent.

**Data model (new keys, all text, default `""` meaning alive)**
- `groomFatherStatus`, `groomMotherStatus`, `brideFatherStatus`, `brideMotherStatus` : `"" | "late" | "hidden"`.

**UI (`CreateForm.tsx`, groom and bride sections)**
- Under each parent's name, a small 3-option segmented control (reuse the `seg` / `role="radio"` pattern from
  `InviteSection.tsx`): Alive, Late, Hide.
- When Late: keep the name inputs, disable the phone input and show the hint "Phone is not shown for a late parent".
- When Hide: grey out the name and phone inputs (values are kept, so switching back loses nothing).
- Optional (same task if small): a Telugu / English title override per parent is NOT part of this task (see T2 prefixes).

**Logic**
- `src/lib/inviteText.ts` `parents()`: take the statuses. Alive: `శ్రీ X` / `శ్రీమతి Y` (unchanged). Late: `కీ.శే. X` /
  `కీ.శే. Y` (keep the exact prefix in one constant so it is easy to change). Hidden: skipped.
- If every parent line is skipped, fall back to the person's own name (the current behaviour of `parents()`).
- `compileInvitation.ts` `valuesFor()`: add `groom-father-status`, ... (value `"late"` or `""`) and make
  `groom-father-phone` (and the `-wa` link) empty when the status is late or hidden. Add `{{#if groom-father-late}}` style
  keys: `groom-father-late`, `groom-mother-late`, `bride-father-late`, `bride-mother-late` = `"1"` when late, so a template
  can print "(Late)" if it wants.
- Template: where a parent name is printed, add the late marker with `{{#if ...-late}}`.

**Other touch points:** checklist rows 1 to 12. SQL: add the four keys to `text_keys` and `allowed`; optionally enforce
`'' | 'late' | 'hidden'` in `details_problem`.

**Tests**
- `inviteText.test.ts`: alive / late / hidden for each mode (`surname`, `groom`, `bride`, `both`, `custom`).
- `teluguTemplate.test.ts`: phone is not rendered for late; old record without the keys is unchanged.
- `CreateForm.test.tsx`: switching to Late disables the phone input.
- `tools/db-test/tests.sql`: `'late'` accepted, a number rejected as text type.

**Acceptance:** an old invitation renders byte-for-byte as before; a late father shows `కీ.శే.` and no phone.

**Owner steps:** run `supabase/updates/01_T1_parent_status.sql`; re-paste the updated template if the late marker is used.

**Completion record**
```
Status: DONE
Finished: 18 Nov 2026 by Claude   Commit(s): 4816c19 (code, SQL, tests); this record is in the commit after it
How it was updated:
  - src/types/invitation.ts: new type `ParentStatus` ("" | "late" | "hidden"); four new keys groomFatherStatus, groomMotherStatus,
      brideFatherStatus, brideMotherStatus on InvitationData.
  - src/features/create/constants.ts: defaults "" in `initial` (so old invitations load as alive); TARGETS map each status key to that
      parent's name element so the live preview scrolls to it. EN_TO_TE not needed (no text twin).
  - src/lib/inviteText.ts: new exports PREFIX_FATHER_TE / PREFIX_MOTHER_TE / PREFIX_LATE_TE ("కీ.శే."), parentStatus() (unknown value ->
      alive) and parentPrefixTe(role, status). parents() now takes the two statuses: late -> "కీ.శే. <name>" for father AND mother
      (no శ్రీ / శ్రీమతి added), hidden -> skipped, and when no parent line is left the person's own name is used (unchanged rule).
  - src/lib/compileInvitation.ts valuesFor(): for each of groom-father, groom-mother, bride-father, bride-mother:
      hidden -> `-en` and `-te` are empty; late or hidden -> `-phone` and `-wa` are empty; new `-late` ("1" or "") and `-prefix-te`
      ("శ్రీ" / "శ్రీమతి" / "కీ.శే."). Because the existing template wraps the name lines and phone cards in {{#if ...-te}} and
      {{#if ...-phone}}, they disappear by themselves.
  - docs/templates/telugu-traditional.html: the four "గారి ఆత్మీయ కుమారుడు / కుమార్తె" lines (252, 253, 262, 263) use
      {{...-prefix-te}} instead of the fixed శ్రీ / శ్రీమతి. Nothing else in the template changed.
  - src/features/create/components/ParentStatus.tsx (new): Alive / Late / Hide radio buttons (same `seg wrap` look as the
      "Who is inviting" control), with a hint line for Late and Hide; buttons are disabled while the section is loading.
  - src/features/create/components/Field.tsx and Bilingual.tsx: new optional `disabled` prop (greyed, value kept; different from
      `loading`, which shows a ghost).
  - src/features/create/CreateForm.tsx: a ParentStatus control above each of the four parents; Late disables that parent's phone;
      Hide disables that parent's names and phone.
  - src/lib/validate.ts: the phone format check is skipped for a late or hidden parent (it is not shown, and the database rule matches).
  - src/features/reviews/fieldLabels.ts: labels for the four keys.
  - supabase/01_schema.sql: details_problem() has the four keys in text_keys, a `status_keys` check (only '', 'late', 'hidden'), and the
      phone check is skipped when that parent's status is not empty; submit_change_request() has the four keys in `allowed`.
  - supabase/updates/01_T1_parent_status.sql (new folder and file): only those two functions, for the live project.
  - tools/db-test/tests.sql: 7 new checks (bad status text, non-text status, late/hidden/alive accepted, phone of late and hidden
      parent not checked, phone of a living parent still checked, client submit of a bad status is refused with 23514, which proves
      the key is on the allowed list).
Tests: typecheck ok · lint ok (0 errors, the same 2 old warnings) · unit 709 passed (was 690, +19: inviteText 6, validate 3,
  teluguTemplate 4, CreateForm 6) · build ok · db tests 240 passed (was 233, +7). The update file was also checked: the OLD schema
  (from git before this task) + supabase/updates/01_T1_parent_status.sql passes the same 240 checks.
Behaviour check done: by tests only (jsdom form, compiled template, SQL). Not clicked in a real browser.
Pending / not done:
  - Review screen (admin diff of a client's change request): a status that goes from alive to late shows "—" -> "late", because
      formatDiffValue() has no per-key wording ("" is shown as "—"). Cosmetic; could map "" to "Alive" for the four status keys.
  - No separate "(Late)" text in the template. The prefix "కీ.శే." already marks it; the `-late` placeholders exist if a template
      wants more.
  - The custom closing name and other templates (the two seed templates in 02_seed_templates.sql) do not print parents, so they
      were not changed.
  - Client area (/my) uses the same CreateForm in client mode, so the control is there; it was not tried in a browser.
Owner steps (live project):
  1. Supabase SQL editor: run supabase/updates/01_T1_parent_status.sql (safe to re-run; no table or data changes).
  2. Admin > Templates: re-paste docs/templates/telugu-traditional.html into the Telugu template (needed for the "కీ.శే." prefix in
      the parentage lines). Without this step everything still works, but a late parent would print with శ్రీ / శ్రీమతి there.
  3. Deploy `preview` and try: set a father to Late, a mother to Hide, check the preview and the public page.
Notes for the next person (T2 and later):
  - Reuse parentStatus() and parentPrefixTe() from inviteText.ts; do not repeat the "కీ.శే." text anywhere else.
  - T2 must keep using parents()-style logic for the "groom side / bride side" sources so late and hidden parents stay correct there.
  - Hidden parents have blank `-en` / `-te` placeholders in valuesFor(), so any new template line that uses them needs no extra if.
  - The status keys are plain text on purpose: details_problem() has no array branch, and text keys are already covered by the
      1000-character and 64 KB rules.
  - `set` in CreateForm is generic over the InvitationData key, so `set("groomFatherStatus", "late")` is type checked.
  - Push credentials: the tooling here has no stored login; do not paste tokens into chat.
```

---

## T2. Closing title, who-appears selector, custom names

**Goal (the user's request):** the block after the invitation message has a **title** (complimentary / closing title), a choice
of **which people appear**, and **any number of custom names**. Bride, groom, or all can be selected.

**Data model (new keys; `inviterMode` stays as the legacy fallback)**
- `closingTitleMode` : `"" | "itlu" | "aahvaninchuvaaru" | "compliments" | "invitedBy" | "regards" | "custom" | "none"`. `""` = today's behaviour (prints "ఇట్లు").
- `closingTitleEn`, `closingTitleTe` : custom title text (only read when mode is `custom`).
- `inviterSources` : comma-separated ids from
  `groom,groomFather,groomMother,bride,brideFather,brideMother,groomFamily,brideFamily,surname`.
  Empty string = fall back to `inviterMode` (today's behaviour). Stored as text on purpose, so `details_problem()` needs no
  new array branch. Validate the ids in TS and in SQL with a regex.
- `inviterNames` : list of `{ id, prefix, nameEn, nameTe, relationEn, relationTe }`. `prefix` is one of
  `"" | "sri" | "smt" | "chi" | "late" | "dr"`.

**UI (`components/InviteSection.tsx`, section id stays `message`)**
1. "Closing title" dropdown with the presets above plus "Custom" (shows EN and TE inputs) and "Hide title".
2. "Who is inviting" becomes a checklist of the nine sources with three quick buttons: **Groom side**, **Bride side**,
   **All**. The existing 5-button control stays working: choosing "Groom's family" ticks `groomFather`+`groomMother`, etc.
   When the legacy value is loaded and `inviterSources` is empty, show the matching boxes ticked (do not write them back
   until the user changes something, so untouched invitations are not marked as edited).
3. "Custom names": repeatable rows (copy the `repeat` / `del` / Add button pattern used by events). Each row: prefix
   dropdown, Name EN, Name తెలుగు (auto-transliterated using `EN_TO_TE`-style behaviour: see `useTransliteration.ts`), optional
   relation (EN and TE), delete. Max 8 rows. Up / down buttons to reorder.
4. A one-line preview of the final lines under the controls.

**Logic**
- `inviteText.ts`: new `closingTitleTe(d)` and an extended `inviterLinesTe(d)`:
  1. resolve sources (new `inviterSources`, else legacy `inviterMode`);
  2. build lines in a fixed order (groom side, then bride side, then custom names);
  3. apply T1 status to parent lines; apply `prefix` to custom names (`sri` -> `శ్రీ`, `smt` -> `శ్రీమతి`, `chi` -> `చి||`,
     `late` -> `కీ.శే.`, `dr` -> `డాక్టర్`); append the relation on the same line;
  4. no hard cap of 4 any more: cap at 10 and let the template wrap.
- `compileInvitation.ts`: add `inviter-title-te`, `inviter-title-en`, and `inviter-line-5-te` to `inviter-line-10-te`
  (keep 1 to 4 and `inviter-te` as they are). Add `inviter-title-visible` = `"1"` unless mode is `none`.
- Template: print the title from `{{inviter-title-te}}` (fallback text "ఇట్లు" when empty), and lines 1 to 10, each wrapped in
  `{{#if inviter-line-N-te}}`.

**Other touch points:** checklist rows 1 to 12. SQL: `text_keys` gets `closingTitleMode`, `closingTitleEn`, `closingTitleTe`,
`inviterSources`; `list_keys` gets `inviterNames`; `sub_text` gets `prefix`, `relationEn`, `relationTe` (`id`, `nameEn`,
`nameTe` already exist); `allowed` gets all four text keys and `inviterNames`. Add `'inviterNames'` to `ListField` in the
types and to the reducer (the reducer already handles any `ListField`).

**Tests:** legacy invitations unchanged; each preset; every source combination; custom names with each prefix; late parent
plus custom names; 10-line cap; SQL accepts good, rejects a bad source id and a 21-item list.

**Acceptance:** a user can choose title "With Best Compliments", tick Groom side only, add two custom names with relations,
and the preview shows exactly that; an invitation saved before this task looks unchanged.

**Owner steps:** run `supabase/updates/02_T2_closing_names.sql`; re-paste the updated template into the live template.

**Completion record**
```
Status: DONE
Finished: 18 Nov 2026 by Claude   Commit(s): 7600db5 (code, SQL, tests); this record is in the commit after it
How it was updated:
  - src/types/invitation.ts: new `InviterName` ({ id, prefix, nameEn, nameTe, relationEn, relationTe }); shared `ListItem` and `ListPatch`
      types (so one add / patch signature serves every list); `ListField` gets "inviterNames"; five new keys on InvitationData:
      closingTitleMode, closingTitleEn, closingTitleTe, inviterSources, inviterNames.
  - src/lib/inviteText.ts: CLOSING_TITLES (the five presets, Telugu and English wording in ONE place), closingTitleMode/Te/En();
      INVITER_SOURCES + labels, effectiveSources() (new list, else the old inviterMode), parse / serialize / okSources(), SOURCES_NONE ("none"),
      INVITER_PREFIXES (sri, smt, chi, late, dr), MAX_CLOSING_LINES (10), MAX_INVITER_NAMES (8). inviterLinesTe() was rewritten: surname line,
      then groom's side, then bride's side, then the old custom line, then the custom names; it uses the T1 helpers (parents(), parentPrefixTe,
      parentStatus), drops repeated lines and caps at 10.
  - src/lib/compileInvitation.ts: valuesFor() computes the lines once and adds inviter-title-te, inviter-title-en, inviter-title-visible ("1"
      unless the title is hidden) and inviter-line-1-te to inviter-line-10-te (1 to 4 and inviter-te are kept).
  - docs/templates/telugu-traditional.html: the fixed "ఇట్లు" is now {{inviter-title-te}} inside {{#if inviter-title-visible}}; lines 1 to 4 are
      unchanged (empty ones are hidden by the template CSS as before); lines 5 to 10 are new, each inside {{#if inviter-line-N-te}}.
  - src/features/create/components/InviteSection.tsx (rewritten): closing-title dropdown (+ custom EN / TE boxes, + Hide), the old five buttons
      (kept), quick buttons Groom side / Bride side / All / Nobody, a checklist of the nine people, repeatable custom-name rows (prefix list,
      name EN / తెలుగు, relation EN / తెలుగు, delete, Up / Down, max 8) and a one-line preview.
  - src/features/create/constants.ts: defaults in `initial`, newInviterName(), MAX_INVITER_NAMES re-export, TARGETS for the five keys,
      EN_TO_TE closingTitleEn -> closingTitleTe.
  - src/features/create/CreateForm.tsx, src/pages/Create.tsx, src/ClientApp.tsx, src/features/create/formReducer.ts: list types widened to
      ListItem / ListPatch; InviteSection gets add / patch / remove / fpx; patch() in Create.tsx and ClientApp.tsx now also auto-fills the Telugu
      name and relation of a custom name while typing English (same schedule() mechanism as events).
  - src/features/client/invitationToForm.ts: inviterNames is read through list() so a damaged value becomes [].
  - src/lib/validate.ts: unknown id in inviterSources, an unknown prefix and more than 8 names give an error in the "message" section.
  - src/features/reviews/fieldLabels.ts: labels for the five keys.
  - supabase/01_schema.sql: details_problem() has the four text keys in text_keys, a closingTitleMode check (known presets only), an
      inviterSources regex ('', 'none', or known ids separated by commas), inviterNames in list_keys (at most 8 items, prefix must be known) and
      prefix / relationEn / relationTe in sub_text; submit_change_request() has all five keys in `allowed`.
  - supabase/updates/02_T2_closing_names.sql (new): the two changed functions (generated from 01_schema.sql, so they cannot drift).
  - tools/db-test/tests.sql: 12 new checks (unknown title, unknown person, stray comma, bad prefix, 9 and 21 names, non-text name, good records
      accepted, "none" accepted, and three client submits that prove the keys are on the allowed list).
Tests: typecheck ok · lint ok (0 errors, the same 2 old warnings) · unit 774 passed (was 709, +65; new tests are in inviteText, teluguTemplate,
  validate, compileInvitation, invitationToForm, formReducer, fieldLabels and CreateForm) · build ok ·
  db tests 252 passed (was 240, +12). The update file was also checked: the OLD schema (git HEAD before this task) + supabase/updates/02_T2_closing_names.sql
  passes the same 252 checks.
Behaviour check done: by tests only (jsdom form, compiled template, SQL). Not clicked in a real browser.
  - Backward compatibility is proven in inviteText.test.ts: a copy of the pre-T2 line builder is kept as a reference and the old-style records
    (every inviterMode, with late / hidden parents, empty names, unknown mode) must give identical lines. The template test checks that an old
    record still shows "ఇట్లు" and the same four line slots, and that the previous template block (fixed ఇట్లు, lines 1 to 4) still compiles.
Pending / not done:
  - The Telugu wording of the presets "సాదర ఆహ్వానంతో" (invitedBy) and "శుభాభినందనలతో" (regards) and the English twins is my choice, as the plan only
      named the ids. All wording is in CLOSING_TITLES in src/lib/inviteText.ts; please have a Telugu speaker confirm or change it.
  - Review screen: a change of inviterSources shows the raw text (for example "groom,groomFather") and inviterNames shows JSON. Cosmetic.
  - No up / down keyboard shortcut other than the two buttons; rows are not drag-and-drop.
  - The two seed templates in 02_seed_templates.sql do not print the closing block, so they were not changed.
  - Not tried in a real browser or with the client area (/my); it uses the same CreateForm and the same patch(), and the db test proves a client
      may submit the new keys.
Owner steps (live project):
  1. Supabase SQL editor: run supabase/updates/01_T1_parent_status.sql if it was not run yet, then supabase/updates/02_T2_closing_names.sql
      (safe to re-run; no table or data changes). Without this step a client edit of the new keys from /my is refused or dropped.
  2. Admin > Templates: re-paste docs/templates/telugu-traditional.html into the Telugu template (needed for the title, the Hide option and lines
      5 to 10). Without it everything still works, but the title stays "ఇట్లు" and only four lines print.
  3. Deploy `preview` and try: title "With Best Compliments", tick Groom side only, add two custom names with relations; check the preview and
      the public page; also open an invitation saved before this task and confirm it looks the same.
Notes for the next person (T3 and later):
  - Decision: the old five buttons stay and are shown as selected only while `inviterSources` is empty. Picking one of them clears inviterSources,
      so the old behaviour (including the "use the person's own name when both parents are hidden" rule) is exactly as before. The checklist then
      shows the matching boxes (old "Groom's family" -> the box "Groom's family (parents)") WITHOUT writing anything until the person changes a box.
      The plan text said the old "Groom's family" would tick groomFather + groomMother; I mapped it to the `groomFamily` source instead, because
      only that source keeps the own-name fallback and so reproduces the old output byte for byte.
  - New value "none" for inviterSources means "nobody from the list" (empty means "use inviterMode"). It is accepted by TS and SQL. Quick button
      "Nobody" and unticking the last box write it.
  - Order of lines: family surname, groom's side (family, father, mother, then the person), bride's side, the old custom line, then custom names.
      Quick button "Groom side" = groom + his parents (so lines read parents first, then the groom).
  - A custom name line is "<prefix> <name> (<relation>)"; the name and relation use Telugu first, English as a fallback. Rows without a name are skipped.
  - The reducer was not changed except for types: reorder is done by `set("inviterNames", newArray)`, add / patch / remove use the generic list actions.
  - `ListPatch` is Partial<EventItem & ContactItem & InviterName>; when T6 / T7 / T8 add fields to those items, add them to the same union.
  - Reuse: INVITER_PREFIXES in inviteText.ts holds the Telugu prefixes for people (use it for T8 relatives too).
  - Security: a GitHub token was pasted into the chat that requested this task. It was only used for the clone and push of this task and is not
      stored in the repo, the remote URL or this file. The owner should revoke it in GitHub settings.
```

---

## T3. Separate house names, gotram, honorific

**Goal:** groom and bride can have their own house name and gotram; optional honorific before the couple's names.

**Data model (new text keys, default `""`)**
- `groomSurnameEn`, `groomSurnameTe`, `brideSurnameEn`, `brideSurnameTe` (house name / ఇంటి పేరు).
  The existing `surnameEn/Te` stays as the shared family surname and as the fallback when these are empty.
- `groomGotramEn`, `groomGotramTe`, `brideGotramEn`, `brideGotramTe`.
- `coupleHonorific` : `"" | "chiranjeevi"`. When set, prints `చి||` before the groom and `చి.ల.సౌ||` before the bride.

**UI:** in the groom and bride sections add the house name and gotram as `Bilingual` fields (`Bilingual.tsx`); add the
honorific as a checkbox "Show చి|| / చి.ల.సౌ|| before names" in the Family section. Add the new EN keys to `EN_TO_TE`.

**Logic / template:** placeholders `groom-surname-te`, `bride-surname-te`, `groom-gotram-te`, `bride-gotram-te`,
`couple-honorific` and `groom-honorific-te`, `bride-honorific-te`. Existing `{{surname-te}}` placeholders must keep working.

**Other touch points:** checklist rows 1 to 12, including SQL `text_keys` and `allowed`.

**Tests:** old record unchanged; gotram renders only when set; honorific on and off.

**Owner steps:** `supabase/updates/03_T3_house_names.sql`; re-paste template.

**Completion record**
```
Status: DONE
Finished: 18 Nov 2026 by Claude   Commit(s): cbdd2d0 (code, SQL, tests); this record is in the commit after it
How it was updated:
  - src/types/invitation.ts: nine new text keys: groomSurnameEn/Te, brideSurnameEn/Te, groomGotramEn/Te, brideGotramEn/Te, coupleHonorific.
  - src/features/create/constants.ts: defaults "" in `initial`; EN_TO_TE for the four English keys (house name and gotram fill their Telugu twin
      while typing); TARGETS point every new key at that person's card in the live preview (the honorific at the groom card).
  - src/lib/inviteText.ts: HONORIFIC_GROOM_TE ("చి||"), HONORIFIC_BRIDE_TE ("చి.ల.సౌ||"), honorificOn(), okHonorific().
  - src/lib/compileInvitation.ts valuesFor(): groom-/bride- surname-te, surname-en (the person's own, else the shared surname), surname-set ("1" only
      when the person's OWN house name was typed), gotram-te, gotram-en (no fallback), couple-honorific, groom-honorific-te, bride-honorific-te.
  - docs/templates/telugu-traditional.html: each couple card h2 prints the honorific first when on; two new list lines per card, "ఇంటి పేరు: ..."
      (only when `-surname-set`) and "గోత్రం: ..." (only when set). {{surname-te}} in the hero is untouched.
  - src/features/create/CreateForm.tsx: "House name EN / ఇంటి పేరు" and "Gotram EN / గోత్రం" pairs in the groom and bride sections; checkbox
      "Show చి|| / చి.ల.సౌ|| before the names" and a one-line hint under the shared surname in the Family section.
  - src/lib/validate.ts: an unknown coupleHonorific is an error in the "family" section (cannot happen from the form).
  - src/features/reviews/fieldLabels.ts: labels for the nine keys.
  - supabase/01_schema.sql: details_problem() has the eight text keys and coupleHonorific in text_keys, and coupleHonorific must be '' or 'chiranjeevi';
      submit_change_request() has all nine in `allowed`.
  - supabase/updates/03_T3_house_names.sql (new): the two changed functions, generated from 01_schema.sql.
  - tools/db-test/tests.sql: 7 new checks (unknown honorific, non-text gotram, 1001-character house name, good record, empty honorific, two client
      submits that prove the keys are on the allowed list).
Tests: typecheck ok · lint ok (0 errors, the same 2 old warnings) · unit 790 passed (was 774, +16) · build ok · db tests 259 passed (was 252, +7).
  The update file was also checked: the OLD schema (git HEAD before this task) + supabase/updates/03_T3_house_names.sql passes the same 259 checks.
Behaviour check done: by tests only (jsdom form, compiled template, SQL). Not clicked in a real browser.
  - Old record: the compiled template has no "ఇంటి పేరు" and no "గోత్రం" text even when a shared surname is set, the names are plain, and no {{ is left.
Pending / not done:
  - The honorific is printed on the couple cards only. The hero line, the "groom & bride" subtitle and the closing block (T2 `groom` / `bride`
      sources) still show the plain names. T2 custom names can use the "చి||" prefix by hand.
  - The house name is not added to the closing-block "family" lines or to the parentage line (T4 will build that line; it may want to use the
      `-surname-te` placeholders).
  - Review screen shows the raw value "chiranjeevi" for the honorific. Cosmetic.
  - Not tried in a real browser or in the client area (/my); same CreateForm, and the db test proves a client may submit the keys.
Owner steps (live project):
  1. Supabase SQL editor: run supabase/updates/03_T3_house_names.sql (after 01 and 02 if they were not run; safe to re-run; no table or data changes).
  2. Admin > Templates: re-paste docs/templates/telugu-traditional.html into the Telugu template (needed for the honorific, house-name and gotram
      lines). Without it everything still works, but those three do not appear.
  3. Deploy `preview` and try: type a house name and gotram for each side, tick the honorific, check the preview and the public page; open an
      invitation saved before this task and confirm it looks the same.
Notes for the next person (T4 and later):
  - `groom-surname-te` / `bride-surname-te` FALL BACK to the shared surname, so a template must test `groom-surname-set` (not `groom-surname-te`)
      if it wants a line that appears only when the person's own house name was typed.
  - The honorific is one switch for both people (chiranjeevi); wording lives in inviteText.ts.
  - A new section field on the groom / bride cards needs the matching TARGETS entry (done) so the preview scrolls to the card.
  - Commits from here on end with the Co-Authored-By / Claude-Session lines from the session's attribution reminder.
```

---

## T4. Birth order and the "son / daughter of" line

**Goal:** print lines such as "second son of Sri X & Smt Y" (Telugu: `శ్రీ X, శ్రీమతి Y ల ద్వితీయ కుమారుడు`).

**Data model (text keys, default `""`)**
- `groomOrder`, `brideOrder` : `"" | "only" | "eldest" | "second" | "third" | "fourth" | "youngest"`.
- `showParentage` : `"" | "1"` (checkbox "Show 'son of / daughter of' line"). Default off so today's output is unchanged.

**UI:** in each of the groom and bride sections, a dropdown "Position among children" and (once, in the Family section) the
checkbox above.

**Logic:** new `parentageLineTe(side, data)` in `inviteText.ts` using the T1 statuses (a late parent prints with `కీ.శే.`;
a single surviving parent prints alone). A constant table maps order -> Telugu word (`పెద్ద`, `రెండవ`, `మూడవ`, `నాల్గవ`,
`చిన్న`, `ఏకైక`) and son / daughter -> `కుమారుడు` / `కుమార్తె`. Placeholders `groom-parentage-te`, `bride-parentage-te`.

**Tests:** each order for son and daughter; one parent late; both hidden (line omitted).

**Owner steps:** `supabase/updates/04_T4_birth_order.sql`; re-paste template.

**Completion record**
```
Status: TODO
```

---

## T5. Separate reception venue

**Goal:** the reception can have its own venue. Today `valuesFor()` sets `reception-venue-te` to the wedding venue.

**Data model**
- `receptionSameVenue` : boolean, default `true` (keeps today's behaviour).
- `receptionVenueEn`, `receptionVenueTe`, `receptionVenueAddress`, `receptionVenueMaps` : text.

**UI:** in "Reception & Venue", when reception is on show the checkbox "Same venue as the wedding"; when unticked, show the four
fields. Add `receptionVenueMaps` to the URL validation (`okUrl`).

**Logic:** `reception-venue-te`, `reception-venue-en`, `reception-venue-address`, `reception-venue-maps` equal the wedding venue
when `receptionSameVenue` is true, else the new fields. Keep `same-venue`.

**SQL:** `receptionSameVenue` needs its own boolean branch next to `receptionEnabled` in `details_problem()`; add the text keys
to `text_keys`; add `receptionVenueMaps` to `url_keys`; add all five to `allowed`.

**Tests:** same-venue default; separate venue; bad maps link rejected in TS and SQL.

**Owner steps:** `supabase/updates/05_T5_reception_venue.sql`; re-paste template.

**Completion record**
```
Status: TODO
```

---

## T6. More events, event types, end time, description

**Goal:** more than two extra events, with presets and extra fields.

**Data model (add to `EventItem`)**
- `type` (`"" | "engagement" | "haldi" | "mehendi" | "sangeet" | "pellikoduku" | "pellikuthuru" | "varapuja" | "baraat" | "dinner" | "griha" | "custom"`),
  `endTime`, `descEn`, `descTe`, `dress`.

**Limits:** introduce `MAX_EVENTS = 6` in `constants.ts` and use it in `CreateForm.tsx` (replace the hard-coded `< 2` and the
hint text) and in `compileInvitation.ts` (replace `[0,1]` with a loop to `MAX_EVENTS`). Templates get slots
`event-1-*` to `event-6-*` wrapped in `{{#if event-N-name-te}}`. SQL list limit (20) already allows this; add the new
sub-keys to `sub_text`.

**UI:** a type dropdown that fills the Telugu / English name when the name is still empty; end time; description (EN / TE);
dress code. Keep the existing layout classes (`repeat`, `grid two`, `grid three`).

**Tests:** old two-event record unchanged; six events; type fills the name only when empty.

**Owner steps:** `supabase/updates/06_T6_events.sql`; re-paste template (it needs the extra slots).

**Completion record**
```
Status: TODO
```

---

## T7. More contacts per side, contact role

**Goal:** `Contacts.tsx` shows the Add button only while `items.length < 1` and `valuesFor()` reads only `[0]`.

**Changes:** `MAX_CONTACTS = 3`; `ContactItem` gets `roleEn`, `roleTe` (for example "Coordinator"); `valuesFor()` emits
`groom-extra-1..3-*` and `bride-extra-1..3-*` (name, phone, `-wa`, role); validation keys already use the contact id; SQL adds
`roleEn`, `roleTe` to `sub_text`. Keep the existing `groom-extra-1-*` names working.

**Tests:** three contacts per side; the phone rule still applies to each.

**Owner steps:** `supabase/updates/07_T7_contacts.sql`; re-paste template.

**Completion record**
```
Status: TODO
```

---

## T8. Family members list (siblings, grandparents, maternal uncle)

**Goal:** an optional list of relatives shown on the invitation. Do this after T1 and T4 (it reuses the late status and titles).

**Data model:** new list `familyMembers` of `{ id, side ("groom"|"bride"), relation ("brother"|"sister"|"grandfather"|"grandmother"|"maternalUncle"|"uncle"|"aunt"|"other"), prefix, nameEn, nameTe, late ("" | "1"), spouseEn, spouseTe, show ("" | "1") }`.
Add `familyMembers` to `ListField`, to `list_keys`, `allowed`, and add `relation`, `side`, `prefix`, `late`, `spouseEn`,
`spouseTe`, `show` to `sub_text`.

**UI:** a new section id `family2` is NOT needed: add a "Relatives" sub-block inside each of the groom and bride sections
(filtered by `side`). Max 8 per side.

**Template:** placeholders `groom-relatives-te` and `bride-relatives-te` (one pre-joined text each, built in `inviteText.ts`),
so the template needs no loops.

**Tests:** ordering, late marker, hidden members skipped, 8-per-side limit.

**Owner steps:** `supabase/updates/08_T8_relatives.sql`; re-paste template.

**Completion record**
```
Status: TODO
```

---

## T9. Cross-field validation, progress tags, docs, final pass

**Goal:** tidy everything the earlier tasks left open.

**Checklist**
- `validate.ts`: reception date not before the wedding date (warning), event dates not before today for new invitations
  (warning only), the maximum number of custom names and relatives, the closing-name source ids.
- `ClientApp.tsx` `tagFor()` and `SECTIONS` / `PROGRESS_IDS` in `constants.ts`: make sure new fields count correctly
  (required stays required; new fields are optional and must not lower progress).
- Client mode (`mode="client"`): confirm every new field is editable and appears in the review diff with its label.
- `README.md` and `docs/RELEASE_CHECKLIST.md`: add one line per new SQL update file and the "re-paste template" step.
- Merge all `supabase/updates/*.sql` knowledge into `01_schema.sql` (already done per task) and confirm
  `npm run test:db` on a clean database.
- Re-run the full command set; update the test count here.

**Completion record**
```
Status: TODO
```

---

## 6. Handoff log (newest first; add one line per work session, even if no task finished)

```
2026-11-18  T3 done (house names, gotram, honorific). 790 unit tests, 259 db tests, build ok. Owner: run supabase/updates/03_T3_house_names.sql (after 01, 02) and re-paste the template. Next: T4 (or T5 / T6 / T7).
2026-11-18  T2 done (closing title, who appears, custom names). 774 unit tests, 252 db tests, build ok. Owner: run supabase/updates/02_T2_closing_names.sql (after 01) and re-paste the template. Next: T3 (or T5 / T6 / T7, which are independent).
2026-11-18  T1 done (parent status). 709 unit tests, 240 db tests, build ok. Owner: run supabase/updates/01_T1_parent_status.sql and re-paste the template. Next: T2.
2026-11-18  T0 baseline done and recorded (690 unit tests, 233 db tests, build ok). No app code changed. Next: T1.
2026-11-18  Plan written. No code changed.
```

## 7. Backlog (ideas, not approved, do not start without the owner)

RSVP and guest count; personalised guest links ("Dear {name}"); calendar file (.ics) per event; gallery and video; background
music; extra languages (Hindi, Tamil, Kannada); invitation types other than weddings; draft / expiry / password; analytics;
country code and "is on WhatsApp" flag for phones; invocation / deity header with image; native place and address per family;
couple, groom and bride photos; education / profession lines; panchang line (tithi, masam) for the muhurtham.

## 8. Where to find things

- Release steps: `docs/RELEASE_CHECKLIST.md` · Short-link and SEO notes: `docs/SEO_SHORT_LINK_CHANGES.md`
- Database: `supabase/01_schema.sql`, `02_seed_templates.sql`, `03_make_admin.sql` (run in that order) and, from this plan on,
  `supabase/updates/NN_*.sql`
- Create form: `src/features/create/` · Template compiler: `src/lib/compileInvitation.ts` · Closing text: `src/lib/inviteText.ts`
- Tests: `npm test` (unit), `npm run test:db` (SQL), `npm run test:e2e` (browser)
- Security: if any token or key was pasted into a chat, revoke it before releasing.
