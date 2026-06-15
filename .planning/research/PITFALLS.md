# Domain Pitfalls

**Domain:** SaaS appointment booking platform (Next.js + Firebase)
**Researched:** 2026-06-15
**Scope:** Greenfield build; all 10 risk areas investigated with verified sources

---

## Critical Pitfalls

Mistakes in this category cause double-bookings, revenue loss, data breaches, or forced rewrites.

---

### Pitfall 1: Double-Booking via Firestore Race Conditions

**What goes wrong:** Two visitors open the same calendar, see the same slot as available, and both trigger a booking simultaneously. Without an atomic transaction wrapping the read-then-write, both commits succeed and the slot is double-booked.

**Why it happens:** Developers use simple `setDoc` or `updateDoc` calls after first checking availability with a `getDoc`. The check and the write are two separate operations with no atomicity guarantee. By the time the second write lands, the slot state has already changed.

**Consequences:** Two confirmed bookings for one slot. Creator reputation damage. Manual refunds required.

**Prevention:**
- Wrap every slot claim in a Firestore `runTransaction`. Inside the transaction: read the slot document, verify `status === "available"`, then set `status = "booked"` and write booker metadata. Firestore's serializable isolation guarantees the second concurrent transaction will retry and see the committed state from the first.
- Never check availability outside the transaction and then write inside it — the gap between those two steps is where races live.
- For very high-concurrency slots (viral calendars), move booking finalization to a Firebase Cloud Function so the transaction runs server-side and cannot be replayed or tampered with from the client.
- Mobile/web SDKs use optimistic concurrency (MVCC) by default: they retry automatically on contention. Cap retries at 3-5 in your application layer and surface a "slot was just taken" error to the user on exhaustion.

**Warning signs:**
- Any code path that reads slot availability with `getDoc` and then writes with `setDoc` as separate awaited calls.
- Missing `runTransaction` imports in booking flow files.
- `status` field updated via `FieldValue.increment` instead of a conditional transaction.

**Phase:** Address in the core booking engine phase (before any UI is built on top of it). This is non-negotiable infrastructure.

---

### Pitfall 2: Stripe Webhook Reliability — Payment Confirmed, Slot Not Booked

**What goes wrong:** User completes Stripe hosted checkout. Stripe fires a `checkout.session.completed` event to your webhook endpoint. Your endpoint times out (>30s), returns a 5xx, or simply processes the event twice due to Stripe's at-least-once delivery. Result: payment taken, booking never created — or booking created twice.

**Why it happens:** Webhook handlers contain too much logic (email sending, Firestore writes, Google Calendar sync all in the same request), causing timeouts. No idempotency check means duplicate events create duplicate bookings.

**Consequences:** Users pay but cannot access their booking. Creator receives payment but calendar shows no booking. Chargebacks and support burden.

**Prevention:**
- Implement idempotency by storing `stripeEventId` in Firestore with a unique constraint (or use a dedicated `processedWebhooks` collection). On every incoming event, check if `stripeEventId` already exists — if yes, return 200 immediately and skip processing.
- Immediately return `200 OK` after signature verification and event ID storage. Enqueue all real work (Firestore booking write, email, Calendar sync) to a background job (Cloud Tasks or a Firestore-triggered Cloud Function).
- Always verify the Stripe signature (`stripe.webhooks.constructEvent`) before processing. Never trust the raw payload body.
- Listen specifically for `checkout.session.completed` with `payment_status === "paid"`. Do not trust `payment_intent.succeeded` alone for checkout sessions — they fire at different times.
- Store `checkoutSessionId` on the booking document so you can reconcile any orphaned payments.

**Warning signs:**
- Webhook handler that calls `await sendEmail(...)` or `await syncGoogleCalendar(...)` inline before returning the response.
- No `processedWebhooks` or similar deduplication table.
- No Stripe signature verification (`stripe.webhooks.constructEvent` missing from handler).

**Phase:** Address during payment integration phase. Stub the webhook early with idempotency scaffolding before wiring real business logic.

---

### Pitfall 3: Firebase Security Rules — Multi-Tenant Data Leakage

**What goes wrong:** Calendar creators can read each other's private (Invite-Only) calendar data, booking lists, or SMTP credentials. Happens when rules authenticate the user but fail to verify document ownership.

**Why it happens:** A rule like `allow read: if request.auth != null` grants any authenticated user access to any document in the collection. Developers write ownership checks only for write operations and forget reads. The Realtime Database compounds this: `.read: true` on a parent node cascades to all children.

