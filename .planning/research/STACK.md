# Technology Stack

**Project:** EasyAppointment SaaS
**Researched:** 2026-06-15
**Overall Confidence:** HIGH (core stack), MEDIUM (email multi-provider), HIGH (AI model IDs verified via official Anthropic docs)

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 15 (App Router) | Full-stack React framework | App Router is the current default; `"use client"` directive enables the reactive, client-driven UI the project requires. Server-side Route Handlers replace `pages/api`. Do NOT use Pages Router. |
| React | 19 | UI runtime | Ships with Next.js 15. Required for Compiler optimizations and concurrent features. |
| TypeScript | 5.x | Type safety | Non-negotiable for a multi-person codebase with Firebase, Stripe, and Anthropic SDK integrations — all have excellent TypeScript types. |

**Next.js client-side approach:** Use `"use client"` at the component level where reactivity is needed (calendar grid, booking form, real-time slot state). Wrap the entire calendar page subtree in a client boundary. Server Components handle the initial HTML shell and page metadata only. Do NOT use `getServerSideProps` — that is Pages Router. Use React Query (TanStack Query v5) to manage Firebase real-time state subscriptions in client components.

---

### Database: Firestore (not Realtime Database)

**Decision: Use Cloud Firestore, not Firebase Realtime Database.**

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Cloud Firestore | Current (Firebase SDK v11) | Primary database | Document/collection model suits structured booking data. Compound queries filter by date AND availability status simultaneously — Realtime Database cannot do this (sort OR filter, not both). Automatic scaling (no 200k concurrent connection ceiling). 99.999% uptime vs 99.95% for RTDB. |

**Why NOT Realtime Database:**
- RTDB is a single large JSON tree — booking slots, user profiles, calendar configs, and booking records all shoved into one tree gets unmanageable fast.
- RTDB cannot compound-query: you cannot do `where("calendarId", "==", x).where("status", "==", "available").orderBy("startTime")` — a query EasyAppointment will need constantly.
- RTDB write rate caps at ~1,000 writes/second per database path before you must shard — unnecessary complexity for a SaaS at this stage.
- RTDB's 10ms vs Firestore's 30ms latency advantage is imperceptible for a booking UI and does not justify the query limitations.

**Real-time slot management with Firestore:**
Use `onSnapshot()` listeners on slot documents for real-time UI updates. Use **Firestore transactions** (`runTransaction()`) to atomically check-then-write slot availability, preventing double-bookings. A transaction reads the slot document, verifies `status === "available"`, and sets `status = "booked"` — if concurrent writers collide, Firestore retries automatically.

```typescript
// Double-booking prevention pattern
await runTransaction(db, async (tx) => {
  const slotDoc = await tx.get(slotRef);
  if (slotDoc.data().status !== "available") throw new Error("Slot taken");
  tx.update(slotRef, { status: "booked", bookedBy: email });
});
```

**Confidence:** HIGH — verified against official Firebase comparison docs.

---

### Authentication

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Firebase Auth | Firebase SDK v11 | Email + Google sign-in | Native pairing with Firestore; no third-party vendor lock-in; custom auth pages are required either way so Clerk's prebuilt UI provides no benefit. Handles email verification codes, password reset, and Google OAuth out of the box. |
| firebase-admin | 13.x | Server-side token verification | Used in Next.js Route Handlers to verify `idToken` from the client before any privileged writes. Admin SDK bypasses Firestore Security Rules by design — server is the trust boundary. |

**Auth pattern for Next.js:** Client calls `getIdToken()` from Firebase Auth; passes token in `Authorization: Bearer` header to Route Handlers; server calls `admin.auth().verifyIdToken(token)` to get the verified uid. Never trust client-provided uid directly.

---

### Payments

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| stripe (Node.js SDK) | ^17.x | Stripe Checkout sessions | Server-side session creation in Route Handlers. `stripe.checkout.sessions.create()` with `mode: "payment"` covers one-time booking fees. |
| @stripe/stripe-js | ^5.x | Stripe.js on client | Redirect to hosted checkout via `stripe.redirectToCheckout()`. No custom card UI — hosted checkout handles PCI compliance. |

**Application fee (1.5%) without Stripe Connect:**
This is a known constraint from the PROJECT.md. The standard Stripe `application_fee_amount` parameter on a PaymentIntent or Session **requires a connected account** — it does not work on your own platform account. Without Connect, you cannot take a platform cut of payments going to a third-party creator's Stripe account at the transaction level.

**Practical implication for v1:** Creators link their own Stripe account via the standard Stripe dashboard. The SaaS collects payment on the creator's behalf only if the creator's Stripe key is used (which requires Connect to do cleanly). The safest v1 approach: creators receive payment to the platform's Stripe account; the platform holds funds and pays out — or defer the 1.5% fee entirely for v1 and revisit with Connect in a later milestone. This needs a product decision, not just a tech decision. Flag this for the roadmap.

