# Production readiness audit — Schedy (react / preview)

**Date:** 2026-11-20  
**Branch audited:** `preview` (includes T9)  
**Scope:** Full codebase inspection (structure, auth, RLS, APIs, UI routes, tests, deploy config).  
**Method:** Static code review and workflow tracing. Live browser / production data not exercised in this pass.  
**Rule:** No code changes applied in this audit. Findings only.

---

## 1. Executive summary

Schedy is a **React + Vite SPA** for creating and sharing digital Telugu/English wedding invitations, backed by **Supabase** (Auth, Postgres + RLS, Storage) and **Vercel** (SPA hosting + serverless `api/*` for crawler OG tags and preview cleanup).

**Architecture strengths (verified in code):**
- Clear separation: public landing / public invitation vs admin shell vs client (`/my`) shell.
- Authorization is primarily **database RLS + security-definer RPCs**, not client-only checks (`RoleGate` is explicit UI-only).
- Invitation `details` JSON is validated server-side (`details_problem` + trigger).
- Clients cannot write `invitations` directly; they use `submit_change_request` / related RPCs.
- Public invitations are compiled and shown in a **sandboxed iframe** without `allow-same-origin`.
- Substantial automated coverage: large Vitest suite, dedicated SQL RLS tests (`npm run test:db`), CI workflow, Playwright e2e scaffolding.

**Production readiness:** **Conditionally ready for a controlled private / early production deploy**, not yet a fully productized self-serve SaaS. Core invitation create → publish → public link → client edit-request → admin review is designed seriously. Billing, several reserved marketing routes, enforced CSP, and operational secrets hygiene are incomplete.

**Highest risks:**
1. Secrets exposure process (PAT pasted in chat; real-looking keys in local `.env.local`).
2. Enforced CSP is minimal; full policy is report-only.
3. Dead billing CTAs and unimplemented reserved routes.
4. Weak minimum password length (6).
5. Template HTML runs scripts inside sandboxed iframes (contained, but still a trust boundary on admin-controlled templates).

---

## 2. Application understanding

### Stack
| Layer | Choice |
|--------|--------|
| UI | React 18, React Router 7, Vite 6, TypeScript |
| Icons | `@hugeicons/react` |
| Backend | Supabase JS client → Postgres + Auth + Storage |
| Serverless | Vercel `api/invite.js`, `api/cleanup-previews.js` |
| Tests | Vitest + jsdom, SQL suite under `tools/db-test/`, Playwright e2e |
| Deploy | `vercel.json` rewrites + headers; CI on `preview` / `main` |

### Roles
| Role | How determined | Capabilities (design) |
|------|----------------|------------------------|
| Anon / guest | No session | Landing, public invitation by slug, enquiry insert (limited columns) |
| Authenticated non-admin | `is_admin()` false | If linked as `client_email`: `/my` edit + change requests |
| Admin | Row in `public.admins` | Dashboard, create, invitations, templates, reviews, enquiries |

UI gate: `src/components/RoleGate.tsx` (does **not** replace RLS).

### Main routes
| Path | Surface |
|------|---------|
| `/` | Public landing |
| `/login` | Auth (email/password + Google) |
| `/dashboard`, `/create`, `/invitations`, `/templates`, `/reviews` | Admin app (`AdminApp.tsx`) |
| `/my` … | Client app (`ClientApp.tsx`) |
| `/:slug` (non-reserved) | Public invitation (`PublicInvitation` via `Gate`) |
| `/i/:slug` | Alias; crawlers rewritten to `/api/invite` |

Reserved slugs: `src/lib/reserved.ts` (must stay in sync with schema + `vercel.json` + `api/invite.js`).

### Core workflows
1. Admin signs in → creates invitation (Create form) → saves to `invitations` → publishes → guests open `/{slug}`.
2. Optional client email → client signs in → `/my` → proposes changes → admin Reviews queue approve/reject.
3. Link previews: social crawlers hit `api/invite.js` (UA-gated rewrite), not the SPA.

---

## 3. Findings

Severity key: **Critical** / **High** / **Medium** / **Low**.  
Status: **Verified** (seen in code) or **Suspected** (needs live proof).

### 3.1 Security

