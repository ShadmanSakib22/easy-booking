# Requirements: EasyAppointment

**Defined:** 2026-06-16
**Core Value:** A calendar creator can publish a booking page in minutes and receive confirmed, optionally paid appointments — without writing any code.

---

## v1 Requirements

### Package (react-easy-appointments)

- [ ] **PKG-01**: Package stores and displays all slot times in UTC internally; renders in visitor's local machine time via `Intl`
- [ ] **PKG-02**: Package accepts a fixed date range (start date, end date) and only renders dates within that range
- [ ] **PKG-03**: Package supports real-time slot status updates (available / pending / booked) via an external state prop
- [ ] **PKG-04**: Package emits slot selection events that the host app can intercept to trigger booking flow
- [ ] **PKG-05**: Package renders correctly on both server (SSR shell) and client (hydration) without mismatch errors

### Authentication

- [ ] **AUTH-01**: User can sign up with email and password
- [ ] **AUTH-02**: User receives email verification after sign-up and cannot access creator features until verified
- [ ] **AUTH-03**: User can sign in with email and password
- [ ] **AUTH-04**: User can sign in with Google (OAuth)
- [ ] **AUTH-05**: User can request a password reset via email link
- [ ] **AUTH-06**: User can change their password from account settings
- [ ] **AUTH-07**: User session persists across browser refresh (Firebase Auth persistence)
- [ ] **AUTH-08**: Custom sign-in, sign-up, forgot-password, and email-verification pages (not Firebase hosted UI)

### Calendar Management

- [ ] **CAL-01**: Authenticated user can create a new appointment calendar with a title, fixed start date, and fixed end date
- [ ] **CAL-02**: Creator can define available time slots per day for a calendar (start time, end time, duration/interval)
- [ ] **CAL-03**: Creator can create multiple independent calendars (e.g. "Engineer Interviews", "Doctor Interviews")
- [ ] **CAL-04**: Creator can edit a calendar's title, date range, and time slots while in draft mode
- [ ] **CAL-05**: Creator can delete a calendar
- [ ] **CAL-06**: Creator can set a calendar to Public or Invite-Only
- [ ] **CAL-07**: Creator receives a warning when time slots of two of their own calendars overlap
- [ ] **CAL-08**: Calendar exists in draft state until creator explicitly publishes it
- [ ] **CAL-09**: Creator can unpublish (revert to draft) or archive a published calendar

### AI Schedule Creation

- [ ] **AI-01**: Creator can describe their schedule in a chat input field on the calendar creation page
- [ ] **AI-02**: AI (Claude Haiku 4.5) parses the description and pre-fills the calendar creation form fields (title, date range, time slots)
- [ ] **AI-03**: AI-filled form stays in draft state; creator must manually click Publish — AI never auto-publishes
- [ ] **AI-04**: Server-side validation runs on all AI-generated date/time values using `date-fns` before saving

### Public Booking Flow

- [ ] **BOOK-01**: Visitor can view a public calendar page showing available slots in their local machine time
- [ ] **BOOK-02**: Calendar page updates slot availability in real-time (Firestore `onSnapshot`) to prevent double-booking
- [ ] **BOOK-03**: Guest booker (not logged in) must enter their email and receive a verification code to prove ownership before confirming a booking
- [ ] **BOOK-04**: Logged-in user can book a slot without email verification (identity confirmed via auth session)
- [ ] **BOOK-05**: Slot is atomically claimed via Firestore transaction — concurrent bookings cannot both succeed
- [ ] **BOOK-06**: Booker receives email confirmation after a successful free booking
- [ ] **BOOK-07**: Creator receives email notification when a slot is booked

### Invite-Only Booking Flow

