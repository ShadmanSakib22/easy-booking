# Research Summary: EasyAppointment SaaS

**Synthesized:** 2026-06-16
**Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md

---

## Recommended Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | Next.js App Router | 15 | "use client" at component level; server components for shell only |
| UI | React | 19 | |
| Styling | Tailwind CSS v4 + shadcn/ui | 4.x | `@theme` directive replaces config file |
| Database | Firebase Firestore | 9+ (modular) | Real-time listeners via `onSnapshot`; transactions for double-booking |
| Auth | Firebase Auth | 9+ | Email + Google sign-in; custom pages required |
| Storage | Firebase Storage | 9+ | Profile images, attachments |
| Payments | Stripe Hosted Checkout | latest | No Connect; no platform fee in v1 |
| Email | Nodemailer | 6.x | Per-calendar SMTP; dynamic transporter per request |
| AI Form Fill | Claude Haiku 4.5 (`claude-haiku-4-5`) | — | Structured Outputs beta; API key server-side only |
| Google Calendar | googleapis | 144+ | OAuth2; push notifications for sync |
| State mgmt | TanStack Query | v5 | Wraps Firebase subscriptions |
| Calendar UI | react-easy-appointments | local pkg | Must be improved before SaaS phases begin |

---

## Table Stakes vs Differentiators

### Table Stakes (must ship or product feels unfinished)
- Real-time slot availability with conflict prevention
- Email confirmation to both creator and booker
- Mobile-friendly booking UI
- Email OTP verification for guest bookers
- Creator dashboard to manage received bookings
- Auth (sign up, sign in, forgot password, email verification)

### Differentiators (EasyAppointment's competitive edge)
- **Fixed date-range calendars** — No competitor (Calendly, Cal.com, Acuity) offers "Jun 10–20 only" scheduling. This is the #1 differentiator.
- **Invite-only with per-email gating** — Calendly's "secret" link hides URL but doesn't gate by email. EasyAppointment's allowlist + OTP is meaningfully different.
- **Per-calendar SMTP** — No mainstream SaaS exposes this. Lets creators send from their own domain.
- **AI schedule creation** (chat → form pre-fill → draft) — Distinct UX pattern; Calendly's AI is availability-focused, not creation-focused.

### Correctly Out of Scope for v1
- Stripe Connect / platform fee (requires full Connect onboarding)
- SMS notifications
- Multi-timezone display
- Video conferencing
- Group bookings / intake forms
- Native mobile app

---

## Critical Architecture Decisions

### 1. Firestore (not Realtime Database) for slot state
Firestore's `runTransaction` provides serializable atomicity. RTDB cannot compound-query (`calendarId == x AND status == "available" ORDER BY startTime`). Use `onSnapshot` for real-time slot updates in the UI.

**Slot document pattern:**
```
calendars/{calendarId}/slots/{slotId}
  status: "available" | "pending" | "booked"
  pendingUntil: Timestamp  (TTL for abandoned checkouts)
  bookingId: string | null
```

### 2. Stripe application fee — NOT possible without Connect
`application_fee_amount` is a Stripe Connect-only field. **V1 decision: 100% of payment goes to creator's Stripe account. No platform fee.** Revisit in a Connect milestone.

### 3. SMTP credentials must be encrypted at rest
Creator SMTP passwords stored in Firestore must be AES-256 encrypted before write. Decrypt in the API Route Handler only. Never expose to client.

### 4. Stripe webhook is the sole booking confirmation trigger
Never confirm bookings on checkout redirect. Only `checkout.session.completed` with `payment_status === "paid"` triggers booking state transition. Store `stripeEventId` for idempotency.

### 5. Pending slot TTL for abandoned Stripe checkouts
When a booker starts checkout, slot moves to `pending`. A Cloud Function (or Firestore TTL field) resets it to `available` after 30 minutes if no webhook arrives.

### 6. AI calls in Next.js Route Handlers only
Claude API key never reaches the client. Form fill: POST to `/api/ai/fill-schedule` → Haiku with Structured Outputs → return JSON matching form schema.

### 7. Google Calendar sync via push notifications
Push channels deliver changes in ~4s vs 5–15min polling. Channels expire every 7 days — a scheduled Cloud Function must re-register them. OAuth app must be published (not in Testing mode) before launch.

---

## Top Pitfalls to Avoid

| # | Pitfall | Severity | Prevention |
|---|---------|----------|-----------|
| 1 | Double-booking race condition | CRITICAL | Always use `runTransaction` for slot claiming — never read-then-write outside a transaction |
| 2 | Stripe webhook not idempotent | CRITICAL | Store `stripeEventId` in Firestore before any business logic; return 200 immediately |
| 3 | Firebase Security Rules too permissive | CRITICAL | Explicit `request.auth.uid == resource.data.creatorId` on every read path; SMTP credentials especially |
| 4 | Timezone/hydration mismatch | HIGH | Store all slots as UTC ISO strings; fix in `react-easy-appointments` package first; use `suppressHydrationWarning` carefully |
| 5 | Google OAuth refresh token silent expiry | HIGH | Catch `invalid_grant` explicitly; surface re-auth UI to creator; publish OAuth app before any testing |
| 6 | Firebase listeners not cleaned up | MODERATE | Always `return unsubscribe` inside `useEffect`; never call `onSnapshot` outside `useEffect` |
| 7 | Invite token replay attacks | MODERATE | Firestore transaction: atomically check + set `used = true`; short expiry (15 min) |
| 8 | AI date arithmetic errors | MODERATE | Server-side validation with `date-fns` or `Temporal` after AI form fill; never trust LLM-generated dates without validation |
| 9 | Per-calendar SMTP silent failures | MODERATE | Validate credentials on save; store `smtpStatus` field; surface failures in creator dashboard |
| 10 | Next.js hydration mismatch with real-time data | MODERATE | Initialize Firebase listeners only in `useEffect`; use `TanStack Query` for loading state |

---

## Open Questions (Require Decisions Before Coding)

1. **Stripe v1 revenue model** — No fee (confirmed), manual payouts, or something else? Must be documented before payment phase.
2. **SMTP credential encryption key management** — Env-var AES key (simple) vs Google Cloud KMS (robust)? Decide before email phase.
3. **Pending slot timeout mechanism** — Firestore TTL field (runs once daily, simpler) vs Cloud Function scheduler (precise 30min)? Firestore TTL recommended for v1.
4. **react-easy-appointments audit** — Does it currently use UTC Date objects or local time strings? This scopes the package improvement work.
5. **Google OAuth app publication** — Must be published before any Google Calendar testing phase begins (Testing mode = 7-day token TTL).

---

## Build Order (from Architecture research)

1. **Package improvements** (`react-easy-appointments`) — prerequisite gate
2. **Firebase setup + Firestore data model** — gate zero for all features
3. **Auth pages + Firebase Auth** — gate for all user-facing flows
4. **Calendar creation + public booking page + real-time slots + free booking transaction** — core MVP
5. **Email (OTP verification + booking confirmation via SMTP)** — must follow booking flow
6. **Stripe paid booking + webhook handler + pending slot TTL** — distinct phase, async complexity
7. **Invite-only calendars + allowlist management**
8. **AI schedule creation (form fill)**
9. **Google Calendar sync**
10. **Creator dashboard + profile pages**
11. **Admin panel**
12. **Landing page** (no data dependencies, can slot in any time after product shape is clear)