**Consequences:** SMTP credentials (passwords, API keys) exposed to other users. Booking PII (names, emails) of another creator's attendees visible. Invite-only calendar attendee lists leaked. Regulatory exposure (GDPR).

**Prevention:**
- For every collection, write explicit ownership rules: `allow read, write: if request.auth.uid == resource.data.ownerId`
- Per-calendar SMTP config must live in a subcollection or document that only the calendar owner can read: `allow read: if request.auth.uid == resource.data.creatorId`
- Invite-Only calendars: the attendee list and all bookings must be gated on `request.auth.uid == calendarDoc.creatorId` for creator access, and `request.auth.token.email == resource.data.invitedEmail` for invited attendees (read their own booking only).
- Never use `{document=**}` wildcards with permissive rules — they grant access to every nested document.
- Validate incoming write fields explicitly. Without field validation, any authenticated user can write `isAdmin: true` or `plan: "enterprise"` to their own user document. Use `request.resource.data.keys().hasOnly([...])` to whitelist fields.
- Run the Firebase Rules Simulator and the Emulator Suite against your rules before deploying. Test cross-user reads explicitly as part of your test suite.
- `get()` calls inside security rules count as Firestore reads and add latency. Cache referenced documents where possible and keep rule evaluation shallow.

**Warning signs:**
- Any rule containing only `if request.auth != null` without an ownership check.
- SMTP credentials stored in the same document as public calendar metadata.
- No rule tests that attempt cross-user reads.

**Phase:** Define the security rules schema before any Firestore collection is created. Retrofitting rules onto an existing data structure is painful and error-prone.

---

### Pitfall 4: Stripe Application Fee Requires Connect — Architecture Dead-End

**What goes wrong:** The project intends to collect a 1.5% platform fee without Stripe Connect. However, `application_fee_amount` in Stripe Checkout is a Connect-only feature. Attempting to use it without a connected account will result in an API error. Discovering this mid-build forces either a Connect onboarding implementation (significant scope expansion) or abandoning the fee model.

**Why it happens:** Stripe's docs discuss `application_fee_amount` in the context of `payment_intent_data`, which sounds like a standard checkout parameter. It is not — it requires the payment to be created on a connected account.

**Consequences:** 1.5% fee cannot be collected without Connect. If Connect is added mid-phase, it requires creator onboarding flows (Stripe Express or Standard), payout management, and compliance considerations — all out-of-scope work.

**Prevention:**
- Accept early that without Connect, all payments go directly to the creator's Stripe account and the platform collects no automated fee.
- If a fee is required: implement Stripe Connect (Express onboarding is the lightest path). Scope this as a separate milestone — it is not trivially added.
- For v1 without Connect: design the payment flow so the creator's Stripe account receives 100% of the booking fee. Document this explicitly so no stakeholder assumes a fee is being collected.
- Do not attempt workarounds (e.g., creating a separate charge to collect the fee) — these violate Stripe's terms of service.

**Warning signs:**
- Any code attempting `payment_intent_data: { application_fee_amount: X }` without a `transfer_data.destination` parameter pointing to a connected account.
- Roadmap tasks that reference "1.5% fee" without a corresponding Connect implementation task.

**Phase:** Resolve this architectural decision before the payment phase begins. The answer affects the entire creator onboarding flow design.

---

## Moderate Pitfalls

Mistakes in this category cause user-facing bugs, silent failures, or significant debugging time.

---

### Pitfall 5: Local Time Display Bugs with Timezone-Naive Slot Storage

**What goes wrong:** Calendar slots are stored as naive date strings (e.g., `"2026-07-15T09:00"`) without a timezone offset. When displayed in the visitor's browser, JavaScript interprets the string differently depending on the parsing method — `new Date("2026-07-15T09:00")` is treated as local time in some environments and UTC in others. Visitors in different timezones see slots shifted by their UTC offset.

**Why it happens:** The `react-easy-appointments` package (and most scheduling libraries) accepts date/time inputs. If slots are stored without explicit UTC offsets, the package will display them relative to whatever the browser's local clock reports. Additionally, Next.js SSR may render a time using the server's timezone (UTC) while the client renders with the user's local timezone — causing a hydration mismatch on top of the display error.

**Consequences:** Visitor in UTC-5 books a 9am slot that the creator (UTC+0) intended as a 9am slot — the visitor arrives 5 hours early/late. Booking confirmation emails show one time, calendar shows another.

