---
phase: 03
slug: authentication
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| TBD | TBD | 0 | AUTH-01 | — | Sign-up creates Firebase Auth user + Firestore doc | integration | `pnpm test:rules` (extend `auth.test.ts`) | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | AUTH-02 | — | Unverified user blocked by `requireVerified` mechanism | unit | new `Guard.test.tsx` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | AUTH-03 | — | Sign-in succeeds/fails correctly, friendly error mapping | integration | `pnpm test:rules` (extend `auth.test.ts`) | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | AUTH-04 | — | Google sign-in completes and creates/links user | manual | manual checklist | ❌ W0 (manual) | ⬜ pending |
| TBD | TBD | 0 | AUTH-05 | — | Password reset email sent for existing account | integration | `pnpm test:rules` (extend `auth.test.ts`) | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | AUTH-06 | — | Password change succeeds; re-auth required on `requires-recent-login` | integration | `pnpm test:rules` (extend `auth.test.ts`) | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | AUTH-07 | — | Session persists across browser close/reopen | manual | manual checklist | ❌ W0 (manual) | ⬜ pending |
| TBD | TBD | 0 | AUTH-08 | — | Custom pages exist and route correctly | smoke | route-existence check or manual QA | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `my-app/lib/firebase/__tests__/auth.test.ts` — covers AUTH-01, AUTH-03, AUTH-05, AUTH-06 against the Auth emulator (`connectAuthEmulator`, not `@firebase/rules-unit-testing`)
- [ ] `my-app/vitest.config.ts` — widen `include` glob to cover new auth test files; add `jsdom`/`happy-dom` environment if `Guard.tsx` component tests are added
- [ ] Decide whether to install `@testing-library/react` for `Guard.tsx` redirect-logic tests, or defer to manual QA

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Google OAuth sign-in completes and creates/links user | AUTH-04 | Firebase Auth emulator's Google provider simulation is limited; full OAuth round-trip requires a real browser + real Google account | Sign in with a real Google account in a real browser; verify Firestore user doc is created/linked and `emailVerified: true` |
| Session persists across browser close/reopen | AUTH-07 | `browserLocalPersistence` depends on real browser storage; jsdom only partially emulates this | Sign in, fully close the browser, reopen, navigate to a protected route — confirm still signed in |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
