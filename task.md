# Astryx UI/UX migration: task tracker

> **Read this first if you are a new agent or a new chat.** Update this file at the end of every work session:
> tick boxes, add a row to the Change log, and refresh "Current state". Keep entries short and factual.

- **Goal:** adopt the Astryx design system (https://astryx.atmeta.com/docs/getting-started) across the whole app.
- **Branch:** `preview-astryx` (cut from `preview` at `f560d2c`). **Never commit to `preview` or `main`.**
- **Repo:** https://github.com/hasrshajw/react
- **Colour rule (owner decision):** keep the CURRENT app colours (brand purple `#673de6`). Do NOT adopt a stock Astryx
  theme palette. Use `@astryxdesign/theme-neutral` as the structural base, then override its colour tokens via
  `defineTheme({extends: neutral, ...})` with the values from `src/index.css` (see "Colour mapping").
- **Approach (owner decision):** FULL adoption: React 19 + Astryx core + theme + CLI, migrate screens/components in stages.
- Old project status (pre-migration, Supabase/egress work) moved to `docs/PROJECT_STATUS_2026-11-15.md`.

## Current state
- Stage: **0, planning done; no code changed yet.**
- Baseline on `preview`: `npx tsc --noEmit` clean, `npx vitest run` = **674 passed**. Every stage must keep both green.
- Stack today: Vite 6, React 18.3, react-router-dom 7, hand-written CSS (~1,650 lines in `src/index.css`,
  `src/styles/*.css`, `src/features/*/*.css`), HugeIcons, Supabase. No Tailwind, no StyleX.
- Astryx versions on npm (checked 18 Nov 2026): `@astryxdesign/core|theme-neutral|cli` = 0.7.16, `@stylexjs/stylex` = 0.19.2.
  Core needs React >= 19 and StyleX ^0.19.0. Pin core, theme and cli to the SAME version.

## How to work (rules for any agent)
1. `git clone` the repo, `git checkout preview-astryx`. Install: `npm ci`. Verify: `npx tsc --noEmit && npx vitest run && npm run build`.
2. Learn Astryx from its CLI, not memory: `npx @astryxdesign/cli init` (writes AGENTS.md/CLAUDE.md), then
   `npx @astryxdesign/cli component <Name>`, `... docs <topic>`, `... docs migration`, `... docs tokens`, `... theme list`.
   Import each component from its own entry, e.g. `import {Button} from '@astryxdesign/core/Button'`.
3. One stage at a time. Commit per stage with a message like `Astryx stage N: ...`. Tests that assert old class names or markup
   should be updated to the new markup, not deleted. Never weaken a test to make it pass.
4. Keep behaviour identical (routing, auth, Supabase calls, `/api/*`, preview bridge). This is a UI change only.
5. Keep phone behaviour (see `mobileview.md`) and reduced-motion support. Playwright e2e specs are in `e2e/`.
6. Never put tokens or secrets in commits, files or chat. A GitHub token was shared in chat earlier: it must be revoked.

## Colour mapping (current values from `src/index.css`; map onto Astryx theme tokens in Stage 2)
| Role | Current | Value |
|---|---|---|
| Primary / brand | `--primary`, `--btn` | `#673de6` |
| Primary hover / pressed | `--primary-dark`, `--btn-hover` | `#5025d1` / `#471ea7` |
| Primary tint (active bg) | `--primary-light`, `--primary-lightest` | `#ebe4ff` / `#673de614` |
| Page background | `--page-bg` (`--gray-light`) | `#f2f3f6` |
| Surface (cards, sidebar, header) | `--white` | `#fff` |
| Text | `--dark` / `--gray-dark` / `--gray` | `#1d1e20` / `#36344d` / `#6d7081` |
| Border | `--gray-border` | `#dadce0` |
| Success | `--success`, light, dark | `#00b090`, `#def4f0`, `#008361` |
| Danger | `--danger`, light, dark | `#fc5185`, `#ffe8ef`, `#d63163` |
| Warning | `--warning`, light, dark | `#ffcd35`, `#fff8e2`, `#fea419` |
| Info light | `--info-light` | `#e0f8ff` |
| Font | body | "DM Sans", "Noto Sans Telugu" (keep Telugu support) |
Hard-coded off-token colours also exist in CSS (e.g. `#101011`, `#b91c1c`, `#166534`, `#fef2f2`): fold them into theme tokens.

## Tasks

### Stage 0: Plan and baseline
- [x] Read Astryx Getting Started; confirm package versions and peer deps
- [x] Record baseline (tsc clean, 674 tests pass)
- [x] Create branch `preview-astryx`; write this `task.md`
- [ ] Push the branch (needs a NEW token with write access to `hasrshajw/react`; the earlier one must be revoked)

### Stage 1: Foundation (React 19 + Astryx install)
- [ ] Upgrade `react`, `react-dom`, `@types/react`, `@types/react-dom` to 19; fix type/test breakages
- [ ] Check `react-router-dom`, `@vitejs/plugin-react`, `@testing-library/*`, `jsdom` work with React 19
- [ ] `npm i @astryxdesign/core @stylexjs/stylex @astryxdesign/theme-neutral @astryxdesign/cli` (same versions)
- [ ] `npx @astryxdesign/cli init` (agent docs); add `"astryx"` script to package.json
- [ ] Decide on StyleX build setup for Vite (see `astryx docs styling`, `docs migration`); add plugin to `vite.config.ts` if needed
- [ ] Add `@import '@astryxdesign/core/reset.css'` and `astryx.css`; declare CSS layer order so legacy CSS still works during migration
- [ ] Confirm `npm run build` and `vercel.json` still work

### Stage 2: Theme with current colours
- [ ] `npx @astryxdesign/cli theme add neutral` (generates `astryx-themes` module)
- [ ] Create `src/theme/schedyTheme.ts` using `defineTheme({extends: neutral, ...})` with the colour mapping above (light mode; keep font stack)
- [ ] Wrap the app root (`src/main.tsx`) in `<Theme>`; keep legacy CSS variables as aliases until Stage 8
- [ ] Visual check: no colour regressions vs `preview`

### Stage 3: Shell and navigation
- [ ] `Sidebar.tsx`, `ProfileMenu.tsx`, `PageHeader.tsx`, `AdminApp.tsx`, `ClientShell.tsx`, `ClientApp.tsx` -> Astryx layout/nav components
- [ ] Mobile shell (bottom nav / slim header per `mobileview.md`) keeps working

### Stage 4: Shared primitives
- [ ] Buttons, icon buttons, inputs, selects (`dashboard/components/Select.tsx`), checkboxes, badges
- [ ] `Modal.tsx`, `BottomSheet.tsx`, `Toast.tsx` (`useToast`), `RowMenu.tsx`, `Skeleton.tsx`, `ListStates.tsx`, `ErrorCard.tsx`, `ErrorPage.tsx`
- [ ] Icons: keep HugeIcons unless Astryx icon docs say otherwise (`astryx docs icons`)

### Stage 5: Admin pages
- [ ] Dashboard (`pages/Dashboard.tsx`; StatCards, AttentionStrip, RecentInvitations, EnquiriesPanel, PreviewPanel, QrModal, TrashModal)
- [ ] Invitations (`pages/Invitations.tsx`; InvitationsTable, InvitationsToolbar, BulkBar, Countdown, ShareModal, RowActions)
- [ ] Reviews (`features/reviews/*`), Templates (`pages/Templates.tsx`), Notifications panel

### Stage 6: Create / edit form
- [ ] `CreateForm.tsx` and `create/components/*` (Field, Section, SectionNav, Bilingual, Contacts, PhotoPicker, TemplatePicker, SeoSection, LeaveModal, ShareModal, LivePreview)
- [ ] Keep preview bridge (`previewBridge.ts`) and unsaved-changes warnings intact

### Stage 7: Client area, auth, landing
- [ ] `features/client/*`, `LoginApp.tsx`, `pages/Login.tsx`, `pages/Landing.tsx`
- [ ] `PublicInvitation.tsx`: public invitations are rendered by templates; do NOT restyle template output

### Stage 8: Cleanup and polish
- [ ] Delete dead legacy CSS and unused variables; remove layer-order workarounds
- [ ] Motion: use Astryx motion tokens, keep reduced-motion behaviour (`styles/motion.css`)
- [ ] Update `README.md`, `mobileview.md`, `docs/RELEASE_CHECKLIST.md`
- [ ] Run Playwright e2e (`npm run test:e2e`) incl. phone projects; final tsc + vitest + build

## Change log (newest first; add a row every session)
| Date | Stage | What changed | Files | Result |
|---|---|---|---|---|
| 2026-11-18 | 0 | Created branch `preview-astryx`; moved old `task.md` to `docs/PROJECT_STATUS_2026-11-15.md`; wrote this tracker | `task.md`, `docs/` | tsc clean, 674 tests pass (baseline, no code changed) |

## Open questions / decisions
- Push access: new fine-grained token (Contents: read/write) for `hasrshajw/react` needed to push `preview-astryx`.
- Vercel preview deploy for `preview-astryx` is not verified.
