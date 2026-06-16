# Roadmap: EasyAppointment

## Overview

EasyAppointment is built in 13 phases. Phase 1 is a hard prerequisite: the `react-easy-appointments` npm package must be production-ready before any SaaS UI can import it. Phase 2 lays the Firebase/Firestore foundation that every subsequent phase depends on. Phases 3–12 build the SaaS features in dependency order — auth before booking flows, free booking before paid, core booking before invite-only gating, and stable booking before Google Calendar sync. Phase 13 (landing page) has no functional dependencies and is written last when the product shape is fully clear.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Package** - Harden react-easy-appointments for production SaaS use
- [ ] **Phase 2: Firebase Foundation** - Set up Firebase project, Firestore data model, and security rules
- [ ] **Phase 3: Authentication** - Custom auth pages with Firebase Auth (email + Google, all verification flows)
- [ ] **Phase 4: Calendar Management** - Create, edit, draft/publish lifecycle, overlap detection
- [ ] **Phase 5: Public Booking Flow** - Real-time slots, guest OTP, atomic slot claiming, free booking confirmation
- [ ] **Phase 6: Email & SMTP** - Per-calendar SMTP config, OTP emails, confirmation and notification emails
- [ ] **Phase 7: Invite-Only Calendars** - Allowlist management, per-email gating, single-use OTP tokens
- [ ] **Phase 8: Paid Booking** - Stripe hosted checkout, webhook handler, pending slot TTL
- [ ] **Phase 9: AI Schedule Creation** - Chat-to-form AI fill via Claude Haiku, server-side date validation
- [ ] **Phase 10: Google Calendar Sync** - OAuth2 connect, automatic event creation, push notification sync
- [ ] **Phase 11: Creator Dashboard & Profiles** - Booking management, calendar status overview, public profile pages
- [ ] **Phase 12: Admin Panel** - User management, calendar oversight, analytics, support tickets
- [ ] **Phase 13: Landing Page** - Public marketing page with hero, features, and CTAs

## Phase Details

### Phase 1: Package
**Goal**: The `react-easy-appointments` package is production-ready — UTC-correct, date-range-aware, real-time-capable, and SSR-safe — so the SaaS can import it without workarounds
**Depends on**: Nothing (first phase)
**Requirements**: PKG-01, PKG-02, PKG-03, PKG-04, PKG-05
**Success Criteria** (what must be TRUE):
  1. Slot times stored and transmitted as UTC; a visitor in UTC+8 sees times in their local machine timezone without any app-level conversion
  2. Package accepts a start date and end date and only renders dates within that range; dates outside the range do not appear
  3. Host app can pass external slot state (available / pending / booked) and the package reflects changes in real-time without page reload
  4. Package emits a slot-selected event that the host app can intercept and use to trigger its own booking modal or flow
  5. Package renders correctly under Next.js SSR — no hydration mismatch errors in the browser console
**Plans**: 4 plans
- [ ] 01-PLAN-00.md — Wave 0: create failing test stubs (utilities, date-range, SSR)
- [ ] 01-PLAN-01.md — UTC Slot type, formatSlotTime + deriveDate utilities, pending status, display-component migration
- [ ] 01-PLAN-02.md — Date-range props, boundary-disabled toolbar nav, out-of-range greying (MonthView + WeekView)
- [ ] 01-PLAN-03.md — SSR-safe theme fix, onSlotClick/real-time verification, demo app migration, 2.0.0 build

### Phase 2: Firebase Foundation
**Goal**: Firebase project is configured, Firestore data model is defined with security rules, and the Next.js app connects to Firebase — so all subsequent phases have a reliable, secure backend to write against
**Depends on**: Phase 1
**Requirements**: *(infrastructure phase — no standalone requirement IDs; outputs are prerequisite for AUTH-01–08, BOOK-02, BOOK-05, and all data-writing features)*
**Success Criteria** (what must be TRUE):
  1. Firebase project exists with Auth, Firestore, and Storage enabled; environment variables are wired into the Next.js app
  2. Firestore collections (users, calendars, slots, bookings, invites) exist with the agreed document schema
  3. Firestore security rules deny all unauthenticated writes to creator-owned resources; a rule test suite passes
  4. A local emulator suite runs all three Firebase services (Auth, Firestore, Storage) for offline development
