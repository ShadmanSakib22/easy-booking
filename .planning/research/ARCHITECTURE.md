# Architecture Patterns

**Project:** EasyAppointment
**Domain:** SaaS appointment booking platform
**Researched:** 2026-06-15
**Confidence:** HIGH (core Firestore/Next.js patterns verified against official docs and multiple current sources)

---

## Recommended Architecture

### System Overview

```
Browser (React/Next.js CSR)
  │
  ├─ Firebase Client SDK ──────────────────► Firestore (real-time listeners)
  │                                          Firebase Auth
  │
  └─ Next.js API Routes (Node.js)
       ├─ /api/stripe/webhook ─────────────► Firestore (confirm booking after payment)
       ├─ /api/stripe/checkout ────────────► Stripe API (create hosted session)
       ├─ /api/ai/fill ────────────────────► OpenAI/Vercel AI SDK (form prefill)
       ├─ /api/google-calendar/... ─────────► Google Calendar API (OAuth, sync)
       └─ /api/notify ──────────────────────► Nodemailer / Resend SDK (send email)
```

**Rule of thumb:** Firestore reads and real-time listeners go through the client SDK directly. Anything involving secrets (Stripe keys, OpenAI key, SMTP credentials, Google refresh tokens) lives exclusively in API routes. Firebase Admin SDK lives only in API routes and is never shipped to the browser.

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Next.js Client (CSR) | UI rendering, real-time slot display, booking form, creator dashboard | Firebase Client SDK (direct), Next.js API Routes |
| Firebase Auth | Identity (email/password + Google SSO), session tokens, custom claims (admin role) | Client SDK, Firebase Admin SDK in API routes |
| Firestore | Source of truth for all persistent data; real-time listeners for slot availability | Client SDK (reads/onSnapshot), Firebase Admin SDK (writes from API routes) |
| Next.js API Route: `/api/stripe/checkout` | Create Stripe Checkout Session with metadata (calendarId, slotId, bookerEmail) | Stripe API, Firestore (read slot/price) |
| Next.js API Route: `/api/stripe/webhook` | Verify Stripe signature, on `checkout.session.completed` atomically mark slot booked | Stripe API (verify), Firestore (atomic write via Admin SDK) |
| Next.js API Route: `/api/notify` | Send booking confirmation and calendar invite emails using per-calendar SMTP config | Firestore (read SMTP config), Nodemailer / Resend SDK |
| Next.js API Route: `/api/ai/fill` | Accept creator's natural language description, return structured form field values | OpenAI API (server-side only) |
| Next.js API Route: `/api/google-calendar/*` | Handle OAuth callback, exchange code for tokens, store refresh token, push events, register push notification channel | Google Calendar API, Firestore (token storage) |
| react-easy-appointments (npm package) | Calendar UI widget: renders slots, handles click selection | Parent component via props/callbacks |
| `(admin)` Route Group | Platform admin panel: user management, analytics, support tickets; protected by custom claim | Firebase Auth (custom claim check), Firestore |

---

## Critical Design Decision: Firestore for Double-Booking Prevention

**Use Firestore, not Firebase Realtime Database.**

Firestore supports true atomic transactions with optimistic concurrency — if two clients attempt to book the same slot simultaneously, only one transaction commits; the other detects the conflict and fails with an error the UI can handle. Firebase Realtime Database has transactions too, but Firestore's Witness-Region Consensus (multi-region majority agreement before commit) gives stronger consistency guarantees for booking-critical writes.

**The slot document IS the lock.** Model each bookable slot as its own Firestore document. The booking write is a transaction that:

1. Reads the slot document.
2. Asserts `slot.status === 'available'`.
3. Sets `slot.status = 'pending' | 'booked'` and writes booking metadata.
4. If another transaction races and wins first, this one fails — Firestore retries automatically up to 5 times, at which point the caller receives a conflict error.

**Real-time listener pattern for the UI:**

```
onSnapshot(query(collection('slots'), where('calendarId', '==', id)))
  → re-render slot grid on every change
  → "taken" slots become unclickable before the user even tries to book
```

This reduces (but does not eliminate) the need for transaction conflict handling in the UI, because most users will see a slot go grey before clicking it.

