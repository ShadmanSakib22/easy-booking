# EasyAppointment

## What This Is

A SaaS platform that lets any user create and manage appointment calendars with flexible time frames, booking permissions, payment gates, and email notifications. Visitors can discover and book slots on public calendars without an account; logged-in users get a faster, frictionless booking flow. The platform also ships a landing page, creator dashboard, profile pages, and an admin panel.

## Core Value

A calendar creator can publish a booking page in minutes and receive confirmed, optionally paid appointments — without writing any code.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can create an appointment calendar with a fixed date range and daily time slots
- [ ] Calendar slots are displayed in the visitor's local machine time
- [ ] A user can own multiple independent calendars (e.g. "Engineer Interviews", "Doctor Interviews")
- [ ] System warns creator when time slots across two of their calendars overlap
- [ ] Each calendar has a title and can be set to Public or Invite-Only
- [ ] Public calendars: anyone can book with any email + email verification code
- [ ] Invite-Only calendars: booker must use their invited email + email verification code
- [ ] Logged-in users can book without verification code (identity proven via auth session)
- [ ] Calendar creator can require free or paid booking; payment via Stripe hosted checkout
- [ ] Stripe application fee (1.5%) applied via direct hosted checkout where possible without Stripe Connect (skip if Connect required)
- [ ] Paid calendars require a one-time fee amount and product description set by creator
- [ ] Creator can build the schedule via a form or via AI chat that pre-fills the form (stays in draft until manually published)
- [ ] Creator can configure their SMTP (personal email, Resend, or other popular providers) per calendar
- [ ] Logged-in creators can connect Google Calendar; booked slots sync automatically
- [ ] Calendar pages are real-time to prevent double-bookings (Firebase Realtime listeners)
- [ ] User has a public profile page listing all their public calendars
- [ ] User can view all bookings they have made and all calendars they have created
- [ ] Creator dashboard with bookings received, filterable by calendar
- [ ] Platform admin panel: user management, calendar management, analytics, support tickets
- [ ] Beautiful landing page introducing the platform
- [ ] Custom auth pages (email + Google sign-in; forgot password, verification, change password)
- [ ] react-easy-appointments package improvements needed before website work begins

### Out of Scope

- Stripe Connect (complex onboarding) — use hosted checkout direct-to-creator for now; revisit if 1.5% fee requires Connect
- Native mobile app — Firebase backend is mobile-ready; web-first for v1
- Multi-timezone display per attendee — standardized to local machine time only
- Video conferencing integration — future milestone
- SMS notifications — email only for v1

## Context

- **Phase 2 complete (firebase-foundation):** Firebase project config (firebase.json, firestore.rules, indexes, storage.rules), SDK singletons (client.ts, admin.ts), TypeScript types for all 5 Firestore collections, v1 security rules (15/15 rules tests passing), and a verified emulator dev workflow (seed script + concurrent `pnpm dev`) are in place. All subsequent phases build on this foundation.
- **Existing code:** Two sub-directories exist: `appoinment-scheduler` (the react-easy-appointments npm package the user maintains) and `my-app` (a Next.js scaffold, now with Firebase wired in as a git submodule). The package needs improvements first before the SaaS site is built on top of it.
- **Calendar package:** `react-easy-appointments` on npm — user owns and maintains it. The SaaS will import this package.
- **Real-time requirement:** Firebase Realtime Database (or Firestore with real-time listeners) to prevent double-booking race conditions.
- **Auth:** Firebase Auth preferred over Clerk because it pairs with Firebase backend and avoids a third-party dependency; custom auth pages required (sign-in, sign-up, forgot password, email verification, change password).
- **Payment:** Stripe hosted checkout (no Connect). 1.5% application fee only if achievable without Connect; otherwise standard checkout with full amount to creator.
- **AI form fill:** Creator can describe their schedule in a chat input; AI fills the form fields and saves as draft. Creator must click Publish.
- **Google Calendar sync:** Optional integration for logged-in creators only.
- **SMTP:** Per-calendar SMTP config. Support personal email (SMTP credentials), Resend API key, and other popular providers.

## Constraints

- **Tech Stack**: Next.js (client-side rendering, reactive UI), Firebase (Auth + Firestore/Realtime DB + Storage), Stripe hosted checkout, react-easy-appointments package
- **Mobile-readiness**: Firebase chosen specifically to ease future mobile app development
- **Real-time**: Calendar slots must use Firebase real-time listeners to prevent booking conflicts
- **Package-first**: `react-easy-appointments` improvements are a prerequisite for website phases
- **No Stripe Connect (v1)**: Use direct hosted checkout; application fee is a stretch goal

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Firebase Auth over Clerk | Avoids third-party auth vendor; Firebase pairs naturally with Firestore/RTDB; custom auth pages required either way | — Pending |
| Next.js client-side focus | User explicitly wants a reactive, client-driven UI | — Pending |
| react-easy-appointments improvements before SaaS | The calendar UI component is the core widget; must be production-ready first | — Pending |
| Stripe hosted checkout (no Connect) | Simplest payment path; 1.5% fee only if achievable without Connect | — Pending |
| Per-calendar SMTP | Each calendar may represent a different creator identity or business | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-16 after Phase 2 (firebase-foundation) completion*