**Plans**: 5 plans
- [x] 02-01-PLAN.md — Wave 1: Install Java/firebase-tools/npm packages, scaffold firebase.json + rules stubs + 6 composite indexes + vitest config
- [x] 02-02-PLAN.md — Wave 2: Firebase client SDK singleton (client.ts), Admin SDK singleton (admin.ts), TypeScript types for all 5 collections (types.ts)
- [x] 02-03-PLAN.md — Wave 2: Complete v1 Firestore security rules for all 5 collections
- [x] 02-04-PLAN.md — Wave 3: Security rules test suite (13+ tests, @firebase/rules-unit-testing v5)
- [ ] 02-05-PLAN.md — Wave 4: Emulator seed script (1 user + 1 calendar + 5 slots) + human verification checkpoint

### Phase 3: Authentication
**Goal**: Users can securely create accounts, sign in via email or Google, verify their email, recover their password, and maintain a persistent session — all through custom-built Next.js pages
**Depends on**: Phase 2
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08
**Success Criteria** (what must be TRUE):
  1. A new visitor can sign up with email and password; they receive a verification email and cannot access creator features until they click the verification link
  2. A registered user can sign in with email/password and with Google OAuth from the same sign-in page
  3. A user who forgets their password can request a reset email and set a new password via the link
  4. A signed-in user can change their password from account settings without signing out
  5. After closing and reopening the browser, a previously signed-in user remains signed in (Firebase Auth persistence)
**Plans**: TBD
**UI hint**: yes

### Phase 4: Calendar Management
**Goal**: A verified creator can create appointment calendars with time slots, manage their lifecycle from draft to published, edit or delete them, and receive a warning when their own calendars overlap
**Depends on**: Phase 3
**Requirements**: CAL-01, CAL-02, CAL-03, CAL-04, CAL-05, CAL-06, CAL-07, CAL-08, CAL-09
**Success Criteria** (what must be TRUE):
  1. A signed-in creator can create a calendar with a title, start date, end date, and daily time slot configuration; the calendar saves as draft and is not publicly visible
  2. A creator can edit a draft calendar's title, date range, and time slots, then publish it — after which it becomes publicly accessible at its URL
  3. A creator can own and manage multiple independent calendars simultaneously; each has its own settings and booking state
  4. When two of the creator's calendars have overlapping time slots, a visible warning appears in the creator's interface
  5. A creator can unpublish a published calendar (reverting to draft), archive it, or delete it entirely
**Plans**: TBD
**UI hint**: yes

### Phase 5: Public Booking Flow
**Goal**: Any visitor can view a public calendar's available slots in real-time and claim a slot — guests via email OTP verification, logged-in users without extra steps — with atomic conflict prevention ensuring no double-bookings
**Depends on**: Phase 4
**Requirements**: BOOK-01, BOOK-02, BOOK-03, BOOK-04, BOOK-05, BOOK-06, BOOK-07
**Success Criteria** (what must be TRUE):
  1. A visitor navigating to a public calendar page sees available slots in their local machine timezone, with no stale data visible after another user books
  2. Two visitors attempting to book the same slot simultaneously: exactly one succeeds, the other sees an "already booked" error (Firestore transaction enforced)
  3. A guest (not logged in) enters their email, receives a verification code, enters it, and confirms the booking — the slot status changes to booked immediately
  4. A logged-in user books a slot without needing to enter or verify their email — the booking completes in fewer steps than guest flow
  5. Both the booker and the calendar creator receive an email confirmation after a successful free booking
**Plans**: TBD
**UI hint**: yes