---

## Firestore Data Model

### Collection Structure

```
users/{userId}
  - email: string
  - displayName: string
  - photoURL: string
  - role: 'creator' | 'admin'          ← also stored as custom claim in Auth
  - createdAt: timestamp

users/{userId}/googleCalendar (subcollection, 1 doc)
  - accessToken: string (encrypted at rest, short-lived — store refresh token instead)
  - refreshToken: string (encrypted — see SMTP note below)
  - scope: string
  - expiresAt: timestamp
  - calendarId: string                  ← which Google Calendar to sync to
  - pushChannelId: string               ← for push notification registration
  - pushChannelExpiry: timestamp

users/{userId}/smtpConfigs/{calendarId}
  - provider: 'smtp' | 'resend' | 'sendgrid'
  - host: string                        ← for raw SMTP
  - port: number
  - secure: boolean
  - username: string
  - encryptedPassword: string           ← AES-256 encrypted before write (see security note)
  - apiKey: string                      ← for Resend/Sendgrid (encrypted)
  - fromEmail: string
  - fromName: string

calendars/{calendarId}
  - ownerId: string                     ← userId
  - title: string
  - description: string
  - visibility: 'public' | 'invite-only'
  - status: 'draft' | 'published'
  - paymentRequired: boolean
  - price: number                       ← in cents
  - currency: string
  - stripeProductDescription: string
  - dateRangeStart: timestamp
  - dateRangeEnd: timestamp
  - slotDurationMinutes: number
  - dailyStartTime: string              ← "09:00"
  - dailyEndTime: string                ← "17:00"
  - timezone: string                    ← creator's timezone for display reference
  - createdAt: timestamp
  - updatedAt: timestamp

calendars/{calendarId}/slots/{slotId}
  - calendarId: string                  ← denormalized for query efficiency
  - startTime: timestamp
  - endTime: timestamp
  - status: 'available' | 'pending' | 'booked' | 'cancelled'
  - bookingId: string | null
  - googleEventId: string | null        ← set after Google Calendar sync

calendars/{calendarId}/invites/{email}   ← only populated for invite-only calendars
  - email: string
  - invitedAt: timestamp

bookings/{bookingId}
  - calendarId: string
  - slotId: string
  - bookerEmail: string
  - bookerName: string
  - bookerUserId: string | null         ← null for unauthenticated bookers
  - status: 'pending_payment' | 'confirmed' | 'cancelled'
  - paymentRequired: boolean
  - stripeSessionId: string | null
  - stripePaymentIntentId: string | null
  - createdAt: timestamp
  - confirmedAt: timestamp | null

supportTickets/{ticketId}              ← for admin panel
  - userId: string
  - subject: string
  - body: string
  - status: 'open' | 'in_progress' | 'closed'
  - createdAt: timestamp
```

### Security Rules Summary

- `users/{userId}/**` — readable and writable only by the owning user (and admin custom claim).
- `calendars/{calendarId}` — readable by anyone if `visibility == 'public'` and `status == 'published'`; writable only by `ownerId`.
- `calendars/{calendarId}/slots/{slotId}` — readable by anyone (for real-time availability); writable only via API route (Admin SDK bypasses rules — the API route enforces its own logic).
- `bookings/{bookingId}` — readable by the booking creator (by userId or email match) and the calendar owner; writable only via API route.
- `smtpConfigs`, `googleCalendar` subcollections — readable/writable only by the owning user; never readable from the browser in production (use API routes as the access layer).

---

## Data Flow

### Booking Flow (Free Calendar)

```
1. Visitor opens /[username]/[calendarId]
2. Client SDK: onSnapshot(slots) → real-time grid renders
3. Visitor clicks available slot → booking form modal opens
4. Unauthenticated: email entered → POST /api/notify (send verification code)
5. Code verified client-side (or via short-lived Firestore token doc)
6. POST /api/booking/confirm → API route runs Firestore transaction:
     read slot, assert available, write slot{status:'booked'}, write booking doc
7. POST /api/notify → send confirmation email using per-calendar SMTP config
8. onSnapshot fires → slot turns grey for all connected clients
```

