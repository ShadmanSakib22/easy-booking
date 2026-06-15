---
phase: 01-package
plan: "02"
subsystem: react-easy-appointments
tags: [date-range, navigation-bounds, out-of-range, tdd, context-extension]
dependency_graph:
  requires: [01-00, 01-01]
  provides: [startDate-endDate-props, toolbar-boundary-nav, out-of-range-month-cells, out-of-range-week-slots]
  affects: [01-03]
tech_stack:
  added: []
  patterns: [date-fns-boundary-comparison, context-prop-threading, conditional-slot-suppression]
key_files:
  created: []
  modified:
    - appoinment-scheduler/packages/react-easy-appointments/src/components/Calendar/CalendarContext.ts
    - appoinment-scheduler/packages/react-easy-appointments/src/components/Calendar/Calendar.tsx
    - appoinment-scheduler/packages/react-easy-appointments/src/hooks/useCalendarState.ts
    - appoinment-scheduler/packages/react-easy-appointments/src/components/Toolbar/Toolbar.tsx
    - appoinment-scheduler/packages/react-easy-appointments/src/components/MonthView/MonthView.tsx
    - appoinment-scheduler/packages/react-easy-appointments/src/components/MonthView/MonthCell.tsx
    - appoinment-scheduler/packages/react-easy-appointments/src/components/WeekView/WeekView.tsx
    - appoinment-scheduler/packages/react-easy-appointments/src/styles/base.css
decisions:
  - "isPrevDisabled uses !isAfter(viewStart, parseISO(startDate)) — boundary day itself is disabled (viewStart equals startDate means we're at the boundary)"
  - "Toolbar boundary check uses startOfMonth/endOfMonth for month view and startOfWeek/endOfWeek for week view to match full visible range"
  - "MonthView passes slots=[] for out-of-range days rather than filtering inside MonthCell, keeping slot suppression co-located with range logic"
  - "WeekView uses isOutOfRange short-circuit on cellSlots to avoid rendering TimeSlotBlock for out-of-range days — no CSS change needed (slot suppression is sufficient)"
  - "ssr.test.tsx failures confirmed pre-existing (existed before plan 02 changes) — logged as out-of-scope, not fixed here"
metrics:
  duration: "~12 minutes"
  completed: "2026-06-16"
  tasks_completed: 2
  files_created: 0
  files_modified: 8
requirements: [PKG-02]
---

# Phase 01 Plan 02: Date Range Feature Summary

**One-liner:** Optional startDate/endDate props thread through CalendarContext to initialize the view, disable Toolbar nav at boundaries, and grey out plus suppress slots on out-of-range MonthView/WeekView days.

## What Was Built

Added the bounded date-range feature (D-04 through D-07) as a pure additive change: omitting `startDate`/`endDate` preserves all existing unbounded behavior.

### Task 1: startDate/endDate props, context wiring, view initialization, Toolbar boundary disabling

**Commit:** da26ea0

`src/components/Calendar/CalendarContext.ts` — Added `startDate?: string` and `endDate?: string` to `CalendarContextValue`.

`src/hooks/useCalendarState.ts` — Signature updated to `useCalendarState(defaultView, startDate?)`. The `currentDate` initializer now returns `parseISO(startDate)` when `startDate` is provided, otherwise `new Date()`. Import of `parseISO` from date-fns added.

`src/components/Calendar/Calendar.tsx` — Added `startDate?: string` and `endDate?: string` to `CalendarProps`. `CalendarRoot` destructures them and passes `startDate` to `useCalendarState(defaultView, startDate)`. Both are spread into the `CalendarContext.Provider` value.

`src/components/Toolbar/Toolbar.tsx` — Added date-fns imports: `startOfMonth`, `endOfMonth`, `startOfWeek`, `endOfWeek`, `isBefore`, `isAfter`, `parseISO`. Added `weekStartsOn`, `startDate`, `endDate` to context destructure. Computes `viewStart`/`viewEnd` based on current view type, then:
- `isPrevDisabled = startDate ? !isAfter(viewStart, parseISO(startDate)) : false`
- `isNextDisabled = endDate ? !isBefore(viewEnd, parseISO(endDate)) : false`

