---
phase: 02-firebase-foundation
plan: "04"
subsystem: testing
tags: [firebase, firestore, security-rules, testing, vitest, emulator]
dependency_graph:
  requires:
    - 02-01 (Firebase deps in package.json)
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
    - my-app/package.json (added test:rules script)
decisions:
  - "vitest.config.ts created in this plan alongside the test file — both committed together"
  - "15 tests written (plan required 13+)"
  - "test:rules script added to package.json running vitest run"
metrics:
  duration: "5 minutes"
  completed_date: "2026-06-16"
  tasks_completed: 1
  files_created: 2
  files_modified: 1
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
- Test result: **15/15 passed** in 2.59s against emulator

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] vitest.config.ts missing from submodule**
- **Found during:** Task 1 setup
- **Issue:** `vitest.config.ts` was not present in the submodule — previous wave execution was lost when the worktree was cleaned. This plan re-creates it as a recovery operation.
- **Fix:** Created `vitest.config.ts` with node environment config and updated `package.json` with the `test:rules` script.
- **Files modified:** `my-app/vitest.config.ts` (new), `my-app/package.json`
- **Commit (submodule):** 8a49570

## Threat Model Verification

| Threat ID | Disposition | Status |
|-----------|-------------|--------|
| T-2-04-01 | mitigate | Tests run against the same `firestore.rules` file that `firebase deploy` deploys — no divergence possible |
| T-2-04-02 | accept | All test data uses dummy values (test@example.com, token 123456) — no real credentials |
| T-2-04-03 | mitigate | `beforeEach(() => testEnv.clearFirestore())` wipes data between tests; `afterAll(() => testEnv.cleanup())` confirmed present |

## Known Stubs

None — all 15 tests are complete and passing. No placeholder logic.

## Commits

| Task | Commit (submodule) | Commit (parent repo) | Description |
|------|--------------------|----------------------|-------------|
| Task 1 | 8a49570 | 0c8d144 | feat(02-04): add Firestore security rules test suite |

## Self-Check: PASSED

- `my-app/lib/firebase/__tests__/firestore.rules.test.ts` exists: CONFIRMED
- 15 `it(` calls (plan required 13+): CONFIRMED
- 5 `describe(` calls: CONFIRMED
- `initializeTestEnvironment` imported (v5 API): CONFIRMED
- `withSecurityRulesDisabled` appears 7 times (plan required 5+): CONFIRMED
- `assertFails|assertSucceeds` appears 17 times (plan required 13+): CONFIRMED
- `readFileSync` path to `../../../../firestore.rules`: CONFIRMED
- All 15 tests GREEN against emulator: CONFIRMED (2.59s run time)
- Submodule commit 8a49570: CONFIRMED
- Parent repo commit 0c8d144: CONFIRMED