**Confidence:** MEDIUM — Stripe docs confirm `application_fee_amount` requires Connect for cross-account flows. Direct single-account checkout works without Connect.

---

### UI Components and Styling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | v4 | Utility-first styling | v4 is the current major release (2025); introduces `@theme` directive for CSS token-driven theming. Compatible with Next.js 15. Use `@theme` for brand tokens. |
| shadcn/ui | Latest (2025 Tailwind v4 compat) | Accessible component primitives | Not a dependency — copy-paste components you own. Built on Radix UI primitives; keyboard navigation and screen-reader support are built-in. Works with Tailwind v4 via the official v4 integration guide (https://ui.shadcn.com/docs/tailwind-v4). |
| lucide-react | ^0.400+ | Icons | Matches shadcn/ui's icon set; tree-shakeable. |
| react-easy-appointments | workspace / npm | Calendar UI widget | The user-owned npm package. The SaaS imports this directly. All calendar display and slot selection goes through this component. Improvements to this package are a prerequisite phase before SaaS UI work begins. |

**Confidence:** HIGH — shadcn + Tailwind v4 + Next.js 15 is the documented 2025 standard combination.

---

### Forms and Validation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| react-hook-form | ^7.x | Form state management | Uncontrolled by default — performant for complex multi-step booking and calendar creation forms. Minimal re-renders. |
| zod | ^3.x | Schema validation | Shared schemas between client (react-hook-form via `@hookform/resolvers/zod`) and server (Route Handler body parsing). Single source of truth for field shape. |
| @hookform/resolvers | ^3.x | Bridge between RHF and Zod | Required to connect the two. |

---

### Data Fetching and Real-time State

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| TanStack Query (React Query) | v5 | Client-side data fetching and cache | Wraps Firebase `onSnapshot` subscriptions; handles loading/error states cleanly; enables optimistic updates for booking confirmation. Use `useQuery` for one-time fetches (creator profile, booking history) and subscribe to Firestore snapshots within `useEffect` for real-time slot state. |
| firebase (client SDK) | ^11.x | Firestore + Auth + Storage client | The standard Firebase web SDK. Import modular (tree-shakeable) functions only: `import { getFirestore, onSnapshot } from "firebase/firestore"`. |

---

### Email Sending Architecture

**Decision: Nodemailer as the universal transport layer, not Resend SDK.**

The project requires **per-calendar SMTP config** — each creator provides their own SMTP credentials (Gmail, personal server, Resend SMTP relay, Mailgun SMTP relay, etc.). This rules out Resend SDK as the primary library because Resend SDK sends via Resend's API key only — it cannot dynamically switch to a creator's arbitrary SMTP credentials at runtime.

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| nodemailer | ^6.x | Email transport | Accepts any SMTP configuration at runtime via `createTransport({ host, port, auth: { user, pass } })`. This enables per-calendar SMTP: load the creator's stored SMTP config from Firestore, construct a transporter, send. Works with Gmail (`smtp.gmail.com`), Resend SMTP relay (`smtp.resend.com`), Mailgun SMTP, SendGrid SMTP, custom servers — all using the same code. |

**Multi-provider SMTP architecture:**
```typescript
// Pseudo-pattern — instantiate per-request, never cache transporters
const transporter = nodemailer.createTransport({
  host: calendar.smtp.host,       // e.g. "smtp.resend.com" or "smtp.gmail.com"
  port: calendar.smtp.port,       // 587 for STARTTLS, 465 for SSL
  secure: calendar.smtp.port === 465,
  auth: {
    user: calendar.smtp.user,
    pass: calendar.smtp.pass,     // stored encrypted in Firestore
  },
});
await transporter.sendMail({ from, to, subject, html });
```

**Why NOT Resend SDK as primary:** Resend SDK only sends from Resend's service using a Resend API key. If a creator wants to send from their own Gmail or custom SMTP, Resend SDK cannot accommodate that. Nodemailer covers Resend SMTP relay too (Resend supports standard SMTP at `smtp.resend.com:587`).

**Email templates:** Use `mjml` or inline HTML strings. Do NOT add React Email as a dependency unless template complexity warrants it — it adds build overhead.

**Transporter instantiation:** Create a new transporter per request in the Route Handler. Do NOT share transporter instances across requests in a serverless environment — each invocation is stateless.

**Confidence:** HIGH — Nodemailer docs confirm arbitrary SMTP transport. MEDIUM — Resend SMTP relay compatibility confirmed via Resend docs pattern.

---

### AI Form Fill

**Decision: Claude Haiku 4.5 via Anthropic SDK with structured outputs.**

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @anthropic-ai/sdk | ^0.x (latest) | Anthropic API client | Official TypeScript SDK for calling Claude models. |
| claude-haiku-4-5 | API alias `claude-haiku-4-5` | AI model for form fill | Fastest and cheapest current Claude model ($1/$5 per MTok input/output). Form fill is a low-complexity, high-frequency task — Haiku is the right tier. Does not need Sonnet-level reasoning. |

**Model ID (verified against Anthropic official docs, 2026-06-15):**
- Pinned: `claude-haiku-4-5-20251001`
- Alias (points to pinned): `claude-haiku-4-5`
- Use the alias in code; note that aliases are pinned snapshots, not evergreen pointers.

**Structured output approach:**
Use the Claude Structured Outputs beta (`anthropic-beta: "structured-outputs-2025-11-13"`) with a JSON Schema matching the calendar creation form fields. This guarantees the model returns valid JSON without extra text or missing fields — no manual JSON parsing needed.

```typescript
// Route Handler: POST /api/ai/parse-schedule
const response = await anthropic.messages.create({
  model: "claude-haiku-4-5",
  max_tokens: 1024,
  system: "Parse the user's natural language schedule description into structured form fields.",
  messages: [{ role: "user", content: userInput }],
  // structured output schema matches CalendarDraft type
});
```

**Integration pattern:** The AI form fill is a Route Handler — never expose the Anthropic API key to the client. The client sends the user's natural language description to `/api/ai/parse-schedule`; the server calls Claude and returns the structured JSON; the client populates form fields using `setValue()` from react-hook-form. The form stays in Draft state until the creator clicks Publish.

**Confidence:** HIGH — model IDs verified via official Anthropic docs. Structured outputs beta confirmed active.

---

### Google Calendar Sync

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| googleapis | ^144.x | Google Calendar API client | Official Google Node.js client. Used in Route Handlers only (server-side OAuth token exchange). |

**OAuth pattern:** Use OAuth 2.0 authorization code flow (not service accounts — service accounts cannot access a user's personal calendar). Store the creator's `access_token` and `refresh_token` encrypted in Firestore after the OAuth callback. On booking, a Route Handler reads the stored tokens, refreshes if expired, and calls `calendar.events.insert()`. This is an optional feature gated behind a "Connect Google Calendar" toggle in the creator dashboard.

**Confidence:** MEDIUM — standard pattern confirmed across multiple dev.to and official Google docs sources, but exact googleapis package version should be confirmed at implementation time.

---

### Storage

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Firebase Storage | Firebase SDK v11 | File storage | Used for creator profile images and any attachments. Pairs naturally with Firebase Auth for security rules (`request.auth.uid`). No additional dependency. |

---

### Infrastructure and Hosting

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel | Current | Next.js hosting | First-party Next.js hosting provider; zero-config deployment; serverless Route Handlers work without configuration; environment variables managed via Vercel dashboard. Alternative: Firebase App Hosting (2024+) supports Next.js — viable if Firebase consolidation is preferred. |
| Firebase project | Current | Auth + Firestore + Storage | Single Firebase project covers all backend services. |

---

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

---

## Key Unresolved: Stripe Application Fee Without Connect

**This is a product-level constraint, not just a tech constraint.**

Stripe's `application_fee_amount` field on `checkout.sessions.create()` only works when `payment_intent_data.application_fee_amount` is used alongside a `stripe_account` header pointing to a connected account. Without Stripe Connect, there is no mechanism to take a percentage cut from a payment going to another Stripe entity.

**Options for v1:**
1. Payments go to the platform's own Stripe account; creators are paid out manually or via Stripe Payouts — operationally heavy.
2. No fee in v1; revenue model revisited when Connect is implemented.
3. Creators embed their own Stripe publishable key; payments go directly to them; platform earns nothing from transactions in v1.

**Recommendation:** Option 2 (no fee in v1, standard checkout, full amount to creator). Stripe Connect is explicitly Out of Scope in PROJECT.md. This is a milestone decision, not a code decision.

**Confidence:** HIGH — confirmed via Stripe official docs.

---

## Installation Reference

```bash
# Core framework (already scaffolded in my-app/)
npm install next@15 react@19 react-dom@19 typescript

# Firebase
npm install firebase firebase-admin

# UI
npm install tailwindcss@4 @tailwindcss/vite
npx shadcn@latest init
npm install lucide-react

# Forms
npm install react-hook-form zod @hookform/resolvers

# Data fetching
npm install @tanstack/react-query

# Payments
npm install stripe @stripe/stripe-js

# Email
npm install nodemailer
npm install -D @types/nodemailer

# AI
npm install @anthropic-ai/sdk

# Google Calendar (optional, add when implementing that phase)
npm install googleapis

# React Easy Appointments (user-owned package)
# Import from local workspace or published npm version
```

---

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
