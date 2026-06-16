---
phase: 02-firebase-foundation
plan: "02"
subsystem: firebase-sdk
tags: [firebase, sdk, typescript, types, admin-sdk, client-sdk, server-only]
dependency_graph:
  requires:
    - 02-01 (firebase packages installed, firebase.json emulator ports)
  provides:
    - my-app/lib/firebase/client.ts (auth, db, storage singletons)
    - my-app/lib/firebase/admin.ts (adminDb, adminAuth server-only singletons)
    - my-app/lib/firebase/types.ts (all 5 Firestore collection interfaces)
  affects:
    - 02-03 (security rules — references collection shapes from types.ts)
    - 02-04 (indexes — slot/booking query shapes confirmed by types.ts)
    - 02-05 (rules testing — imports types.ts for test data shapes)
    - All Phase 3–12 plans that write to Firestore or call Firebase Auth
tech_stack:
  added: []
  patterns:
    - "Firebase client SDK singleton: getApps().length guard + export auth/db/storage"
    - "Firebase Admin SDK singleton: server-only import + cert() from firebase-admin/app"
    - "Emulator toggle: NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true guard in client.ts"
    - "Firestore write variant: SlotDocWrite with Timestamp | FieldValue union"
key_files:
  created:
    - my-app/lib/firebase/client.ts
    - my-app/lib/firebase/admin.ts
    - my-app/lib/firebase/types.ts
  modified: []
decisions:
  - "cert() imported from firebase-admin/app (not credential namespace) — firebase-admin v14 removed the credential.cert() compat namespace export; cert() is the correct v14 API"
  - "SlotDocWrite type added alongside SlotDoc — allows serverTimestamp() FieldValue on createdAt/updatedAt during writes while keeping read types clean"
  - "types.ts uses client SDK Timestamp — admin code should use firebase-admin/firestore Timestamp directly; comment explains the split"
metrics:
  duration: "8 minutes"
  completed_date: "2026-06-16"
  tasks_completed: 2
  files_created: 3
---

# Phase 02 Plan 02: Firebase SDK Singletons and TypeScript Types Summary

**One-liner:** Firebase client SDK (auth/db/storage), Admin SDK (adminDb/adminAuth with server-only guard), and 5 Firestore collection interfaces implemented as the shared contract layer for all subsequent phases.

## What Was Built

The SDK contract layer — three files that every client component and Route Handler in Phases 3–12 imports from. Getting types and init patterns right here prevents cascading type errors across the entire codebase.

### Task 1: Firebase client SDK singleton (client.ts) and TypeScript types (types.ts)

- `client.ts`: `initializeApp` with `getApps().length` singleton guard; exports `auth`, `db`, `storage`
- Emulator toggle: `NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true'` guards `connectAuthEmulator`, `connectFirestoreEmulator`, `connectStorageEmulator` — disableWarnings flag suppresses emulator banner noise
- `types.ts`: 7 exported interfaces covering all 5 collections: `UserDoc`, `DailySlotConfig`, `PaymentConfig`, `CalendarDoc`, `SlotDoc`, `BookingDoc`, `InviteDoc`
- Exported union types: `SlotStatus`, `BookingStatus`, `PaymentStatus`, `CalendarStatus`, `CalendarVisibility`
- All D-02 schema fields verbatim: `pendingExpiresAt` (PAY-04), `stripeEventId` (PAY-06), `smtpConfigEncrypted` (SMTP-03), `invitedEmails` (INV-01)
- `SlotDocWrite` type alias for write operations using `Timestamp | FieldValue` on timestamp fields

### Task 2: Firebase Admin SDK singleton (admin.ts)

- `import 'server-only'` as first statement — Next.js build error if imported client-side (T-2-02-01 mitigation)
- `getApps()` singleton guard in `getAdminApp()` function prevents duplicate initialization across Route Handlers
- `cert()` from `firebase-admin/app` with `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` env vars
- Private key newline unescaping: `.replace(/\\n/g, '\n')` converts stored `\n` two-char sequences to real PEM newlines
- No client SDK imports (`firebase/*` packages absent from admin.ts)
- Exports `adminDb` and `adminAuth` for use in Route Handlers only

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] firebase-admin v14 removed credential.cert() compat namespace**
- **Found during:** Task 2 TypeScript verification
- **Issue:** Plan specified `import { credential } from 'firebase-admin'` then `credential.cert({...})`. TypeScript error TS2724: `'"firebase-admin"' has no exported member named 'credential'`. firebase-admin v14 moved to subpackage exports — `cert()` is now exported directly from `firebase-admin/app`.
- **Fix:** Changed import to `import { getApps, initializeApp, cert, type App } from 'firebase-admin/app'` and call `cert({...})` directly without the namespace.
- **Files modified:** `my-app/lib/firebase/admin.ts`
- **Commits:** b5ece62 (submodule), 34837a5 (parent worktree)

## Threat Model Verification

| Threat ID | Disposition | Status |
|-----------|-------------|--------|
| T-2-02-01 | mitigate | `import 'server-only'` is first line of admin.ts; Next.js throws build error if client bundle imports it |
| T-2-02-02 | mitigate | admin.ts never logs credentials; FIREBASE_PRIVATE_KEY used only in cert() call |
| T-2-02-03 | accept | Firestore security rules (Plan 03) enforces this at the DB layer |
| T-2-02-04 | accept | Emulator guard uses `=== 'true'` string comparison; production builds have env var unset |

## Known Stubs

None — all 5 collection interfaces are complete. No placeholder data or TODO fields.

## Commits

| Task | Submodule Commit | Worktree Commit | Description |
|------|-----------------|-----------------|-------------|
| Task 1 | bb5c972 | 79135e3 | feat(02-02): client.ts + types.ts |
| Task 2 | d940ee0 | 8f42453 | feat(02-02): admin.ts |
| Fix 1 | b5ece62 | 34837a5 | fix(02-02): cert() import for firebase-admin v14 |

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| my-app/lib/firebase/client.ts exists | FOUND |
| my-app/lib/firebase/admin.ts exists | FOUND |
| my-app/lib/firebase/types.ts exists | FOUND |
| Commit 79135e3 (Task 1 worktree) exists | FOUND |
| Commit 8f42453 (Task 2 worktree) exists | FOUND |
| Commit 34837a5 (Fix 1 worktree) exists | FOUND |
| TypeScript --noEmit passes with 0 errors | PASSED |
