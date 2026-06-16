---
phase: 01-package
verified: 2026-06-16T17:18:00Z
status: human_needed
score: 14/15 must-haves verified
human_verification:
  - test: "Run the demo app and verify SSR/hydration, UTC slot times, date-range nav, and pending status in the browser"
    expected: "No React hydration mismatch warnings in console; slot times display in visitor's local timezone; prev/next disabled at date-range boundaries; out-of-range dates greyed; pending slots non-interactive; onSlotClick fires for available only"
    why_human: "Visual/browser behavior cannot be verified by grep or unit tests. Plan 03 Task 4 is an explicit blocking human-checkpoint gate requiring manual confirmation. The automated test suite confirms the code is correct, but timezone rendering (PKG-01) and hydration safety (PKG-05) require a running browser with devtools open."
---

# Phase 1: react-easy-appointments v2.0.0 Verification Report

**Phase Goal:** Improve the react-easy-appointments package with UTC slot model, pending status, date-range feature, SSR safety, and publish as v2.0.0
**Verified:** 2026-06-16T17:18:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Slot type uses startUtc/endUtc (full UTC ISO strings) instead of startTime/endTime | VERIFIED | `src/types/index.ts` line 6-7: `startUtc: string` and `endUtc: string`; no `startTime`/`endTime` on Slot |
| 2 | SlotStatus includes 'pending' | VERIFIED | `src/types/index.ts` line 1: `'available' \| 'pending' \| 'booked' \| 'unavailable'` |
| 3 | A visitor sees slot times in their local machine timezone (Intl, no timeZone override) | VERIFIED | `formatSlotTime.ts` uses `Intl.DateTimeFormat(locale, { hour, minute })` with no `timeZone` option; confirmed by passing test suite |
| 4 | Server-side render produces a stable placeholder (empty string), not server-timezone time | VERIFIED | `formatSlotTime.ts` line 8: `if (typeof window === 'undefined') return ''`; ssr.test.tsx 2/2 green |
| 5 | A pending slot is non-interactive and visually distinct from booked | VERIFIED | `base.css` lines 644-647: `.rea-slot--pending { background: var(--rea-slot-pending-bg); cursor: not-allowed; }`; `disabled={slot.status !== 'available'}` in TimeSlotBlock |
| 6 | deriveDate is exported from the package for host apps to build the date key | VERIFIED | `src/index.ts` line 3: `export { deriveDate } from './utils/deriveDate'` |
| 7 | Calendar accepts optional startDate and endDate props | VERIFIED | `CalendarContext.ts` lines 20-21; `Calendar.tsx` CalendarProps includes both; `useCalendarState.ts` signature updated |
| 8 | When startDate is set, the calendar opens to startDate's month, not today | VERIFIED | `useCalendarState.ts` line 8: `startDate ? parseISO(startDate) : new Date()`; dateRange.test.tsx "May 2026" init test green |
| 9 | Prev/next nav buttons are disabled at range boundaries | VERIFIED | `Toolbar.tsx` lines 19-20: `isPrevDisabled`/`isNextDisabled` applied to all 4 buttons (headless+styled); dateRange.test.tsx Previous/Next disabled tests green |
| 10 | Dates outside startDate-endDate are greyed out and render no clickable slots (MonthView) | VERIFIED | `MonthView.tsx` passes `slots=[]` + `isOutOfRange` for out-of-range days; `MonthCell.tsx` applies `rea-month-cell--out-of-range` class; `base.css` has the opacity/background rule |
| 11 | WeekView suppresses slots on days outside the startDate-endDate range | VERIFIED | `WeekView.tsx` both headless and styled branches: `const cellSlots = isOutOfRange ? [] : slots.filter(...)` using `getUTCHours()` |
| 12 | Calendar renders with theme='auto' without throwing, SSR-safe, no hydration mismatch (automated portion) | VERIFIED | `Calendar.tsx`: `resolvedTheme` via `useState` lazy init returns `'light'` for `'auto'`; `typeof window === 'undefined' \|\| !window.matchMedia` guard in `useEffect([theme])`; no `getEffectiveTheme`; no `state.setView(state.view)`; ssr.test.tsx 2/2 green |
| 13 | onSlotClick fires with full Slot object for available slots only (PKG-04) | VERIFIED | `Calendar.test.tsx` lines 83-116: spy confirmed called once with `{ startUtc, status: 'available' }`; pending slot button disabled, spy not called |
| 14 | Updating the slots prop re-renders without reload (PKG-03) | VERIFIED | `Calendar.test.tsx`: rerender test adds second slot and asserts both buttons visible |
| 15 | Demo app uses UTC Slot shape and builds; browser behavior clean (PKG-05 hydration + PKG-01 local time display) | NEEDS HUMAN | `appStore.ts` and `App.tsx` confirmed migrated to `startUtc`/`endUtc` with `formatSlotTime` import; build passes; BUT browser console hydration check and local-timezone rendering require human observation |

