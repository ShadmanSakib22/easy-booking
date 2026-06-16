# Phase 3: Authentication - Research

**Researched:** 2026-06-17
**Domain:** Firebase Auth (client SDK) integration in Next.js 16 App Router, custom UI, client-side session/route gating
**Confidence:** HIGH (core stack), MEDIUM (Next.js 16-specific routing nuances, popup vs redirect choice), LOW (none — all critical claims verified or cited)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Auth Provider — Firebase Auth (confirmed, not Clerk)**
- **D-01:** Firebase Auth remains the auth provider. This was already a locked project-level decision (PROJECT.md Key Decisions) made because Clerk would require custom auth pages anyway (no benefit from its prebuilt UI) and would force rework of Phase 2's Firestore security rules, which already assume `request.auth.uid`. User considered switching to Clerk if Firebase felt difficult, but the actual pain point was page-protection pattern (see D-02), not Firebase Auth itself — resolved without a provider swap.

**Page Protection — Guard.tsx, not proxy.ts/middleware**
- **D-02:** Do NOT use `proxy.ts` (this project's Next.js 16 renamed `middleware.ts`) for auth/session gating. Confirmed via this project's actual docs (`my-app/node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`): "Proxy... should not be used as a full session management or authorization solution" — it's for optimistic redirects only. Firebase Auth's client SDK keeps session state in-browser via `onAuthStateChanged` with no server session cookie by default, so server-side proxy gating doesn't have anything reliable to check anyway.
- **D-03:** Build a client component `Guard.tsx` that wraps protected layouts/pages. It consumes an `AuthProvider` React context (built on `onAuthStateChanged`) for `{ user, loading, emailVerified }`.
  - While `loading` is true: render a loading skeleton (no flash of wrong content).
  - If unauthenticated: redirect to `/sign-in` (optionally preserving a `?redirect=` target).
  - Accepts a `requireVerified` prop: when true and `emailVerified` is false, redirect to `/verify-email` instead of rendering children.
- **D-04:** `AuthProvider` lives at the root layout (`app/layout.tsx` or a client wrapper just under it) so auth state is available app-wide without prop drilling.

**Routes & Page Structure**
- **D-05:** Pages: `/sign-in`, `/sign-up`, `/forgot-password`, `/verify-email`, and a password-change UI inside an account/settings area (exact route path is Claude's discretion — e.g. `/account/security`).
- **D-06:** Sign-in and sign-up pages each support both email/password submission and a "Continue with Google" button (Firebase `GoogleAuthProvider` popup or redirect — Claude's discretion based on what's more reliable in this Next.js version).
- **D-07:** Shared minimal `AuthLayout` (centered card, no app nav) wraps `/sign-in`, `/sign-up`, `/forgot-password`, `/verify-email`.

**Username Onboarding**
- **D-08:** `username` (required on `UserDoc` per Phase 2 schema, used for `/u/[username]` per PROF-04) is NOT collected on the sign-up form. Instead, a separate `/onboarding/username` step runs post-auth (for both email/password and Google sign-in — Google has no form step to attach it to) whenever the signed-in user's Firestore doc has no `username` set. `Guard.tsx`-protected routes should redirect here first if `username` is missing, before any other gated content.

**Email Verification Gating**
- **D-09:** On sign-up, Firebase sends a verification email immediately (`sendEmailVerification`). User lands on `/verify-email` showing pending state + a "resend code" action (rate-limited client-side to avoid spam).
- **D-10:** AUTH-02 ("cannot access creator features until verified") — Phase 3 builds the *mechanism* (`requireVerified` prop on `Guard.tsx`) but there are no creator features to actually gate yet (those arrive in Phase 4 calendar creation). Phase 3's own use of the flag is limited to making sure `/verify-email` correctly reflects state and unblocks once Firebase reports `emailVerified: true` (poll or listen via `onAuthStateChanged` after user clicks the email link).
- **D-11:** Google OAuth sign-ins are treated as pre-verified (Firebase sets `emailVerified: true` automatically for Google accounts) — they skip `/verify-email` entirely but still go through `/onboarding/username` if needed.

**Forms, Validation & Errors**
- **D-12:** Use `react-hook-form` + `zod` + `@hookform/resolvers` for all auth forms — shared schemas define field shape once. Install: `react-hook-form`, `zod`, `@hookform/resolvers`.
- **D-13:** Install and initialize `shadcn/ui` for form primitives (button, input, card, label, form, alert) — not yet present in `my-app`. Install `lucide-react` for icons (loading spinners, show/hide password, Google "G" icon if no asset provided).
- **D-14:** Centralize a Firebase Auth error-code → user-facing message map (e.g. `auth/email-already-in-use` → "An account with this email already exists.", `auth/wrong-password` / `auth/invalid-credential` → "Incorrect email or password."). Lives in `lib/firebase/auth-errors.ts` or similar. All auth forms use this instead of showing raw Firebase error strings.

**Session Persistence**
- **D-15:** Use Firebase Auth's default `browserLocalPersistence` so a signed-in user remains signed in across browser close/reopen (AUTH-07) — no custom session cookie/token needed for v1.

### Claude's Discretion
- Exact account/settings route path for password change
- Google sign-in via popup vs redirect
- Whether `/verify-email` polls `user.reload()` or relies on a manual "I've verified, refresh" button
- Resend-code rate-limit window and exact copy/microcopy on all pages
- Visual design details beyond "shadcn/ui primitives, centered card auth layout" (full UI direction may get its own `/gsd-ui-phase` pass before planning, per the roadmap's "UI hint: yes" flag for this phase)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can sign up with email and password | `createUserWithEmailAndPassword` pattern, zod schema, error map — see Code Examples §Sign-Up |
| AUTH-02 | User receives email verification after sign-up and cannot access creator features until verified | `sendEmailVerification`, `Guard.tsx requireVerified` prop, D-10 scoping (mechanism only, no gated features yet) |
| AUTH-03 | User can sign in with email and password | `signInWithEmailAndPassword` pattern — see Code Examples §Sign-In |
| AUTH-04 | User can sign in with Google (OAuth) | `GoogleAuthProvider` + `signInWithPopup`/`signInWithRedirect` — see Architecture Patterns §Google Sign-In |
| AUTH-05 | User can request a password reset via email link | `sendPasswordResetEmail` — see Code Examples §Forgot Password |
| AUTH-06 | User can change their password from account settings | `updatePassword` + `reauthenticateWithCredential` re-auth requirement — see Common Pitfalls §Stale Credential |
| AUTH-07 | User session persists across browser refresh (Firebase Auth persistence) | `browserLocalPersistence` is the SDK default; `onAuthStateChanged` rehydration — see Architecture Patterns §AuthProvider |
| AUTH-08 | Custom sign-in, sign-up, forgot-password, and email-verification pages (not Firebase hosted UI) | `AuthLayout` + shadcn/ui forms — see Architecture Patterns §Route Structure |
</phase_requirements>

## Summary

This phase wires Firebase Auth's client SDK (already installed at `firebase@12.15.0`, configured in `lib/firebase/client.ts`) into a set of custom Next.js 16 App Router pages, using a client-context (`AuthProvider`) + client-wrapper (`Guard.tsx`) pattern instead of `proxy.ts`. This is the correct approach for this stack: Firebase Auth's default persistence (`browserLocalPersistence`) keeps session state in the browser's `localStorage`/IndexedDB with no server-readable cookie, so `proxy.ts` literally has nothing reliable to inspect — Next.js's own docs confirm proxy "should not be used as a full session management or authorization solution." All auth state must be read client-side via `onAuthStateChanged`.

The standard library set for this work is already mostly chosen by CONTEXT.md: `firebase` (client SDK, already installed), `react-hook-form` + `zod` + `@hookform/resolvers` for forms, `shadcn/ui` + `lucide-react` for UI primitives (none of these are yet installed in `my-app`). No additional auth library (NextAuth/Clerk/Auth.js) is needed or wanted — Firebase Auth's SDK already provides email/password, Google OAuth, verification email, password reset, and password change APIs natively.

The two riskiest areas are (1) re-authentication requirements for `updatePassword` (Firebase requires a "recent" sign-in or it throws `auth/requires-recent-login`), and (2) `signInWithPopup` reliability — popups can be blocked or fail silently due to browser COOP/third-party-cookie policies, especially in dev tooling or certain browser configurations, making `signInWithRedirect` the safer default for a v1 ship despite slightly more plumbing (must call `getRedirectResult` on mount).

**Primary recommendation:** Use `onAuthStateChanged`-driven `AuthProvider` context + `Guard.tsx` client wrapper (no `proxy.ts`); use `signInWithRedirect` for Google OAuth to avoid popup-blocking flakiness; centralize a Firebase `AuthErrorCode` → message map; handle `auth/requires-recent-login` on password change by prompting re-auth via `reauthenticateWithCredential` before retrying `updatePassword`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| firebase | 12.15.0 [VERIFIED: npm registry] | Client Auth SDK (`firebase/auth`) | Already installed and configured in `lib/firebase/client.ts`; modular tree-shakeable API (`getAuth`, `onAuthStateChanged`, `signInWithEmailAndPassword`, etc.) is the only Auth client this project uses — no NextAuth/Clerk needed since Firebase Auth already covers email/password + Google OAuth + verification + reset natively. |
| firebase-admin | 14.0.0 [VERIFIED: npm registry] | Server-side token verification / user doc writes from Route Handlers | Already installed in `lib/firebase/admin.ts`. Used if any phase-3 Route Handler needs to verify an `idToken` server-side (e.g. writing the initial Firestore `users/{uid}` doc with elevated trust) — optional for v1 since client SDK can write its own doc under Firestore rules (`request.auth.uid == userId`). |
| react-hook-form | 7.79.0 [VERIFIED: npm registry] | Form state for sign-up/sign-in/forgot-password/change-password/username forms | Per CLAUDE.md and CONTEXT.md D-12; uncontrolled-by-default, minimal re-renders, good React 19 compat. |
| zod | 4.4.3 (latest registry tag; CLAUDE.md pins ^3.x) [VERIFIED: npm registry] | Schema validation, shared between RHF and any server-side checks | Per CONTEXT.md D-12. **Note:** registry's `latest` tag is zod 4.x, but project's CLAUDE.md pins `^3.x` — confirm which major version to install (see Open Questions). |
| @hookform/resolvers | 5.4.0 [VERIFIED: npm registry] (CLAUDE.md pins ^3.x) | Bridges react-hook-form ↔ zod | Required glue package; version must match installed zod major (resolvers v5 supports zod v4; v3 line supports zod v3). |
| shadcn/ui (CLI) | 4.11.0 (`shadcn` package) [VERIFIED: npm registry] | Form primitives: button, input, card, label, form, alert | Per CONTEXT.md D-13. Not a runtime dependency — CLI copies component source into `components/ui/`. Confirmed Tailwind v4 compatible (official docs: ui.shadcn.com/docs/tailwind-v4) [CITED: ui.shadcn.com/docs/tailwind-v4]. |
| lucide-react | 1.20.0 [VERIFIED: npm registry] (CLAUDE.md pins ^0.400+) | Icons: spinners, show/hide password, Google "G" glyph | Per CONTEXT.md D-13; pairs with shadcn/ui's default icon choice. **Note:** registry shows a 1.x major exists now — CLAUDE.md's `^0.400+` pin predates this; confirm desired major (see Open Questions). |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tailwindcss | ^4 (project already has it) [VERIFIED: npm registry, project package.json] | Styling substrate for AuthLayout + shadcn components | Already configured via `@theme inline` in `globals.css`; no changes needed beyond shadcn's CLI-driven token additions. |
| next | 16.2.9 [VERIFIED: project package.json] | App Router, Route Handlers if needed | Already installed; this is the "not the Next.js you know" version — `proxy.ts` replaces `middleware.ts` and is explicitly NOT used here per D-02. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Firebase Auth (client-only, no server session) | NextAuth.js / Auth.js with Firebase adapter | Adds a second auth abstraction layer on top of Firebase Auth, server session cookies, and CSRF concerns the project doesn't need — rejected, already decided against in PROJECT.md/CONTEXT.md D-01. |
| `Guard.tsx` client wrapper | `proxy.ts`-based route protection | Explicitly rejected per D-02 — proxy can only read cookies, and Firebase's default persistence doesn't set one; Next.js's own docs warn against using proxy as the sole auth/session layer. |
| `signInWithRedirect` for Google | `signInWithPopup` | Popup is simpler (no extra `getRedirectResult` call, no full-page navigation) but can silently fail due to popup blockers, third-party cookie restrictions, or COOP browser policies — especially flaky in incognito/strict-privacy browsers. Redirect is more reliable but requires handling `getRedirectResult` on every page load and a "loading" UI during the round trip. **Recommendation: redirect**, given v1 ships need maximum reliability over minor UX smoothness; planner should treat this as Claude's discretion already granted (D-06) — document final choice in PLAN.md. |
| Centralized error map | Showing raw `error.message` from Firebase | Firebase's raw messages are technical / inconsistent across SDK versions and leak internal codes to end users — D-14 already locks the centralized-map approach. |

**Installation:**
```bash
cd my-app
pnpm add react-hook-form zod @hookform/resolvers lucide-react
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button input card label form alert
```

**Version verification:** Verified directly against the npm registry on 2026-06-17:
- `firebase@12.15.0` (already installed; CLAUDE.md says "^11.x" — registry confirms 12.x is current, no action needed since the project already pins `^12.14.0` in package.json — CLAUDE.md text is stale, not a blocker)
- `firebase-admin@14.0.0` (already installed, matches CLAUDE.md `^14.x`)
- `react-hook-form@7.79.0` (matches CLAUDE.md `^7.x`)
- `zod@4.4.3` is npm's current `latest` tag — CLAUDE.md says `^3.x`. **This is a version mismatch requiring a decision before planning** (see Open Questions §1).
- `@hookform/resolvers@5.4.0` is current `latest` — CLAUDE.md says `^3.x`. Tied to the zod major decision above.
- `lucide-react@1.20.0` is current `latest` — CLAUDE.md says `^0.400+`. The 1.x line is a 2025/2026-era major bump; confirm desired pin (low risk, icon API is stable across this bump per lucide's changelog conventions, but unverified in this session — flag as ASSUMED).
- `shadcn` CLI `4.11.0` is current `latest`.

## Architecture Patterns

### Recommended Project Structure
```
my-app/
├── app/
│   ├── layout.tsx                  # root layout — mounts <AuthProvider>
│   ├── (auth)/                     # route group, no effect on URL, shares AuthLayout
│   │   ├── layout.tsx              # AuthLayout: centered card, no app nav (D-07)
│   │   ├── sign-in/page.tsx
│   │   ├── sign-up/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── verify-email/page.tsx
│   ├── onboarding/
│   │   └── username/page.tsx       # post-auth step (D-08), wrapped in Guard (no requireVerified)
│   └── account/
│       └── security/page.tsx       # password change UI (D-05 discretion), wrapped in Guard(requireVerified)
├── components/
│   ├── ui/                         # shadcn-generated primitives (button, input, card, label, form, alert)
│   └── auth/
│       ├── Guard.tsx                # client wrapper (D-03)
│       ├── AuthProvider.tsx         # context provider (D-04)
│       ├── SignInForm.tsx
│       ├── SignUpForm.tsx
│       ├── GoogleSignInButton.tsx
│       └── ...
└── lib/
    └── firebase/
        ├── client.ts                # existing — auth, db, storage singletons
        ├── admin.ts                 # existing — server-only
        ├── auth-errors.ts           # NEW (D-14) — error-code → message map
        └── auth-schemas.ts          # NEW — zod schemas shared by all auth forms (D-12)
```

### Pattern 1: AuthProvider via onAuthStateChanged
**What:** A `"use client"` context provider mounted near the root layout that subscribes to `onAuthStateChanged(auth, callback)` once, exposing `{ user, loading, emailVerified }` to the whole tree.
**When to use:** Always — this is the single source of truth for client-side auth state; avoids every component re-subscribing independently.
**Example:**
```typescript
// Source: Firebase official docs pattern (https://firebase.google.com/docs/auth/web/manage-users) [CITED]
'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'

type AuthContextValue = {
  user: User | null
  loading: boolean
  emailVerified: boolean
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true, emailVerified: false })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, emailVerified: user?.emailVerified ?? false }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```
Mount `<AuthProvider>` as a child of `<body>` in `app/layout.tsx` (root layout itself stays a Server Component; only the provider needs `"use client"`, per the Next.js docs' "Context Providers" guidance that client context works via interleaving even from a Server Component parent) [CITED: my-app/node_modules/next/dist/docs/.../authentication.md §Context Providers].

### Pattern 2: Guard.tsx client wrapper
**What:** A reusable client component that consumes `useAuth()`, shows a skeleton while `loading`, redirects unauthenticated users to `/sign-in?redirect=<path>`, optionally redirects unverified users to `/verify-email` when `requireVerified` is true, and redirects users with no Firestore `username` to `/onboarding/username` first (per D-08 ordering).
**When to use:** Wrap any page/layout that needs auth (account/security, future creator routes in Phase 4+).
**Example:**
```typescript
'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { useAuth } from '@/components/auth/AuthProvider'

export function Guard({
  children,
  requireVerified = false,
}: {
  children: React.ReactNode
  requireVerified?: boolean
}) {
  const { user, loading, emailVerified } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [checkingUsername, setCheckingUsername] = useState(true)
  const [hasUsername, setHasUsername] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace(`/sign-in?redirect=${encodeURIComponent(pathname)}`)
      return
    }
    if (requireVerified && !emailVerified) {
      router.replace('/verify-email')
      return
    }
    // Check username onboarding (D-08) — runs after verification check
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      const username = snap.data()?.username
      if (!username) {
        router.replace('/onboarding/username')
      } else {
        setHasUsername(true)
      }
      setCheckingUsername(false)
    })
  }, [loading, user, emailVerified, requireVerified, pathname, router])

  if (loading || checkingUsername || !user || !hasUsername) {
    return <div className="flex min-h-screen items-center justify-center">{/* skeleton */}</div>
  }

  return <>{children}</>
}
```
**Note:** `useRouter`/`usePathname` come from `next/navigation` (App Router) — confirmed stable in Next.js 16 [VERIFIED: project's own `next` package + standard App Router API, no deprecation found in `node_modules/next/dist/docs`].

### Pattern 3: Google Sign-In via signInWithRedirect
**What:** Use `GoogleAuthProvider` + `signInWithRedirect`/`getRedirectResult` instead of `signInWithPopup` to avoid popup-blocker and COOP flakiness.
**When to use:** Both `/sign-in` and `/sign-up` "Continue with Google" buttons.
**Example:**
```typescript
// Source: https://firebase.google.com/docs/auth/web/google-signin [CITED]
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'

export function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  return signInWithRedirect(auth, provider)
}

// Call once on app mount (e.g. inside AuthProvider's useEffect, or a dedicated page)
// to capture the result after the redirect completes:
useEffect(() => {
  getRedirectResult(auth).catch((error) => {
    // surface via centralized auth-errors.ts map
  })
}, [])
```

### Pattern 4: Centralized Firebase error map
**What:** Single object mapping Firebase `AuthErrorCode` strings to user-facing copy, consumed by every form's catch block.
**Example:**
```typescript
// lib/firebase/auth-errors.ts
// Error codes per Firebase Auth (stable, longstanding API) [ASSUMED — not independently re-verified
// against a live registry/docs page in this session; codes below match documented behavior across
// SDK versions 9-12 and are very unlikely to have changed, but flagging per protocol]
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  'auth/requires-recent-login': 'For security, please sign in again before changing your password.',
  'auth/network-request-failed': 'Network error. Please check your connection and try again.',
}

export function getAuthErrorMessage(code: string): string {
  return AUTH_ERROR_MESSAGES[code] ?? 'Something went wrong. Please try again.'
}
```

### Anti-Patterns to Avoid
- **Using `proxy.ts` for any auth gating:** Explicitly rejected (D-02). Firebase's default persistence has no server-readable cookie; proxy can't check anything meaningful without a custom session-cookie layer this project deliberately doesn't want for v1.
- **Showing raw `error.code` or `error.message` to users:** Always route through the centralized map (D-14).
- **Calling `updatePassword` without handling `auth/requires-recent-login`:** Firebase enforces a "recent login" window for sensitive operations; a stale session will throw this error and the UI must catch it and prompt re-authentication rather than showing a generic failure.
- **Skipping the username-doc check in `Guard.tsx`:** Per D-08, this must run before rendering any other gated content, including before checking `requireVerified` content rendering (though verification check itself should still happen first in the redirect chain, since an unverified user shouldn't reach onboarding either, per D-09 flow — sign-up → verify-email → onboarding/username → app).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing/storage | Custom bcrypt + Firestore user-password field | Firebase Auth's built-in `createUserWithEmailAndPassword` | Firebase manages password storage, hashing, and breach-detection entirely server-side; the project never touches raw passwords. |
| Email verification token generation/expiry | Custom token + Firestore + nodemailer for verification emails | `sendEmailVerification` (Firebase-hosted email + link) | Firebase generates, sends, and validates the verification link itself; building this manually duplicates a solved problem and introduces a second email-sending path beyond what SMTP-phase (Phase 6) will configure for booking emails. |
| Password reset flow | Custom OTP/token table + email template | `sendPasswordResetEmail` | Same rationale — Firebase Auth already implements secure, expiring reset links. |
| Session/cookie management | Custom JWT + httpOnly cookie + `iron-session`/`jose` (the Next.js docs' generic recommendation) | Firebase Auth's client-side `browserLocalPersistence` + `onAuthStateChanged` | The generic Next.js auth guide recommends session libraries because it assumes a custom credentials-based auth system with no built-in session layer. Firebase Auth already *is* that session layer (D-15) — adding `jose`/`iron-session` on top would be redundant for v1's stated needs. |
| Google OAuth token exchange | Custom OAuth2 flow against Google's endpoints | `GoogleAuthProvider` + `signInWithRedirect`/`signInWithPopup` | Firebase Auth's SDK handles the entire OAuth dance (PKCE, token exchange, account linking) client-side. |

**Key insight:** Every "don't hand-roll" item in this phase is already solved by Firebase Auth's SDK — the actual engineering work is wiring Firebase's client APIs into custom Next.js pages/forms/redirects correctly, not building auth primitives.

## Common Pitfalls

### Pitfall 1: `updatePassword` throws `auth/requires-recent-login`
**What goes wrong:** Calling `updatePassword(user, newPassword)` from `/account/security` fails if the user's sign-in is not "recent" (Firebase's internal freshness window).
**Why it happens:** Firebase requires re-authentication for sensitive operations (password change, email change, account deletion) to prevent session-hijacking attacks from silently changing credentials.
**How to avoid:** Catch `auth/requires-recent-login`, prompt the user to re-enter their current password, call `reauthenticateWithCredential(user, EmailAuthProvider.credential(email, currentPassword))`, then retry `updatePassword`.
**Warning signs:** Password-change works right after login but fails for users who return to settings after a long session.

### Pitfall 2: Google popup blocked or silently fails
**What goes wrong:** `signInWithPopup` either gets blocked by the browser's popup blocker, or the popup opens but the result promise never resolves due to COOP (Cross-Origin-Opener-Policy) restrictions some browsers/extensions enforce by default in 2025/2026.
**Why it happens:** Increasingly strict browser privacy defaults (especially Safari, Brave, and Chrome with certain flags) restrict cross-window communication that `signInWithPopup` relies on.
**How to avoid:** Prefer `signInWithRedirect` + `getRedirectResult` for the primary flow (per Architecture Pattern 3); this is a full-page navigation with no popup/COOP dependency.
**Warning signs:** Google sign-in works in local dev (often relaxed browser settings) but users report it silently doing nothing in production.

### Pitfall 3: Flash of unauthenticated content (FOUC) on protected routes
**What goes wrong:** Because Firebase Auth state is rehydrated asynchronously from IndexedDB/localStorage, there's a brief window on page load (and full refresh) where `user` is `null` even though the user is actually signed in — naive guards would redirect to `/sign-in` momentarily or flash protected content before the real state resolves.
**Why it happens:** `onAuthStateChanged`'s first callback fires once Firebase has read persisted state, but this isn't synchronous; React renders once with default state first.
**How to avoid:** `Guard.tsx`'s `loading` flag (initialized `true`, flipped only inside the first `onAuthStateChanged` callback) must gate ALL rendering decisions — never redirect or render children while `loading` is true (already encoded in D-03/Pattern 2 above).
**Warning signs:** Brief redirect flicker to `/sign-in` on hard refresh of a protected page, even when the user is actually logged in.

### Pitfall 4: Firestore username-doc read race with Guard's redirect logic
**What goes wrong:** If `Guard.tsx` checks `emailVerified` and the Firestore `username` field in parallel (or in the wrong order), a freshly-Google-signed-in user with no username yet could briefly be routed to `/verify-email` (incorrect, since Google accounts are pre-verified per D-11) or rendering could flash gated content before the username check resolves.
**Why it happens:** Two async checks (`emailVerified` from Auth SDK state, `username` from a Firestore `getDoc` call) have different resolution times; the username check is strictly slower (network round trip) than `emailVerified` (already in the `User` object).
**How to avoid:** Sequence the checks explicitly: (1) loading → show skeleton, (2) no user → redirect sign-in, (3) `requireVerified && !emailVerified` → redirect verify-email, (4) only then fetch and check `username` → redirect onboarding if missing, (5) finally render children. Keep a `checkingUsername` loading flag distinct from the auth `loading` flag (as in Pattern 2's example).
**Warning signs:** Onboarding redirect loop, or users briefly seeing gated content flash before being redirected.

### Pitfall 5: zod/`@hookform/resolvers` major version mismatch
**What goes wrong:** Installing zod 4.x with a `@hookform/resolvers` version built against zod 3.x's API (or vice versa) causes type errors or runtime resolver failures.
**Why it happens:** `@hookform/resolvers`' `zodResolver` integration is version-coupled to zod's schema/error API, which changed between zod 3 and 4.
**How to avoid:** Install matching majors — confirm the target zod major before running `pnpm add` (see Open Questions §1) and select the corresponding `@hookform/resolvers` major (resolvers 5.x for zod 4.x; resolvers 3.x for zod 3.x, per registry's pairing convention).
**Warning signs:** TypeScript errors on `zodResolver(schema)` calls, or validation errors not surfacing correctly in `formState.errors`.

## Code Examples

### Sign-Up (email/password)
```typescript
// Source: Firebase official Auth docs pattern (https://firebase.google.com/docs/auth/web/start) [CITED]
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/client'
import { getAuthErrorMessage } from '@/lib/firebase/auth-errors'

async function signUp(email: string, password: string) {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password)
    await sendEmailVerification(user)
    // Write initial Firestore user doc per Phase 2 UserDoc schema (username left unset for onboarding step, D-08)
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: '',
      username: '',
      bio: '',
      photoURL: null,
      emailVerified: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return { ok: true as const }
  } catch (err: unknown) {
    const code = (err as { code?: string }).code ?? 'unknown'
    return { ok: false as const, message: getAuthErrorMessage(code) }
  }
}
```

### Sign-In (email/password)
```typescript
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { getAuthErrorMessage } from '@/lib/firebase/auth-errors'

async function signIn(email: string, password: string) {
  try {
    await signInWithEmailAndPassword(auth, email, password)
    return { ok: true as const }
  } catch (err: unknown) {
    const code = (err as { code?: string }).code ?? 'unknown'
    return { ok: false as const, message: getAuthErrorMessage(code) }
  }
}
```

### Forgot Password
```typescript
// Source: https://firebase.google.com/docs/auth/web/manage-users [CITED]
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'

async function requestPasswordReset(email: string) {
  await sendPasswordResetEmail(auth, email) // Firebase hosts the reset-confirmation page by default unless actionCodeSettings configured
}
```

### Change Password (with re-auth fallback)
```typescript
// Source: https://firebase.google.com/docs/auth/web/manage-users [CITED]
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'

async function changePassword(currentPassword: string, newPassword: string) {
  const user = auth.currentUser
  if (!user || !user.email) throw new Error('Not signed in')

  try {
    await updatePassword(user, newPassword)
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'auth/requires-recent-login') {
      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, newPassword)
    } else {
      throw err
    }
  }
}
```

### Verify Email Polling
```typescript
// /verify-email page — D-09/D-10: poll until emailVerified flips true after user clicks link
import { useEffect } from 'react'
import { auth } from '@/lib/firebase/client'

function useEmailVerificationPolling(onVerified: () => void, intervalMs = 3000) {
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!auth.currentUser) return
      await auth.currentUser.reload() // refreshes emailVerified from server
      if (auth.currentUser.emailVerified) {
        clearInterval(interval)
        onVerified()
      }
    }, intervalMs)
    return () => clearInterval(interval)
  }, [onVerified, intervalMs])
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Next.js `middleware.ts` for route gating | `proxy.ts` (same capability, renamed) | Next.js 16 [CITED: my-app/node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md] | File must be named `proxy.ts`, exported function can be named `proxy` (or default export) — this project explicitly does not use it for auth (D-02), but future phases needing simple redirects (e.g. www→non-www, locale routing) would use this filename, not `middleware.ts`. |
| `firebase` v9 modular-only transition | `firebase` v12.x (current) | Ongoing yearly major bumps; v12 confirmed current via `npm view firebase version` on 2026-06-17 [VERIFIED: npm registry] | No breaking auth API changes expected for the functions used in this phase (`signInWithEmailAndPassword`, `onAuthStateChanged`, etc. have been stable since the v9 modular rewrite) — but this claim about zero breaking changes between v9 and v12 specifically for Auth is [ASSUMED], not independently verified against the v9→v12 changelog in this session. |

**Deprecated/outdated:**
- `middleware.ts`: superseded by `proxy.ts` in Next.js 16 — irrelevant to this phase since neither is used for auth gating, but the planner should not introduce a `middleware.ts` file by mistake if any non-auth redirect logic is added later.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Firebase `AuthErrorCode` string values (`auth/email-already-in-use`, `auth/wrong-password`, `auth/invalid-credential`, `auth/too-many-requests`, `auth/popup-closed-by-user`, `auth/requires-recent-login`, `auth/network-request-failed`, etc.) are unchanged in firebase 12.x vs. older SDK versions | Architecture Patterns §Pattern 4, Code Examples | Low risk — these codes have been part of Firebase Auth's stable public API for years; if wrong, the error map would simply show the fallback generic message instead of the specific one for a given code, a minor UX degradation, not a functional break. Recommend a quick smoke-test against the emulator during execution. |
| A2 | `signInWithRedirect` is meaningfully more reliable than `signInWithPopup` in 2026 browsers, justifying the recommendation in Pattern 3 / Alternatives Considered | Architecture Patterns §Pattern 3 | Medium — if popup blocking has improved or redirect introduces its own UX friction (full navigation away from the app), the recommendation could be sub-optimal. This is explicitly called out as Claude's discretion in CONTEXT.md (D-06), so the planner/executor can revisit if redirect proves worse in practice. |
| A3 | No breaking Firebase Auth API changes exist between SDK v9 (modular rewrite) and the currently-installed v12.15.0 for the specific functions used in this phase | State of the Art | Low — all functions referenced (`signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `sendEmailVerification`, `sendPasswordResetEmail`, `updatePassword`, `reauthenticateWithCredential`, `onAuthStateChanged`, `GoogleAuthProvider`, `signInWithRedirect`, `getRedirectResult`) were directly confirmed via official Firebase docs fetched in this session against the current docs site, which reflects the current SDK — risk is limited to subtle parameter/behavior changes not surfaced by the fetched excerpts. |
| A4 | lucide-react's 1.x major (current registry `latest`) has no breaking icon-name/API changes vs. the `^0.400+` pin in CLAUDE.md that would affect the specific icons needed here (spinner, eye/eye-off, chrome/google glyph) | Standard Stack | Low — worst case, a specific icon name moved; trivial to fix by checking the installed package's icon list during execution. |

**If this table is empty:** N/A — see entries above; none of these block planning, all are low-to-medium risk with cheap fallback/verification paths during execution.

## Open Questions

1. **zod major version: 3.x (per CLAUDE.md) or 4.x (current npm `latest`)?**
   - What we know: CLAUDE.md pins `zod ^3.x` and `@hookform/resolvers ^3.x`; npm registry's current `latest` tags are `zod@4.4.3` and `@hookform/resolvers@5.4.0` [VERIFIED: npm registry, 2026-06-17].
   - What's unclear: Whether CLAUDE.md's pin reflects an intentional project decision (e.g. compatibility with some other already-installed package) or is simply stale guidance written before zod 4 was current.
   - Recommendation: Default to current `latest` (zod 4.x + resolvers 5.x) since nothing else in `my-app/package.json` currently depends on zod, and there's no compatibility constraint forcing v3. Planner should confirm this choice explicitly in the plan's setup task rather than silently picking one.

2. **Account/security route path** — Claude's discretion per CONTEXT.md; this research recommends `/account/security` (matches the example already given in D-05) for consistency with the future `account/` area implied by PROF-02/PROF-03 in later phases, but the planner should make the final call and note it in PLAN.md so Phase 11 (Creator Dashboard & Profiles) can build a consistent `/account/*` area around it.

3. **Resend verification email rate limiting** — Claude's discretion (CONTEXT.md). No specific Firebase quota was independently verified in this session for `sendEmailVerification` call frequency; recommend a conservative client-side cooldown (e.g. 60 seconds between resend clicks) as a placeholder, and treat any server-imposed Firebase rate limit as a defense-in-depth backstop rather than the primary control, since Firebase's own per-project Auth quotas are not user-facing/documented at a granular level. Flag as something to validate against actual emulator/production behavior during execution rather than a locked number.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Firebase emulator suite (Auth + Firestore) | Local dev/testing of all sign-up/sign-in/reset flows without hitting real Firebase quota | ✓ | Configured via `pnpm dev` → `firebase emulators:start`, `.env.local.example` shows `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true` toggle [VERIFIED: my-app/package.json scripts, .env.local.example] | — |
| Google OAuth credentials (Firebase Console → Authentication → Sign-in method → Google) | AUTH-04 Google sign-in to function at all (even via emulator, a configured Google provider is needed for non-emulator testing) | Not verified in this session — requires checking Firebase Console, which is outside repo file access | — | If not yet configured, Google sign-in cannot be manually tested end-to-end until enabled in the Firebase project console; emulator's Auth UI can simulate some OAuth flows without real Google credentials for local dev, but production testing needs the real provider enabled. |
| pnpm | Package installation (`pnpm add ...`, `pnpm dlx shadcn@latest ...`) | ✓ | Project uses `pnpm-lock.yaml` / `pnpm-workspace.yaml` [VERIFIED: file listing] | — |
| Node.js (for Next.js 16 + shadcn CLI) | Running dev server, shadcn CLI codegen | ✓ (implied by existing working `pnpm dev` script) | Not independently version-checked in this session | — |

**Missing dependencies with no fallback:**
- None identified that fully block planning. Google OAuth Console configuration should be verified by the user/executor before AUTH-04 acceptance testing — flagged as a setup checklist item, not a planning blocker.

**Missing dependencies with fallback:**
- Google OAuth Console setup — emulator can partially substitute for local dev iteration; full verification needs real Firebase project configuration outside this repo.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 [VERIFIED: my-app/package.json] |
| Config file | `my-app/vitest.config.ts` — currently scoped to `lib/firebase/__tests__/**/*.test.ts` only |
| Quick run command | `cd my-app && pnpm test:rules` (currently named for rules tests; may need a broader/renamed script if Phase 3 adds non-rules unit tests) |
| Full suite command | `cd my-app && pnpm test:rules` (same — no separate "full" suite exists yet) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Sign-up creates Firebase Auth user + Firestore doc | integration (Firebase emulator) | `pnpm test:rules` extended with an auth-emulator-backed test, or new `lib/firebase/__tests__/auth.test.ts` | ❌ Wave 0 |
| AUTH-02 | Verification email sent; unverified user blocked by `requireVerified` mechanism | unit (Guard logic) + manual (actual email delivery only verifiable via emulator UI, not automatable without an email-capture tool) | New `components/auth/__tests__/Guard.test.tsx` (React Testing Library not yet installed — see gap below) | ❌ Wave 0 |
| AUTH-03 | Sign-in succeeds with correct credentials, fails with wrong password (mapped to friendly error) | integration (Firebase emulator) | extend `lib/firebase/__tests__/auth.test.ts` | ❌ Wave 0 |
| AUTH-04 | Google sign-in completes and creates/links user | manual-only — Firebase Auth emulator's Google provider simulation is limited; full OAuth round-trip requires a real browser + real Google account, not unit-testable | Manual test plan in PLAN.md verification steps | ❌ Wave 0 (manual checklist, not a file) |
| AUTH-05 | Password reset email sent for existing account | integration (Firebase emulator — emulator UI lists "sent" emails) | extend `lib/firebase/__tests__/auth.test.ts` | ❌ Wave 0 |
| AUTH-06 | Password change succeeds; re-auth required after `requires-recent-login` | integration (Firebase emulator) | extend `lib/firebase/__tests__/auth.test.ts` | ❌ Wave 0 |
| AUTH-07 | Session persists across reload (persistence default) | manual / browser-level (not meaningfully unit-testable — `browserLocalPersistence` behavior depends on real browser storage, which jsdom only partially emulates) | Manual test plan + optional Playwright/E2E in a later phase if the project adds one (none currently installed) | ❌ Wave 0 (manual checklist) |
| AUTH-08 | Custom pages exist and route correctly (no Firebase hosted UI used) | smoke (route renders, AuthLayout applied) | New `app/(auth)/__tests__/` or simple route-existence check; alternatively rely on manual QA since no component-testing framework (RTL/Playwright) is installed yet | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd my-app && pnpm test:rules` (extended to cover new auth-emulator tests)
- **Per wave merge:** Same command — there is currently no separate "full suite" distinct from the rules-test command; the planner should consider renaming/expanding the vitest config's `include` glob to cover new `auth.test.ts` files alongside `firestore.rules.test.ts`.
- **Phase gate:** Full `pnpm test:rules` green, plus a manual verification pass for AUTH-04 (Google OAuth) and AUTH-07 (persistence across real browser close/reopen), since these cannot be fully automated with the project's current tooling.

### Wave 0 Gaps
- [ ] `my-app/lib/firebase/__tests__/auth.test.ts` — covers AUTH-01, AUTH-03, AUTH-05, AUTH-06 against the Auth emulator (pattern mirrors existing `firestore.rules.test.ts`'s `initializeTestEnvironment`-style setup, but Auth emulator tests typically use `firebase/auth` directly against `connectAuthEmulator`, not `@firebase/rules-unit-testing`)
- [ ] `my-app/vitest.config.ts` — `include` glob currently only matches `lib/firebase/__tests__/**/*.test.ts`; if Guard/component tests are added under `components/`, the glob needs widening, and a component-testing library (e.g. `@testing-library/react` + `jsdom` environment) is not yet installed — currently `environment: 'node'` only.
- [ ] No component-testing framework installed (`@testing-library/react`, `jsdom`/`happy-dom`) — needed only if the planner wants automated tests for `Guard.tsx`'s redirect logic rather than relying on manual QA; otherwise this can be deferred.
- [ ] No E2E framework (Playwright/Cypress) installed — needed for true AUTH-04/AUTH-07 automation; out of scope to add in this phase unless the planner explicitly decides browser session-persistence and OAuth need automated coverage now rather than manual QA.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Firebase Auth handles credential storage, password hashing, and brute-force throttling (`auth/too-many-requests`) server-side — no custom implementation in this project's code. |
| V3 Session Management | Yes | Firebase Auth's `browserLocalPersistence` + SDK-managed token refresh is the session mechanism (D-15); no custom cookie/JWT issuance in this phase. |
| V4 Access Control | Yes | `Guard.tsx` is the client-side authorization gate; Firestore Security Rules (already written in Phase 2, confirmed in `firestore.rules` — `users/{userId}` requires `request.auth.uid == userId`) are the actual enforcement boundary, since client-side gating alone is never sufficient (per Next.js's own authentication guide: "client-side UI restrictions alone are not sufficient for security" [CITED: my-app/node_modules/next/dist/docs/01-app/02-guides/authentication.md]). |
| V5 Input Validation | Yes | zod schemas validate email format, password strength on all forms (D-12) before calling Firebase APIs. |
| V6 Cryptography | No direct application in this phase | Firebase Auth handles all cryptographic operations (password hashing, token signing) internally; this project never implements crypto primitives for auth. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Account enumeration via distinct "user not found" vs "wrong password" errors | Information Disclosure | Centralized error map (D-14) intentionally maps both `auth/wrong-password`/`auth/invalid-credential` and `auth/user-not-found` to the same generic "Incorrect email or password" message (already reflected in Code Examples §Sign-In and Pattern 4) — this is the correct mitigation and should be preserved exactly as scoped. |
| Client-side-only route gating bypassed by direct API/Firestore calls | Tampering / Elevation of Privilege | `Guard.tsx` is UX-only; actual enforcement is Firestore Security Rules (already in place from Phase 2) plus any future server-side Route Handler checks (Admin SDK token verification) for privileged writes — this phase must not treat `Guard.tsx` as a security boundary, only as a UX redirect layer. |
| Session fixation / stale-session privilege operations (password change without fresh auth) | Tampering | `auth/requires-recent-login` handling (Pitfall 1 / Code Examples §Change Password) — Firebase enforces this natively; the app must handle the error correctly rather than suppress or retry-loop it. |
| OAuth popup/redirect hijacking or open-redirect via `?redirect=` query param on `/sign-in` | Spoofing / Tampering | When implementing the `?redirect=` preservation in `Guard.tsx`'s sign-in redirect (D-03), validate that the redirect target is a relative, same-origin path before using it in `router.replace()` — do not pass through arbitrary external URLs. This is a new consideration not explicitly called out in CONTEXT.md and should be added as an explicit task/verification step in the plan. |

## Sources

### Primary (HIGH confidence)
- `my-app/node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` — confirms Next.js 16 proxy.ts rename and "not a full session management or authorization solution" guidance (read directly from installed package)
- `my-app/node_modules/next/dist/docs/01-app/02-guides/authentication.md` — full Next.js App Router authentication guide, Context Providers section, client-side-restriction-insufficiency warning (read directly from installed package)
- `my-app/lib/firebase/client.ts`, `my-app/lib/firebase/admin.ts`, `my-app/lib/firebase/types.ts` — existing project code defining `auth`, `db`, `UserDoc` schema (read directly)
- `my-app/lib/firebase/__tests__/firestore.rules.test.ts`, `firestore.rules` — existing test pattern and security rules for `users/{userId}` (read directly)
- npm registry (`npm view <pkg> version`) — verified current versions for `firebase`, `firebase-admin`, `react-hook-form`, `zod`, `@hookform/resolvers`, `shadcn`, `lucide-react`, `next`, `react` on 2026-06-17

### Secondary (MEDIUM confidence)
- https://firebase.google.com/docs/auth/web/manage-users — WebFetch-verified function signatures for `sendEmailVerification`, `updatePassword`, `sendPasswordResetEmail`, `reauthenticateWithCredential`
- https://firebase.google.com/docs/auth/web/google-signin — WebFetch-verified `GoogleAuthProvider`/`signInWithPopup`/`signInWithRedirect` patterns
- https://ui.shadcn.com/docs/installation/next — WebFetch-verified shadcn CLI init/add commands
- https://ui.shadcn.com/docs/tailwind-v4 — WebFetch-verified (partial) Tailwind v4 compatibility confirmation

### Tertiary (LOW confidence)
- Firebase `AuthErrorCode` string constants (Assumption A1) — based on training knowledge of a long-stable public API; a direct docs page lookup (`firebase.google.com/docs/reference/js/auth.autherrorcodes`) 404'd in this session and was not independently re-verified via an alternate source.
- Claim that popup-based Google sign-in is "increasingly" unreliable due to 2025/2026 browser privacy defaults (Assumption A2) — based on general industry knowledge of COOP/popup-blocker trends, not a specific dated source verified this session.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all package versions independently verified against npm registry this session; Firebase client SDK already installed and configured in the codebase.
- Architecture: HIGH for the Guard/AuthProvider/proxy-avoidance pattern (directly grounded in this project's own Next.js docs and CONTEXT.md decisions); MEDIUM for the popup-vs-redirect Google sign-in recommendation (reasonable industry-standard guidance, but the comparative reliability claim itself is flagged ASSUMED).
- Pitfalls: HIGH for `requires-recent-login` and FOUC/loading-state pitfalls (well-documented, structurally inherent to the chosen pattern); MEDIUM for the specific error-code list (stable but not independently re-verified against a live reference page this session).

**Research date:** 2026-06-17
**Valid until:** 2026-07-17 (30 days — Firebase Auth client API and Next.js 16 App Router conventions are stable; npm package versions should be re-checked at plan execution time given the fast-moving zod/resolvers/lucide-react major-version question flagged in Open Questions)
