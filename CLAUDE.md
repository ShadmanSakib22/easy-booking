<!-- GSD:project-start source:PROJECT.md -->
## Project

**EasyAppointment**

A SaaS platform that lets any user create and manage appointment calendars with flexible time frames, booking permissions, payment gates, and email notifications. Visitors can discover and book slots on public calendars without an account; logged-in users get a faster, frictionless booking flow. The platform also ships a landing page, creator dashboard, profile pages, and an admin panel.

**Core Value:** A calendar creator can publish a booking page in minutes and receive confirmed, optionally paid appointments — without writing any code.

### Constraints

- **Tech Stack**: Next.js (client-side rendering, reactive UI), Firebase (Auth + Firestore/Realtime DB + Storage), Stripe hosted checkout, react-easy-appointments package
- **Mobile-readiness**: Firebase chosen specifically to ease future mobile app development
- **Real-time**: Calendar slots must use Firebase real-time listeners to prevent booking conflicts
- **Package-first**: `react-easy-appointments` improvements are a prerequisite for website phases
- **No Stripe Connect (v1)**: Use direct hosted checkout; application fee is a stretch goal
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 15 (App Router) | Full-stack React framework | App Router is the current default; `"use client"` directive enables the reactive, client-driven UI the project requires. Server-side Route Handlers replace `pages/api`. Do NOT use Pages Router. |
| React | 19 | UI runtime | Ships with Next.js 15. Required for Compiler optimizations and concurrent features. |
| TypeScript | 5.x | Type safety | Non-negotiable for a multi-person codebase with Firebase, Stripe, and Anthropic SDK integrations — all have excellent TypeScript types. |
### Database: Firestore (not Realtime Database)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Cloud Firestore | Current (Firebase SDK v11) | Primary database | Document/collection model suits structured booking data. Compound queries filter by date AND availability status simultaneously — Realtime Database cannot do this (sort OR filter, not both). Automatic scaling (no 200k concurrent connection ceiling). 99.999% uptime vs 99.95% for RTDB. |
- RTDB is a single large JSON tree — booking slots, user profiles, calendar configs, and booking records all shoved into one tree gets unmanageable fast.
- RTDB cannot compound-query: you cannot do `where("calendarId", "==", x).where("status", "==", "available").orderBy("startTime")` — a query EasyAppointment will need constantly.
- RTDB write rate caps at ~1,000 writes/second per database path before you must shard — unnecessary complexity for a SaaS at this stage.
- RTDB's 10ms vs Firestore's 30ms latency advantage is imperceptible for a booking UI and does not justify the query limitations.
### Authentication
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Firebase Auth | Firebase SDK v11 | Email + Google sign-in | Native pairing with Firestore; no third-party vendor lock-in; custom auth pages are required either way so Clerk's prebuilt UI provides no benefit. Handles email verification codes, password reset, and Google OAuth out of the box. |
| firebase-admin | 13.x | Server-side token verification | Used in Next.js Route Handlers to verify `idToken` from the client before any privileged writes. Admin SDK bypasses Firestore Security Rules by design — server is the trust boundary. |
### Payments
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| stripe (Node.js SDK) | ^17.x | Stripe Checkout sessions | Server-side session creation in Route Handlers. `stripe.checkout.sessions.create()` with `mode: "payment"` covers one-time booking fees. |
| @stripe/stripe-js | ^5.x | Stripe.js on client | Redirect to hosted checkout via `stripe.redirectToCheckout()`. No custom card UI — hosted checkout handles PCI compliance. |
### UI Components and Styling
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | v4 | Utility-first styling | v4 is the current major release (2025); introduces `@theme` directive for CSS token-driven theming. Compatible with Next.js 15. Use `@theme` for brand tokens. |
| shadcn/ui | Latest (2025 Tailwind v4 compat) | Accessible component primitives | Not a dependency — copy-paste components you own. Built on Radix UI primitives; keyboard navigation and screen-reader support are built-in. Works with Tailwind v4 via the official v4 integration guide (https://ui.shadcn.com/docs/tailwind-v4). |
| lucide-react | ^0.400+ | Icons | Matches shadcn/ui's icon set; tree-shakeable. |
| react-easy-appointments | workspace / npm | Calendar UI widget | The user-owned npm package. The SaaS imports this directly. All calendar display and slot selection goes through this component. Improvements to this package are a prerequisite phase before SaaS UI work begins. |
### Forms and Validation
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| react-hook-form | ^7.x | Form state management | Uncontrolled by default — performant for complex multi-step booking and calendar creation forms. Minimal re-renders. |
| zod | ^3.x | Schema validation | Shared schemas between client (react-hook-form via `@hookform/resolvers/zod`) and server (Route Handler body parsing). Single source of truth for field shape. |
| @hookform/resolvers | ^3.x | Bridge between RHF and Zod | Required to connect the two. |
### Data Fetching and Real-time State
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| TanStack Query (React Query) | v5 | Client-side data fetching and cache | Wraps Firebase `onSnapshot` subscriptions; handles loading/error states cleanly; enables optimistic updates for booking confirmation. Use `useQuery` for one-time fetches (creator profile, booking history) and subscribe to Firestore snapshots within `useEffect` for real-time slot state. |
| firebase (client SDK) | ^11.x | Firestore + Auth + Storage client | The standard Firebase web SDK. Import modular (tree-shakeable) functions only: `import { getFirestore, onSnapshot } from "firebase/firestore"`. |
### Email Sending Architecture
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| nodemailer | ^6.x | Email transport | Accepts any SMTP configuration at runtime via `createTransport({ host, port, auth: { user, pass } })`. This enables per-calendar SMTP: load the creator's stored SMTP config from Firestore, construct a transporter, send. Works with Gmail (`smtp.gmail.com`), Resend SMTP relay (`smtp.resend.com`), Mailgun SMTP, SendGrid SMTP, custom servers — all using the same code. |
### AI Form Fill
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @anthropic-ai/sdk | ^0.x (latest) | Anthropic API client | Official TypeScript SDK for calling Claude models. |
| claude-haiku-4-5 | API alias `claude-haiku-4-5` | AI model for form fill | Fastest and cheapest current Claude model ($1/$5 per MTok input/output). Form fill is a low-complexity, high-frequency task — Haiku is the right tier. Does not need Sonnet-level reasoning. |
- Pinned: `claude-haiku-4-5-20251001`
- Alias (points to pinned): `claude-haiku-4-5`
- Use the alias in code; note that aliases are pinned snapshots, not evergreen pointers.
### Google Calendar Sync
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| googleapis | ^144.x | Google Calendar API client | Official Google Node.js client. Used in Route Handlers only (server-side OAuth token exchange). |
### Storage
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Firebase Storage | Firebase SDK v11 | File storage | Used for creator profile images and any attachments. Pairs naturally with Firebase Auth for security rules (`request.auth.uid`). No additional dependency. |
### Infrastructure and Hosting
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel | Current | Next.js hosting | First-party Next.js hosting provider; zero-config deployment; serverless Route Handlers work without configuration; environment variables managed via Vercel dashboard. Alternative: Firebase App Hosting (2024+) supports Next.js — viable if Firebase consolidation is preferred. |
| Firebase project | Current | Auth + Firestore + Storage | Single Firebase project covers all backend services. |
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Database | Firestore | Firebase Realtime Database | RTDB cannot compound-query (filter AND sort simultaneously); flat JSON tree is unmaintainable for booking + user + calendar data; 200k concurrent connection ceiling; 99.95% vs 99.999% uptime |
| Auth | Firebase Auth | Clerk | Clerk adds a third-party vendor dependency on top of Firebase; custom auth pages are required either way; Firebase Auth is free within quota and already in the stack |
| Email | Nodemailer | Resend SDK | Resend SDK only sends via Resend API key; cannot dynamically use a creator's arbitrary SMTP credentials; Nodemailer handles all SMTP providers including Resend's SMTP relay |
| UI | shadcn/ui + Tailwind v4 | Chakra UI / MUI | shadcn components are owned by the project (copy-paste), not a runtime dependency; Tailwind v4 token system integrates cleanly; MUI's sx prop system fights Tailwind |
| AI model | claude-haiku-4-5 | claude-sonnet-4-6 | Sonnet is 3x more expensive ($3/$15 vs $1/$5 per MTok); form fill is low-complexity extraction, not reasoning; Haiku is sufficient and faster |
| Forms | react-hook-form + zod | Formik | react-hook-form has better performance (uncontrolled), better TypeScript integration, and better React 19 compatibility |
| Data fetching | TanStack Query v5 | SWR | TanStack Query has richer cache invalidation API and better TypeScript generics; both are valid but TQ v5 is more mature for complex multi-key caching patterns |
| Payments | Stripe hosted checkout | Stripe Elements | Elements requires custom payment form; hosted checkout handles PCI compliance and is faster to ship; no Connect requirement |
## Key Unresolved: Stripe Application Fee Without Connect
## Installation Reference
# Core framework (already scaffolded in my-app/)
# Firebase
# UI
# Forms
# Data fetching
# Payments
# Email
# AI
# Google Calendar (optional, add when implementing that phase)
# React Easy Appointments (user-owned package)
# Import from local workspace or published npm version
## Sources
- Firebase Realtime DB vs Firestore comparison: https://firebase.google.com/docs/database/rtdb-vs-firestore (HIGH confidence)
- Firestore transactions: https://firebase.google.com/docs/firestore/manage-data/transactions (HIGH confidence)
- Anthropic model IDs and pricing: https://platform.claude.com/docs/en/docs/about-claude/models/overview (HIGH confidence, verified 2026-06-15)
- Anthropic structured outputs: https://platform.claude.com/docs/en/build-with-claude/structured-outputs (HIGH confidence)
- shadcn/ui Tailwind v4 integration: https://ui.shadcn.com/docs/tailwind-v4 (HIGH confidence)
- Stripe Connect and application fees: https://docs.stripe.com/connect/direct-charges (HIGH confidence)
- Nodemailer docs: https://nodemailer.com/ (HIGH confidence)
- Resend vs Nodemailer 2026: https://www.pkgpulse.com/guides/resend-vs-nodemailer-vs-postmark-email-nodejs-2026 (MEDIUM confidence)
- Next.js 15 + React Query + Firebase: https://dsheiko.com/weblog/nextjs-15-tutorial/ (MEDIUM confidence)
- Google Calendar OAuth Node.js: https://dev.to/divofred/integrating-google-calendar-with-oauth2-in-nodejs-530i (MEDIUM confidence)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
