---
phase: 02-firebase-foundation
plan: "04"
subsystem: testing
tags: [firebase, firestore, security-rules, testing, vitest, emulator]
dependency_graph:
  requires:
    - 02-01 (vitest toolchain — recreated here as it was missing from submodule)
    - 02-03 (firestore.rules — rules under test)
  provides:
    - my-app/lib/firebase/__tests__/firestore.rules.test.ts (security rule test suite)
    - my-app/vitest.config.ts (test runner config)
  affects:
    - all future plans that modify firestore.rules (tests must be kept green)
tech_stack:
  added:
    - "@firebase/rules-unit-testing@^5.0.1"
    - vitest@^4.1.9
    - concurrently@^10.0.3
    - tsx@^4.22.4
    - firebase@^12.14.0
    - firebase-admin@^14.0.0
    - server-only@^0.0.1
  patterns:
    - "initializeTestEnvironment (v5 API) — NOT the deprecated initializeTestApp"
    - "withSecurityRulesDisabled for all test data seeding — tests only the rule under examination"
    - "beforeEach clearFirestore() to prevent state leakage between tests"
    - "assertFails/assertSucceeds as the primary test assertion pattern"
key_files:
  created:
    - my-app/lib/firebase/__tests__/firestore.rules.test.ts
    - my-app/vitest.config.ts
  modified:
    - my-app/package.json (added deps and scripts)
    - my-app/pnpm-lock.yaml
decisions:
  - "vitest.config.ts recreated in this plan — it was supposed to be in 02-01 but was absent from submodule commit history"
  - "15 tests written (plan required 13+) — extra 2 tests cover additional slot seeding coverage"
  - "Comment mentioning initializeTestApp in test file is documentation only (says NOT used) — does not violate acceptance criteria"
metrics:
  duration: "10 minutes"
  completed_date: "2026-06-16"
  tasks_completed: 1
  files_created: 2
  files_modified: 2
---

# Phase 02 Plan 04: Firestore Security Rules Test Suite Summary

**One-liner:** 15-test Firestore security rules suite using @firebase/rules-unit-testing v5 across all 5 collections — all GREEN against live emulator at 127.0.0.1:8080.

## What Was Built

Complete security rules test suite proving the access control model from `firestore.rules` (Plan 03) actually works. Tests run against the real Firestore emulator — not mocks — so rule evaluation is genuine.

### Task 1: Write complete Firestore rules test suite (TDD)

- **vitest.config.ts**: node environment, `lib/firebase/__tests__/**/*.test.ts` include glob, 30s timeout per test
- **firestore.rules.test.ts**: 15 tests across 5 describe blocks
  - `users` (3 tests): unauthenticated write rejected, own-doc write allowed, cross-user write rejected
  - `calendars` (5 tests): public calendar read allowed, invite-only read rejected, creator create allowed, non-creator write rejected, unauthenticated create rejected
  - `slots` (3 tests): unauthenticated read allowed, creator create with matching creatorId allowed, non-creator write rejected
  - `bookings` (2 tests): all direct client writes rejected (Admin SDK only), non-creator/non-booker read rejected
  - `invites` (2 tests): authenticated write rejected, authenticated read rejected
- Test result: **15/15 passed** in 3.98s against emulator

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] vitest.config.ts and test:rules script missing from submodule**
- **Found during:** Task 1 setup
- **Issue:** The worktree's `my-app` submodule was at commit `b5ece62` (end of 02-02). Plan 02-01 claimed to create `vitest.config.ts` and `test:rules` script in submodule commit `79fd840`, but that commit does not exist in the submodule's git history. The submodule history only shows 4 commits (ba81652 → bb5c972 → d940ee0 → b5ece62), none containing vitest.config.ts.
- **Fix:** Created `vitest.config.ts` and updated `package.json` with all required dependencies (`@firebase/rules-unit-testing`, `vitest`, `concurrently`, `tsx`, `firebase`, `firebase-admin`, `server-only`) and scripts (`test:rules`, `emulators`, `dev`, `dev:next`, `seed`) as part of this plan.
- **Files modified:** `my-app/vitest.config.ts` (new), `my-app/package.json`, `my-app/pnpm-lock.yaml`
- **Commit (submodule):** 4aa34f9

**2. [Rule 3 - Blocking] node_modules absent from worktree submodule**
- **Found during:** Task 1 dependency check
- **Issue:** The worktree's submodule `my-app` had no `node_modules` — packages had never been installed in this worktree.
- **Fix:** Ran `pnpm install` in the worktree's `my-app` to install all packages.
- **Commit (submodule):** 4aa34f9 (pnpm-lock.yaml updated)

## Threat Model Verification

| Threat ID | Disposition | Status |
|-----------|-------------|--------|
| T-2-04-01 | mitigate | Tests run against the same `firestore.rules` file that `firebase deploy` deploys — no divergence possible |
| T-2-04-02 | accept | All test data uses dummy values (test@example.com, token 123456) — no real credentials |
| T-2-04-03 | mitigate | `beforeEach(() => testEnv.clearFirestore())` wipes data between tests; `afterAll(() => testEnv.cleanup())` confirmed present |

## Known Stubs

None — all 15 tests are complete and passing. No placeholder logic.

## Commits

| Task | Commit (submodule) | Commit (worktree) | Description |
|------|--------------------|-------------------|-------------|
| Task 1 | 4aa34f9 | 0ff477d | feat(02-04): add Firestore security rules test suite |

## Self-Check: PASSED

- `my-app/lib/firebase/__tests__/firestore.rules.test.ts` exists: CONFIRMED
- 15 `it(` calls (plan required 13+): CONFIRMED
- 5 `describe(` calls: CONFIRMED
- `initializeTestEnvironment` imported (v5 API): CONFIRMED
- No `initializeTestApp` usage in code (comment-only mention): CONFIRMED
- `withSecurityRulesDisabled` appears 7 times (plan required 5+): CONFIRMED
- `assertFails|assertSucceeds` appears 17 times (plan required 13+): CONFIRMED
- `readFileSync` path to `../../../../firestore.rules`: CONFIRMED
- All 15 tests GREEN against emulator: CONFIRMED (3.98s run time)
- TypeScript no-emit check: PASSED (0 errors)
- Submodule commit 4aa34f9: CONFIRMED
- Worktree commit 0ff477d: CONFIRMED
