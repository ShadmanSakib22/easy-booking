# Phase 2: Firebase Foundation - Context

**Gathered:** 2026-06-16 (auto — Claude's discretion)
**Status:** Ready for planning

<domain>
## Phase Boundary

Configure the Firebase project (Auth, Firestore, Storage), define the Firestore data model with agreed document schemas, write security rules, and set up the local emulator suite — so all subsequent phases have a reliable, secure backend to write against. No UI is built in this phase.

</domain>

<decisions>
## Implementation Decisions

### Slot Storage Location

- **D-01:** Top-level `slots` collection (not a subcollection under `calendars`). Enables compound queries like `where("calendarId", "==", x).where("status", "==", "available").orderBy("startUtc")` required by BOOK-02 real-time listeners and PAY-03 status transitions. Subcollection approach would force collection group queries and make cross-calendar slot operations awkward.

### Firestore Schema — Full Upfront

- **D-02:** Define all 5 collections with complete field lists now. This phase IS the contract; lean schema means every subsequent phase rewrites it. All 11 remaining phases write against this schema — getting it right once is cheaper than migrating Firestore documents across phases.

#### `users/{uid}`
```
uid: string
email: string
displayName: string
username: string            // for /u/[username] — set during onboarding (PROF-04)
bio: string
photoURL: string | null
emailVerified: boolean
createdAt: Timestamp
updatedAt: Timestamp
```

#### `calendars/{calendarId}`
```
id: string
creatorId: string           // Firebase Auth uid
title: string
status: 'draft' | 'published' | 'archived'
visibility: 'public' | 'invite-only'
startDate: string           // UTC date "2026-05-19" — matches Phase 1 PKG-02 contract
endDate: string             // UTC date "2026-05-30"
dailySlotConfig: {
  startTime: string         // "09:00" local-agnostic HH:mm used for slot generation
  endTime: string           // "17:00"
  durationMinutes: number
}
invitedEmails: string[]     // whitelist for invite-only calendars (INV-01)
isPaid: boolean
paymentConfig: {            // null when isPaid is false
  amount: number            // in cents
  currency: string          // "usd"
  description: string
} | null
smtpConfigEncrypted: string | null   // AES-256 encrypted blob (SMTP-03); null = use platform default
googleCalendarConnected: boolean
createdAt: Timestamp
updatedAt: Timestamp
```

#### `slots/{slotId}`
```
id: string
calendarId: string
creatorId: string           // denormalized from calendar — needed for security rules without cross-doc reads
date: string                // UTC date key "2026-05-19" (Phase 1 D-02)
startUtc: string            // ISO 8601 "2026-05-19T09:00:00Z" (Phase 1 D-01)
endUtc: string              // ISO 8601 "2026-05-19T10:00:00Z"
status: 'available' | 'pending' | 'booked' | 'unavailable'   // 'pending' added per Phase 1 D-08
bookingId: string | null
pendingExpiresAt: Timestamp | null   // PAY-04: auto-reset after 30 min if Stripe webhook never arrives
createdAt: Timestamp
updatedAt: Timestamp
```

#### `bookings/{bookingId}`
```
id: string
slotId: string
calendarId: string
creatorId: string           // denormalized — for dashboard queries (DASH-01, DASH-02)
bookerEmail: string
bookerUid: string | null    // null for guest bookers
status: 'confirmed' | 'cancelled' | 'pending_payment'
stripeSessionId: string | null
stripeEventId: string | null   // idempotency key (PAY-06)
paymentStatus: 'not_required' | 'paid' | 'pending' | 'failed'
createdAt: Timestamp
updatedAt: Timestamp
```

#### `invites/{inviteId}` — OTP verification tokens
```
id: string
calendarId: string
email: string               // the email the OTP was sent to
token: string               // the 6-digit code (hashed or plaintext — server decides)
used: boolean               // set atomically to true on first use (INV-04)
expiresAt: Timestamp        // 15 minutes from creation (INV-04)
createdAt: Timestamp
```

### Security Rules Scope — Full v1 Ruleset Now

- **D-03:** Write the complete v1 security rules covering all collections now rather than minimal rules that must be patched every phase. Rationale: security rules are easy to get wrong under time pressure; doing it once during the infrastructure phase with a test suite is safer than adding per-phase.
- **D-04:** Rule principles:
  - `users`: auth user reads/writes only their own document (`request.auth.uid == userId`)
  - `calendars`: creator (auth uid == `creatorId`) has full read/write; anyone can read documents where `status == 'published' && visibility == 'public'`
  - `slots`: creator can write; public read allowed (slot status is public info needed for real-time availability display)
  - `bookings`: creator can read all bookings where `creatorId == request.auth.uid`; booker can read their own booking (`bookerUid == request.auth.uid`); booking creation goes through server-side Admin SDK (no direct client writes to bookings)
  - `invites`: no client reads/writes — all OTP operations go through server-side Route Handlers using Admin SDK
- **D-05:** Write a `firestore.rules.test.ts` suite using `@firebase/rules-unit-testing` covering: unauthenticated write rejected, creator write allowed, non-creator write rejected, public calendar read allowed, invite-only calendar read rejected.

### Emulator Workflow — Enhanced Setup

- **D-06:** Enhanced emulator integration: `firebase.json` configures Auth (port 9099), Firestore (port 8080), and Storage (port 9199) emulators. A `dev` npm script in `my-app/package.json` runs `firebase emulators:start` and `next dev` concurrently (via `concurrently` package).
- **D-07:** A `scripts/seed-emulator.ts` script seeds the emulator with: one test user, one published public calendar, 5 available slots — giving all subsequent phases a testable starting point without manual setup.
- **D-08:** `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true` env var toggles client SDK to point at emulator ports; when false (production), client SDK points at production Firebase. No code-path differences — just configuration.

### Firebase SDK Wiring

- **D-09:** Firebase client SDK initialized in `my-app/lib/firebase/client.ts` as a singleton using `getApps().length ? getApp() : initializeApp(config)` guard. Exports `auth`, `db`, `storage` instances. Import this file anywhere client-side Firebase is needed.
- **D-10:** Firebase Admin SDK initialized in `my-app/lib/firebase/admin.ts` as a server-only singleton. Used in Route Handlers for privileged operations (booking writes, OTP verification, webhook handling). Never imported in `"use client"` components.

### Claude's Discretion

- OTP token storage: plaintext 6-digit code vs hashed (server Route Handler handles both equally; lean toward hashed for defense in depth)
- Firestore index definitions (`firestore.indexes.json`) for the compound queries identified above
- Exact `concurrently` command flags for the dev script

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — Full v1 requirements; Phase 2 has no standalone IDs but its outputs gate AUTH-01–08, BOOK-02, BOOK-05, and all data-writing features
- `.planning/REQUIREMENTS.md` §SMTP-03 — AES-256 encryption requirement for SMTP credentials stored in Firestore (informs `smtpConfigEncrypted` field design)
- `.planning/REQUIREMENTS.md` §INV-04 — Single-use token + 15-minute expiry (informs `invites` collection schema)
- `.planning/REQUIREMENTS.md` §PAY-04 — 30-minute pending reset (informs `pendingExpiresAt` field on slots)
- `.planning/REQUIREMENTS.md` §PAY-06 — Idempotency via `stripeEventId` (informs `bookings` schema)

### Roadmap
- `.planning/ROADMAP.md` §Phase 2 — Success criteria (4 items) that define done for this phase

### Phase 1 Contract
- `.planning/phases/01-package/01-CONTEXT.md` — Slot field names (`startUtc`, `endUtc`, `date`) and `SlotStatus` values that the Firestore schema must match exactly

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `my-app/app/` — Bare Next.js 16 App Router scaffold (no Firebase yet). All Firebase initialization files will be new additions under `my-app/lib/firebase/`.
- No existing Firebase config, env vars, or SDK imports anywhere in the codebase.

### Established Patterns
- Next.js App Router with `"use client"` directive for reactive components — Firebase client SDK calls belong in client components or hooks; Admin SDK calls belong in Route Handlers (`app/api/`)
- Tailwind v4 already configured — no style work in this phase

### Integration Points
- `my-app/lib/firebase/client.ts` → imported by all future client-side components that need Firestore/Auth/Storage
- `my-app/lib/firebase/admin.ts` → imported by all future Route Handlers (`app/api/**`)
- `firebase.json` at repo root or `my-app/` root — controls emulator ports that every subsequent phase's dev setup depends on
- `scripts/seed-emulator.ts` → run once after `firebase emulators:start` to populate test data

</code_context>

<specifics>
## Specific Ideas

- Firebase chosen deliberately over Supabase/NeonDB — decision re-evaluated and confirmed during Phase 2 context discussion. Real-time + Auth + Storage integration is the primary driver.
- Denormalize `creatorId` onto `slots` and `bookings` documents to avoid cross-document reads in security rules (a Firestore rule cannot read another document to check ownership — denormalization is the standard workaround).

</specifics>

<deferred>
## Deferred Ideas

- Supabase / NeonDB as Firebase replacement — considered and declined; Firebase confirmed
- Google OAuth app publication (Testing → Production) — required before Phase 10 (Google Calendar Sync); flag as a pre-Phase-10 blocker in STATE.md

</deferred>

---

*Phase: 02-firebase-foundation*
*Context gathered: 2026-06-16*
