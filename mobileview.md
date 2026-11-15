# Mobile view: admin pages

Last updated: 16 Nov 2026 (round 5: back button, swipe-down, long-press, sticky bar, phone bell) · Branch: `preview`
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

### Round 3: slimmer phone cards
- A phone card now shows only the couple name and the status chip (Published, Draft, Pending review...), with a small **Menu** button at its bottom right.
- Event date, views, client email, template and the "Top" badge moved into the bottom sheet, next to all the action buttons (both Dashboard/Invitations and the queue sheet).
- Loading cards match: name, status and one small ghost button.

### Round 4: card redesign + selection mode (phones)
| Area | Change |
|---|---|
| Card layout | One compact row, centred vertically: avatar, name (up to 2 lines) and status chip on the left, icon-only menu button (vertical dots, 44px) at the right centre |
| Card tap | Tapping anywhere on a card opens its bottom sheet (Dashboard, Invitations, queue); the icon button stays for screen readers and keyboards (`aria-label="More actions for <couple>"`) |
| Look | Soft shadow, press highlight, tap highlight removed, 2-line name clamp so long names never push the layout |
| Checkboxes | Hidden on phone cards. The sheet on Invitations has a **Select** item: it closes the sheet, turns on selection mode and ticks that card |
| Selection mode | Every card shows a checkbox at its left, the menu icon is hidden, tapping a card toggles it. A bar at the top has select-all, the count and **Done** |
| Bulk actions | Dock at the bottom as four icon + label buttons (Publish, Move to draft, Export CSV, Move to trash) instead of a wrapping row |
| Guard | A selection made on a wide screen is cleared when the window becomes phone-sized, so hidden checkboxes can't hold a stale selection |
| Code | `cardTap.ts`, selection state in `Invitations.tsx`, `InvitationsTable.tsx`, `RowActions.tsx`, `ReviewsTable.tsx`, CSS in `dashboard.css` and `invitations.css` |

Checks: type check clean, build passes, 659 tests pass. Not yet looked at in a real browser or on a phone.

### Round 5: gestures, back button, notifications (phones)
| Area | Change |
|---|---|
| Back button / gesture | Closes the bottom sheet, and leaves selection mode on Invitations, instead of leaving the page. One shared history entry for all open layers (`useBackClose.ts`); closing by hand takes it back, so no dead back-presses. If a sheet action navigates (Edit, Preview), history is left alone |
| Swipe down | Dragging the sheet's handle or header down closes it (past 90px, or a quick flick); a short drag snaps back. The action list still scrolls normally |
| Long-press | Holding a card for half a second starts selection mode with that card ticked (small vibration where supported). Moving the finger (scrolling) cancels it; the click after a long press is ignored. Text selection and the native callout are off on cards |
| Select-all bar | Sticks under the mobile header while the list scrolls (the panel no longer clips in selection mode) |
| Notifications | The bell was only in the top bar, which is hidden on phones, so phones had no way to open notifications. The bell is now in the mobile header, with the unread dot. The panel is a card pinned under the header, full width, scrolls inside, uses the dynamic viewport |
| Drawer | On short screens (phone held sideways) the drawer header and spacing shrink; the list scrolls |
| Tests | Phone sheet on Dashboard / Invitations (`RowMenu.phone.test.tsx`), `BottomSheet.test.tsx` (close paths, swipe, back), `useBackClose.test.tsx`, long-press tests in `InvitationsTable.phone.test.tsx` |
| Playwright | Phone projects 390x844 and 360x740 run `e2e/*.phone.spec.ts` (`npm run test:e2e:phone`); added to `docs/RELEASE_CHECKLIST.md`. Admin checks need `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` |
| Code | `useBackClose.ts`, `BottomSheet.tsx`, `cardTap.ts` (`useLongPress`), `InvitationsTable.tsx`, `Invitations.tsx`, `Sidebar.tsx`, `admin-mobile.css`, `invitations.css`, `dashboard.css` |

Checks: type check clean, build passes, lint 0 errors, 674 tests pass (15 new). Still not looked at in a real browser or on a phone.

### Fix: could not scroll to the bottom on phones
Cause: the admin shell was `height: 100vh` with `overflow: hidden`. On phones `100vh` is taller than the visible screen (the address bar covers part of it), so the bottom of every page sat below the screen edge.
Fix: `100dvh` (with a `100vh` fallback) on the shell, sidebar, profile menu and modals; smoother touch scrolling inside the page.

### Pending (round 4)
- [ ] Look at every card, the sheet and selection mode on real iPhone and Android.
- [x] Select-all bar sticks under the mobile header (round 5).
- [x] Back gesture / back button closes the sheet and leaves selection mode (round 5).
- [x] Long-press on a card as a shortcut into selection mode (round 5).
- [ ] Long-press and swipe tuning on real touch screens (500ms hold, 90px swipe are first guesses).

### Pending (round 2)
- [ ] Decide whether desktop should also move its row buttons under the menu (only phones changed so far).
- [x] Swipe-down to close the sheet (round 5).
- [ ] Test the sheet on real iPhone and Android (safe area, keyboard, long names).
- [x] Tests for the Dashboard / Invitations sheet (round 5).

## Pending (round 1)
- [ ] Check every change on real devices (iPhone Safari, Android Chrome); only automated checks were run here.
- [ ] Create page: audit the form, step progress and live preview on phones.
- [x] Notification panel: phone bell added in the header, panel fits the screen and scrolls (round 5). Still to confirm on a real phone.
- [x] Sidebar drawer: short-screen / landscape rules added (round 5). Still to confirm on a real phone.
- [ ] Reviews: consider a side-by-side "old / new" card layout instead of the scrolling table.
- [x] Add Playwright phone-size runs (390x844 and 360x740) to `docs/RELEASE_CHECKLIST.md` (round 5). Admin pages need a test admin account to run.
- [ ] Dark mode and large-text (accessibility font size) pass.
- [ ] Move the inline `<style>` blocks (Templates, Sidebar, AdminApp) into CSS files so mobile rules live in one place.