#### S-1 · Secrets handling (operational)
- **Severity:** Critical (process) / High (if keys were committed or reused)
- **Location:** Chat history; local `.env.local` (present on audit machine); `.gitignore` correctly ignores `.env.*`
- **What:** A GitHub fine-grained PAT was pasted into chat earlier. `.env.local` contains real-looking `VITE_SUPABASE_URL` and publishable key. File is gitignored; not verified absent from all history on all machines.
- **Why it matters:** Token/key reuse enables repo or project abuse.
- **Recommendation:** Revoke the GitHub PAT; rotate Supabase publishable/anon keys if exposed beyond trusted machines; never paste secrets into chat. Confirm `.env.local` never committed (`git log --all -- .env.local`).
- **Verified:** PAT-in-chat and local env file presence. Not verified: whether Supabase project was compromised.

#### S-2 · Content-Security-Policy mostly report-only
- **Severity:** High
- **Location:** `vercel.json` headers
- **What:** Enforced CSP is only `object-src 'none'; frame-ancestors 'none'`. The stricter policy (script-src 'self', connect-src, etc.) is `Content-Security-Policy-Report-Only`.
- **Why it matters:** XSS in the SPA origin can still run scripts; session in `localStorage` (`SESSION_KEY` / auth session) is then stealable.
- **Recommendation:** Move to enforced CSP after fixing any report-only violations; prefer httpOnly cookie session long-term or accept SPA tradeoff with strict CSP.
- **Verified.**

#### S-3 · Invitation template HTML executes in iframes with `allow-scripts`
- **Severity:** Medium (contained) / High if templates are attacker-controlled
- **Location:** `src/pages/PublicInvitation.tsx`, `LivePreview.tsx`, `PreviewPanel.tsx`, `ReviewDetail.tsx`
- **What:** Compiled HTML is injected via `srcDoc` with sandbox including `allow-scripts` (and sometimes popups). **Without** `allow-same-origin` on public page (good).
- **Why it matters:** Malicious/compromised template JS runs in opaque origin; phishing or browser bugs remain theoretical risks. Admin-only template write reduces likelihood.
- **Recommendation:** Keep templates admin-only (already RLS); consider stripping `<script>` from published HTML if interactivity is unnecessary; document trust model.
- **Verified** sandbox attributes in code.

#### S-4 · Compiler sanitization is partial by design
- **Severity:** Medium
- **Location:** `src/lib/compileInvitation.ts` — `sanitizeAttributes`, `stripBrokenAssets`
- **What:** Removes `on*` handlers and unsafe URL attributes; strips some broken same-origin assets. Does not fully neutralize all HTML/JS (scripts may remain for sandbox execution).
- **Why it matters:** Defense-in-depth depends on iframe sandbox + admin-only templates.
- **Recommendation:** Explicit allowlist of tags/attributes if templates should be static documents only.
- **Verified.**

#### S-5 · Minimum password length = 6
- **Severity:** Medium
- **Location:** `src/lib/auth.ts` — `MIN_PASSWORD = 6`
- **What:** Client-side (and signup) minimum is six characters.
- **Why it matters:** Weak passwords increase account takeover risk for admin accounts.
- **Recommendation:** Raise to 10–12+; enable Supabase leaked-password protection if available; encourage Google OAuth for admins.
- **Verified.**

#### S-6 · Client-side session cache in localStorage
- **Severity:** Medium (standard SPA tradeoff)
- **Location:** `src/lib/session.ts`, `src/lib/auth.ts`
- **What:** Cached session for UI routing; real API auth is Supabase session.
- **Why it matters:** Any XSS can read storage.
- **Recommendation:** Pair with enforced CSP (S-2); avoid putting long-lived secrets in storage.
- **Verified.**

#### S-7 · Enquiry public insert surface
- **Severity:** Low–Medium
- **Location:** `supabase/01_schema.sql` — column grants + insert policy on `enquiries`
- **What:** Anon can insert only `name, phone, email, message`. Admins read/update. Good column restriction.
- **Why it matters:** Spam/flood possible without app-level or edge rate limit (DB may not throttle inserts beyond change-request/view limits elsewhere).
- **Recommendation:** Add rate limiting (edge middleware, CAPTCHA, or DB throttle) for enquiry inserts.
- **Verified** grants; spam resistance **suspected** weak without live load test.

