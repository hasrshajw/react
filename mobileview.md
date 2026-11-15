# Mobile view: admin pages

Last updated: 16 Nov 2026 · Branch: `preview`
Scope: signed-in admin area (Dashboard, Invitations, Reviews, Templates, Create, shell, profile menu).
Phone rules apply at 768px and below; desktop is unchanged.

## Already in place before this round
- Sidebar becomes a slide-in drawer with a mobile header (Sidebar.tsx).
- Dashboard, Invitations and Reviews tables turn into stacked cards under 760px, with a select-all bar.
- Dashboard stat cards go to one column; the enquiries side panel becomes a full-screen sheet.

## Updated in this round
Everything below lives in `src/styles/admin-mobile.css` (imported by `AdminApp.tsx`), plus one line in `index.html`.

| Area | Change |
|---|---|
| Whole app | `viewport-fit=cover` added, so notch and home-bar safe areas work |
| Whole app | Page padding tightened (14px, 10px on small phones); no sideways scrolling |
| Inputs | 16px text in search, enquiry, share and review fields, so iPhones don't zoom in on focus |
| Buttons | About 44px tap targets for row actions, More, Create, Refresh, category chips, Use template, close |
| Dashboard | Toast and side panel respect the home bar; modals use the dynamic viewport height |
| Reviews | Change table scrolls inside its panel; header and action buttons stack full width |
| Templates | Stacked header, full-width search, swipeable category chips, two-up grid (one-up under 400px) |
| Templates | Preview opens as a bottom sheet; hover lift and hover-only "Preview" pill removed on touch |
| Profile menu | Capped to screen width |

Checks: type check clean, build passes, 651 tests pass.

## Pending
- [ ] Check every change on real devices (iPhone Safari, Android Chrome); only automated checks were run here.
- [ ] Create page: audit the form, step progress and live preview on phones.
- [ ] Notification panel: confirm width and scrolling on small screens.
- [ ] Sidebar drawer: check landscape and very short screens.
- [ ] Reviews: consider a side-by-side "old / new" card layout instead of the scrolling table.
- [ ] Add Playwright phone-size runs (for example 390x844 and 360x740) to `docs/RELEASE_CHECKLIST.md`.
- [ ] Dark mode and large-text (accessibility font size) pass.
- [ ] Move the inline `<style>` blocks (Templates, Sidebar, AdminApp) into CSS files so mobile rules live in one place.
