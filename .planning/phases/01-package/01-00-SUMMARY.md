---
phase: 01-package
plan: "00"
subsystem: react-easy-appointments
tags: [tdd, testing, red-phase, nyquist, contracts]
dependency_graph:
  requires: []
  provides: [test-contracts-formatSlotTime, test-contracts-deriveDate, test-contracts-dateRange, test-contracts-ssr]
  affects: [01-01, 01-02, 01-03]
tech_stack:
  added: []
  patterns: [vitest, testing-library, red-green-refactor]
key_files:
  created:
    - appoinment-scheduler/packages/react-easy-appointments/tests/formatSlotTime.test.ts
    - appoinment-scheduler/packages/react-easy-appointments/tests/deriveDate.test.ts
    - appoinment-scheduler/packages/react-easy-appointments/tests/dateRange.test.tsx
    - appoinment-scheduler/packages/react-easy-appointments/tests/ssr.test.tsx
  modified: []
decisions:
  - "Use vi.stubGlobal for SSR window simulation in formatSlotTime tests rather than process.env NODE_ENV tricks"
  - "deriveDate tests use string literals (not new Date()) to prove slice-based implementation is required"
  - "dateRange.test.tsx uses Slot shape with startUtc/endUtc to lock the new type contract before Plan 01 lands"
metrics:
  duration: "~8 minutes"
  completed: "2026-06-16"
  tasks_completed: 2
  files_created: 4
  files_modified: 0
requirements: [PKG-01, PKG-02, PKG-05]
---

# Phase 01 Plan 00: Test Contract Stubs (RED Phase) Summary

**One-liner:** Four failing Vitest test files locking the formatSlotTime, deriveDate, date-range, and SSR contracts before any implementation lands.

## What Was Built

Created four test files in the `react-easy-appointments` package that define behavioral contracts for Plans 01-03. All tests are intentionally RED — they fail because the implementation modules and props do not exist yet.

### Task 1: Unit test stubs for formatSlotTime and deriveDate

**Commit:** b264f88

`tests/formatSlotTime.test.ts` — 3 tests:
- SSR-safe window guard: `vi.stubGlobal('window', undefined)` confirms empty string return on server
- Browser mode: non-empty string with a digit returned
- Locale parameter: no throw on alternate locale

`tests/deriveDate.test.ts` — 3 tests:
- Standard UTC date extraction
- Late-night UTC (23:30) proves string slice is used, not a timezone-sensitive Date object
- Midnight UTC edge case

**Why these tests fail:** `src/utils/formatSlotTime.ts` and `src/utils/deriveDate.ts` do not exist yet.

### Task 2: Component test stubs for date range and SSR

**Commit:** ead5aa6

`tests/dateRange.test.tsx` — 5 tests using the new `Slot` shape with `startUtc`/`endUtc`:
- Prev button disabled at startDate boundary
- Next button disabled at endDate boundary
- `.rea-month-cell--out-of-range` CSS class applied to out-of-range cells
- Calendar initializes to startDate month (not today)
- WeekView suppresses slots whose `date` falls outside the date range

`tests/ssr.test.tsx` — 2 tests:
- `theme="auto"` renders without throwing
- `window.matchMedia = undefined` (absent matchMedia in older jsdom/SSR) does not crash

**Why these tests fail:** `startDate`/`endDate` props do not exist on CalendarProps, the new Slot shape's `startUtc`/`endUtc` fields are not in the type definition, `.rea-month-cell--out-of-range` is not emitted, and the WeekView has no out-of-range guard.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this plan creates test stubs intentionally. The stubs are the deliverable; they are not incomplete implementations.

## Threat Flags

None — test-only code with no network calls, auth, persistence, or trust boundaries crossed.

## Self-Check

Files exist check:
- FOUND: appoinment-scheduler/packages/react-easy-appointments/tests/formatSlotTime.test.ts
- FOUND: appoinment-scheduler/packages/react-easy-appointments/tests/deriveDate.test.ts
- FOUND: appoinment-scheduler/packages/react-easy-appointments/tests/dateRange.test.tsx
- FOUND: appoinment-scheduler/packages/react-easy-appointments/tests/ssr.test.tsx

Commits exist check:
- FOUND: b264f88 (task 1)
- FOUND: ead5aa6 (task 2)

## Self-Check: PASSED