#### S-8 · Positive security controls (not issues)
- RLS on core tables; `is_admin()` security definer; invitations owner-scoped.
- Clients use RPCs (`my_invitations`, `submit_change_request`, …), not direct table writes.
- `details_problem` + trigger blocks invalid JSON details.
- Storage preview bucket: public read, owner-scoped write path `auth.uid()/…`.
- View counting rate table + `record_invitation_view`.
- Change request rate: ≥10/hour blocked (schema).
- `RoleGate` documents UI-only nature.
- `api/invite.js` escapes OG fields; does not use service role.
- Cleanup API uses bearer secret comparison (`isAuthorized`).
- **Verified** in schema and API sources.

---

### 3.2 Functional

#### F-1 · Billing CTAs navigate to non-existent route
- **Severity:** High (product honesty / UX)
- **Location:** `src/AdminApp.tsx` — plan banner CTAs `to: "/billing"`; no `<Route path="/billing">`
- **What:** Trial / past_due / manage-plan links go to admin `NotFound`.
- **Why it matters:** Broken workflow; users believe billing exists.
- **Recommendation:** Remove CTAs, or implement billing page, or deep-link to external portal.
- **Verified.**

#### F-2 · Reserved routes without pages
- **Severity:** Medium
- **Location:** `src/lib/reserved.ts`, `vercel.json` vs `AdminApp` routes
- **What:** Reserved: `inventory`, `billing`, `customize`, `privacy`, `terms`, `pricing`, `about`, `contact` — no implemented marketing/legal pages in `src/pages/`.
- **Why it matters:** Direct navigation hits NotFound / invitation-unavailable behavior; unprofessional for production marketing site.
- **Recommendation:** Add minimal static pages or drop from marketing until ready; keep reserved to protect slugs.
- **Verified.**

#### F-3 · Reception UI inconsistency (known)
- **Severity:** Low–Medium
- **Location:** Create form reception section; prior T5 notes
- **What:** Reception card can show when `receptionDate` is set even if “Include reception” is off (checkbox mainly toggles date inputs).
- **Why it matters:** Confusing preview vs form state.
- **Recommendation:** Gate reception block on `receptionEnabled` in compile + form display.
- **Suspected** still present from prior task notes; confirm in UI.

#### F-4 · Create form T1–T9 largely complete
- **Severity:** n/a (positive)
- **Location:** `src/features/create/*`, `src/lib/validate.ts`, `inviteText.ts`, schema updates
- **What:** Parent status, closing names, house names/gotram/honorific, birth order, separate reception venue, expanded events, contacts, relatives, cross-field warnings (T9).
- **Verified** in code structure and validate.ts severity support.

#### F-5 · Client change-request workflow designed end-to-end
- **Severity:** n/a (positive)
- **Location:** RPCs in schema; `ClientApp.tsx`; `features/reviews/*`
- **What:** Submit / withdraw / review with optimistic concurrency (`base_updated_at` / force flag).
- **Verified** in schema function definitions; live email webhooks listed as optional in release checklist.

#### F-6 · Email notifications optional / incomplete ops
- **Severity:** Medium (ops)
- **Location:** `docs/RELEASE_CHECKLIST.md` § Email
- **What:** Webhooks to `/api/notify-admin` and `/api/notify-client` called out as optional; not fully audited as present/complete in `api/`.
- **Why it matters:** Clients/admins may miss review events.
- **Recommendation:** Confirm notify endpoints exist and are configured before promising email.
- **Suspected** incomplete until file inventory + deploy env confirmed.

---

### 3.3 Database & backend

#### D-1 · Schema quality
- **Severity:** n/a (positive)
- **Location:** `supabase/01_schema.sql` (~1029 lines)
- **What:** Single consolidated schema; RLS; triggers; RPCs; storage policies; optional `pg_cron` trash purge. Updates in `supabase/updates/` for live upgrades.
- **Verified.**

#### D-2 · CI loads schema file path comment drift
- **Severity:** Low
- **Location:** `.github/workflows/ci.yml` comment mentions `supabase/schema.sql`; runner uses `01_schema.sql` via `tools/db-test/run.sh`
- **What:** Comment outdated; runner script correct.
- **Recommendation:** Fix comment to avoid operator mistakes.
- **Verified.**