### Booking Flow (Paid Calendar)

```
1–3. Same as above
4. POST /api/stripe/checkout → create Stripe Checkout Session with:
     metadata: { calendarId, slotId, bookingId(pre-created as 'pending_payment') }
5. Write slot{status:'pending'} and booking{status:'pending_payment'} atomically
6. Redirect to Stripe hosted checkout
7. Stripe calls POST /api/stripe/webhook on payment success
8. API route: verify Stripe signature, read metadata, run Firestore transaction:
     update slot{status:'booked'}, update booking{status:'confirmed'}
9. POST /api/notify → send confirmation email
10. onSnapshot fires → real-time update to all viewers
```

**Do not mark a slot booked on Stripe redirect return.** Users can close the tab. The webhook is the only trusted signal.

**Handle pending slot expiry.** A slot set to `pending` while a user is in Stripe checkout can stay stuck if payment fails/abandons. Use a Cloud Function scheduled trigger (or Firestore TTL field) to reset `pending` slots older than 30 minutes back to `available`.

### AI Form Fill Flow

```
1. Creator types natural language description in form chat input
2. POST /api/ai/fill { prompt: "..." }
3. API route calls OpenAI (server-side, API key in env var, never client)
4. Returns structured JSON: { title, dateRange, slotDuration, price, ... }
5. Client merges response into form state (draft mode only)
6. Creator reviews, edits, clicks Publish → writes to Firestore
```

### Google Calendar Sync Flow

```
1. Creator clicks "Connect Google Calendar" in dashboard
2. Client → GET /api/google-calendar/auth-url → returns OAuth URL
3. Redirect to Google consent screen
4. Callback: GET /api/google-calendar/callback?code=...
5. Exchange code for tokens, store refresh token in users/{userId}/googleCalendar (encrypted)
6. Register push notification channel with Google (watch endpoint pointing to /api/google-calendar/webhook)
7. On booking confirmed: POST /api/google-calendar/sync → create Google Calendar event using stored refresh token
8. Google push notification → POST /api/google-calendar/webhook → sync external changes back
```

**Use webhooks (Google push notifications), not polling.** Webhooks are near-instant (~4 seconds round-trip); polling is 5–15 minutes delayed. Channels expire every ~7 days — re-register in the same Cloud Function that handles the webhook.

---

## SMTP Credential Security

Raw SMTP passwords and API keys must never sit in Firestore as plaintext. Firestore encrypts at rest automatically, but encryption at rest does not protect against a compromised service account or misconfigured security rules.

**Recommended approach:** Encrypt sensitive fields (SMTP password, API key, OAuth refresh token) with AES-256 using a server-side key stored in an environment variable (not in Firestore) before writing. Decrypt only inside API routes when needed to send email or refresh OAuth tokens.

This means:
- The browser NEVER reads the `smtpConfigs` or `googleCalendar` subcollections directly.
- Firestore Security Rules DENY reads on those subcollections from the client.
- The API routes use Firebase Admin SDK (bypasses security rules) and decrypt in memory.

For higher-security requirements (HIPAA, SOC 2), use Google Cloud Secret Manager or KMS instead of environment variable encryption — flag as a future consideration, not v1.

---

## Next.js Route Group Structure

```
app/
  (marketing)/           ← landing page, public-facing
    page.tsx             → /
    layout.tsx

  (auth)/                ← auth pages with minimal layout
    sign-in/page.tsx
    sign-up/page.tsx
    forgot-password/page.tsx
    verify-email/page.tsx
    change-password/page.tsx
    layout.tsx

  (app)/                 ← logged-in creator area
    dashboard/page.tsx
    calendars/
      new/page.tsx
      [calendarId]/edit/page.tsx
    bookings/page.tsx
    profile/page.tsx
    settings/page.tsx
    layout.tsx           ← auth guard, creator nav

  (public)/              ← public calendar/profile pages (no auth required)
    [username]/page.tsx               → profile page
    [username]/[calendarId]/page.tsx  → booking page (real-time)
    layout.tsx

  (admin)/               ← platform admin panel
    users/page.tsx
    calendars/page.tsx
    analytics/page.tsx
    tickets/page.tsx
    layout.tsx           ← admin custom-claim guard, separate nav

  api/
    stripe/
      checkout/route.ts
      webhook/route.ts
    google-calendar/
      auth-url/route.ts
      callback/route.ts
      sync/route.ts
      webhook/route.ts
    ai/
      fill/route.ts
    notify/route.ts
    booking/
      confirm/route.ts   ← free bookings
```

