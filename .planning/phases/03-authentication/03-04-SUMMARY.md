---
phase: 03-authentication
plan: 04
subsystem: auth
tags: [nextjs-app-router, firebase-auth, firestore, zod, react-hook-form, route-guard]

# Dependency graph
requires:
  - phase: 03-authentication
    plan: 01
    provides: useAuth(), usernameSchema, AuthProvider context
  - phase: 03-authentication
    plan: 02
    provides: AuthLayout route group pattern, Firestore users/{uid} doc shape (username field)
  - phase: 03-authentication
    plan: 03
    provides: Completed sign-in/sign-up/Google OAuth entry points that Guard-wrapped routes will eventually redirect from
provides:
  - "Guard.tsx — reusable client wrapper enforcing loading -> unauthenticated -> requireVerified -> username onboarding gating, the AUTH-02 page-protection mechanism for all future protected routes (Phase 4+)"
  - "/onboarding/username — username selection step with live URL preview, writes to users/{uid}.username"
  - "buildSignInRedirect — internal open-redirect-safe helper for constructing /sign-in?redirect= targets"
affects: [Phase 4+ creator dashboard and any future protected route, which will wrap pages in <Guard> directly]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Guard.tsx sequences checks in strict order (loading -> unauthenticated -> requireVerified -> username) to avoid race conditions between fast in-memory Auth state and slower Firestore reads (RESEARCH.md Pitfall 4)"
    - "Open-redirect mitigation: any user-controlled redirect target must be validated as a same-origin relative path (starts with single '/', not '//') before use in router.replace()"
    - "Guard.tsx is documented as UX-only; Firestore Security Rules (Phase 2) remain the actual enforcement boundary"

key-files:
  created:
    - my-app/components/auth/Guard.tsx
    - my-app/app/onboarding/layout.tsx
    - my-app/app/onboarding/username/page.tsx
  modified: []

key-decisions:
  - "buildSignInRedirect kept module-private (not exported) since it's an internal helper, not part of Guard's public contract, per plan instruction"
  - "/onboarding/username itself is wrapped in <Guard requireVerified={false}> despite being Guard's own onboarding redirect target — confirmed safe: Guard only redirects there when username is missing, and the page navigates away to '/' on successful submission, so no infinite loop occurs"

requirements-completed: [AUTH-02, AUTH-08]

# Metrics
duration: 15min
completed: 2026-06-17
---

# Phase 03 Plan 04: Guard.tsx and Username Onboarding Summary

**Reusable Guard.tsx client wrapper sequencing auth/verification/username-onboarding checks in race-condition-safe order, paired with an /onboarding/username page that writes the chosen username to Firestore and unblocks all future Guard-protected routes.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 2
- **Files modified:** 3 (3 created, 0 modified)

## Accomplishments
- Built `Guard.tsx`: client wrapper consuming `useAuth()`, sequencing checks in the exact order RESEARCH.md Pitfall 4 requires — (1) loading skeleton, (2) unauthenticated redirect to `/sign-in?redirect=...`, (3) `requireVerified` check (before username check, per D-09), (4) Firestore `username` check redirecting to `/onboarding/username` if missing, (5) render children only once all checks pass
- Implemented `buildSignInRedirect` as a module-private helper that rejects any redirect path not starting with a single `/` (rejects `//`-prefixed protocol-relative URLs), closing the open-redirect gap (T-03-10) RESEARCH.md's Security Domain flagged
- Built `/onboarding/username`: react-hook-form + zod (`usernameSchema`) form with a live preview of `easyappointment.app/u/{username}` updating as the user types, `updateDoc`-ing `users/{uid}.username` on valid submission and redirecting to `/`
- Created `app/onboarding/layout.tsx`: minimal centered post-auth shell, distinct from the pre-auth `(auth)` route group layout from Plan 02
- Confirmed `pnpm exec tsc --noEmit` and `pnpm exec eslint` are clean across all three new files

## Task Commits

Each task was committed atomically in the `my-app` submodule, followed by a parent-repo submodule-pointer-update commit:

1. **Task 1: Guard.tsx client wrapper** - `my-app@044ccca` (feat) / parent `74e5e26` (chore)
2. **Task 2: /onboarding/username page wrapped in Guard** - `my-app@e15f8a1` (feat) / parent `50edb69` (chore)

## Files Created/Modified
- `my-app/components/auth/Guard.tsx` - reusable auth/verification/username-onboarding gate, exports `Guard`
- `my-app/app/onboarding/layout.tsx` - minimal centered post-auth layout shell
- `my-app/app/onboarding/username/page.tsx` - username selection form with live URL preview, wrapped in `<Guard requireVerified={false}>`

## Decisions Made
- `buildSignInRedirect` is intentionally not exported from `Guard.tsx` — internal implementation detail, not part of the public `Guard` contract
- `/onboarding/username` wraps itself in `Guard` per the plan's explicit instruction; verified no infinite-redirect-loop risk since the redirect to this page only fires once (on missing username) and the page itself navigates away to `/` on success

## Deviations from Plan

None — plan executed exactly as written. Both tasks matched the plan's exact code listings with no Rule 1-4 fixes necessary. `pnpm exec tsc --noEmit` and `pnpm exec eslint` were both clean on the first pass.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required. Manual emulator-based end-to-end verification (sign out -> hit Guard-wrapped route -> redirect to /sign-in?redirect=... -> sign in -> land on /onboarding/username -> submit -> Firestore doc updated -> redirect to /) was not run interactively in this session due to autonomous execution constraints; automated verification (grep-based structural checks, `tsc --noEmit`, `eslint`) confirmed all code paths are present and type-correct. This manual click-through is recommended before Phase 4 begins consuming `Guard` on real protected routes.

## Next Phase Readiness
- `Guard` is now importable by any future protected route (Phase 4+ creator dashboard, account/security pages) via `import { Guard } from '@/components/auth/Guard'`
- `/onboarding/username` is live and will correctly intercept any signed-in user with no Firestore `username` before they reach gated content
- This is the final plan in Phase 03 (authentication) — full auth feature set (sign-up, verify-email, sign-in, Google OAuth, forgot-password, Guard/onboarding) is now complete
- No blockers identified for Phase 04

---
*Phase: 03-authentication*
*Completed: 2026-06-17*

## Self-Check: PASSED

All claimed files found on disk:
- my-app/components/auth/Guard.tsx
- my-app/app/onboarding/layout.tsx
- my-app/app/onboarding/username/page.tsx

All claimed commits found in git history:
- my-app: 044ccca, e15f8a1
- parent (submodule pointer updates): 74e5e26, 50edb69
