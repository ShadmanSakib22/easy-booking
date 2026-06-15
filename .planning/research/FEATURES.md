# Feature Landscape

**Domain:** Appointment booking SaaS (creator-facing scheduling platform)
**Project:** EasyAppointment
**Researched:** 2026-06-15
**Overall confidence:** HIGH (verified against Calendly, Cal.com, Acuity, Google Bookings, Microsoft Bookings, Cal.com blog)

---

## Table Stakes

Features users expect from any credible appointment booking product. Missing one means users leave for Calendly.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Self-service booking page | Core product promise — guests book without creator involvement | Low | Public URL per calendar; no guest account required |
| Real-time slot availability | Double-bookings destroy creator trust instantly | Medium | Firebase Realtime listeners satisfy this; race conditions are the hard part |
| Email confirmation to booker | Guests expect immediate proof of booking | Low | Transactional email triggered on booking write |
| Email notification to creator | Creator must know when someone books | Low | Same trigger as guest confirmation |
| Booking cancellation | Users expect to cancel; no mechanism = support burden | Medium | Requires slot state machine: available → held → booked → cancelled |
| Calendar creation and management | Core creator workflow | Low | CRUD for calendars with title, date range, time slots |
| Multiple calendars per creator | Any creator with more than one use case needs this | Medium | Independent calendars; overlap warning is the hard part |
| Fixed date range scheduling | Users expect an event to have a start and end date | Low | Not common as a constraint in competitors — see differentiators |
| Public booking page with discoverable URL | Guests share links; this is how the product spreads | Low | `/[username]/[calendar-slug]` pattern |
| Creator profile page listing their calendars | Expected on any multi-calendar platform | Low | Public page listing all public calendars |
| Mobile-friendly booking UI | 50%+ of bookings happen on mobile | Medium | Responsive layout; react-easy-appointments package must handle this |
| Authentication (email + OAuth) | Creators need accounts; logged-in bookers get frictionless flow | Medium | Firebase Auth; custom pages required |
| Creator dashboard (bookings received) | Creators must see who booked and when | Low | Filterable list by calendar |
| Booking history for logged-in users | Users expect to see past and upcoming bookings | Low | Separate from creator dashboard |
| Email verification for guest bookers | Prevents spam; ensures real email on file | Medium | OTP sent to email before slot is confirmed; Cal.com, Google, and Microsoft all implement this |
| Automated email reminders | Reduce no-shows; users have come to expect them | Medium | Scheduled job or Firebase Functions triggered N hours before slot |

---

## Differentiators

Features EasyAppointment has that mainstream competitors lack or gate behind higher tiers. These are the reasons a creator picks this platform over Calendly.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Fixed date range calendars | Competitors default to rolling/open-ended availability. A "Doctor Interviews" calendar that runs June 1–30 is a natural mental model for event-based creators | Low | Core data model decision; needs `start_date` and `end_date` on Calendar entity |
| Invite-only calendars with email allowlist | Calendly has "secret" links (hidden from profile) but no actual per-email gating. EasyAppointment lets creator specify which emails may book | Medium | Requires invite list storage and OTP validation against that list specifically |
| Per-calendar SMTP configuration | No mainstream SaaS competitor offers this. Creators who run multiple brands or businesses can send confirmations from the right address per calendar | High | UI for SMTP credentials/Resend API key; encrypted credential storage; send-test validation; abstraction layer (nodemailer-compatible) |
| AI-assisted schedule creation | Describe your schedule in plain language → form fields pre-filled → save as draft | High | LLM integration (OpenAI/Anthropic); structured output (JSON) to map onto form schema; stays draft until creator manually publishes |
| Public vs invite-only per calendar (explicit toggle) | The distinction is a first-class concept here, not a workaround via secret links | Low | Boolean field on Calendar; changes booking validation path |
| Platform application fee via Stripe (no Connect) | If achievable without Connect, this is architecturally simpler than Acuity/Square. Stripe Transfer approach or destination charges let the platform take a cut | High | Legal and Stripe compliance risk; investigate per-transaction fee viability during payment phase |
| Overlap warning across creator's own calendars | If a creator's "Morning Slots" and "Q3 Review" calendars both have 9am–10am, the system warns before publish | Medium | Comparison of slot ranges across calendars owned by same user; can be client-side |

---

## Anti-Features