### Phase 6: Email & SMTP
**Goal**: Every calendar has a configurable SMTP provider; all transactional emails (OTP codes, booking confirmations, creator notifications) route through the calendar's SMTP with a platform fallback, and SMTP failures are surfaced to the creator
**Depends on**: Phase 5
**Requirements**: SMTP-01, SMTP-02, SMTP-03, SMTP-04, SMTP-05, SMTP-06
**Success Criteria** (what must be TRUE):
  1. A creator can enter SMTP credentials (host, port, username, password, from address) for a calendar and send a test email that arrives in their inbox
  2. A creator can alternatively provide a Resend API key as the SMTP provider for a calendar and send a successful test email
  3. SMTP credentials stored in Firestore are AES-256 encrypted; plain-text credentials never appear in Firestore or client-side responses
  4. When an SMTP send fails, the failure is logged to the calendar document and a visible alert appears in the creator's dashboard for that calendar
  5. Booking confirmation and OTP emails use the calendar's configured SMTP if set; if not set, they fall back to the platform's default sender
**Plans**: TBD

### Phase 7: Invite-Only Calendars
**Goal**: A creator can restrict a calendar to a specific list of email addresses; only invited guests (verified via single-use OTP) or logged-in users whose email is on the list can book
**Depends on**: Phase 6
**Requirements**: INV-01, INV-02, INV-03, INV-04, INV-05
**Success Criteria** (what must be TRUE):
  1. A creator can add, remove, and view a list of invited email addresses on an Invite-Only calendar
  2. A visitor whose email is not on the invite list is blocked from booking; they see a clear "not invited" message
  3. An invited guest enters their email, receives a one-time verification code via email, enters it, and proceeds to booking; the token cannot be reused and expires after 15 minutes
  4. A logged-in user whose account email is on the invite list proceeds directly to booking without receiving a verification code
**Plans**: TBD
**UI hint**: yes

### Phase 8: Paid Booking
**Goal**: A creator can require payment before a slot is confirmed; bookers are redirected to Stripe Hosted Checkout, the slot is held pending while checkout is open, and booking is confirmed only upon a verified Stripe webhook — abandoned checkouts automatically release the slot
**Depends on**: Phase 5
**Requirements**: PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, PAY-06, PAY-07
**Success Criteria** (what must be TRUE):
  1. A creator can enable paid booking on a calendar and set a price (amount + currency) and product description; this configuration persists and is visible on the calendar's booking page
  2. A booker who selects a slot on a paid calendar is redirected to a Stripe Hosted Checkout page; the slot shows as "pending" for other visitors during checkout
  3. After a booker abandons checkout (no payment), the slot automatically returns to "available" within 30 minutes without manual intervention
  4. A completed Stripe payment triggers the `checkout.session.completed` webhook, which atomically confirms the booking; double-delivery of the same webhook event does not create duplicate bookings
  5. The creator receives the full payment amount in their Stripe account; no platform fee is deducted in v1
**Plans**: TBD

### Phase 9: AI Schedule Creation
**Goal**: A creator can describe their schedule in plain language in a chat input; Claude Haiku pre-fills the calendar creation form fields based on the description, and the filled form saves as a draft that the creator reviews and manually publishes
**Depends on**: Phase 4
**Requirements**: AI-01, AI-02, AI-03, AI-04
**Success Criteria** (what must be TRUE):
  1. The calendar creation page has a chat input where a creator can type a natural-language schedule description (e.g., "10 AM–4 PM slots every 30 minutes from June 20 to June 30")
  2. After submitting the chat input, the form fields (title, start date, end date, time slot configuration) are populated automatically; the creator can see and edit these values before doing anything else
  3. The AI-filled form is saved as draft automatically; no publish action occurs without the creator explicitly clicking Publish
  4. Dates and times generated by the AI are validated server-side; invalid date values are rejected with an error message before the form is returned to the creator
**Plans**: TBD
**UI hint**: yes