**Score:** 14/15 truths verified (1 requires human confirmation)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/types/index.ts` | Slot with startUtc/endUtc; SlotStatus with pending | VERIFIED | Contains `startUtc: string`, `endUtc: string`, `'pending'` in union; no `startTime`/`endTime` on Slot |
| `src/utils/formatSlotTime.ts` | SSR-safe Intl formatter | VERIFIED | `if (typeof window === 'undefined') return ''`; `Intl.DateTimeFormat` with no `timeZone:` key |
| `src/utils/deriveDate.ts` | UTC date-key extractor | VERIFIED | `return startUtc.slice(0, 10)` — string slice, no Date object |
| `src/index.ts` | Exports deriveDate + formatSlotTime | VERIFIED | Lines 3-4: both utilities exported |
| `src/components/Calendar/Calendar.tsx` | SSR-safe resolvedTheme; startDate/endDate props | VERIFIED | `const [resolvedTheme, setResolvedTheme]`; guard in `useEffect([theme])`; `startDate`/`endDate` in CalendarProps and Provider value |
| `src/components/Calendar/CalendarContext.ts` | startDate/endDate on context type | VERIFIED | Lines 20-21: both optional string fields present |
| `src/hooks/useCalendarState.ts` | startDate param initializes currentDate | VERIFIED | `useCalendarState(defaultView, startDate?)` with `parseISO(startDate)` initializer |
| `src/components/Toolbar/Toolbar.tsx` | Boundary-aware disabled prev/next | VERIFIED | `isPrevDisabled` + `isNextDisabled` computed and applied to all 4 nav buttons |
| `src/components/MonthView/MonthView.tsx` | Out-of-range detection passed to MonthCell | VERIFIED | `isOutOfRange` computed per day; passes `slots=[]` + `isOutOfRange` prop |
| `src/components/MonthView/MonthCell.tsx` | isOutOfRange prop + CSS class | VERIFIED | `isOutOfRange?: boolean` in Props; `'rea-month-cell--out-of-range'` in cellClass |
| `src/components/WeekView/WeekView.tsx` | Out-of-range day filtering (no TimeSlotBlock outside range) | VERIFIED | `isOutOfRange ? [] : slots.filter(...)` in both branches; `getUTCHours()` intact |
| `src/styles/base.css` | .rea-slot--pending + .rea-month-cell--out-of-range rules | VERIFIED | Both rules present with correct tokens and `cursor: not-allowed` |
| `package.json` | version 2.0.0 | VERIFIED | `"version": "2.0.0"` |
| `apps/web/src/store/appStore.ts` | UTC Slot shape in demo store | VERIFIED | `startUtc: string`, `endUtc: string` on StoredSlot; seed produces ISO timestamps |
| `tests/ssr.test.tsx` | theme=auto + matchMedia=undefined tests | VERIFIED | 2 tests, both green |
| `tests/dateRange.test.tsx` | All 5 date-range assertions | VERIFIED | 5 tests green: prev disabled, next disabled, out-of-range class, May 2026 init, WeekView slot suppression |
| `tests/Calendar.test.tsx` | PKG-03 rerender + PKG-04 onSlotClick spy | VERIFIED | 6 tests green including both requirement validations |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `tests/formatSlotTime.test.ts` | `src/utils/formatSlotTime.ts` | `import { formatSlotTime } from '../src/utils/formatSlotTime'` | WIRED | Import present; 3 tests green |
| `tests/deriveDate.test.ts` | `src/utils/deriveDate.ts` | `import { deriveDate } from '../src/utils/deriveDate'` | WIRED | Import present; 3 tests green |
| `src/components/WeekView/WeekView.tsx` | `slot.startUtc` | `new Date(s.startUtc).getUTCHours() === hour` | WIRED | Both headless and styled branches use `getUTCHours()` |
| `src/components/WeekView/TimeSlotBlock.tsx` | `src/utils/formatSlotTime.ts` | `formatSlotTime(slot.startUtc, locale)` for display | WIRED | Import line 2; used in aria-label and rendered text |
| `src/index.ts` | `src/utils/deriveDate.ts` | `export { deriveDate }` | WIRED | Line 3 |
| `src/components/Calendar/Calendar.tsx` | `src/hooks/useCalendarState.ts` | `useCalendarState(defaultView, startDate)` | WIRED | startDate passed as second argument |
| `src/components/Toolbar/Toolbar.tsx` | `context.startDate / context.endDate` | `!isAfter(viewStart, parseISO(startDate))` boundary checks | WIRED | Both flags computed from context; applied to all 4 nav buttons |
| `src/components/MonthView/MonthView.tsx` | `src/components/MonthView/MonthCell.tsx` | `isOutOfRange` prop suppresses slots | WIRED | `slots={isOutOfRange ? [] : ...}` + `isOutOfRange={isOutOfRange}` passed to MonthCell |
| `src/components/WeekView/WeekView.tsx` | `context.startDate / context.endDate` | `parseISO` boundary check short-circuits cellSlots to `[]` | WIRED | `isOutOfRange ? [] : slots.filter(...)` in both branches |
| `src/components/Calendar/Calendar.tsx` | `window.matchMedia` | guarded inside `useEffect` with `typeof window === 'undefined'` check | WIRED | Line 45: `if (typeof window === 'undefined' \|\| !window.matchMedia) return` |
| `apps/web/src/App.tsx` | `react-easy-appointments Slot` | maps store slots to `{ startUtc, endUtc }` | WIRED | Line 34-35: `startUtc: s.startUtc, endUtc: s.endUtc` |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `TimeSlotBlock.tsx` | `slot.startUtc` | Props from WeekView `cellSlots` filter | Yes — filters from host-provided `slots` prop | FLOWING |
| `MonthCell.tsx` | `slot.startUtc` | Props from MonthView `slotsByDate[key]` | Yes — grouped from host-provided `slots` prop | FLOWING |
| `BookingModal.tsx` | `slot.startUtc/endUtc` | Props from parent on slot click | Yes — full Slot object passed on click | FLOWING |
| `AdminPanel.tsx` | `slot.startUtc/endUtc` | `slots` prop from host | Yes — renders from prop; creation form emits local strings (intentional by design) | FLOWING |
| `Toolbar.tsx` | `startDate/endDate` | `CalendarContext` → `Calendar.tsx` props | Yes — props pass through context | FLOWING |
| `apps/web/src/App.tsx` | `slot.startUtc` | `appStore.ts` seeded slots | Yes — `seedSlots()` builds UTC ISO strings | FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite passes (all plans) | `pnpm --filter react-easy-appointments test --run` | 54/54 tests green, 12/12 test files | PASS |
| Package build succeeds (tsup ESM+CJS+DTS) | `pnpm build:pkg` | ESM 53KB, CJS 61KB, DTS 4.25KB — all success in <2s | PASS |
| TypeScript type check exits 0 | `pnpm --filter react-easy-appointments exec tsc --noEmit` | No output (exit 0) | PASS |
| formatSlotTime returns empty on server | `ssr.test.tsx` "matchMedia undefined" test | PASS | PASS |
| deriveDate uses string slice (no timezone shift) | `deriveDate.test.ts` "23:30:00Z → 2026-05-19" test | PASS | PASS |
| onSlotClick fires for available, not pending | `Calendar.test.tsx` PKG-04 test | PASS | PASS |
| Slots prop update re-renders without remount | `Calendar.test.tsx` PKG-03 rerender test | PASS | PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PKG-01 | 01-00, 01-01, 01-03 | UTC storage + Intl local-time rendering | SATISFIED | `startUtc`/`endUtc` on Slot type; `formatSlotTime` with `Intl.DateTimeFormat`; `deriveDate` with string slice; all component display sites updated; browser rendering needs human verification |
| PKG-02 | 01-00, 01-02 | Fixed date range (start/end) with bounded nav | SATISFIED | `startDate`/`endDate` props on Calendar; Toolbar boundary disabling; MonthView/WeekView out-of-range suppression; `rea-month-cell--out-of-range` CSS; dateRange.test.tsx 5/5 green |
| PKG-03 | 01-01, 01-03 | Real-time slot status updates via external state prop | SATISFIED | `slots` prop drives all rendering; `Calendar.test.tsx` rerender test confirms re-render without remount when `slots` changes |
| PKG-04 | 01-03 | Slot selection events emitted for available slots only | SATISFIED | `onSlotClick` spy test confirms fires with `{ startUtc, status: 'available' }`; pending slot button is `disabled`; spy not called for non-available |
| PKG-05 | 01-00, 01-03 | SSR-safe rendering (no hydration mismatch) | SATISFIED (automated) / NEEDS HUMAN (browser) | `resolvedTheme` lazy init returns `'light'`; `matchMedia` guarded in `useEffect([theme])`; `formatSlotTime` returns `''` on server; `ssr.test.tsx` 2/2 green; browser console check required |

No orphaned requirements — all 5 PKG requirements declared in at least one plan and verified above.

---

## Anti-Patterns Found

| File | Pattern | Severity | Assessment |
|------|---------|----------|-----------|
| `src/components/AdminPanel/AdminPanel.tsx` — `startTime`/`endTime` state vars (lines 56-57) | Local HH:MM strings in creation form state | Info | INTENTIONAL — `onCreateSlot(date, startTime, endTime)` callback is explicitly out-of-scope per Plan 01. The host app (`App.tsx`) handles local-to-UTC conversion via `localToUtcIso()`. This is not a stub. |
| `src/components/Calendar/Calendar.tsx` — `resolvedTheme` starts as `'light'` for `theme='auto'` | Server always renders light theme | Info | INTENTIONAL SSR behavior — stable placeholder prevents hydration mismatch. Client `useEffect` updates to system preference after hydration. |

No blockers or warnings found. All identified patterns are intentional by design.

---

## Human Verification Required

### 1. Browser SSR/Hydration + UTC Time Display + Date-Range Visual

**Test:** `cd appoinment-scheduler && pnpm --filter web dev` (or equivalent). Open the printed localhost URL with browser devtools Console open.

**Expected:**
1. No React hydration mismatch warnings in the console (PKG-05)
2. No `window is not defined` or `matchMedia` errors (PKG-05)
3. Seeded slot times display in your local machine timezone (not UTC) (PKG-01)
4. If the demo calendar renders with `startDate`/`endDate`: prev button disabled at start month, next disabled at end month (PKG-02)
5. Days outside the range appear greyed and are not clickable (PKG-02)
6. Available slot click triggers booking modal or `onSlotClick` flow (PKG-03, PKG-04)
7. Pending/booked slots appear in amber/greyed color and are not clickable (PKG-03)

**Optional cross-timezone check:** Restart dev server with `TZ=Asia/Singapore pnpm --filter web dev`, reload, and confirm slot times shift to Singapore local time (confirms PKG-01 Intl rendering).

**Why human:** Visual appearance, browser console output, hydration behavior, and timezone rendering cannot be verified programmatically. This is the explicit blocking checkpoint (Task 4) from Plan 03.

---

## Gaps Summary

No automated gaps found. All 14 programmatically verifiable must-haves pass: 54/54 tests green, build succeeds, TypeScript exits 0, all artifacts substantive and wired.

The single outstanding item (Truth 15) is a browser-only human verification checkpoint explicitly built into the phase plan as a blocking gate. It cannot be resolved by code inspection — it requires running the demo app in a browser and confirming console output and visual behavior.

---

_Verified: 2026-06-16T17:18:00Z_
_Verifier: Claude (gsd-verifier)_