Things to deliberately NOT build in v1. Each one has been excluded for a specific reason, not by omission.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Recurring/open-ended scheduling | Adds a new scheduling paradigm on top of fixed date ranges; doubles the edge case surface area. Calendly already does this well | Fixed date range only; if recurring is needed later, it is a separate calendar type |
| Stripe Connect onboarding | KYC flow, Connect dashboard, per-account payout logic — this is weeks of work and a different compliance regime | Direct hosted checkout to creator's Stripe account; 1.5% fee only if achievable without Connect |
| SMS notifications | Twilio/SMS providers add cost, GDPR surface, and phone number verification complexity | Email-only for v1; SMS is a post-validation feature |
| Multi-timezone display per attendee | Timezone edge cases (DST, UTC offsets, display labels) are disproportionately complex relative to v1 value | Display in visitor's local machine time only (via browser `Intl` API); note this in booking confirmation |
| Video conferencing auto-link generation | Zoom/Google Meet OAuth + link generation + calendar event creation is a separate integration project | Creator can paste a video link into the calendar description field manually |
| Native mobile app | Firebase backend is mobile-ready but a React Native or Flutter app is a full second product | Web-first; mobile web must be excellent |
| Waitlists | Slot capacity management, waitlist queue, automatic promotion logic — significant complexity | Out of scope; if a slot is booked, it is gone |
| Group bookings / multi-attendee slots | Capacity > 1 per slot is a different product (event ticketing, not appointment scheduling) | Each slot is 1 booker only in v1 |
| Team scheduling / round-robin | Requires staff entity, availability per staff member, routing logic | Single creator per calendar only |
| CRM sync (HubSpot, Salesforce) | Integration maintenance burden; niche need at early stage | Creator can export booking data manually |
| Custom domain per creator | DNS verification, SSL provisioning, CNAME management — infrastructure overhead | Use `[platform]/[username]` paths; custom domain is a growth-stage feature |
| Intake forms / custom booking fields | Useful but expands the booking UX and data model significantly | Capture only name and email from guest in v1 |
| Package deals / memberships / gift certificates | This is Acuity's product differentiation, not EasyAppointment's | One-time paid booking only |

---

## Feature Dependencies

```
Firebase Auth
  └── Logged-in creator can connect Google Calendar (requires auth session)
  └── Logged-in booker skips email OTP (identity proven via session)
  └── Creator dashboard (must know whose bookings to show)
  └── Calendar creation (must associate calendar with owner)

Calendar creation
  └── Time slot definition (slots belong to calendar)
  └── Public vs invite-only flag (determines booking validation path)
  └── Per-calendar SMTP config (SMTP belongs to calendar)
  └── Fixed date range (start_date, end_date on calendar)
  └── Paid vs free flag → Stripe hosted checkout (if paid)
  └── Overlap warning (compare against creator's other calendars)

Email OTP verification (guest flow)
  └── Per-calendar SMTP (OTP email sent via calendar's SMTP config)
  └── Invite-only validation (OTP recipient must match allowlist)

Stripe hosted checkout
  └── Calendar paid flag (must be enabled on calendar)
  └── Creator's Stripe account (creator must connect Stripe)
  └── Booking confirmed only after payment webhook (async)

Google Calendar sync
  └── Firebase Auth (must be logged in as creator)
  └── OAuth token storage (per-creator, encrypted)
  └── Booking write → trigger sync (Firebase Function or API route)

AI schedule creation
  └── Calendar creation form (AI pre-fills this; same schema)
  └── Draft state on calendar (must exist before AI feature)
  └── LLM API key / server-side route (not exposed to client)

Real-time slot availability
  └── Firebase Realtime DB or Firestore real-time listeners
  └── Slot state machine: available → held (during checkout) → booked

Admin panel
  └── All of the above (reads across all users/calendars/bookings)
  └── Separate role/permission check (admin flag on user record)
```

---

## MVP Recommendation

**Build in this order (informed by dependency graph above):**

1. **Auth + calendar creation** — everything else depends on having a creator with a calendar
2. **Slot definition + public booking page + email OTP** — core guest experience; validates the core loop
3. **Email confirmation (per-calendar SMTP)** — differentiator; required for bookings to feel real
4. **Creator dashboard + booking history** — creators need to see what came in
5. **Paid bookings via Stripe checkout** — monetization; unblocked after booking flow works
6. **Invite-only calendars** — variant of the public flow; lower effort once OTP exists
7. **Google Calendar sync** — useful but not core; can be Phase 2
8. **AI schedule creation** — highest complexity; validate the core product first
9. **Admin panel** — internal tooling; build when there are users to manage

**Defer without risk:**
- Google Calendar sync until Phase 2 (post-MVP validation)
- AI schedule creation until Phase 3 (after creator workflow is validated manually)
- Admin panel can be minimal (Firebase console + manual queries) until user volume justifies it

---

## Sources

- [Best AI Scheduling Tools 2026: Calendly vs Acuity vs SavvyCal vs Cal.com — Radara](https://radara.net/best-ai-scheduling-tools-2026-calendly-vs-acuity-vs-savvycal-vs-cal-com-comparison/)
- [9 Essential Features Every Online Booking System Must Have — Booknetic](https://www.booknetic.com/blog/essential-online-booking-system-features)
- [Elevating Booking Authenticity on Cal.com: Email Verification Feature](https://cal.com/blog/elevating-booking-authenticity-on-cal-com-a-guide-to-cal-com-s-verification-featu)
- [Single-use links and private event types — Calendly Community](https://community.calendly.com/how-do-i-40/how-do-i-make-completely-private-calendly-event-links-3502)
- [Engineering Google Calendar Sync: Hidden Complexity — Codex Conversation](https://codexconversation.substack.com/p/engineering-google-calendar-sync)
- [Build a SaaS platform — Stripe Documentation](https://docs.stripe.com/connect/saas)
- [Verify emails for appointments — Google Calendar Help](https://support.google.com/calendar/answer/11902347)
- [AI Appointment Booking Statistics 2026 — AgentZap](https://agentzap.ai/blog/ai-booking-statistics)
- [Calendly vs. Acuity: Which is best? 2026 — Zapier](https://zapier.com/blog/calendly-vs-acuity/)