- [ ] **INV-01**: Creator can add a list of invited email addresses to an Invite-Only calendar
- [ ] **INV-02**: Visitor attempting to book an Invite-Only calendar must enter an email that is on the invite list
- [ ] **INV-03**: Invited guest receives a one-time verification code to confirm their email before booking
- [ ] **INV-04**: Verification tokens are single-use (Firestore transaction sets `used: true` atomically) and expire after 15 minutes
- [ ] **INV-05**: Logged-in user whose auth email is on the invite list can skip verification code

### Paid Booking Flow

- [ ] **PAY-01**: Creator can enable paid booking for a calendar, setting a one-time fee (amount + currency) and product description
- [ ] **PAY-02**: Booker is redirected to a Stripe Hosted Checkout page to pay before the slot is confirmed
- [ ] **PAY-03**: Slot moves to `pending` state when booker starts Stripe checkout (blocking other bookings of that slot)
- [ ] **PAY-04**: `pending` slot automatically resets to `available` after 30 minutes if Stripe webhook never arrives (abandoned checkout)
- [ ] **PAY-05**: Booking is confirmed only upon receiving `checkout.session.completed` webhook with `payment_status === "paid"`
- [ ] **PAY-06**: Stripe webhook handler is idempotent — stores `stripeEventId` and ignores duplicate events
- [ ] **PAY-07**: Creator receives the full payment amount (no platform fee in v1; Stripe fees deducted by Stripe directly)

### Email & SMTP

- [ ] **SMTP-01**: Creator can configure a per-calendar SMTP setup (host, port, username, password, from address)
- [ ] **SMTP-02**: Creator can alternatively enter a Resend API key as the SMTP provider for a calendar
- [ ] **SMTP-03**: SMTP credentials are encrypted (AES-256) before being stored in Firestore; decrypted only in server-side API Routes
- [ ] **SMTP-04**: Creator can send a test email from the SMTP configuration UI to verify credentials work
- [ ] **SMTP-05**: SMTP send failures are caught, logged to a `smtpStatus` field on the calendar document, and surfaced in the creator dashboard
- [ ] **SMTP-06**: All transactional emails (OTP, booking confirmation, booking notification) use the calendar's configured SMTP if set; falls back to platform default

### Google Calendar Sync

- [ ] **GCAL-01**: Authenticated creator can connect their Google account and authorize Google Calendar access
- [ ] **GCAL-02**: When a booking is confirmed on EasyAppointment, the slot is automatically created as an event in the creator's connected Google Calendar
- [ ] **GCAL-03**: Google OAuth refresh tokens are encrypted before storage in Firestore; re-auth UI is shown if token becomes invalid (`invalid_grant`)
- [ ] **GCAL-04**: Creator can disconnect Google Calendar sync from their account settings

### Creator Dashboard

- [ ] **DASH-01**: Creator can view all bookings received across all their calendars
- [ ] **DASH-02**: Bookings list is filterable by calendar
- [ ] **DASH-03**: Creator can see booking details (booker email, slot time, payment status if applicable)
- [ ] **DASH-04**: Creator can cancel a booking (slot returns to available; cancellation email sent to booker)
- [ ] **DASH-05**: Creator can view all their calendars with status (draft / published / archived) and booking counts

### Profile

- [ ] **PROF-01**: Every user has a public profile page at `/u/[username]` listing all their published public calendars
- [ ] **PROF-02**: User can set a display name, bio, and profile photo from a profile editor
- [ ] **PROF-03**: User can view all bookings they have made (as a booker) in their account area
- [ ] **PROF-04**: User can choose a username during onboarding (used for their public profile URL)

### Admin Panel

- [ ] **ADMIN-01**: Platform admin can view and search all registered users
- [ ] **ADMIN-02**: Platform admin can suspend or delete a user account
- [ ] **ADMIN-03**: Platform admin can view and manage all calendars (search, archive, delete)
- [ ] **ADMIN-04**: Platform admin can view platform analytics (total users, calendars, bookings, revenue processed)
- [ ] **ADMIN-05**: Platform admin can view and respond to support tickets submitted by users
- [ ] **ADMIN-06**: Users can submit a support ticket from within the app

