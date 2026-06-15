---
phase: 01-package
plan: "03"
subsystem: react-easy-appointments
tags: [ssr-safe, theme-resolution, utc-migration, demo-app, version-bump, tdd]
dependency_graph:
  requires: [01-00, 01-01, 01-02]
  provides: [ssr-safe-theme, pkgv2.0.0, demo-utc-migration, onSlotClick-verified, realtime-verified]
  affects: []
tech_stack:
  added: []
  patterns: [useState-lazy-init, useEffect-cleanup, client-only-guard, local-to-utc-conversion]
key_files:
  created: []
  modified:
    - appoinment-scheduler/packages/react-easy-appointments/src/components/Calendar/Calendar.tsx
    - appoinment-scheduler/packages/react-easy-appointments/package.json
    - appoinment-scheduler/packages/react-easy-appointments/tests/Calendar.test.tsx
    - appoinment-scheduler/apps/web/src/store/appStore.ts
    - appoinment-scheduler/apps/web/src/App.tsx
decisions:
  - "useState lazy initializer sets 'light' for theme='auto' so SSR renders stable HTML with no hydration mismatch"
  - "useEffect deps=[theme] only (not [theme,state]) eliminates infinite-render risk from old state.setView(state.view) hack"
  - "typeof window === 'undefined' || !window.matchMedia guard protects matchMedia call in jsdom/SSR environments"
  - "Admin Panel onCreateSlot still emits local HH:MM strings (per plan 01 scope); App.tsx localToUtcIso() handles conversion"
  - "Demo app uses formatSlotTime(slot.startUtc) so appointment display shows visitor-local time"
metrics:
  duration: "~10 minutes"
  completed: "2026-06-16"
  tasks_completed: 3
  files_created: 0
  files_modified: 5
requirements: [PKG-01, PKG-03, PKG-04, PKG-05]
---

# Phase 01 Plan 03: SSR Safety, onSlotClick Verification, Demo Migration, v2.0.0 Summary

**One-liner:** SSR-safe state-based theme resolution removes infinite-render bug and matchMedia crash; onSlotClick and real-time slot-prop contracts verified by tests; demo app migrated to UTC Slot shape with formatSlotTime; package bumped to 2.0.0.

## What Was Built

Fixed the Calendar theme resolution to be SSR-safe and infinite-render-free, verified the two "no code change needed" requirements (PKG-03, PKG-04) with explicit tests, migrated the demo app to the new UTC Slot contract, and bumped the package to 2.0.0.

### Task 1: SSR-safe state-based theme resolution (PKG-05)

**Commits:** 1d489e0 (RED test), f9710b5 (GREEN implementation)

`src/components/Calendar/Calendar.tsx` — Replaced the buggy synchronous `getEffectiveTheme()` + `useEffect([theme, state])` pattern with:

```typescript
const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
  theme === 'auto' ? 'light' : theme
)
useEffect(() => {
  if (theme !== 'auto') { setResolvedTheme(theme); return }
  if (typeof window === 'undefined' || !window.matchMedia) return
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  setResolvedTheme(mq.matches ? 'dark' : 'light')
  const handler = (e: MediaQueryListEvent) => setResolvedTheme(e.matches ? 'dark' : 'light')
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}, [theme])
```

The lazy initializer returns `'light'` for `'auto'` so SSR always renders the same HTML. `resolvedTheme` replaces `effectiveTheme` in both `rootClass` and the Provider value. The `matchMedia` listener is registered and cleaned up on the client only.

`tests/Calendar.test.tsx` — Added PKG-03 real-time slots-rerender test: render with one slot, rerender with two, assert both buttons visible without remount. All 7 tests green (ssr.test.tsx 2/2, Calendar.test.tsx 5/5).

### Task 2: onSlotClick contract verification (PKG-04) + demo app UTC migration

**Commits:** e52855a (PKG-04 test), bc7878a (demo migration)

`tests/Calendar.test.tsx` — Added PKG-04 test: spy on `onSlotClick`, click available slot → spy called once with `{ startUtc, status: 'available' }`; pending slot button is disabled, spy not called again. No implementation changes needed — existing behavior confirmed.

`apps/web/src/store/appStore.ts` — `StoredSlot` now uses `startUtc`/`endUtc` ISO strings. `seedSlots()` builds UTC timestamps as `${dateStr}T${HH}:00:00Z`. `slotsOverlap()` compares via `new Date().getTime()`. `createSlot`/`createSlots` signatures updated. `timeToMinutes` helper removed (no longer needed).

`apps/web/src/App.tsx` — `storedSlots.map` sets `startUtc: s.startUtc, endUtc: s.endUtc`. Imports `formatSlotTime` from `react-easy-appointments`. Appointment display uses `formatSlotTime(slot.startUtc)`. Added `localToUtcIso()` helper + `handleCreateSlot`/`handleCreateSlots` wrappers that convert AdminPanel's local HH:MM strings to UTC ISO before storing.

### Task 3: Version bump to 2.0.0 and full build

**Commit:** 8c57060

`package.json` version changed from `1.0.0` to `2.0.0`. `pnpm build:pkg` exits 0 (tsup ESM + CJS + DTS). `tsc --noEmit` exits 0. Full test suite: 54/54 tests green across all Plan 00-03 test files.

### Task 4: Human verification checkpoint

Paused for human verification of the demo app runtime behavior (SSR hydration, local timezone display, date-range navigation, slot click flow).

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all UTC slot times are wired end-to-end. The `formatSlotTime` SSR `''` return is intentional documented behavior (stable server placeholder), not a stub.

## Threat Flags

None — client-side UI library with no new network endpoints, auth paths, file access, or trust boundaries. The `localToUtcIso` conversion in the demo app is demo-only and uses `new Date(dateStr + 'T' + time).toISOString()` which is host-local-time-based by design (documented in code comment).

## Self-Check

Files exist:
- FOUND: appoinment-scheduler/packages/react-easy-appointments/src/components/Calendar/Calendar.tsx
- FOUND: appoinment-scheduler/packages/react-easy-appointments/package.json
- FOUND: appoinment-scheduler/packages/react-easy-appointments/tests/Calendar.test.tsx
- FOUND: appoinment-scheduler/apps/web/src/store/appStore.ts
- FOUND: appoinment-scheduler/apps/web/src/App.tsx

Commits exist:
- FOUND: 1d489e0 (PKG-03 RED test)
- FOUND: f9710b5 (SSR-safe theme implementation)
- FOUND: e52855a (PKG-04 verification test)
- FOUND: bc7878a (demo app UTC migration)
- FOUND: 8c57060 (version bump 2.0.0)

## Self-Check: PASSED