#### D-3 · Migration story for existing projects
- **Severity:** Medium (ops)
- **Location:** `supabase/updates/01`…`08`, README, RELEASE_CHECKLIST
- **What:** Live projects need ordered SQL updates + template re-paste. Easy to miss on one environment.
- **Recommendation:** Checklist gate before promote to `main`; document last-applied update version.
- **Verified** docs exist; application on live project **not verified** in this audit.

#### D-4 · No destructive audit actions run
- Audit did not execute `purge`, cleanup delete mode, or production SQL against live data.

---

### 3.4 UI/UX

#### U-1 · Mobile attention is real
- **Severity:** n/a (positive)
- **Location:** `mobileview.md`, admin mobile CSS, bottom sheets, phone e2e projects
- **What:** Documented phone layouts, 44px targets, safe areas, card menus.
- **Verified** documentation and e2e config; visual QA on devices **not** run in this pass.

#### U-2 · Dead billing and missing legal pages
- See F-1, F-2. Hurts trust on production domain.

#### U-3 · Skeleton loading system
- **Severity:** n/a (positive)
- **Location:** `Skeleton.tsx`, README skeleton rules, page-level loading flags
- **What:** Thoughtful loading UX.
- **Verified** code presence.

#### U-4 · Accessibility
- **Severity:** Medium (program risk)
- **What:** Some aria labels present; no full a11y audit (focus traps, contrast, screen reader) in this pass.
- **Recommendation:** Keyboard pass on Create, Reviews, modals; axe/lighthouse on landing + create.
- **Suspected** gaps without automated a11y run.

---

### 3.5 Performance

#### P-1 · Code splitting
- **Severity:** n/a (positive)
- **Location:** `src/App.tsx` lazy `Login` / `AdminApp` / `ClientApp`; vite `manualChunks` for supabase
- **What:** Public paths avoid loading full admin + supabase until needed.
- **Verified.**

#### P-2 · Bundle / CWV / image budgets
- **Severity:** Low–Medium
- **What:** No Lighthouse numbers collected in this audit. OG image `public/og-main.jpg` present; preview images in storage.
- **Recommendation:** Run Lighthouse on `/`, `/login`, public invitation slug, `/create`.
- **Suspected** acceptable; **not measured**.

#### P-3 · Template HTML size
- Large template strings in DB; downloaded for preview. Acceptable for this product; watch payload on mobile.

---

### 3.6 Code quality

#### Q-1 · Strong domain modules
- `validate.ts`, `inviteText.ts`, `compileInvitation.ts`, `api.ts`, form reducer — coherent, tested.

#### Q-2 · Large files
- **Severity:** Low
- **Location:** e.g. `src/lib/api.ts` (~665 lines), `AdminApp.tsx` with large inline CSS string
- **Recommendation:** Extract admin shell CSS to stylesheets over time.

#### Q-3 · Test culture
- **Severity:** n/a (positive)
- Many `*.test.ts(x)` files under `src`; SQL tests; e2e smoke/phone.
- Full suite not re-run successfully in constrained audit environment; CI is the authority.

#### Q-4 · TypeScript
- `npm run typecheck` / build scripted; strictness not re-validated this pass.

---

### 3.7 SEO & deployment

#### E-1 · Build-time SEO pipeline
- **Severity:** n/a (positive)
- **Location:** `vite.config.ts`, `api/_siteUrl.js`, `index.html` `%SITE_URL%`
- **What:** Canonical/OG tags and robots/sitemap generated from `SITE_URL` (rejects bad placeholders).
- **Verified** in vite plugin logic. Deployed values depend on Vercel env.

#### E-2 · Checked-in `public/robots.txt` / `sitemap.xml` use example.com
- **Severity:** Low (overwritten on build when SITE_URL set)
- **Location:** `public/robots.txt`, `public/sitemap.xml`
- **What:** Placeholder `https://example.com`. Dev server plugin can serve generated versions.
- **Recommendation:** Ensure production build always sets `SITE_URL`; do not rely on static public files.
- **Verified** file contents.

#### E-3 · Security headers incomplete beyond CSP
- **Severity:** Medium
- **Location:** `vercel.json`
- **What:** No explicit `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` in audited file (platform defaults may apply).
- **Recommendation:** Add standard production headers.
- **Verified** absent from `vercel.json`.

