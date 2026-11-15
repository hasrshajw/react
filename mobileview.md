# Mobile view: admin pages

Last updated: 16 Nov 2026 (second round: card menu + bottom sheet) · Branch: `preview`
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

## Round 2: one Menu button per card + bottom sheet (phones, 760px and below)
Applies to the Dashboard "Recent invitations", the Invitations page and the Review queue (`/reviews`).

| Area | Change |
|---|---|
| Cards | Each card shows the details and one full-width **Menu** button; Preview / Edit / Link / More buttons are gone from the card |
| Cards | Wider cards: less padding around the list (10px 6px), cards fill the row |
| Bottom sheet | Tapping Menu slides up a sheet with the couple, status, date, views (queue: client, changed fields, submitted time) and every action |
| Dashboard / Invitations sheet | Preview, Edit, Copy link, then the existing items (WhatsApp, QR code, Share, Duplicate, Publish / Move to draft, Move to trash) |
| Queue sheet | Review changes / View request, Edit invitation |
| Behaviour | Closes with the X, a tap on the dimmed area, or Escape; the page behind doesn't scroll; scrolling inside the sheet doesn't close it |
| Skeletons | Loading cards show one ghost button, so nothing jumps when data arrives |
| Code | `BottomSheet.tsx`, `useIsPhone.ts`, phone mode in `RowMenu.tsx`, `RowActions.tsx`, `ReviewsTable.tsx`; styles in `dashboard.css` |

Desktop keeps the row buttons and the small dropdown menu. Checks: type check clean, build passes, 654 tests pass (3 new phone tests).

### Pending (round 2)
- [ ] Decide whether desktop should also move its row buttons under the menu (only phones changed so far).
- [ ] Swipe-down to close the sheet.
- [ ] Test the sheet on real iPhone and Android (safe area, keyboard, long names).
- [ ] Tests for the Dashboard / Invitations sheet (only the queue sheet has tests so far).

## Pending (round 1)
- [ ] Check every change on real devices (iPhone Safari, Android Chrome); only automated checks were run here.
- [ ] Create page: audit the form, step progress and live preview on phones.
- [ ] Notification panel: confirm width and scrolling on small screens.
- [ ] Sidebar drawer: check landscape and very short screens.
- [ ] Reviews: consider a side-by-side "old / new" card layout instead of the scrolling table.
- [ ] Add Playwright phone-size runs (for example 390x844 and 360x740) to `docs/RELEASE_CHECKLIST.md`.
- [ ] Dark mode and large-text (accessibility font size) pass.
- [ ] Move the inline `<style>` blocks (Templates, Sidebar, AdminApp) into CSS files so mobile rules live in one place.