### Landing Page

- [ ] **LAND-01**: Public landing page introduces the platform with hero, features section, and CTA
- [ ] **LAND-02**: Landing page highlights the fixed date-range and invite-only differentiators
- [ ] **LAND-03**: Landing page links to sign-up and demo/example calendar

---

## v2 Requirements

### Payments
- **PAY-V2-01**: Stripe Connect integration allowing EasyAppointment to collect a 1.5% application fee
- **PAY-V2-02**: Recurring / subscription-based booking calendars

### Notifications
- **NOTF-01**: In-app notifications for new bookings
- **NOTF-02**: User can configure email notification preferences (on/off per event type)
- **NOTF-03**: Booking reminder emails (24h before appointment)

### Advanced Calendar
- **CAL-V2-01**: Group bookings (multiple bookers per slot)
- **CAL-V2-02**: Buffer time between slots
- **CAL-V2-03**: Intake forms (custom questions per booking)
- **CAL-V2-04**: Recurring availability templates

### Mobile App
- **MOB-01**: iOS and Android app using Firebase backend (React Native or Flutter)

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Stripe Connect / platform fee | Requires full Connect onboarding; `application_fee_amount` is Connect-only. Deferred to v2. |
| SMS notifications | Email only for v1; adds Twilio/cost complexity |
| Multi-timezone display per attendee | Standardized to local machine time; multi-tz adds significant UI/UX complexity |
| Video conferencing integration | Not core to booking value; Zoom/Meet links can be added manually in booking notes |
| Group bookings | Adds slot inventory complexity; deferred to v2 |
| Intake forms / custom questions | Out of scope for v1 booking flow simplicity |
| Native mobile app | Firebase backend is mobile-ready; web-first for v1 |
| Peer-to-peer calendar sharing / team calendars | Single-creator model for v1 |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PKG-01 | Phase 1: Package | Pending |
| PKG-02 | Phase 1: Package | Pending |
| PKG-03 | Phase 1: Package | Pending |
| PKG-04 | Phase 1: Package | Pending |
| PKG-05 | Phase 1: Package | Pending |
| AUTH-01 | Phase 3: Authentication | Pending |
| AUTH-02 | Phase 3: Authentication | Pending |
| AUTH-03 | Phase 3: Authentication | Pending |
| AUTH-04 | Phase 3: Authentication | Pending |
| AUTH-05 | Phase 3: Authentication | Pending |
| AUTH-06 | Phase 3: Authentication | Pending |
| AUTH-07 | Phase 3: Authentication | Pending |
| AUTH-08 | Phase 3: Authentication | Pending |
| CAL-01 | Phase 4: Calendar Management | Pending |
| CAL-02 | Phase 4: Calendar Management | Pending |
| CAL-03 | Phase 4: Calendar Management | Pending |
| CAL-04 | Phase 4: Calendar Management | Pending |
| CAL-05 | Phase 4: Calendar Management | Pending |
| CAL-06 | Phase 4: Calendar Management | Pending |
| CAL-07 | Phase 4: Calendar Management | Pending |
| CAL-08 | Phase 4: Calendar Management | Pending |
| CAL-09 | Phase 4: Calendar Management | Pending |
| BOOK-01 | Phase 5: Public Booking Flow | Pending |
| BOOK-02 | Phase 5: Public Booking Flow | Pending |
| BOOK-03 | Phase 5: Public Booking Flow | Pending |
| BOOK-04 | Phase 5: Public Booking Flow | Pending |
| BOOK-05 | Phase 5: Public Booking Flow | Pending |
| BOOK-06 | Phase 5: Public Booking Flow | Pending |
| BOOK-07 | Phase 5: Public Booking Flow | Pending |
| SMTP-01 | Phase 6: Email & SMTP | Pending |
| SMTP-02 | Phase 6: Email & SMTP | Pending |
| SMTP-03 | Phase 6: Email & SMTP | Pending |
| SMTP-04 | Phase 6: Email & SMTP | Pending |
| SMTP-05 | Phase 6: Email & SMTP | Pending |
| SMTP-06 | Phase 6: Email & SMTP | Pending |
| INV-01 | Phase 7: Invite-Only Calendars | Pending |
| INV-02 | Phase 7: Invite-Only Calendars | Pending |
| INV-03 | Phase 7: Invite-Only Calendars | Pending |
| INV-04 | Phase 7: Invite-Only Calendars | Pending |
| INV-05 | Phase 7: Invite-Only Calendars | Pending |
| PAY-01 | Phase 8: Paid Booking | Pending |
| PAY-02 | Phase 8: Paid Booking | Pending |
| PAY-03 | Phase 8: Paid Booking | Pending |
| PAY-04 | Phase 8: Paid Booking | Pending |
| PAY-05 | Phase 8: Paid Booking | Pending |
| PAY-06 | Phase 8: Paid Booking | Pending |
| PAY-07 | Phase 8: Paid Booking | Pending |
| AI-01 | Phase 9: AI Schedule Creation | Pending |
| AI-02 | Phase 9: AI Schedule Creation | Pending |
| AI-03 | Phase 9: AI Schedule Creation | Pending |
| AI-04 | Phase 9: AI Schedule Creation | Pending |
| GCAL-01 | Phase 10: Google Calendar Sync | Pending |
| GCAL-02 | Phase 10: Google Calendar Sync | Pending |
| GCAL-03 | Phase 10: Google Calendar Sync | Pending |
| GCAL-04 | Phase 10: Google Calendar Sync | Pending |
| DASH-01 | Phase 11: Creator Dashboard & Profiles | Pending |
| DASH-02 | Phase 11: Creator Dashboard & Profiles | Pending |
| DASH-03 | Phase 11: Creator Dashboard & Profiles | Pending |
| DASH-04 | Phase 11: Creator Dashboard & Profiles | Pending |
| DASH-05 | Phase 11: Creator Dashboard & Profiles | Pending |
| PROF-01 | Phase 11: Creator Dashboard & Profiles | Pending |
| PROF-02 | Phase 11: Creator Dashboard & Profiles | Pending |
| PROF-03 | Phase 11: Creator Dashboard & Profiles | Pending |
| PROF-04 | Phase 11: Creator Dashboard & Profiles | Pending |
| ADMIN-01 | Phase 12: Admin Panel | Pending |
| ADMIN-02 | Phase 12: Admin Panel | Pending |
| ADMIN-03 | Phase 12: Admin Panel | Pending |
| ADMIN-04 | Phase 12: Admin Panel | Pending |
| ADMIN-05 | Phase 12: Admin Panel | Pending |
| ADMIN-06 | Phase 12: Admin Panel | Pending |
| LAND-01 | Phase 13: Landing Page | Pending |
| LAND-02 | Phase 13: Landing Page | Pending |
| LAND-03 | Phase 13: Landing Page | Pending |

**Coverage:**
- v1 requirements: 73 total (PKG: 5, AUTH: 8, CAL: 9, AI: 4, BOOK: 7, INV: 5, PAY: 7, SMTP: 6, GCAL: 4, DASH: 5, PROF: 4, ADMIN: 6, LAND: 3)
- Mapped to phases: 73
- Unmapped: 0 ✓

**Note on Phase 2 (Firebase Foundation):** This is an infrastructure phase with no standalone requirement IDs. Its outputs (Firebase project, Firestore schema, security rules, local emulator) are prerequisites for AUTH-01–08, BOOK-02, BOOK-05, and all data-writing features. It has explicit success criteria in ROADMAP.md.

---
*Requirements defined: 2026-06-16*
*Last updated: 2026-06-16 — traceability updated after roadmap finalization*
