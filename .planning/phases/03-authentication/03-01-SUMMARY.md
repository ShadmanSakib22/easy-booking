---
phase: 03-authentication
plan: 01
subsystem: auth
tags: [firebase-auth, zod, react-hook-form, vitest, shadcn]

# Dependency graph
requires:
  - phase: 02-firebase-foundation
    provides: Firebase client SDK singleton (lib/firebase/client.ts), emulator-aware setup, Firestore rules test harness pattern
provides:
  - getAuthErrorMessage(code) centralized Firebase Auth error-to-message map
  - Zod schemas for sign-up, sign-in, forgot-password, change-password, username
  - AuthProvider/useAuth() React context wrapping onAuthStateChanged
  - Auth-emulator-backed integration test suite (auth.test.ts) covering AUTH-01, AUTH-03, AUTH-05
  - button.tsx font-semibold weight fix per UI-SPEC
affects: [03-authentication remaining plans (sign-up/verify-email, sign-in/Google/forgot-password, Guard.tsx/onboarding, account security)]

# Tech tracking
tech-stack:
  added: [react-hook-form@7.79.0, zod@4.4.3, "@hookform/resolvers@5.4.0"]
  patterns:
    - "Centralized Firebase Auth error map prevents raw SDK error codes reaching UI; account-enumeration-sensitive codes unified to one message"
    - "Zod schemas as single source of truth for auth form field shapes, shared by future react-hook-form integrations"
    - "React context + onAuthStateChanged for app-wide auth state via useAuth()"
    - "Auth emulator integration tests via firebase/auth client SDK + connectAuthEmulator (not @firebase/rules-unit-testing, which is rules-only)"

key-files:
  created:
    - my-app/lib/firebase/auth-errors.ts
    - my-app/lib/firebase/auth-schemas.ts
    - my-app/components/auth/AuthProvider.tsx
    - my-app/lib/firebase/__tests__/auth.test.ts
  modified:
    - my-app/package.json
    - my-app/pnpm-lock.yaml
    - my-app/components/ui/button.tsx
    - my-app/.gitignore

key-decisions:
  - "Installed zod ^4.x and @hookform/resolvers ^5.x (current latest majors) instead of CLAUDE.md's stale ^3.x reference, per RESEARCH.md Open Question guidance — nothing else in package.json pinned zod to 3.x"
  - "signUpSchema/changePasswordSchema enforce 8-char password minimum, stricter than Firebase's own 6-char floor, as an intentional product-level security choice"
  - "wrong-password, invalid-credential, and user-not-found Firebase error codes all map to the identical generic message to prevent account enumeration (T-03-01)"

patterns-established:
  - "Pattern: any future auth form imports getAuthErrorMessage from lib/firebase/auth-errors.ts rather than displaying err.code or err.message directly"
  - "Pattern: any future auth form imports its Zod schema from lib/firebase/auth-schemas.ts as the single source of truth for field validation"
  - "Pattern: any component needing auth state calls useAuth() from components/auth/AuthProvider.tsx rather than re-subscribing to onAuthStateChanged"

requirements-completed: [AUTH-01, AUTH-03, AUTH-05, AUTH-07]

# Metrics
duration: 35min
completed: 2026-06-17
---

# Phase 03 Plan 01: Auth Foundation Summary

**Centralized Firebase Auth error map, Zod validation schemas, and AuthProvider context wired up with a 4-test emulator-backed integration suite proving sign-up/sign-in/password-reset end-to-end.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3
- **Files modified:** 8 (4 created, 4 modified)

## Accomplishments
- Installed `react-hook-form`, `zod` (^4.x), `@hookform/resolvers` (^5.x) with matching majors
- Fixed `components/ui/button.tsx` base class weight from `font-medium` to `font-semibold` per UI-SPEC, zero remaining occurrences
- Built `getAuthErrorMessage()` covering 10 Firebase Auth error codes plus fallback, with account-enumeration mitigation (T-03-01)
- Built 5 Zod schemas (`signUpSchema`, `signInSchema`, `forgotPasswordSchema`, `changePasswordSchema`, `usernameSchema`) as the single source of truth for auth form validation
- Built `AuthProvider`/`useAuth()` exposing `{ user, loading, emailVerified }` app-wide via `onAuthStateChanged`
- Added `lib/firebase/__tests__/auth.test.ts` with 4 passing tests against the Firebase Auth emulator (sign-up, sign-in success, sign-in wrong-password, password-reset request) — full suite run shows 19/19 tests passing (15 existing Firestore rules tests + 4 new)