Route groups use parentheses in directory names; Next.js ignores them in URLs. Each group gets its own `layout.tsx` with appropriate auth guards and navigation shells. The `(admin)` group reads the user's Firebase Auth custom claim (`role: 'admin'`) in its layout and redirects non-admins.

---

## Firebase Cloud Functions vs Next.js API Routes

**Use Next.js API Routes for everything synchronous:** booking confirmation, Stripe webhook handling, SMTP sending, AI fill, Google Calendar OAuth.

**Use Firebase Cloud Functions (scheduled/background) for async triggers that Next.js can't handle:**
- Scheduled function every 30 minutes: reset `pending` slots older than 30 minutes back to `available`.
- Firestore trigger on booking write: fan-out Google Calendar sync if creator has Google Calendar connected (alternative: call `/api/google-calendar/sync` from the booking confirm API route directly — simpler for v1).
- Scheduled function every 6 days: re-register expiring Google push notification channels.

Keeping the main request/response logic in Next.js API routes avoids cold-start latency of Cloud Functions for hot paths (booking, payment). Cloud Functions handle the background/scheduled work where cold starts don't affect the user experience.

---

## Anti-Patterns to Avoid

### 1. Client-Side Booking Confirmation
**What it is:** Marking a slot booked from the browser after Stripe redirects back.
**Why bad:** User can close tab after payment succeeds. You lose the booking confirmation. Slot stays stuck as pending.
**Instead:** Webhook only. The Stripe `checkout.session.completed` event is the sole trigger for confirming a paid booking.

### 2. Exposing API Secrets in Client Code
**What it is:** Calling OpenAI, SMTP servers, or Stripe from browser-side JavaScript.
**Why bad:** API keys visible in browser devtools. SMTP credentials leak.
**Instead:** All third-party API calls route through Next.js API routes using `NEXT_PUBLIC_` env vars for non-secret config only.

### 3. Polling for Slot Availability
**What it is:** setInterval fetch to check slot status.
**Why bad:** Stale data between polls causes double-booking UX. Wasteful reads.
**Instead:** Firestore `onSnapshot` listener — pushes changes to all clients in real time without polling.

### 4. Storing Plaintext Credentials in Firestore
**What it is:** Writing SMTP passwords or OAuth refresh tokens as unencrypted strings.
**Why bad:** Compromised security rules or admin access exposes all credentials.
**Instead:** AES-256 encrypt before write; decrypt only in API route memory.

### 5. Single `slots` Top-Level Collection
**What it is:** `slots/{slotId}` with calendarId as a field.
**Why bad:** Firestore Security Rules can't efficiently scope read access per calendar. Real-time listeners pull too broadly.
**Instead:** `calendars/{calendarId}/slots/{slotId}` subcollection scopes listeners and security rules naturally.

### 6. Checking Availability in Application Logic Without a Transaction
**What it is:** Read slot status → if available, write booking in two separate operations.
**Why bad:** Classic TOCTOU race — two clients can read "available" simultaneously and both proceed to write.
**Instead:** Always use a Firestore transaction that reads and writes atomically.

---

## Suggested Build Order (Dependency Graph)

Components must be built in this order because later components depend on earlier ones:

