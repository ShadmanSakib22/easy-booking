---
phase: 1
slug: package
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-16
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `appoinment-scheduler/packages/react-easy-appointments/vitest.config.ts` |
| **Quick run command** | `pnpm --filter react-easy-appointments test --run` |
| **Full suite command** | `pnpm --filter react-easy-appointments test --run --reporter=verbose` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter react-easy-appointments test --run`
- **After every plan wave:** Run `pnpm --filter react-easy-appointments test --run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|--------|
| wave0-units | 00 | 0 | PKG-01, PKG-05 | N/A | unit (RED) | `pnpm --filter react-easy-appointments test --run tests/formatSlotTime.test.ts tests/deriveDate.test.ts` | ⬜ pending |
| wave0-components | 00 | 0 | PKG-02, PKG-05 | N/A | component (RED) | `pnpm --filter react-easy-appointments test --run tests/dateRange.test.tsx tests/ssr.test.tsx` | ⬜ pending |
| types-utc + utilities | 01 | 1 | PKG-01 | N/A | type + unit | `pnpm --filter react-easy-appointments test --run tests/deriveDate.test.ts tests/formatSlotTime.test.ts tests/types.test.ts tests/useSlotsByDate.test.ts` | ⬜ pending |
| slot-display (components) | 01 | 1 | PKG-01, PKG-03 | N/A | component | `pnpm --filter react-easy-appointments test --run tests/MonthView.test.tsx tests/WeekView.test.tsx tests/BookingModal.test.tsx` | ⬜ pending |
| date-range-props + toolbar | 02 | 2 | PKG-02 | N/A | component | `pnpm --filter react-easy-appointments test --run tests/dateRange.test.tsx tests/Toolbar.test.tsx tests/Calendar.test.tsx tests/useCalendarState.test.ts` | ⬜ pending |
| out-of-range (Month + Week) | 02 | 2 | PKG-02 | N/A | component | `pnpm --filter react-easy-appointments test --run tests/dateRange.test.tsx tests/MonthView.test.tsx tests/WeekView.test.tsx` | ⬜ pending |
| ssr-fix + realtime | 03 | 3 | PKG-03, PKG-05 | N/A | component | `pnpm --filter react-easy-appointments test --run tests/ssr.test.tsx tests/Calendar.test.tsx` | ⬜ pending |
| onSlotClick + demo migrate | 03 | 3 | PKG-04 | N/A | component | `pnpm --filter react-easy-appointments test --run tests/Calendar.test.tsx tests/MonthView.test.tsx` | ⬜ pending |
| build-check | 03 | 3 | PKG-05 | N/A | build | `pnpm build:pkg` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 (Plan 00) creates these failing (RED) test stubs under `tests/`:

- [ ] `appoinment-scheduler/packages/react-easy-appointments/tests/formatSlotTime.test.ts` — stubs for PKG-01 UTC display + PKG-05 SSR-safe empty-string-on-server
- [ ] `appoinment-scheduler/packages/react-easy-appointments/tests/deriveDate.test.ts` — stubs for PKG-01 UTC date-key derivation
- [ ] `appoinment-scheduler/packages/react-easy-appointments/tests/dateRange.test.tsx` — stubs for PKG-02 date-range props, toolbar prev/next disable, out-of-range greying (MonthView and WeekView)
- [ ] `appoinment-scheduler/packages/react-easy-appointments/tests/ssr.test.tsx` — stubs for PKG-05 SSR safety (theme="auto", matchMedia undefined)

PKG-03 (pending status), PKG-04 (onSlotClick), and the remaining PKG-01 WeekView/MonthView cases are added to EXISTING test files (`tests/types.test.ts`, `tests/MonthView.test.tsx`, `tests/WeekView.test.tsx`, `tests/Calendar.test.tsx`) during their implementing plans — no new Wave 0 files needed for those.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visitor in UTC+8 sees correct local time | PKG-01 | Requires timezone override or real cross-TZ testing | Set `TZ=Asia/Singapore` in shell, run demo app, verify slot times shift correctly |
| SSR hydration mismatch absent | PKG-05 | Requires Next.js SSR runtime | Open demo app in Next.js dev mode, check browser console for hydration warnings |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
