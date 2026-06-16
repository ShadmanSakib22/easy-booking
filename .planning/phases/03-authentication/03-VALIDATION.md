---
phase: 03
slug: authentication
status: final
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-17
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.9 |
| **Config file** | `my-app/vitest.config.ts` — currently scoped to `lib/firebase/__tests__/**/*.test.ts`; needs widening for new auth tests |
| **Quick run command** | `cd my-app && pnpm test:rules` |
| **Full suite command** | `cd my-app && pnpm test:rules` (no separate full suite exists yet) |
| **Estimated runtime** | ~10-20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd my-app && pnpm test:rules`
- **After every plan wave:** Run `cd my-app && pnpm test:rules`
- **Before `/gsd-verify-work`:** Full suite must be green, plus manual verification pass for AUTH-04 (Google OAuth) and AUTH-07 (cross-restart persistence)
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-T3 | 01 | 1 | AUTH-01 | — | Sign-up creates Firebase Auth user + Firestore doc | integration | `pnpm test:rules` (`auth.test.ts`) | ✅ | ⬜ pending |
| 03-04-T1 | 04 | 3 | AUTH-02 | — | Unverified user blocked by `requireVerified` mechanism | unit/integration | `pnpm test:rules` (`auth.test.ts` / Guard logic) | ✅ | ⬜ pending |
| 03-03-T1 | 03 | 2 | AUTH-03 | — | Sign-in succeeds/fails correctly, friendly error mapping | integration | `pnpm test:rules` (`auth.test.ts`) | ✅ | ⬜ pending |
| 03-05-T2 | 05 | 4 | AUTH-04 | — | Google sign-in completes and creates/links user | manual | manual checkpoint | ✅ (manual) | ⬜ pending |
| 03-03-T2 | 03 | 2 | AUTH-05 | — | Password reset email sent for existing account | integration | `pnpm test:rules` (`auth.test.ts`) | ✅ | ⬜ pending |
| 03-05-T1 | 05 | 4 | AUTH-06 | — | Password change succeeds; re-auth required on `requires-recent-login` | integration | `pnpm test:rules` (`auth.test.ts` extended) | ✅ | ⬜ pending |
| 03-05-T2 | 05 | 4 | AUTH-07 | — | Session persists across browser close/reopen | manual | manual checkpoint | ✅ (manual) | ⬜ pending |
| 03-02-T1 | 02 | 2 | AUTH-08 | — | Custom pages exist and route correctly | smoke | route-existence check | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `my-app/lib/firebase/__tests__/auth.test.ts` — covers AUTH-01, AUTH-03, AUTH-05, AUTH-06 against the Auth emulator (`connectAuthEmulator`), created in 03-01-PLAN.md Task 3, extended in 03-05-PLAN.md
- [x] `my-app/vitest.config.ts` — `include` glob widened to cover `auth.test.ts` in 03-01-PLAN.md
- [x] Decided: defer `@testing-library/react` install — Guard.tsx redirect logic covered via manual QA + integration tests, not component tests (per 03-04-PLAN.md)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Google OAuth sign-in completes and creates/links user | AUTH-04 | Firebase Auth emulator's Google provider simulation is limited; full OAuth round-trip requires a real browser + real Google account | Sign in with a real Google account in a real browser; verify Firestore user doc is created/linked and `emailVerified: true` |
| Session persists across browser close/reopen | AUTH-07 | `browserLocalPersistence` depends on real browser storage; jsdom only partially emulates this | Sign in, fully close the browser, reopen, navigate to a protected route — confirm still signed in |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 20s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-17 (verified against 5 finalized plans by gsd-plan-checker; no unmitigated high-severity threats, no missing automated verifies outside documented manual-only exceptions)