**Prevention:**
- Store all slot times as UTC ISO 8601 strings with explicit `Z` suffix (`"2026-07-15T09:00:00Z"`) or as Unix timestamps.
- On the creator side, capture the creator's timezone at calendar-creation time and store it on the calendar document. Use this timezone to convert creator-local times to UTC before writing to Firestore.
- On the display side, convert UTC to the visitor's `Intl.DateTimeFormat().resolvedOptions().timeZone` inside a `useEffect` (client-only). Never render timezone-dependent values during SSR.
- For the `react-easy-appointments` package: audit whether it accepts UTC Date objects or expects local time strings. Write a regression test that runs across UTC-12 and UTC+12 simulated environments.
- Pass `Date` objects (not strings) to any scheduling component, constructed via `new Date(utcString)`, which is always parsed as UTC when the string ends in `Z`.

**Warning signs:**
- Slot times stored as `"YYYY-MM-DDTHH:mm"` strings without timezone suffix in Firestore.
- Timezone conversion logic running in a component render function (not inside `useEffect`).
- Hydration warnings in the browser console mentioning date/time values.
- No timezone field on the calendar document.

**Phase:** Address in the `react-easy-appointments` package improvement phase (before SaaS build). Add timezone regression tests to the package. Apply UTC-first storage design during the calendar creation phase.

---

### Pitfall 6: Google Calendar OAuth Refresh Token Silent Expiry

**What goes wrong:** Creator connects their Google Calendar during setup. The integration works for days or weeks. Then: the refresh token is silently invalidated by Google (password change, 6-month inactivity, user revoked access in Google account settings, or the OAuth app is still in "Testing" mode with a 7-day token TTL). Calendar sync stops working with no visible error to the creator. Bookings are no longer pushed to Google Calendar.

**Why it happens:** The `googleapis` library auto-refreshes access tokens transparently — which is good — but when the underlying refresh token itself is invalidated, the library throws an `invalid_grant` error that is only surfaced if explicitly caught and handled. Most implementations catch errors at the API call level but do not propagate them to the user.

**Consequences:** Creator misses bookings because their Google Calendar is out of sync. Creator discovers the issue only when a booking conflict occurs in real life.

**Prevention:**
- Store the `refresh_token`, `access_token`, and `expiry_date` in Firestore on the creator's profile document (encrypted at rest).
- Wrap every Google Calendar API call in a try/catch. On `invalid_grant` error: set a `googleCalendarStatus: "disconnected"` flag on the creator's profile. Show a prominent banner in the creator dashboard prompting reconnection.
- Use the `tokens` event on `oauth2Client` to persist newly refreshed tokens back to Firestore immediately.
- During OAuth setup: request `access_type: "offline"` and `prompt: "consent"` to force Google to issue a refresh token (omitting `prompt: "consent"` on repeat authorizations skips the consent screen and may not return a new refresh token).
- Move Google Calendar sync to a Cloud Function triggered by Firestore booking writes. This keeps sync logic server-side and prevents refresh token secrets from ever reaching the browser.
- Publish the OAuth app before v1 launch. Apps in "Testing" mode issue refresh tokens that expire after 7 days regardless of usage.

**Warning signs:**
- Google Calendar sync implemented directly in client-side Next.js code (tokens exposed).
- No `googleCalendarStatus` field on creator profile documents.
- No dashboard UI for reconnecting Google Calendar.
- OAuth app still in "Testing" mode at launch.

**Phase:** Address during the Google Calendar integration phase. Ensure Cloud Function sync architecture is decided before writing any OAuth code.

---

### Pitfall 7: Next.js Hydration Mismatches with Firebase Real-Time Listeners

**What goes wrong:** A calendar page uses Firebase `onSnapshot` to subscribe to real-time slot availability. The component renders slot availability on the server (SSR) with no data (or stale data), then hydrates on the client with the real-time data. React throws hydration mismatch errors because server HTML and client HTML differ. Additionally, if `onSnapshot` is set up outside `useEffect` in a `"use client"` component, it runs immediately and creates a subscription that is never cleaned up — causing memory leaks and phantom listener warnings.

**Why it happens:** Next.js attempts to match server-rendered HTML with the first client render. Any dynamic data (real-time slot status, booking counts) that differs between server and client causes a mismatch. Firebase listeners are browser-only APIs but can be accidentally invoked during SSR.

