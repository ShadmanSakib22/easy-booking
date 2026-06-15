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
| types-utc | 01 | 1 | PKG-01 | N/A | type-check | `pnpm --filter react-easy-appointments build` | ⬜ pending |
| slot-display | 01 | 1 | PKG-01 | N/A | unit | `pnpm --filter react-easy-appointments test --run src/__tests__/utcDisplay.test.ts` | ⬜ pending |
| date-range-props | 02 | 1 | PKG-02 | N/A | unit | `pnpm --filter react-easy-appointments test --run src/__tests__/dateRange.test.ts` | ⬜ pending |
| toolbar-disabled | 02 | 1 | PKG-02 | N/A | unit | `pnpm --filter react-easy-appointments test --run src/__tests__/toolbar.test.ts` | ⬜ pending |
| pending-status | 03 | 1 | PKG-03 | N/A | unit | `pnpm --filter react-easy-appointments test --run src/__tests__/slotStatus.test.ts` | ⬜ pending |
| ssr-fix | 04 | 2 | PKG-05 | N/A | unit | `pnpm --filter react-easy-appointments test --run src/__tests__/ssr.test.ts` | ⬜ pending |
| week-view-utc | 01 | 2 | PKG-01 | N/A | unit | `pnpm --filter react-easy-appointments test --run src/__tests__/weekView.test.ts` | ⬜ pending |
| build-check | 05 | 3 | PKG-05 | N/A | build | `pnpm build:pkg` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `appoinment-scheduler/packages/react-easy-appointments/src/__tests__/utcDisplay.test.ts` — stubs for PKG-01 UTC display
- [ ] `appoinment-scheduler/packages/react-easy-appointments/src/__tests__/dateRange.test.ts` — stubs for PKG-02 date range
- [ ] `appoinment-scheduler/packages/react-easy-appointments/src/__tests__/toolbar.test.ts` — stubs for PKG-02 navigation disable
- [ ] `appoinment-scheduler/packages/react-easy-appointments/src/__tests__/slotStatus.test.ts` — stubs for PKG-03 pending status
- [ ] `appoinment-scheduler/packages/react-easy-appointments/src/__tests__/ssr.test.ts` — stubs for PKG-05 SSR safety
- [ ] `appoinment-scheduler/packages/react-easy-appointments/src/__tests__/weekView.test.ts` — stubs for PKG-01 WeekView UTC rendering

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