#### E-4 · Deployment protection vs invite API
- Documented that `api/invite.js` does not fetch `index.html` (avoids protection login HTML leakage to crawlers). Good design note.

---

### 3.8 Testing gaps

| Check | Status in this audit |
|--------|----------------------|
| Unit tests (`npm test`) | Not fully executed here (environment limits); CI defined |
| DB RLS tests (`npm run test:db`) | Not executed here; harness reviewed |
| E2E | Config present; needs deployed URL + credentials |
| Dependency audit | CI job `npm audit --omit=dev` continue-on-error |
| Manual multi-account RLS | Release checklist item; not run here |

---

## 4. Overall production readiness assessment

| Area | Rating | Notes |
|------|--------|-------|
| Core invitation product | Strong | Create, compile, publish, public view, client request |
| Security baseline | Good with gaps | RLS solid; CSP enforcement weak; password policy weak |
| Multi-tenant isolation | Strong by design | Owner RLS + client RPCs |
| Billing / SaaS monetization | Not ready | Dead `/billing` links |
| Marketing / legal pages | Not ready | Reserved but empty |
| Ops / secrets | Process risk | Rotate any exposed tokens |
| Automated tests | Strong investment | Rely on green CI before promote |
| Observability | Limited | No evidence of error tracking (Sentry etc.) in repo |

**Verdict:** Suitable for **private beta / controlled production** after secrets rotation and either removing billing CTAs or implementing billing. Not ready to market as a complete self-serve SaaS with payments and legal pages until F-1/F-2 and ops checklist are closed.

---

## 5. Prioritized remediation roadmap

### P0 — Before any public production traffic
1. **Revoke/rotate secrets** (S-1): GitHub PAT; review Supabase keys; confirm no secrets in git history.
2. **Remove or implement `/billing` CTAs** (F-1) so no dead ends in admin chrome.
3. **Confirm Supabase Auth settings** (release checklist): email confirmations, signup policy intentional.
4. **Run CI green on `preview`** including `test:db`.
5. **Apply SQL updates 01–08 + re-paste Telugu template** on live DB if not already (D-3).

### P1 — First production hardening sprint
6. Enforce real **CSP** (S-2) after fixing violations; add HSTS / nosniff / referrer-policy (E-3).
7. Raise **MIN_PASSWORD** (S-5).
8. Enquiry **rate limit / bot resistance** (S-7).
9. Add minimal **privacy/terms** pages or remove from nav expectations (F-2).
10. Wire or explicitly disable **email notify** webhooks (F-6).

### P2 — Quality and product completeness
11. Reception enabled flag consistency (F-3).
12. A11y pass on Create + Reviews (U-4).
13. Lighthouse budgets on key routes (P-2).
14. Extract oversized inline admin CSS (Q-2).
15. Optional: strip scripts from published invitation HTML if not required (S-3/S-4).

### P3 — Backlog (product ideas; not started)
RSVP, personalized guest links, calendar files, gallery/video, music, more languages, analytics, other invitation types, draft/expiry/password links.

---

## 6. Verification matrix (sample)

| Finding | How verified |
|---------|----------------|
| S-2 CSP | Read `vercel.json` |
| S-5 password | Read `MIN_PASSWORD` in `auth.ts` |
| F-1 billing | Grep AdminApp CTAs; Routes list has no `/billing` |
| S-3 sandbox | Read `PublicInvitation.tsx` iframe attributes |
| RLS model | Read `01_schema.sql` policies and RPCs |
| SEO build | Read `vite.config.ts` plugin |
| Secrets file | `.env.local` on disk; gitignore rule confirmed |

---

## 7. What this audit did *not* do

- No live login against production/preview URL.
- No multi-user penetration of RLS on a real project.
- No full `npm test` / `npm run build` / `npm run test:db` green proof in this environment.
- No dependency CVE deep dive beyond noting CI audit job.
- No visual regression screenshots.
- **No application code changes** (audit only).

---

## 8. Recommended next action

Owner reviews this report, prioritizes P0 items, then authorizes a **fix branch** for P0/P1 only. Do not mix feature work with secret rotation.

**Security reminder:** If any GitHub or Supabase credential was shared in chat or committed, revoke it before promotion to `main`.