## Task Commits

Each task was committed atomically in the `my-app` submodule, followed by a parent-repo submodule-pointer-update commit:

1. **Task 1: Install packages and apply button weight override** - `my-app@b454b42` (feat) / parent `31abe79` (chore)
2. **Task 2: Centralized error map and Zod schemas** - `my-app@f046c3d` (feat) / parent `df6e4b7` (chore)
3. **Task 3: AuthProvider context + Wave-0 auth emulator tests** - `my-app@adddcfe` (feat) / parent `b4c09b3` (chore)

## Files Created/Modified
- `my-app/lib/firebase/auth-errors.ts` - `getAuthErrorMessage(code)` Firebase Auth error-to-message map
- `my-app/lib/firebase/auth-schemas.ts` - Zod schemas for sign-up/sign-in/forgot-password/change-password/username
- `my-app/components/auth/AuthProvider.tsx` - React context + `useAuth()` hook wrapping `onAuthStateChanged`
- `my-app/lib/firebase/__tests__/auth.test.ts` - 4 emulator-backed integration tests (AUTH-01, AUTH-03 x2, AUTH-05)
- `my-app/package.json` / `my-app/pnpm-lock.yaml` - added react-hook-form, zod, @hookform/resolvers
- `my-app/components/ui/button.tsx` - `font-medium` → `font-semibold` base class fix
- `my-app/.gitignore` - added emulator debug log patterns (hygiene fix, see Deviations)

## Decisions Made
- zod ^4.x / @hookform/resolvers ^5.x chosen over CLAUDE.md's stale ^3.x reference, per RESEARCH.md guidance — confirmed no other dependency pins zod to 3.x
- 8-character minimum password (stricter than Firebase's 6-char floor) is intentional, not weakened
- Account-enumeration mitigation: `wrong-password`/`invalid-credential`/`user-not-found` unified to one message

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking/Hygiene] Ignored Firebase emulator debug logs**
- **Found during:** Task 3 (running auth emulator to verify auth.test.ts)
- **Issue:** Starting the Firebase Auth + Firestore emulators to run the verification command generated `firebase-debug.log` and `firestore-debug.log` as untracked files in `my-app/`, not covered by the existing `.gitignore` debug-log patterns (which only matched npm/yarn/pnpm debug logs)
- **Fix:** Added `firebase-debug.log`, `firestore-debug.log`, `ui-debug.log` to `my-app/.gitignore`; removed the generated log files before committing
- **Files modified:** my-app/.gitignore
- **Verification:** `git status --short` shows no untracked files after the fix
- **Committed in:** my-app@adddcfe (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking/hygiene)
**Impact on plan:** Minor hygiene fix required to keep the repo clean after running the emulator for verification. No scope creep, no architectural change.

## Issues Encountered
None — plan executed without blockers. A previous worktree-isolated attempt at this plan had its submodule commits lost; this execution started from the clean reset state (parent at b3559f6, my-app at a59bf8c) and rebuilt all three tasks from scratch as instructed.

## User Setup Required
None - no external service configuration required. Firebase Auth/Firestore emulators were started locally for verification only and are not part of the committed state.

## Next Phase Readiness
- `useAuth()`, `getAuthErrorMessage()`, and all five Zod schemas are now available for every downstream Phase 3 plan (sign-up/verify-email, sign-in/Google/forgot-password, Guard.tsx/onboarding, account security) to import directly without re-deriving field names or error handling.
- No blockers identified for Plan 03-02.

---
*Phase: 03-authentication*
*Completed: 2026-06-17*

## Self-Check: PASSED

All claimed files found on disk:
- my-app/lib/firebase/auth-errors.ts
- my-app/lib/firebase/auth-schemas.ts
- my-app/components/auth/AuthProvider.tsx
- my-app/lib/firebase/__tests__/auth.test.ts
- .planning/phases/03-authentication/03-01-SUMMARY.md

All claimed commits found in git history:
- my-app: b454b42, f046c3d, adddcfe
- parent (submodule pointer updates): 31abe79, df6e4b7, b4c09b3
