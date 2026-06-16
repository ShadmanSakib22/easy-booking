# Phase 3: Authentication - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-17
**Phase:** 03-authentication
**Areas discussed:** Auth provider (Firebase vs Clerk), page-protection mechanism (proxy.ts vs Guard.tsx), then remaining areas resolved via industry-standard defaults at user's request

---

## Auth Provider

| Option | Description | Selected |
|--------|-------------|----------|
| Stick with Firebase Auth | Guard.tsx solves the page-protection concern; keeps Phase 2's tested security rules valid | ✓ |
| Switch to Clerk | Reverses locked project decision; would require redoing Phase 2 security rules | |

**User's choice:** Stick with Firebase Auth.
**Notes:** User initially floated Clerk as a fallback "if Firebase setup is difficult." The actual difficulty was the page-protection pattern (see below), not Firebase Auth itself — resolved without a provider swap. Confirmed against PROJECT.md's existing Firebase-over-Clerk rationale (avoids third-party vendor, pairs with Firestore, custom pages required either way).

---

## Page Protection Mechanism

**User's concern:** Next.js 16 renamed `middleware.ts` to `proxy.ts` — wanted to avoid confusion and proposed a client-side `Guard.tsx` wrapping the layout as a unified guard instead.

**Research performed:** Read this project's actual installed Next.js docs (`my-app/node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`) per the project's own `AGENTS.md` warning that this Next.js build has non-standard/breaking behavior. Confirmed:
- Middleware was renamed to Proxy in Next.js 16, same functionality.
- Next.js's own docs state Proxy "should not be used as a full session management or authorization solution" — intended for optimistic redirects only.
- Firebase Auth's client SDK keeps auth state in-browser (`onAuthStateChanged`), with no server session cookie by default — so server-side proxy gating has nothing reliable to check against anyway.

**User's choice:** `Guard.tsx` client component pattern, no `proxy.ts` involvement.
**Notes:** This wasn't just a naming-confusion workaround — it's the technically correct pattern given how Firebase Auth manages session state in this stack.

---

## Remaining Areas (Auth pages & flow, Email verification gating, Guard.tsx details, Forms/validation/errors)

**User's choice:** Skipped individual discussion. Instructed: "go straight to planning, take decisions that are industry standard, install any packages that you require or think make the development easier and faster."

**Resolution:** Claude applied industry-standard defaults, captured as D-05 through D-15 in CONTEXT.md:
- Route structure: `/sign-in`, `/sign-up`, `/forgot-password`, `/verify-email`, account settings for password change
- Username collected via separate `/onboarding/username` post-auth step (covers Google sign-in users who have no form step)
- `AuthProvider` context at root layout; `Guard.tsx` with `requireVerified` prop
- react-hook-form + zod + @hookform/resolvers + shadcn/ui + lucide-react (not yet installed — installation deferred to planning/execution, not this discussion step)
- Centralized Firebase Auth error-code → message map
- Default `browserLocalPersistence` for AUTH-07 session persistence

## Claude's Discretion

- Exact account/settings route path for password change
- Google sign-in via popup vs redirect
- `/verify-email` polling vs manual refresh button
- Resend-code rate-limit window and microcopy
- Visual design details (full UI direction likely needs a `/gsd-ui-phase` pass before planning, given the roadmap's "UI hint: yes" flag)

## Deferred Ideas

None — discussion stayed within phase scope.