Both headless and styled Previous/Next buttons receive `disabled={isPrevDisabled}` and `disabled={isNextDisabled}` respectively.

Test results: 20/21 passing (the 1 remaining failure was the out-of-range CSS class test — Task 2's work).

### Task 2: Out-of-range date suppression in MonthView and WeekView

**Commit:** 73eb8ad

`src/components/MonthView/MonthView.tsx` — Pulls `startDate`, `endDate` from context. Imports `parseISO`, `isBefore`, `isAfter` from date-fns. Inside `days.map`, computes `rangeStart`/`rangeEnd` and derives `isOutOfRange`. Passes `slots={isOutOfRange ? [] : (slotsByDate[key] ?? [])}` and `isOutOfRange={isOutOfRange}` to `MonthCell`.

`src/components/MonthView/MonthCell.tsx` — Added `isOutOfRange?: boolean` to `Props` (default `false`). The `cellClass` array now includes `isOutOfRange && 'rea-month-cell--out-of-range'`. Empty `slots` from MonthView ensures no slot buttons render on out-of-range days.

`src/components/WeekView/WeekView.tsx` — Pulls `startDate`, `endDate` from context. Imports `parseISO`, `isBefore`, `isAfter`. Computes `rangeStart`/`rangeEnd` once before the branch split. In BOTH headless and styled branches, inside `days.map`, computes `isOutOfRange` per day and short-circuits `cellSlots` to `[]` when out of range. `getUTCHours()` filter from Plan 01 remains intact.

`src/styles/base.css` — Added `.rea-month-cell--out-of-range` rule:
```css
.rea-month-cell--out-of-range { opacity: 0.4; background: var(--rea-cell-disabled-bg, #f1f1f1); }
.rea-month-cell--out-of-range .rea-month-cell__date-number { color: var(--rea-text-muted, #999); }
```

Test results: All 15 dateRange + MonthView + WeekView tests green. Full suite 50/52 (2 pre-existing ssr.test.tsx failures unrelated to this plan).

## Deviations from Plan

### Out-of-scope issue logged (not fixed)

**ssr.test.tsx — 2 pre-existing failures**
- **Found during:** Final full-suite run
- **Confirmed pre-existing:** Ran `git stash` + tests on previous commit — same 2 failures present before any plan 02 changes
- **Action:** Logged as out-of-scope; not fixed in this plan
- **Files modified:** None

## Known Stubs

None — all date-range logic is fully wired. The `--rea-cell-disabled-bg` and `--rea-text-muted` CSS custom property fallbacks (`#f1f1f1`, `#999`) are intentional defaults, not stubs.

## Threat Flags

None — client-side UI library with no new network endpoints, auth paths, file access, or trust boundaries. `parseISO` on invalid date strings yields `Invalid Date` which degrades gracefully (no constraint applied), consistent with T-01-02-01 accepted risk in the threat model.

## Self-Check

Files exist check:
- FOUND: appoinment-scheduler/packages/react-easy-appointments/src/components/Calendar/CalendarContext.ts
- FOUND: appoinment-scheduler/packages/react-easy-appointments/src/components/Calendar/Calendar.tsx
- FOUND: appoinment-scheduler/packages/react-easy-appointments/src/hooks/useCalendarState.ts
- FOUND: appoinment-scheduler/packages/react-easy-appointments/src/components/Toolbar/Toolbar.tsx
- FOUND: appoinment-scheduler/packages/react-easy-appointments/src/components/MonthView/MonthView.tsx
- FOUND: appoinment-scheduler/packages/react-easy-appointments/src/components/MonthView/MonthCell.tsx
- FOUND: appoinment-scheduler/packages/react-easy-appointments/src/components/WeekView/WeekView.tsx
- FOUND: appoinment-scheduler/packages/react-easy-appointments/src/styles/base.css

Commits exist check:
- FOUND: da26ea0 (task 1)
- FOUND: 73eb8ad (task 2)

## Self-Check: PASSED
