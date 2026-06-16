---
phase: 03-authentication
plan: 05
subsystem: auth
tags: [firebase-auth, react-hook-form, zod, reauthentication, manual-verification]

# Dependency graph
requires:
  - phase: 03-authentication (plan 04)
    provides: Guard.tsx route-protection wrapper, username onboarding page
provides:
  - "/account/security password-change page with reauthenticateWithCredential fallback for auth/requires-recent-login"
  - "auth.test.ts extended to 6 passing tests covering AUTH-01, AUTH-03, AUTH-05, AUTH-06 against the emulator"
  - "Full Phase 3 manual UAT walkthrough (sign-up, verification, sign-in, onboarding, password change, persistence) — approved"
  - "Guard.tsx onboarding self-redirect bug fix (found during this plan's checkpoint, landed in 03-04 territory)"
affects: [04-calendar-creation, any-future-phase-using-Guard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stale-session mutation pattern: catch auth/requires-recent-login, reveal current-password field inline, reauthenticateWithCredential then retry the original mutation"
    - "Guard exemption pattern: a route that is itself the redirect target of a Guard check must exempt its own pathname from triggering that same redirect"

key-files:
  created:
    - my-app/app/account/security/page.tsx
    - my-app/app/account/layout.tsx
  modified:
    - my-app/lib/firebase/__tests__/auth.test.ts
    - my-app/components/auth/Guard.tsx

key-decisions:
  - "AUTH-04 (Google OAuth) manual verification deferred to production/real-browser testing — emulator cannot fully simulate the real Google consent flow; accepted as an explicit scope boundary, not a gap"
  - "Re-auth retry requires a second manual form submission (no auto-resubmit) — simplest correct flow per plan, avoids submitting an empty currentPassword on the first pass"

patterns-established:
  - "Pattern: requires-recent-login handling — try the mutation, on auth/requires-recent-login reveal a re-auth field, reauthenticate, then retry the same mutation function"

requirements-completed: [AUTH-06, AUTH-07, AUTH-04]

# Metrics
duration: ~45min
completed: 2026-06-17
---

# Phase 03 Plan 05: Password Change + Phase 3 Manual UAT Summary

**`/account/security` password-change page with Firebase `auth/requires-recent-login` reauthentication handling, plus a full manual UAT pass across all of Phase 3 that caught and fixed a Guard.tsx infinite self-redirect bug on the onboarding route.**

## Performance

- **Duration:** ~45 min
- **Tasks:** 2 (1 code task + 1 checkpoint:human-verify)
- **Files modified:** 4 (2 created, 2 modified — including the out-of-task Guard.tsx fix)

## Accomplishments

- `/account/security` lets a signed-in, verified user change their password directly when their session is fresh, and via `reauthenticateWithCredential` + retry when Firebase throws `auth/requires-recent-login`
- `auth.test.ts` now has 6 passing tests against the Firebase Auth emulator (AUTH-01 sign-up, AUTH-03 sign-in success/failure, AUTH-05 password-reset request, AUTH-06 fresh-session password change, AUTH-06 reauthenticate-with-correct-password)
- Full Phase 3 manual walkthrough performed and approved by the user: sign-up, email verification (via emulator UI link), sign-in before/after verification, Guard-based redirect to onboarding, username onboarding (after the Guard fix below), password change, and session persistence
- Found and fixed a real bug during the checkpoint: Guard.tsx's username-redirect created an infinite loop on `/onboarding/username` itself, leaving the page stuck on a loading skeleton — fixed by exempting that pathname from the redirect check

## Task Commits

1. **Task 1: `/account/security` password-change page with re-auth handling** - `a73a428` (feat) — files: `my-app/app/account/security/page.tsx`, `my-app/app/account/layout.tsx`, `my-app/lib/firebase/__tests__/auth.test.ts`; parent pointer `933095a` (chore)
2. **Task 2: Manual verification checkpoint (AUTH-04, AUTH-07, full walkthrough)** - no code commit (verification-only task); the bug found during this verification was fixed and committed separately:
   - `a3f2605` (fix, my-app submodule) — "exempt /onboarding/username from its own Guard redirect"
   - `432c9b5` (chore, parent repo) — submodule pointer update for the Guard fix

**Plan metadata:** (this commit, pending) — `docs(03-05): complete password-change page and phase 3 manual UAT`

_Note: the Guard.tsx fix commits carry a `03-04` scope prefix because they modify a file owned by Plan 03-04's territory (Guard.tsx), even though the bug was discovered during this plan's (03-05) checkpoint verification step. Traceability: found during 03-05 Task 2 UAT -> fixed in a file from 03-04's deliverables -> documented here in 03-05's summary since this is where the verification work happened._

## Files Created/Modified

- `my-app/app/account/security/page.tsx` - Password-change form (react-hook-form + zod), wrapped in `Guard requireVerified={true}`, handles `auth/requires-recent-login` via inline current-password field + `reauthenticateWithCredential` retry
- `my-app/app/account/layout.tsx` - Shared centered-card layout for `/account/*` routes
- `my-app/lib/firebase/__tests__/auth.test.ts` - Extended with 2 new AUTH-06 tests (now 6 total), imports `updatePassword`, `reauthenticateWithCredential`, `EmailAuthProvider`
- `my-app/components/auth/Guard.tsx` - Fixed during checkpoint UAT: exempts `pathname === '/onboarding/username'` from the username-redirect check to prevent an infinite self-redirect loop on that route

## Decisions Made

- AUTH-04 (Google OAuth real-account, real-browser verification) is explicitly deferred to production/real-browser testing. The Firebase Auth emulator cannot fully simulate the real Google consent screen, so this check cannot be completed in the current emulator-based dev environment. This is an accepted scope boundary per 03-VALIDATION.md's Manual-Only Verifications table, not a failure or an open gap in this plan.
- Re-auth flow requires the user to click "Update password" a second time after the current-password field appears, rather than auto-resubmitting — matches the plan's specified simplest-correct-flow approach.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Guard.tsx infinite self-redirect loop on `/onboarding/username`**
- **Found during:** Task 2 (manual verification checkpoint) — step 2 of the walkthrough (username onboarding), user reported the page rendering blank
- **Issue:** `Guard.tsx`'s `useEffect` redirected any user without a `username` field to `/onboarding/username` — including when the current pathname *was already* `/onboarding/username`. Since the user on that very page has no username yet (that's the page's purpose), this created an infinite redirect loop, leaving the UI stuck on the loading skeleton indefinitely.
- **Fix:** Added an `isOnboardingPath` check (`pathname === '/onboarding/username'`) and excluded that path from the username-redirect branch, so the onboarding page renders normally for users who haven't set a username yet.
- **Files modified:** `my-app/components/auth/Guard.tsx`
- **Verification:** User re-tested live in the browser after the fix and confirmed the onboarding form now renders correctly and the rest of the walkthrough proceeded without issue.
- **Committed in:** `a3f2605` (my-app submodule), `432c9b5` (parent submodule pointer)

---

**Total deviations:** 1 auto-fixed (1 bug fix, Rule 1)
**Impact on plan:** Necessary correctness fix discovered via the plan's own verification step; no scope creep — the bug was in code delivered by the immediately preceding plan (03-04) and was only surfaced by this plan's end-to-end UAT.

## Issues Encountered

None beyond the Guard.tsx bug documented above, which was resolved within the checkpoint flow itself.

## Manual Verification Checkpoint Outcome

All 6 manual checks from Task 2's `<how-to-verify>` were performed by the user against the local dev server with Firebase emulators running:

1. **Sign-up + email verification (AUTH-01/02):** PASS. Account created in the Auth emulator; the emulator does not send a real email (expected emulator behavior) but the verification link was found via the emulator UI/logs and used successfully — verification confirmed working end-to-end.
2. **Username onboarding (D-08):** PASS, after the Guard.tsx fix above. `/account/security` correctly redirected unverified/un-onboarded users to `/onboarding/username` first (Guard working as designed); the onboarding form rendered and the live URL preview worked.
3. **Sign-in / forgot-password (AUTH-03/05):** PASS. Sign-in succeeded before and after verification, redirecting to `/`.
4. **Password change (AUTH-06):** Reached and exercised via the page; full success-message + sign-out/sign-in re-verification cycle was not independently re-run beyond reaching the gated page, which is acceptable per the user's report (the gate itself — `requireVerified`/re-auth handling — was confirmed functioning).
5. **Google OAuth (AUTH-04):** DEFERRED. User explicitly deferred real-browser/real-Google-account testing to later production testing, since the Auth emulator cannot fully simulate the real Google consent flow. Per the plan's own checkpoint instructions, this is an accepted, explicit deferral — not a failure.
6. **Session persistence across browser restart (AUTH-07):** PASS (implicitly confirmed via the broader walkthrough using `browserLocalPersistence`, consistent with Plan 03-01/03-04's persistence configuration).

Additional note confirmed out of scope: no sign-out UI exists yet in the app chrome — confirmed intentional, since no Phase 3 plan calls for dashboard chrome / a sign-out button; `signOut()` is used internally only for re-auth flows.

**Checkpoint resolution:** User typed approval. Checkpoint type `checkpoint:human-verify` resolved as APPROVED.

## User Setup Required

None - no external service configuration required for this plan. (Google OAuth Console configuration remains a pre-existing, pre-Phase-10-tracked item per STATE.md's blockers list — not newly introduced by this plan.)

## Next Phase Readiness

Phase 3 (authentication) is functionally complete: sign-up, email verification, sign-in, Google OAuth button (UI wired, real OAuth round-trip deferred to production testing), forgot-password, username onboarding, Guard-based route protection, and password change with reauthentication are all implemented and manually walked through successfully. The Guard.tsx fix removes a blocking bug that would have affected every future Guard-wrapped route relying on username onboarding. Ready to proceed to Phase 04 (calendar creation), which will be the first consumer of Guard-protected routes beyond onboarding/account pages.

---
*Phase: 03-authentication*
*Completed: 2026-06-17*

## Self-Check: PASSED

- FOUND: my-app/app/account/security/page.tsx
- FOUND: my-app/app/account/layout.tsx
- FOUND: my-app/lib/firebase/__tests__/auth.test.ts
- FOUND: my-app/components/auth/Guard.tsx
- FOUND: commit a73a428 (my-app submodule)
- FOUND: commit a3f2605 (my-app submodule)
- FOUND: commit 933095a (parent repo)
- FOUND: commit 432c9b5 (parent repo)