```
1. Firebase project setup + Auth
   → required by everything

2. Firestore data model + Security Rules
   → required by all reads/writes

3. react-easy-appointments package improvements  ← stated prerequisite
   → required by the booking page UI

4. Auth pages (sign-in, sign-up, forgot password, verify, change password)
   → required before any protected routes

5. Calendar creation flow (form + AI fill + draft/publish)
   → requires Auth + Firestore + AI API route

6. Public booking page (slot grid + real-time listener + free booking flow)
   → requires Calendar creation + react-easy-appointments + Firestore transactions

7. Email notification system (per-calendar SMTP config + send on booking)
   → can be layered onto booking flow once basic booking works

8. Paid booking flow (Stripe checkout + webhook + pending slot expiry)
   → requires Booking flow working first; adds Stripe layer

9. Google Calendar sync (OAuth + token storage + event push + push notifications)
   → requires Auth + Firestore token storage + confirmed booking event to trigger

10. Creator dashboard (bookings received, calendar management)
    → requires bookings data to exist

11. Public profile page ([username] route)
    → requires published calendars to exist

12. Admin panel (user management, analytics, support tickets)
    → requires all core flows working; uses custom claims

13. Landing page
    → last; no data dependencies; pure marketing
```

**Phase implication:** The package improvement milestone (step 3) must complete before steps 6+ can be meaningfully built. Steps 1–2 are setup/infrastructure and unlock everything else. Steps 4–6 form a natural "core MVP" phase. Steps 7–9 are enhancement phases. Steps 10–13 are polish/completeness phases.

---

## Scalability Considerations

| Concern | At 1K bookings | At 100K bookings | Notes |
|---------|---------------|-----------------|-------|
| Firestore reads | Default quotas sufficient | Enable Firestore caching; monitor read costs | Real-time listeners count per open connection |
| onSnapshot fan-out | Fine | Consider Firestore enterprise real-time queries (sharded listeners) | Google docs note scale limit is ~1M concurrent listeners per project |
| Stripe webhooks | Single `/api/stripe/webhook` endpoint | Idempotency key on Stripe session to prevent duplicate processing | Use `stripe.webhooks.constructEvent` for signature verification always |
| SMTP sending | Nodemailer fine | Consider queue (Cloud Tasks) to avoid timeouts on slow SMTP | Resend/Sendgrid handle queuing internally |
| Google Calendar sync | Per-booking sync call fine | Batch if needed; watch channel renewal must be reliable | Channel expiry at 7 days is the critical operational concern |

---

## Sources

- [Firestore Transactions and Batched Writes — Official Docs](https://docs.cloud.google.com/firestore/docs/manage-data/transactions)
- [How to Structure Any Booking/Reservation System with Firebase](https://keepdeploying.com/how-to-structure-any-booking-reservation-system-with-firebase-e7f1774e848e)
- [Firestore Real-Time Listeners at Scale — Official Docs](https://firebase.google.com/docs/firestore/enterprise/real-time-queries-at-scale)
- [Get Real-Time Updates with onSnapshot — Official Docs](https://docs.cloud.google.com/firestore/native/docs/query-data/listen)
- [Stripe Checkout and Webhook in Next.js 15 (2025)](https://medium.com/@gragson.john/stripe-checkout-and-webhook-in-a-next-js-15-2025-925d7529855e)
- [Stripe: Payment Status Verification — Official Docs](https://docs.stripe.com/payments/payment-intents/verifying-status)
- [Generating and Storing OAuth 2.0 Access Tokens with Firebase](https://medium.com/@adamgerhant/generating-and-storing-oauth-2-0-access-tokens-with-firebase-7b8a2e285578)
- [Integrating Google Calendar with Firebase](https://medium.com/@mulhoon/integrating-google-calendar-with-firebase-a-step-by-step-guide-d28ab68097b9)
- [How Calendar Sync Works: Webhooks, Polling & Dedup](https://syncdate.app/blog/how-calendar-sync-works)
- [Firestore Security Overview — Official Docs](https://firebase.google.com/docs/firestore/security/overview)
- [Next.js App Router Route Groups — Best Practices 2025](https://medium.com/better-dev-nextjs-react/inside-the-app-router-best-practices-for-next-js-file-and-directory-structure-2025-edition-ed6bc14a8da3)
- [Next.js 16 AI Integration Patterns](https://www.digitalapplied.com/blog/nextjs-16-ai-integration-patterns-guide)
- [Firebase with Next.js — Ultimate Guide](https://blog.jarrodwatts.com/the-ultimate-guide-to-firebase-with-nextjs)
- [Implementing Multi-Tenancy with Firebase](https://ktree.com/blog/implementing-multi-tenancy-with-firebase-a-step-by-step-guide.html)
