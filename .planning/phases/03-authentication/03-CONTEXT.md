# Phase 3: Authentication - Context

**Gathered:** 2026-06-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Custom-built Next.js pages (no Firebase hosted UI) that let users sign up with email/password or Google OAuth, verify their email, sign in, reset a forgotten password, change their password while signed in, and stay signed in across browser sessions. This phase also establishes the unified page-protection mechanism (`Guard.tsx`) that all future phases will use to gate creator-only routes. Calendar/creator features themselves are out of scope (Phase 4+).

</domain>

<decisions>
## Implementation Decisions

### Auth Provider — Firebase Auth (confirmed, not Clerk)

- **D-01:** Firebase Auth remains the auth provider. This was already a locked project-level decision (PROJECT.md Key Decisions) made because Clerk would require custom auth pages anyway (no benefit from its prebuilt UI) and would force rework of Phase 2's Firestore security rules, which already assume `request.auth.uid`. User considered switching to Clerk if Firebase felt difficult, but the actual pain point was page-protection pattern (see D-02), not Firebase Auth itself — resolved without a provider swap.

### Page Protection — Guard.tsx, not proxy.ts/middleware

- **D-02:** Do NOT use `proxy.ts` (this project's Next.js 16 renamed `middleware.ts`) for auth/session gating. Confirmed via this project's actual docs (`my-app/node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`): "Proxy... should not be used as a full session management or authorization solution" — it's for optimistic redirects only. Firebase Auth's client SDK keeps session state in-browser via `onAuthStateChanged` with no server session cookie by default, so server-side proxy gating doesn't have anything reliable to check anyway.
- **D-03:** Build a client component `Guard.tsx` that wraps protected layouts/pages. It consumes an `AuthProvider` React context (built on `onAuthStateChanged`) for `{ user, loading, emailVerified }`.
  - While `loading` is true: render a loading skeleton (no flash of wrong content).
  - If unauthenticated: redirect to `/sign-in` (optionally preserving a `?redirect=` target).
  - Accepts a `requireVerified` prop: when true and `emailVerified` is false, redirect to `/verify-email` instead of rendering children.
- **D-04:** `AuthProvider` lives at the root layout (`app/layout.tsx` or a client wrapper just under it) so auth state is available app-wide without prop drilling.

### Routes & Page Structure

- **D-05:** Pages: `/sign-in`, `/sign-up`, `/forgot-password`, `/verify-email`, and a password-change UI inside an account/settings area (exact route path is Claude's discretion — e.g. `/account/security`).
- **D-06:** Sign-in and sign-up pages each support both email/password submission and a "Continue with Google" button (Firebase `GoogleAuthProvider` popup or redirect — Claude's discretion based on what's more reliable in this Next.js version).
- **D-07:** Shared minimal `AuthLayout` (centered card, no app nav) wraps `/sign-in`, `/sign-up`, `/forgot-password`, `/verify-email`.

### Username Onboarding

- **D-08:** `username` (required on `UserDoc` per Phase 2 schema, used for `/u/[username]` per PROF-04) is NOT collected on the sign-up form. Instead, a separate `/onboarding/username` step runs post-auth (for both email/password and Google sign-in — Google has no form step to attach it to) whenever the signed-in user's Firestore doc has no `username` set. `Guard.tsx`-protected routes should redirect here first if `username` is missing, before any other gated content.

### Email Verification Gating

- **D-09:** On sign-up, Firebase sends a verification email immediately (`sendEmailVerification`). User lands on `/verify-email` showing pending state + a "resend code" action (rate-limited client-side to avoid spam).
- **D-10:** AUTH-02 ("cannot access creator features until verified") — Phase 3 builds the *mechanism* (`requireVerified` prop on `Guard.tsx`) but there are no creator features to actually gate yet (those arrive in Phase 4 calendar creation). Phase 3's own use of the flag is limited to making sure `/verify-email` correctly reflects state and unblocks once Firebase reports `emailVerified: true` (poll or listen via `onAuthStateChanged` after user clicks the email link).
- **D-11:** Google OAuth sign-ins are treated as pre-verified (Firebase sets `emailVerified: true` automatically for Google accounts) — they skip `/verify-email` entirely but still go through `/onboarding/username` if needed.

### Forms, Validation & Errors

- **D-12:** Use `react-hook-form` + `zod` + `@hookform/resolvers` for all auth forms — shared schemas define field shape once. Install: `react-hook-form`, `zod`, `@hookform/resolvers`.
- **D-13:** Install and initialize `shadcn/ui` for form primitives (button, input, card, label, form, alert) — not yet present in `my-app`. Install `lucide-react` for icons (loading spinners, show/hide password, Google "G" icon if no asset provided).
- **D-14:** Centralize a Firebase Auth error-code → user-facing message map (e.g. `auth/email-already-in-use` → "An account with this email already exists.", `auth/wrong-password` / `auth/invalid-credential` → "Incorrect email or password."). Lives in `lib/firebase/auth-errors.ts` or similar. All auth forms use this instead of showing raw Firebase error strings.

### Session Persistence

- **D-15:** Use Firebase Auth's default `browserLocalPersistence` so a signed-in user remains signed in across browser close/reopen (AUTH-07) — no custom session cookie/token needed for v1.

### Claude's Discretion

- Exact account/settings route path for password change
- Google sign-in via popup vs redirect
- Whether `/verify-email` polls `user.reload()` or relies on a manual "I've verified, refresh" button
- Resend-code rate-limit window and exact copy/microcopy on all pages
- Visual design details beyond "shadcn/ui primitives, centered card auth layout" (full UI direction may get its own `/gsd-ui-phase` pass before planning, per the roadmap's "UI hint: yes" flag for this phase)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §AUTH-01–AUTH-08 — All eight authentication requirements with acceptance criteria

### Roadmap
- `.planning/ROADMAP.md` §Phase 3 — Success criteria (5 items) that define done for this phase

### Prior Phase Contracts
- `.planning/phases/02-firebase-foundation/02-CONTEXT.md` — `users/{uid}` schema (`UserDoc`: `uid, email, displayName, username, bio, photoURL, emailVerified, createdAt, updatedAt`) that sign-up/onboarding must write to; Firebase Auth confirmed over Clerk/Supabase/NeonDB
- `my-app/lib/firebase/types.ts` — Current `UserDoc` type definition
- `my-app/lib/firebase/client.ts` — Firebase client SDK singleton (`auth`, `db`, `storage`) — import for all client-side auth calls
- `my-app/lib/firebase/admin.ts` — Firebase Admin SDK singleton (server-only) — for any server-side user doc writes (e.g. creating the Firestore user doc on sign-up via a Route Handler)

### Next.js Version-Specific Behavior
- `my-app/node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` — Confirms `middleware.ts` → `proxy.ts` rename in this Next.js version and that proxy is NOT a full session/auth solution (informs D-02)
- `my-app/AGENTS.md` — Warns this Next.js build has non-standard/breaking changes vs. training data; read relevant `node_modules/next/dist/docs/` pages before implementing routing/layout code

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `my-app/lib/firebase/client.ts` — `auth`, `db`, `storage` singletons, emulator-aware
- `my-app/lib/firebase/admin.ts` — `adminAuth`, `adminDb` singletons (server-only, via `cert()`)
- `my-app/lib/firebase/types.ts` — `UserDoc` and other Firestore document types already defined
- `my-app/lib/firebase/__tests__/firestore.rules.test.ts` — existing rules test pattern to extend if any rule changes are needed for user doc writes

### Established Patterns
- Next.js App Router, `"use client"` for client components; Firebase client SDK only in client components/hooks; Admin SDK only in Route Handlers/server code
- Tailwind v4 with `@theme inline` token setup in `globals.css` — no brand tokens defined yet, clean slate

### Integration Points
- `app/layout.tsx` — root layout, currently default scaffold; `AuthProvider` mounts here
- No existing routes, providers, or middleware/proxy files — this phase is fully greenfield for app structure
- This Next.js version uses `proxy.ts` instead of `middleware.ts` — explicitly NOT used for auth in this phase (see D-02)

</code_context>

<specifics>
## Specific Ideas

- User explicitly prioritized avoiding `proxy.ts`/middleware-style auth due to Next.js 16's middleware→proxy rename causing confusion; resolved with the `Guard.tsx` client-wrapper pattern, which also happens to match Next.js's own guidance that proxy isn't meant for full auth.
- User authorized installing whatever packages speed up development (react-hook-form, zod, @hookform/resolvers, shadcn/ui, lucide-react) — actual installation happens during planning/execution, not in this discussion step.
- User said to take industry-standard defaults on remaining unresolved gray areas rather than discuss further — reflected in D-05 through D-15 above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

### Reviewed Todos (not folded)

None — no pending todos matched this phase.

</deferred>

---

*Phase: 03-authentication*
*Context gathered: 2026-06-17*