**Consequences:** Console errors and potential React rendering corruption. Orphaned `onSnapshot` listeners on every page navigation — each one maintaining an open WebSocket to Firestore, accumulating until the browser tab is refreshed.

**Prevention:**
- Always initialize Firebase `onSnapshot` listeners inside `useEffect` in `"use client"` components. The `useEffect` hook only runs after hydration, on the client.
- Return the unsubscribe function from `useEffect`: `return () => unsubscribe()`. This is mandatory — not optional — or listeners accumulate.
- For slot availability display: render a loading skeleton server-side, not actual slot data. Let the client populate real slot status after hydration. Use `suppressHydrationWarning` only as a last resort and document why.
- Use `next/dynamic` with `{ ssr: false }` to wrap any component that directly consumes Firebase real-time data if server rendering it provides no SEO value (calendar pages are not crawled for content).
- Avoid `onSnapshot` in Server Components. Server Components cannot subscribe to real-time data — they render once. All Firebase listener logic belongs in Client Components only.

**Warning signs:**
- "Hydration failed because the initial UI does not match what was rendered on the server" errors in the console.
- `onSnapshot` called at the module level or in the component body (not inside `useEffect`).
- Listener count growing across page navigations (detectable in Firebase console's active connections metric).

**Phase:** Address during the calendar display phase. Establish the SSR/CSR boundary pattern early — all real-time Firebase components must use `"use client"` with `useEffect`-scoped listeners.

---

### Pitfall 8: Invite-Only Email Verification Replay Attacks

**What goes wrong:** An invite-only calendar sends a verification code to the invited email. If the code is a simple short-lived numeric token without a use-once constraint, an intercepted or forwarded code can be used multiple times by an unauthorized party. Alternatively, if codes have long or no expiry, an old invite email can be replayed months later to gain access to a calendar that has since been revoked.

**Why it happens:** Developers implement verification codes as a Firestore document with only an expiry timestamp. They check `expiresAt > now` but do not mark the token as used after first verification. The token remains valid for its full lifetime even after use.

**Consequences:** An intercepted verification email allows unauthorized booking on a private calendar. An invited attendee who was later uninvited can still book using their original code.

**Prevention:**
- Store verification tokens in a `pendingVerifications` Firestore collection with: `token` (cryptographically random, 32+ bytes), `email`, `calendarId`, `expiresAt` (15 minutes is sufficient for booking flow), and `used: false`.
- On verification: use a Firestore transaction to atomically check `used === false AND expiresAt > now` then set `used = true`. This prevents concurrent replay within the same token window.
- For invite revocation: deleting the invite record from the `invites` collection is not enough if a token is already issued. Also delete or invalidate any pending `pendingVerifications` documents associated with that email+calendarId pair.
- Do not use sequential numeric codes (e.g., 6-digit codes) that are brute-forceable. Use `crypto.randomBytes(32).toString('hex')` for the token, sent as a URL link, not a typed code.
- Rate-limit verification attempts per IP and per email to prevent enumeration attacks.

**Warning signs:**
- Verification tokens without a `used` boolean field.
- Token check implemented as a single `getDoc` + conditional (not a transaction).
- 6-digit numeric codes that users type in manually (brute-forceable in ~10^6 attempts, trivial at API speed without rate limiting).

**Phase:** Address during the invite-only calendar and email verification phase.

---

### Pitfall 9: Per-Calendar SMTP Misconfiguration Causing Silent Email Failures

**What goes wrong:** Creator configures their own SMTP credentials (personal Gmail SMTP, Resend API key, or another provider) per calendar. If the credentials are wrong, the SMTP server rejects the connection silently in the background. The booker receives no confirmation email. The creator has no indication emails are failing.

**Why it happens:** Email sending is async and often fire-and-forget. Errors thrown by the SMTP library (Nodemailer, Resend SDK) are caught at the service level but not surfaced to the creator. Additionally, Google's 2025 bulk sender guidelines (complaint rate above 0.1% degrades deliverability) mean even valid SMTP credentials can fail deliverability checks if the sending domain lacks SPF/DKIM records.

**Consequences:** Bookers do not receive confirmation or verification emails. For public calendars, bookers cannot complete email verification and cannot book. For paid calendars, booker has paid but received no confirmation.

**Prevention:**
- Test SMTP credentials at configuration time. When a creator saves their SMTP config, immediately send a test email to the creator's own account and return success/failure. Do not silently accept credentials without validation.
- Store a `smtpStatus` field on the calendar document: `"verified" | "failed" | "unconfigured"`. Surface a warning in the creator dashboard if status is not `"verified"`.
- Log all email send attempts with outcome (success/bounce/rejection) in a Firestore `emailLogs` subcollection. Make this visible to creators in their dashboard.
- For Resend: use the Resend SDK and check the response `error` field — Resend returns structured errors, not just HTTP codes.
- Provide a platform-default fallback SMTP (Resend or SendGrid account controlled by the platform) if the creator has not configured their own. This prevents broken booking flows.
- Document SPF/DKIM requirements prominently in the creator SMTP setup flow. Creators using personal Gmail SMTP who own a custom domain may not have SPF records pointing to Google's servers.
- Google/Microsoft reject unauthenticated email for senders above 5,000 emails/day (2025). For the platform-wide email domain, ensure SPF, DKIM, and DMARC are configured from day one.

**Warning signs:**
- SMTP credential save endpoint that returns success without attempting a test send.
- Email sending code wrapped in a try/catch that logs to console but does not write to Firestore or notify the creator.
- No `smtpStatus` indicator in the creator dashboard UI.

**Phase:** Address during the notification/email phase. Design the email service abstraction (Resend vs. SMTP vs. platform default) before implementing any booking confirmation flow.

---

## Minor Pitfalls

Mistakes in this category cause friction, technical debt, or late-discovered bugs.

---

### Pitfall 10: AI Form Fill Hallucinating Time Slots or Dates

**What goes wrong:** Creator types "Schedule interviews every Tuesday and Thursday in July from 10am to 4pm, 30-minute slots, starting July 7th." The AI misparses the instruction — generates slots on wrong dates, uses 60-minute intervals instead of 30, or hallucinates slots on days that don't exist (e.g., July 31 when July ends on the 31st but July 31 is a Sunday not a Tuesday). Creator publishes without reviewing and the schedule is wrong.

**Why it happens:** LLMs are poor at precise date arithmetic (day-of-week calculations, DST awareness, month-end edge cases). Without a hard constraint that generated slots are validated against a date library, the model produces plausible-looking but incorrect outputs. The form pre-fill pattern obscures errors because the creator may not carefully review every generated slot.

**Consequences:** Incorrect schedule published. Bookers see wrong dates/times. Creator must unpublish, regenerate, and re-publish — or manually edit many individual slots.

**Prevention:**
- Always use the AI to fill form fields (text, config), never to directly write slot records to Firestore. The creator must click Publish as a final human review gate — this is already in the project requirements and must not be bypassed.
- After AI form fill, validate all generated slots server-side against a strict date library (e.g., `date-fns` or `Temporal` API). Reject any slot that does not fall on the claimed day of the week, falls outside the declared date range, or overlaps with an existing slot.
- Show a slot preview in the UI before publish with explicit date-of-week labels (e.g., "Tuesday, July 8 — not just "2026-07-08"). This gives the creator a fast human sanity check.
- Constrain the AI prompt with a structured output schema (JSON mode / function calling). Define an enum for allowed days-of-week, a specific time format, and slot duration options. Do not accept free-form date strings from the model output — parse them strictly.
- Test AI form fill with adversarial inputs: month boundaries, DST transition weeks, leap years, and ambiguous natural language ("last Tuesday of the month").

**Warning signs:**
- AI output written directly to Firestore without a validation layer.
- Slot generation that relies on model output for date arithmetic without cross-checking against `new Date()` or a date library.
- No server-side validation of slot dates before Publish is allowed.

**Phase:** Address during the AI form fill feature phase. The validation layer is more important than the AI itself — implement it first.

---

## Phase-Specific Warning Map

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| react-easy-appointments package improvements | Timezone display bugs (Pitfall 5) | Audit UTC handling; add timezone regression tests before SaaS build |
| Core booking engine / Firestore schema | Double-booking race condition (Pitfall 1) | Design runTransaction pattern as the only booking write path |
| Firestore schema / security rules | Multi-tenant data leakage (Pitfall 3) | Write and test rules before any UI reads data |
| Payment integration | Stripe webhook reliability (Pitfall 2) | Idempotency scaffolding before webhook business logic |
| Payment integration | Stripe Connect architecture (Pitfall 4) | Decide Connect vs no-Connect before any payment code is written |
| Calendar display / real-time UI | Next.js hydration mismatches (Pitfall 7) | Enforce useEffect listener pattern; no SSR for real-time slot data |
| Invite-only calendar feature | Replay attack on verification tokens (Pitfall 8) | Use-once tokens with atomic Firestore transaction check |
| Email / notification system | SMTP silent failures (Pitfall 9) | Test-on-save credential validation; smtpStatus dashboard indicator |
| Google Calendar integration | OAuth token silent expiry (Pitfall 6) | invalid_grant handler; disconnected status flag; Cloud Function sync |
| AI form fill feature | Hallucinated slots and date errors (Pitfall 10) | Server-side date validation layer; structured JSON output schema |

---

## Sources

- [Firestore Transaction Isolation and Serializability](https://firebase.google.com/docs/firestore/transaction-data-contention) — HIGH confidence (official Firebase docs)
- [Race Conditions in Firestore — QuintoAndar Engineering](https://medium.com/quintoandar-tech-blog/race-conditions-in-firestore-how-to-solve-it-5d6ff9e69ba7) — MEDIUM confidence
- [Firestore Transactions and Batched Writes](https://firebase.google.com/docs/firestore/manage-data/transactions) — HIGH confidence (official Firebase docs)
- [Stripe Webhook Idempotency and Security](https://dev.to/whoffagents/stripe-webhook-security-signature-verification-idempotency-and-local-testing-1lk3) — MEDIUM confidence
- [Handling Payment Webhooks Reliably](https://medium.com/@sohail_saifii/handling-payment-webhooks-reliably-idempotency-retries-validation-69b762720bf5) — MEDIUM confidence
- [Stripe Collect Application Fees (Connect required)](https://docs.stripe.com/connect/saas/tasks/app-fees) — HIGH confidence (official Stripe docs)
- [Stripe Direct Charges](https://docs.stripe.com/connect/direct-charges) — HIGH confidence (official Stripe docs)
- [Firebase Security Rules: 8 Common Mistakes](https://checkvibe.dev/blog/firebase-security-rules-guide) — MEDIUM confidence
- [Top 10 Firebase Security Rules Best Practices 2025](https://saproh.com/blog/top-10-firebase-security-rules-best-practices-for-2025) — MEDIUM confidence
- [Basic Firebase Security Rules](https://firebase.google.com/docs/rules/basics) — HIGH confidence (official Firebase docs)
- [Fix Insecure Firestore Rules](https://firebase.google.com/docs/firestore/security/insecure-rules) — HIGH confidence (official Firebase docs)
- [JavaScript UTC Timezone Bugs](https://ostechnix.com/javascript-timestamp-bug-utc-timezone-fix/) — MEDIUM confidence
- [Syncfusion React Schedule Timezone Docs](https://ej2.syncfusion.com/react/documentation/schedule/timezone) — MEDIUM confidence
- [Google OAuth2 Token Refresh in Node.js](https://dev.to/rashidpbi/understanding-google-oauth2-token-refresh-in-nodejs-with-googleapis-157) — MEDIUM confidence
- [Google Calendar OAuth Refresh Token Expiry — freeCodeCamp GitHub Issue](https://github.com/freeCodeCamp/chapter/issues/1885) — MEDIUM confidence
- [Google OAuth2 Token Revocation Causes](https://developers.google.com/identity/protocols/oauth2) — HIGH confidence (official Google docs)
- [Next.js Hydration Error Documentation](https://nextjs.org/docs/messages/react-hydration-error) — HIGH confidence (official Next.js docs)
- [Firebase onSnapshot Memory Leak Issue](https://github.com/firebase/firebase-js-sdk/issues/4416) — MEDIUM confidence
- [JWT Replay Attack Prevention](https://workos.com/blog/token-replay-attacks) — MEDIUM confidence
- [JWT Security Best Practices](https://domainindia.com/support/kb/jwt-security-best-practices-replay-refresh-revocation) — MEDIUM confidence
- [AI Hallucination Risk in Bookings](https://lseo.com/answer-engine-optimization-services/managing-hallucination-risk-in-agent-initiated-bookings/) — MEDIUM confidence
- [Resend Transactional Email](https://resend.com/products/transactional-emails) — HIGH confidence (official Resend docs)
- [Email Authentication Protocols 2025](https://www.emailonacid.com/blog/article/email-deliverability/email-authentication-protocols/) — MEDIUM confidence
- [Email Deliverability Best Practices 2025](https://saleshive.com/blog/dkim-dmarc-spf-best-practices-email-security-deliverability/) — MEDIUM confidence
