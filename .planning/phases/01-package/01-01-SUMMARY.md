---
phase: 01-package
plan: "01"
subsystem: react-easy-appointments
tags: [utc-types, breaking-change, ssr-safe, intl, pending-status, tdd]
dependency_graph:
  requires: [01-00]
  provides: [utc-slot-type, deriveDate-util, formatSlotTime-util, pending-status-css]
  affects: [01-02, 01-03]
tech_stack:
  added: []
  patterns: [Intl.DateTimeFormat, getUTCHours, string-slice-date-key, SSR-guard]
key_files:
  created:
    - appoinment-scheduler/packages/react-easy-appointments/src/utils/deriveDate.ts
    - appoinment-scheduler/packages/react-easy-appointments/src/utils/formatSlotTime.ts
  modified:
    - appoinment-scheduler/packages/react-easy-appointments/src/types/index.ts
    - appoinment-scheduler/packages/react-easy-appointments/src/index.ts
    - appoinment-scheduler/packages/react-easy-appointments/src/components/WeekView/WeekView.tsx
    - appoinment-scheduler/packages/react-easy-appointments/src/components/WeekView/TimeSlotBlock.tsx
    - appoinment-scheduler/packages/react-easy-appointments/src/components/MonthView/MonthCell.tsx
    - appoinment-scheduler/packages/react-easy-appointments/src/components/BookingModal/BookingModal.tsx
    - appoinment-scheduler/packages/react-easy-appointments/src/components/AdminPanel/AdminPanel.tsx
    - appoinment-scheduler/packages/react-easy-appointments/src/styles/base.css
    - appoinment-scheduler/packages/react-easy-appointments/tests/types.test.ts
    - appoinment-scheduler/packages/react-easy-appointments/tests/useSlotsByDate.test.ts
    - appoinment-scheduler/packages/react-easy-appointments/tests/MonthView.test.tsx
    - appoinment-scheduler/packages/react-easy-appointments/tests/WeekView.test.tsx
    - appoinment-scheduler/packages/react-easy-appointments/tests/BookingModal.test.tsx
decisions:
  - "WeekView grid row matching uses getUTCHours() (not getHours()) to keep placement timezone-independent"
  - "formatSlotTime SSR guard uses typeof window === 'undefined' — returns '' on server, Intl result in browser"
  - "deriveDate uses startUtc.slice(0,10) not new Date() to prevent local-timezone shift on UTC date key"
  - "AdminPanel creation form (startTime/endTime useState + onCreateSlot callbacks) intentionally left as local-time strings per plan scope"
  - "Test assertions query by 'available'/'booked' aria-label substring instead of time string to avoid locale-sensitivity"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-16"
  tasks_completed: 3
  files_created: 2
  files_modified: 13
requirements: [PKG-01, PKG-03]
---

# Phase 01 Plan 01: UTC Slot Type + Pending Status Summary

**One-liner:** Breaking UTC slot-time model (startUtc/endUtc) with SSR-safe Intl formatter, string-slice date-key utility, pending status union member, and amber non-interactive CSS styling — all components updated and TypeScript clean.

## What Was Built

Replaced the `startTime`/`endTime` wall-clock string fields on the `Slot` type with `startUtc`/`endUtc` (full UTC ISO 8601 strings). Created two utilities and updated every display component.

### Task 1: Slot type rewrite + utilities + exports

**Commit:** 7c64b90

`src/types/index.ts` — `SlotStatus` now includes `'pending'`; `Slot` uses `startUtc`/`endUtc` instead of `startTime`/`endTime`.

`src/utils/deriveDate.ts` — `deriveDate(startUtc)` returns `startUtc.slice(0,10)`. String-slice only — never constructs a `Date` object — so it cannot shift by local timezone.

`src/utils/formatSlotTime.ts` — `formatSlotTime(utcIso, locale)` returns `''` when `typeof window === 'undefined'` (SSR guard), otherwise formats via `Intl.DateTimeFormat` with no `timeZone` option so the visitor's system timezone is used automatically.

`src/index.ts` — exports `deriveDate` and `formatSlotTime`.

Test fixtures in `tests/types.test.ts` and `tests/useSlotsByDate.test.ts` updated to new UTC shape. 14/14 tests green.

### Task 2: Component updates

**Commit:** fa7efd6

- **WeekView.tsx**: Both headless and styled branches replace `s.startTime === hourStr` with `new Date(s.startUtc).getUTCHours() === hour`. The `hourStr` const removed (no longer needed).
- **TimeSlotBlock.tsx**: Imports `formatSlotTime`, pulls `locale` from context, renders `formatSlotTime(slot.startUtc, locale)` for display and aria-label.
- **MonthCell.tsx**: Same pattern — imports `formatSlotTime`, pulls `locale`, replaces `slot.startTime` in both headless and styled branches.
- **BookingModal.tsx**: Duration computed as `Math.round((new Date(slot.endUtc).getTime() - new Date(slot.startUtc).getTime()) / 60000)`. Display uses `formatSlotTime`.
- **AdminPanel.tsx**: Sort comparator uses `startUtc.localeCompare`; headless list, aria-label, and table cells use `formatSlotTime(slot.startUtc/endUtc)`. Creation form (`startTime`/`endTime` useState, `onCreateSlot`/`onCreateSlots` props) untouched per scope.

Test fixtures in MonthView/WeekView/BookingModal updated to `startUtc`/`endUtc`. Assertions changed from time-string queries (`/09:00/i`) to status-based aria-label queries (`/available/i`, `/booked/i`) to be locale-independent. 15/15 component tests green. TypeScript `tsc --noEmit` exits 0.

### Task 3: Pending-slot CSS

**Commit:** a83f49f

Added `--rea-slot-pending-bg` (amber-600 `#d97706`), `--rea-slot-pending-text` (`#ffffff`), and `--rea-slot-pending-bg-hover` (amber-700 `#b45309`) tokens to the `.rea-calendar` block in `base.css`. Added `.rea-slot--pending` rule mirroring the shape of `.rea-slot--booked` with `cursor: not-allowed` and `opacity: 0.9`. Existing available/booked/unavailable rules unchanged.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all display sites render real UTC-formatted times in the browser. The SSR-side `''` return from `formatSlotTime` is intentional and documented behavior (stable placeholder, not a stub).

## Threat Flags

None — client-side UI library with no new network endpoints, auth paths, file access, or trust boundaries. All inputs are ISO strings from the host app rendered to React-escaped text.

## Self-Check

Files exist check:
- FOUND: appoinment-scheduler/packages/react-easy-appointments/src/utils/deriveDate.ts
- FOUND: appoinment-scheduler/packages/react-easy-appointments/src/utils/formatSlotTime.ts
- FOUND: appoinment-scheduler/packages/react-easy-appointments/src/types/index.ts

Commits exist check:
- FOUND: 7c64b90 (task 1)
- FOUND: fa7efd6 (task 2)
- FOUND: a83f49f (task 3)

## Self-Check: PASSED