### Phase 10: Google Calendar Sync
**Goal**: A creator can connect their Google account and authorize Google Calendar; every confirmed booking on EasyAppointment automatically creates an event in the creator's Google Calendar, with OAuth token health managed transparently
**Depends on**: Phase 5
**Requirements**: GCAL-01, GCAL-02, GCAL-03, GCAL-04
**Success Criteria** (what must be TRUE):
  1. A signed-in creator can initiate Google OAuth from their account settings and grant Google Calendar access; a "connected" status appears in settings after authorization
  2. When a booking is confirmed (free or paid) on a calendar with Google sync active, a corresponding event appears in the creator's Google Calendar within seconds
  3. If the creator's Google OAuth token expires or is revoked, they see a re-authorization prompt in the dashboard; sync resumes after they reconnect
  4. A creator can disconnect Google Calendar sync from account settings; no new events are created after disconnection
**Plans**: TBD

### Phase 11: Creator Dashboard & Profiles
**Goal**: Creators have a dashboard to manage all bookings and calendars in one place; every user has a public profile page listing their published calendars; bookers can review their own booking history
**Depends on**: Phase 5
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, PROF-01, PROF-02, PROF-03, PROF-04
**Success Criteria** (what must be TRUE):
  1. A creator's dashboard shows all bookings received across all their calendars, filterable by calendar, with booker email, slot time, and payment status visible per booking
  2. A creator can cancel a booking from the dashboard; the slot returns to available and the booker receives a cancellation email
  3. A creator's dashboard lists all their calendars with their current status (draft / published / archived) and booking counts
  4. Every user has a public profile page at `/u/[username]` that lists all their published public calendars; visitors can reach a calendar's booking page from there
  5. A logged-in user can view all the bookings they have made as a booker in their account area
**Plans**: TBD
**UI hint**: yes

### Phase 12: Admin Panel
**Goal**: A platform administrator can manage all users and calendars, view platform-wide analytics, and handle support tickets submitted by users
**Depends on**: Phase 11
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06
**Success Criteria** (what must be TRUE):
  1. An admin user can view and search all registered users; they can suspend or delete any user account
  2. An admin user can view, search, archive, or delete any calendar on the platform
  3. An admin dashboard shows platform analytics: total users, calendars, bookings, and revenue processed
  4. Users can submit a support ticket from within the app; an admin can view all tickets and respond to them
**Plans**: TBD
**UI hint**: yes

### Phase 13: Landing Page
**Goal**: A polished public landing page introduces EasyAppointment to potential creators, highlights the fixed date-range and invite-only differentiators, and drives sign-up
**Depends on**: Phase 3
**Requirements**: LAND-01, LAND-02, LAND-03
**Success Criteria** (what must be TRUE):
  1. A first-time visitor lands on a page with a hero section, features section, and a clear call-to-action that links to sign-up
  2. The features section specifically names and explains the fixed date-range scheduling and invite-only gating as differentiators
  3. The landing page includes a visible link to sign-up and a link to a demo or example calendar
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13
(Phase 9 depends on Phase 4, not Phase 8; Phase 8 depends on Phase 5, not Phase 7 — both can begin after their gates are met)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Package | 0/4 | Planned | - |
| 2. Firebase Foundation | 0/5 | Planned | - |
| 3. Authentication | 0/TBD | Not started | - |
| 4. Calendar Management | 0/TBD | Not started | - |
| 5. Public Booking Flow | 0/TBD | Not started | - |
| 6. Email & SMTP | 0/TBD | Not started | - |
| 7. Invite-Only Calendars | 0/TBD | Not started | - |
| 8. Paid Booking | 0/TBD | Not started | - |
| 9. AI Schedule Creation | 0/TBD | Not started | - |
| 10. Google Calendar Sync | 0/TBD | Not started | - |
| 11. Creator Dashboard & Profiles | 0/TBD | Not started | - |
| 12. Admin Panel | 0/TBD | Not started | - |
| 13. Landing Page | 0/TBD | Not started | - |
