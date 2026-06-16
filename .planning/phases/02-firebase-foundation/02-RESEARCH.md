# Phase 2: Firebase Foundation - Research

**Researched:** 2026-06-16
**Domain:** Firebase SDK v11, Firestore Security Rules, Local Emulator Suite, Next.js 15 App Router integration
**Confidence:** HIGH (core patterns), MEDIUM (Admin SDK credential strategy)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Top-level `slots` collection (not a subcollection under `calendars`). Enables compound queries like `where("calendarId", "==", x).where("status", "==", "available").orderBy("startUtc")`.
- **D-02:** All 5 collections with complete field lists defined now: `users`, `calendars`, `slots`, `bookings`, `invites`. Full schemas documented in CONTEXT.md.
- **D-03:** Write the complete v1 security rules covering all collections in this phase with a test suite.
- **D-04:** Rule principles — users: own-doc only; calendars: creator full, public read if published+public; slots: creator write, public read; bookings: creator reads own, booker reads own, all writes via Admin SDK; invites: no client reads/writes.
- **D-05:** `firestore.rules.test.ts` using `@firebase/rules-unit-testing` covering 5 scenarios.
- **D-06:** `firebase.json` configures Auth (9099), Firestore (8080), Storage (9199) emulators; `dev` script in `my-app/package.json` runs both concurrently via `concurrently`.
- **D-07:** `scripts/seed-emulator.ts` seeds: 1 test user, 1 published public calendar, 5 available slots.
- **D-08:** `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true` toggles client SDK to emulator ports.
- **D-09:** Firebase client SDK singleton in `my-app/lib/firebase/client.ts` using `getApps().length ? getApp() : initializeApp(config)` guard. Exports `auth`, `db`, `storage`.
- **D-10:** Firebase Admin SDK singleton in `my-app/lib/firebase/admin.ts` — server-only, used in Route Handlers. Never imported in `"use client"` components.

### Claude's Discretion

- OTP token storage: plaintext 6-digit code vs hashed (lean toward hashed for defense in depth).
- Firestore index definitions (`firestore.indexes.json`) for the compound queries identified above.
- Exact `concurrently` command flags for the dev script.

### Deferred Ideas (OUT OF SCOPE)

- Supabase / NeonDB as Firebase replacement — declined; Firebase confirmed.
- Google OAuth app publication (Testing to Production) — pre-Phase 10 blocker; flag in STATE.md but not in this phase.

</user_constraints>

---

## Summary

Phase 2 establishes the Firebase foundation that all subsequent phases depend on. The primary concerns are: initializing Firebase SDK v11's modular API correctly in a Next.js 15 App Router project (avoiding duplicate initialization), writing complete Firestore security rules with a test suite using `@firebase/rules-unit-testing` v5.x, configuring the local emulator suite with environment-based toggling, and defining composite indexes for the compound queries the app requires.

Firebase SDK v11 uses an exclusively modular (tree-shakeable) API — all older namespaced patterns (`firebase.firestore()`, `firebase.auth()`) are removed. The Admin SDK v14 uses subpackage imports (`firebase-admin/firestore`, `firebase-admin/auth`) and requires either Application Default Credentials (for Google-hosted environments) or explicit service account credentials via environment variables (for Vercel). Both SDKs require a re-initialization guard to survive Next.js hot-reload in development.

A critical environmental blocker exists: the Firebase Local Emulator Suite requires Java JDK 11+ to run the Firestore and Storage emulators. Java is not currently installed on the development machine. This must be resolved in Wave 0 before any emulator-dependent work can proceed.

**Primary recommendation:** Install Java JDK 21, install `firebase-tools` globally, run `firebase init` to scaffold `firebase.json` and initial rules files, then implement SDK singletons and the security rule test suite.

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on this phase |
|-----------|---------------------|
| Firebase SDK v11 (client), firebase-admin 13.x (server) | Use modular API only; no compat/namespaced imports |
| Firestore, NOT Realtime Database | All schema/rules work targets Firestore |
| Next.js 15 App Router | Client SDK in `"use client"` components or hooks; Admin SDK in Route Handlers only |
| TypeScript 5.x — non-negotiable | All files in `.ts` / `.tsx`; type all Firestore documents |
| pnpm workspace | Use `pnpm add` not `npm install` |
| No direct repo edits outside GSD workflow | All implementation goes through `/gsd-execute-phase` |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| firebase | 12.14.0 | Client SDK — Auth, Firestore, Storage | Project decision; v11+ modular API is current |
| firebase-admin | 14.0.0 | Server SDK — privileged writes, token verification | Current major; subpackage imports required |
| @firebase/rules-unit-testing | 5.0.1 | Security rules test suite | Official Firebase testing library; v5 requires Node 20+ (machine has Node 20.20.2 — compatible) |
| firebase-tools | latest | CLI — `firebase init`, emulator runner, deploy | Required to run emulators and deploy rules |
| concurrently | 10.0.3 | Run emulators + next dev in one terminal | Standard npm concurrent-process tool |
| tsx | 4.22.4 | Run TypeScript seed script directly | Zero-config TS execution; no separate compile step |

**Version verification:** All versions confirmed via `npm view <package> version` on 2026-06-16. [VERIFIED: npm registry]

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 4.1.9 | Test runner for security rule tests | Already available in npm registry; use for `firestore.rules.test.ts` |
| @vitest/coverage-v8 | latest | Coverage (optional) | Only if coverage reporting needed |

### Installation

```bash
# In my-app/ — client and shared deps
pnpm add firebase

# Dev deps for my-app/
pnpm add -D @firebase/rules-unit-testing vitest tsx

# Server-only — firebase-admin stays out of client bundle
# It is imported only from lib/firebase/admin.ts (server-only file)
pnpm add firebase-admin

# Dev tooling — add concurrently
pnpm add -D concurrently

# firebase-tools — global install so `firebase` CLI works
npm install -g firebase-tools
# OR use npx firebase ... in scripts (avoids global)
```

---

## Architecture Patterns

### Recommended Project Structure

```
my-app/
├── lib/
│   └── firebase/
│       ├── client.ts        # Client SDK singleton — auth, db, storage instances
│       └── admin.ts         # Admin SDK singleton — server-only
├── app/
│   └── api/                 # Route Handlers — only place that imports admin.ts
scripts/
│   └── seed-emulator.ts     # Emulator seed script (run with tsx)
firebase.json                # Emulator config (at repo root or my-app/)
firestore.rules              # Security rules
firestore.indexes.json       # Composite index definitions
storage.rules                # Storage security rules
.env.local                   # Firebase config + emulator toggle
```

### Pattern 1: Firebase Client SDK Singleton

The `getApps()` guard prevents duplicate initialization across Next.js hot reloads and module re-imports. All three `connectXxxEmulator` calls are guarded by the `NEXT_PUBLIC_USE_FIREBASE_EMULATOR` env var — they must be called before any SDK operations.

```typescript
// my-app/lib/firebase/client.ts
// Source: https://firebase.google.com/docs/web/setup [VERIFIED: official docs]
// Source: https://firebase.google.com/docs/emulator-suite/connect_auth [VERIFIED: official docs]

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Emulator connections — must happen before any SDK operation
// connectXxxEmulator throws if called a second time on the same instance,
// so guard with a flag or rely on the module singleton (module runs once).
if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
}
```

**PITFALL:** `connectXxxEmulator` throws `"Emulator already started"` if called a second time on the same Firestore instance. The module singleton (ES modules are only evaluated once per process) prevents this in production. In dev, Next.js's fast refresh reuses module instances, so the guard is naturally satisfied. [VERIFIED: firebase.google.com/docs/emulator-suite/connect_firestore]

### Pattern 2: Firebase Admin SDK Singleton

The Admin SDK must never be imported in client components. The `global` object cache (`globalThis`) is the standard pattern for Next.js serverless environments where module state can be cold-started or reset between requests.

```typescript
// my-app/lib/firebase/admin.ts
// Source: https://firebase.google.com/docs/admin/setup [VERIFIED: official docs]
// Source: https://www.benmvp.com/blog/initializing-firebase-admin-node-sdk-env-vars/ [CITED: benmvp.com]

import { getApps, initializeApp, App } from 'firebase-admin/app';
import { credential } from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }
  return initializeApp({
    credential: credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      // Private key is stored as a single-line env var; \n must be unescaped
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')!,
    }),
  });
}

const adminApp = getAdminApp();

export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
```

**NOTE on credential strategy:** `credential.cert()` with individual env vars is the recommended Vercel pattern. `applicationDefault()` works only on Google Cloud infrastructure (Cloud Run, App Engine, Firebase App Hosting) where ADC is auto-configured. For Vercel deployments, `cert()` is required. [CITED: benmvp.com blog, verified against firebase.google.com/docs/admin/setup]

**CRITICAL:** firebase-admin v14 uses subpackage imports: `from 'firebase-admin/firestore'`, `from 'firebase-admin/auth'`, `from 'firebase-admin/app'`. The old `import admin from 'firebase-admin'` namespaced pattern still exists as compat but is not recommended. [VERIFIED: npm view firebase-admin version 14.0.0]

### Pattern 3: Firestore Security Rules

```
// firestore.rules
// Source: https://firebase.google.com/docs/firestore/security/get-started [VERIFIED: official docs]
// Source: https://firebase.google.com/docs/firestore/security/rules-conditions [VERIFIED: official docs]

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // users — authenticated user reads/writes only their own document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // calendars — creator has full access; anyone can read public+published
    match /calendars/{calendarId} {
      allow read: if resource.data.status == 'published'
                  && resource.data.visibility == 'public';
      allow read, write: if request.auth != null
                         && request.auth.uid == resource.data.creatorId;
      allow create: if request.auth != null
                    && request.auth.uid == request.resource.data.creatorId;
    }

    // slots — creator writes; public read (availability is public info)
    match /slots/{slotId} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.auth.uid == resource.data.creatorId;
      allow create: if request.auth != null
                    && request.auth.uid == request.resource.data.creatorId;
    }

    // bookings — creator reads their own bookings; booker reads their booking
    // All writes go through Admin SDK (no client write rules needed)
    match /bookings/{bookingId} {
      allow read: if request.auth != null
                  && (request.auth.uid == resource.data.creatorId
                      || request.auth.uid == resource.data.bookerUid);
      allow write: if false; // Admin SDK only
    }

    // invites — no client reads/writes; all via Admin SDK Route Handlers
    match /invites/{inviteId} {
      allow read, write: if false;
    }
  }
}
```

**IMPORTANT:** `resource.data` is the existing document (for reads/updates/deletes). `request.resource.data` is the incoming data (for creates/updates). `resource.data` is null on `create` operations — use `request.resource.data` for create rules. [VERIFIED: firebase.google.com/docs/firestore/security/rules-conditions]

**DENORMALIZATION RATIONALE:** `creatorId` is stored on `slots` and `bookings` documents because Firestore security rules cannot read other documents to verify ownership. A rule on `/slots/{slotId}` cannot read `/calendars/{calendarId}` to check `creatorId`. Denormalization is the standard Firestore pattern. [CITED: CONTEXT.md §Specific Ideas]

### Pattern 4: Security Rule Test Suite

```typescript
// my-app/lib/firebase/__tests__/firestore.rules.test.ts
// Source: https://firebase.google.com/docs/firestore/security/test-rules-emulator [VERIFIED: official docs]

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-easyappointment',
    firestore: {
      rules: readFileSync(resolve(__dirname, '../../../../firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('users collection', () => {
  it('rejects unauthenticated write', async () => {
    const unauth = testEnv.unauthenticatedContext();
    await assertFails(
      setDoc(unauth.firestore().doc('users/uid-alice'), { displayName: 'Alice' })
    );
  });

  it('allows authenticated user to write their own document', async () => {
    const alice = testEnv.authenticatedContext('uid-alice');
    await assertSucceeds(
      setDoc(alice.firestore().doc('users/uid-alice'), {
        uid: 'uid-alice',
        email: 'alice@example.com',
        displayName: 'Alice',
        username: 'alice',
        bio: '',
        photoURL: null,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );
  });

  it('rejects non-owner write to another user document', async () => {
    const bob = testEnv.authenticatedContext('uid-bob');
    await assertFails(
      setDoc(bob.firestore().doc('users/uid-alice'), { displayName: 'Hacked' })
    );
  });
});

describe('calendars collection', () => {
  it('allows public read of published+public calendar', async () => {
    // Use withSecurityRulesDisabled to seed test data
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(ctx.firestore().doc('calendars/cal-1'), {
        id: 'cal-1',
        creatorId: 'uid-creator',
        status: 'published',
        visibility: 'public',
        title: 'Test Calendar',
      });
    });
    const unauth = testEnv.unauthenticatedContext();
    await assertSucceeds(
      getDoc(unauth.firestore().doc('calendars/cal-1'))
    );
  });

  it('rejects unauthenticated read of invite-only calendar', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(ctx.firestore().doc('calendars/cal-inv'), {
        id: 'cal-inv',
        creatorId: 'uid-creator',
        status: 'published',
        visibility: 'invite-only',
        title: 'Private Calendar',
      });
    });
    const unauth = testEnv.unauthenticatedContext();
    await assertFails(
      getDoc(unauth.firestore().doc('calendars/cal-inv'))
    );
  });

  it('allows creator to write their own calendar', async () => {
    const creator = testEnv.authenticatedContext('uid-creator');
    await assertSucceeds(
      setDoc(creator.firestore().doc('calendars/cal-new'), {
        id: 'cal-new',
        creatorId: 'uid-creator',
        status: 'draft',
        visibility: 'public',
        title: 'New Calendar',
      })
    );
  });

  it('rejects non-creator write', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(ctx.firestore().doc('calendars/cal-2'), {
        id: 'cal-2',
        creatorId: 'uid-creator',
        status: 'published',
        visibility: 'public',
      });
    });
    const other = testEnv.authenticatedContext('uid-other');
    await assertFails(
      setDoc(other.firestore().doc('calendars/cal-2'), { title: 'Hacked' })
    );
  });
});

describe('bookings collection', () => {
  it('rejects all client writes to bookings', async () => {
    const creator = testEnv.authenticatedContext('uid-creator');
    await assertFails(
      setDoc(creator.firestore().doc('bookings/booking-1'), {
        creatorId: 'uid-creator',
        bookerUid: 'uid-booker',
      })
    );
  });
});

describe('invites collection', () => {
  it('rejects all client operations on invites', async () => {
    const user = testEnv.authenticatedContext('uid-user');
    await assertFails(
      setDoc(user.firestore().doc('invites/inv-1'), { email: 'test@test.com' })
    );
    await assertFails(
      getDoc(user.firestore().doc('invites/inv-1'))
    );
  });
});
```

**CRITICAL API NOTE:** `@firebase/rules-unit-testing` v5.x API (current) uses `initializeTestEnvironment()` — NOT the old `initializeTestApp()` from v1/v2. The test environment must be pointed at a running Firestore emulator. Tests fail if the emulator is not running. [VERIFIED: firebase.google.com/docs/firestore/security/test-rules-emulator]

**v4 breaking change:** ES5 bundle removed; minimum ES2017 required. Vitest with modern config handles this. [VERIFIED: npm CHANGELOG]

**v5 breaking change:** Minimum Node engine is Node 20 (machine has 20.20.2 — compatible). [VERIFIED: npm CHANGELOG]

### Pattern 5: Seed Script

```typescript
// scripts/seed-emulator.ts
// Run with: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 tsx scripts/seed-emulator.ts

import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Admin SDK auto-connects to emulators when env vars are set
// FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST must be set
// before initializeApp() is called

initializeApp({ projectId: 'demo-easyappointment' });

const db = getFirestore();
const auth = getAuth();

async function seed() {
  console.log('Seeding emulator...');

  // Create test user in Auth
  const user = await auth.createUser({
    email: 'creator@test.com',
    password: 'password123',
    displayName: 'Test Creator',
    emailVerified: true,
  });

  // Seed users collection
  await db.collection('users').doc(user.uid).set({
    uid: user.uid,
    email: 'creator@test.com',
    displayName: 'Test Creator',
    username: 'testcreator',
    bio: 'Test creator account',
    photoURL: null,
    emailVerified: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  // Seed calendar
  const calRef = db.collection('calendars').doc('seed-cal-1');
  await calRef.set({
    id: 'seed-cal-1',
    creatorId: user.uid,
    title: 'Test Calendar',
    status: 'published',
    visibility: 'public',
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    dailySlotConfig: { startTime: '09:00', endTime: '17:00', durationMinutes: 60 },
    invitedEmails: [],
    isPaid: false,
    paymentConfig: null,
    smtpConfigEncrypted: null,
    googleCalendarConnected: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  // Seed 5 available slots
  const batch = db.batch();
  for (let i = 0; i < 5; i++) {
    const slotRef = db.collection('slots').doc(`seed-slot-${i}`);
    const hour = 9 + i;
    batch.set(slotRef, {
      id: `seed-slot-${i}`,
      calendarId: 'seed-cal-1',
      creatorId: user.uid,
      date: '2026-07-01',
      startUtc: `2026-07-01T${String(hour).padStart(2, '0')}:00:00Z`,
      endUtc: `2026-07-01T${String(hour + 1).padStart(2, '0')}:00:00Z`,
      status: 'available',
      bookingId: null,
      pendingExpiresAt: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }
  await batch.commit();

  console.log('Seed complete. User UID:', user.uid);
}

seed().catch(console.error);
```

### Anti-Patterns to Avoid

- **Importing `admin.ts` in client components:** Will crash at build time or expose credentials. Admin SDK is Node-only; it cannot run in the browser. Mark admin.ts with `import 'server-only'` from the `server-only` package as an additional guard.
- **Using the compat (`firebase/compat/*`) imports:** The compat layer is deprecated. Always use modular imports (`import { getFirestore } from 'firebase/firestore'`).
- **Calling `initializeApp()` without a guard:** Throws `"Firebase App named '[DEFAULT]' already exists"` on hot reload. Always use the `getApps().length` check.
- **Reading `resource.data` in a `create` rule:** `resource.data` is null on creates — use `request.resource.data` for new document validation.
- **Storing `FIREBASE_PRIVATE_KEY` with literal `\n`:** When set as an environment variable, newlines are stored as `\n` string literals. Must replace with `.replace(/\\n/g, '\n')` before passing to `cert()`. [CITED: benmvp.com]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Security rule testing | Custom test harness with raw fetch calls | `@firebase/rules-unit-testing` | Handles emulator connection, auth context mocking, `assertFails`/`assertSucceeds` helpers |
| Atomic slot claiming | Client-side read-then-write with optimistic update | `runTransaction()` from `firebase/firestore` | Transactions retry on conflict; client-side check has race condition window |
| Duplicate app initialization check | try-catch on `initializeApp` | `getApps().length` guard | Official pattern; try-catch on "already exists" is fragile |
| Credential parsing for Vercel | Manual JSON parsing of service account | `admin.credential.cert({ projectId, clientEmail, privateKey })` with env vars | Handles private key newline escaping correctly |

**Key insight:** Firestore security rules are deceptively complex — the absence of cross-document reads in rules forces denormalization patterns that must be planned at schema design time. Changing denormalization strategy post-launch requires data migration.

---

## Firestore Composite Indexes

Composite indexes are required whenever a query uses `where()` on one field and `orderBy()` on a different field, or combines multiple `where()` filters that include a range comparator. Single-field equality `where()` with no ordering uses automatic single-field indexes. [VERIFIED: firebase.google.com/docs/firestore/query-data/index-overview]

### Required Composite Indexes for this Schema

| Collection | Query Pattern | Fields Required | Reason |
|------------|--------------|-----------------|--------|
| `slots` | `where("calendarId","==",x).where("status","==","available").orderBy("startUtc")` | calendarId (ASC), status (ASC), startUtc (ASC) | Two equality filters + orderBy = composite required |
| `slots` | `where("calendarId","==",x).orderBy("startUtc")` | calendarId (ASC), startUtc (ASC) | Equality + orderBy on different field |
| `slots` | `where("calendarId","==",x).where("date","==",y)` | calendarId (ASC), date (ASC) | Two equality filters — auto index may suffice but composite is safer |
| `bookings` | `where("creatorId","==",x).orderBy("createdAt","desc")` | creatorId (ASC), createdAt (DESC) | Equality + orderBy on different field |
| `bookings` | `where("creatorId","==",x).where("calendarId","==",y)` | creatorId (ASC), calendarId (ASC) | Two equality filters for DASH-02 calendar filter |
| `bookings` | `where("bookerUid","==",x).orderBy("createdAt","desc")` | bookerUid (ASC), createdAt (DESC) | PROF-03 booker history query |

### `firestore.indexes.json` Format

```json
{
  "indexes": [
    {
      "collectionGroup": "slots",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "calendarId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "startUtc", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "slots",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "calendarId", "order": "ASCENDING" },
        { "fieldPath": "startUtc", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "slots",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "calendarId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "bookings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "creatorId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "bookings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "creatorId", "order": "ASCENDING" },
        { "fieldPath": "calendarId", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "bookings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "bookerUid", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

**NOTE:** The Firebase CLI also auto-generates missing index definitions when a query fails in the emulator console — it prints the exact `firestore.indexes.json` entry to add. This is a useful fallback during development. [ASSUMED — based on common Firebase development practice; verify during implementation]

---

## TypeScript Document Types

### Recommended Pattern: Interface + FirestoreDataConverter

For typed Firestore documents, define TypeScript interfaces and use `withConverter()` on collection references. The key consideration is Timestamp: Firestore stores Timestamps as Firestore Timestamp objects; when reading, they are Timestamp instances; when writing, you can pass `serverTimestamp()` FieldValue.

```typescript
// my-app/lib/firebase/types.ts
import { Timestamp, FieldValue } from 'firebase/firestore';

// Document interface — fields as they exist in Firestore
export interface UserDoc {
  uid: string;
  email: string;
  displayName: string;
  username: string;
  bio: string;
  photoURL: string | null;
  emailVerified: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SlotDoc {
  id: string;
  calendarId: string;
  creatorId: string;
  date: string;
  startUtc: string;
  endUtc: string;
  status: 'available' | 'pending' | 'booked' | 'unavailable';
  bookingId: string | null;
  pendingExpiresAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// For writes, timestamps may be FieldValue.serverTimestamp()
export type SlotDocWrite = Omit<SlotDoc, 'createdAt' | 'updatedAt'> & {
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
};
```

**Timestamp handling rules:**
- **Reading:** Timestamp comes back as `Timestamp` object. Call `.toDate()` or `.toMillis()` for JS Date manipulation.
- **Writing (new docs):** Use `Timestamp.now()` or `serverTimestamp()` from `firebase/firestore`.
- **Writing (Admin SDK):** Use `Timestamp.now()` from `firebase-admin/firestore` (different import path from client SDK).
- **Do NOT** store Dates as ISO strings for `createdAt`/`updatedAt` — those are already strings in the schema. [VERIFIED: consistent with CONTEXT.md schema where `date`, `startUtc`, `endUtc` are strings, timestamps are Timestamp]

---

## Environment Variables Structure

```bash
# my-app/.env.local

# Firebase client config — safe to be public; these are not secrets
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Emulator toggle — set to "true" for local dev; absent or "false" for production
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true

# Firebase Admin credentials — server-only secrets (no NEXT_PUBLIC_ prefix)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
```

**NEXT_PUBLIC_ rule:** Variables prefixed with `NEXT_PUBLIC_` are inlined into the client-side JavaScript bundle at build time. Firebase client config values (API key, project ID) are designed to be public — they are scoped by Firestore security rules, not kept secret. [VERIFIED: nextjs.org/docs/app/guides/environment-variables]

**Private key newline:** `FIREBASE_PRIVATE_KEY` when stored in `.env.local` or Vercel environment variables will have `\n` as literal two-character sequences. The Admin SDK init code must call `.replace(/\\n/g, '\n')` to convert these back to real newlines. [CITED: benmvp.com/blog/initializing-firebase-admin-node-sdk-env-vars/]

---

## Emulator Configuration

### firebase.json

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "emulators": {
    "auth": {
      "port": 9099
    },
    "firestore": {
      "port": 8080
    },
    "storage": {
      "port": 9199
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

[VERIFIED: firebase.google.com/docs/emulator-suite/install_and_configure]

### package.json Scripts (my-app/package.json)

```json
{
  "scripts": {
    "dev": "concurrently --kill-others-on-fail --names \"EMU,NEXT\" --prefix-colors \"yellow,cyan\" \"firebase emulators:start --project demo-easyappointment\" \"next dev\"",
    "dev:next": "next dev",
    "emulators": "firebase emulators:start --project demo-easyappointment",
    "seed": "FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 tsx scripts/seed-emulator.ts",
    "test:rules": "vitest run lib/firebase/__tests__/firestore.rules.test.ts"
  }
}
```

**`--project demo-easyappointment`:** The `demo-` prefix is a Firebase convention for local-only project IDs that don't require a real Firebase project to be configured. This prevents the emulator from trying to connect to production. [ASSUMED — common community practice; verify against firebase CLI docs during implementation]

**`--kill-others-on-fail`:** If the emulator fails to start (e.g., port already in use, Java missing), the Next.js dev server also stops, making the failure visible rather than silently running against production Firebase.

### Admin SDK Emulator Auto-Connection

The Admin SDK auto-connects to emulators via environment variables — no code changes needed:

```bash
# Set these before running the seed script or any admin operation against the emulator
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
```

[VERIFIED: firebase.google.com/docs/emulator-suite/connect_firestore — "omit http:// from env var value"]

---

## Common Pitfalls

### Pitfall 1: connectXxxEmulator Called Multiple Times

**What goes wrong:** Calling `connectFirestoreEmulator(db, ...)` a second time throws `"Firestore has already been started and its settings can no longer be changed"`. In dev, React Strict Mode and Next.js fast refresh can cause module re-evaluation.
**Why it happens:** The emulator connection is a one-time configuration on the Firestore instance.
**How to avoid:** The module singleton pattern (file-level `const db = getFirestore(app)`) ensures emulator connection only happens once per process. The `getApps()` guard ensures the same app instance is reused on re-imports.
**Warning signs:** Error message containing "Firestore has already been started."

### Pitfall 2: Client SDK Imported in Server Components

**What goes wrong:** `firebase/auth`, `firebase/firestore`, and `firebase/storage` use browser APIs. Importing them from a Next.js Server Component (no `"use client"` directive) causes a build error or hydration failure.
**Why it happens:** Next.js App Router components are server-rendered by default.
**How to avoid:** `lib/firebase/client.ts` should only be imported from `"use client"` components, hooks, or client-side utilities. Never imported from `app/api/` route handlers (which should use `admin.ts`).
**Warning signs:** `ReferenceError: window is not defined` or `TypeError: Cannot read properties of undefined (reading 'length')` during build.

### Pitfall 3: Admin SDK in Client Bundle

**What goes wrong:** `firebase-admin` is a Node.js-only package. If it gets imported into the client bundle, the build fails.
**Why it happens:** Import chains can accidentally pull server-only code into client components.
**How to avoid:** Add `import 'server-only'` from the `server-only` package at the top of `admin.ts`. Next.js will throw a build error if this file is ever imported from a client component.
**Warning signs:** `Module not found: Can't resolve 'fs'` or similar Node-built-in errors in client build.

### Pitfall 4: Security Rules Not Reloaded in Tests

**What goes wrong:** `initializeTestEnvironment()` reads the rules file once at startup. Changes to `firestore.rules` during a test run require restarting the test suite.
**Why it happens:** `@firebase/rules-unit-testing` loads rules at initialization time.
**How to avoid:** Use `vitest watch` for development; each file change triggers a full suite re-run including new rule loading.
**Warning signs:** Rule changes have no effect; tests pass when they should fail.

### Pitfall 5: Java Not Installed

**What goes wrong:** `firebase emulators:start` fails with `Error: Failed to launch process. ${cmd}` when Java is not installed. The Firestore, Realtime Database, and Storage emulators are Java-based.
**Why it happens:** Java is a hard requirement for these emulators. It is not installed on the current dev machine.
**How to avoid:** Install Java JDK 21 (Wave 0 task). `sudo apt install default-jdk` on Ubuntu/Debian or download from adoptium.net.
**Warning signs:** `Error: Process java -jar ... exited with code 1` or `firebase emulators:start` exits immediately.

### Pitfall 6: Private Key Newline Escaping

**What goes wrong:** Admin SDK throws `Error: error:09091064:PEM routines:PEM_read_bio:no start line` when private key has `\n` as two characters instead of real newlines.
**Why it happens:** `.env.local` stores everything as strings. The PEM key has real newlines which get stored as `\n` escape sequences in some editors or CI systems.
**How to avoid:** Always apply `.replace(/\\n/g, '\n')` when reading `FIREBASE_PRIVATE_KEY` from process.env.
**Warning signs:** Admin SDK auth errors on initialization, not on individual operations.

### Pitfall 7: rules_version = '2' Missing

**What goes wrong:** Collection group queries fail silently. `{name=**}` recursive wildcard behaves differently under v1.
**Why it happens:** `rules_version = '2'` is required for correct recursive wildcard behavior.
**How to avoid:** First line of `firestore.rules` must always be `rules_version = '2';`.
**Warning signs:** Rules test failures for queries that should work, or unexpected permission errors in production.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `import firebase from 'firebase/app'` (namespaced) | `import { initializeApp } from 'firebase/app'` (modular) | Firebase v9 (2021), v11 removes compat | Old imports cause tree-shaking failures; v11 modular only |
| `firebase.firestore()` | `getFirestore(app)` | Firebase v9 | N/A — compat removed in v11 |
| `import admin from 'firebase-admin'` with `.firestore()` | `import { getFirestore } from 'firebase-admin/firestore'` | firebase-admin v11 | Subpackage imports for tree-shaking |
| `initializeTestApp()` (rules testing v1) | `initializeTestEnvironment()` (rules testing v2+) | @firebase/rules-unit-testing v2 | Old API is fully removed; using old pattern causes "not a function" errors |
| Firebase Hosting Functions emulation | Firebase Emulator Suite (standalone) | 2020+ | Full local development without network |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.9 |
| Config file | None yet — Wave 0 creates `my-app/vitest.config.ts` |
| Quick run command | `pnpm vitest run lib/firebase/__tests__/firestore.rules.test.ts` (from my-app/) |
| Full suite command | `pnpm vitest run` (from my-app/) |

**Note:** Rule tests require the Firestore emulator to be running (`firebase emulators:start`). They cannot run without the emulator. The test:rules script should be run with the emulator already started.

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SC-1 | Firebase project env vars wired in | smoke | `node -e "require('./lib/firebase/client')"` | ❌ Wave 0 |
| SC-2 | Firestore collections have agreed schema | manual | inspect emulator UI at localhost:4000 | — |
| SC-3 | Security rules deny unauthorized writes | unit | `pnpm vitest run lib/firebase/__tests__/firestore.rules.test.ts` | ❌ Wave 0 |
| SC-4 | Emulator suite runs all three services | smoke | `firebase emulators:exec "echo ok" --only auth,firestore,storage` | — |

### Wave 0 Gaps

- [ ] `my-app/vitest.config.ts` — vitest configuration with TypeScript support
- [ ] `my-app/lib/firebase/__tests__/firestore.rules.test.ts` — security rule test suite (5 test scenarios from D-05)
- [ ] Java JDK 21 installed — prerequisite for emulators (`sudo apt install default-jdk`)
- [ ] `firebase-tools` installed globally — prerequisite for `firebase init` and emulator runner

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Everything | ✓ | 20.20.2 | — |
| pnpm | Package management | ✓ | 10.28.0 | — |
| Java JDK 11+ | Firestore, Storage emulators | ✗ | — | **None — blocks emulator work** |
| firebase-tools (CLI) | `firebase init`, `firebase emulators:start` | ✗ | — | Install via `npm install -g firebase-tools` |
| firebase (npm) | Client SDK | ✗ not yet | — | Install via `pnpm add firebase` |
| firebase-admin (npm) | Admin SDK | ✗ not yet | — | Install via `pnpm add firebase-admin` |
| @firebase/rules-unit-testing | Rule tests | ✗ not yet | — | Install via `pnpm add -D @firebase/rules-unit-testing` |
| vitest | Test runner | ✗ not yet installed in project | — | Install via `pnpm add -D vitest` |

**Missing dependencies with no fallback:**
- Java JDK 11+ (recommended: 21) — required for Firestore and Storage emulators. Without Java, the emulator suite cannot start and all emulator-dependent tasks are blocked. Wave 0 must install Java before any other emulator work.

**Missing dependencies with fallback:**
- firebase-tools — can use `npx firebase-tools@latest` as fallback but global install is cleaner
- npm packages (firebase, firebase-admin, etc.) — all installable in Wave 0

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Partially (Phase 3 owns this) | Firebase Auth handles credential management |
| V3 Session Management | No (Phase 3) | Firebase Auth handles session persistence |
| V4 Access Control | Yes | Firestore Security Rules + Admin SDK as trust boundary |
| V5 Input Validation | Yes — for seed script and rule test data | TypeScript types enforce shape at compile time |
| V6 Cryptography | Yes — SMTP credential storage (D-02 schema has `smtpConfigEncrypted`) | AES-256 implementation deferred to Phase 6; field exists in schema now |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Client writes to `bookings` or `invites` directly | Tampering | `allow write: if false` in rules; Admin SDK is the only writer |
| Non-creator modifying another user's calendar | Tampering | `request.auth.uid == resource.data.creatorId` in rules |
| Unauthenticated read of invite-only calendar | Information Disclosure | `visibility == 'public'` check in read rule |
| Duplicate webhook processing (PAY-06) | Repudiation | `stripeEventId` field in bookings schema enables idempotency check (implemented in Phase 8) |
| Service account credentials in source control | Information Disclosure | `.env.local` in `.gitignore`; Vercel env vars dashboard for production |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `demo-` prefix in project ID tells Firebase emulator to skip real project validation | Emulator Configuration | Emulator may require `firebase login` and real project; workaround: `firebase use --add` with real project |
| A2 | `concurrently --kill-others-on-fail` correctly propagates emulator failure to kill Next.js process | Dev Script | Silent failure: Next.js runs but points at no emulator; could hit production Firebase if env var is wrong |
| A3 | Firebase auto-generates missing composite index hints in emulator console output | Composite Indexes | Developer misses missing index; queries silently return wrong results without error |
| A4 | OTP tokens hashed (SHA-256) for defense in depth — plaintext is functionally equivalent since token expires in 15 minutes | Security | Token exposure via Firestore rules misconfiguration would allow OTP replay within window |

---

## Open Questions

1. **firebase.json location — repo root vs my-app/**
   - What we know: `firebase init` places `firebase.json` at the directory where it's run. The repo has `my-app/` as the Next.js root and a separate `appoinment-scheduler/` package.
   - What's unclear: Should `firebase.json` live at the repo root (alongside both packages) or inside `my-app/`? The Firebase CLI looks for `firebase.json` in the current working directory.
   - Recommendation: Place `firebase.json` at the repo root. The `firebase emulators:start` command in `my-app/package.json` should use `cd .. && firebase emulators:start` or the working directory should be set to repo root. Alternatively, run `firebase init` from repo root and adjust paths.

2. **`server-only` package for admin.ts protection**
   - What we know: Next.js supports the `server-only` package which throws a build error if the file is imported in client bundles.
   - What's unclear: Whether it's already in the project dependencies.
   - Recommendation: Add `pnpm add server-only` and add `import 'server-only'` to the top of `admin.ts` as a safety guard. Cost: one tiny package.

3. **OTP token hashing algorithm**
   - What we know: CONTEXT.md says "lean toward hashed for defense in depth." No specific algorithm was chosen.
   - What's unclear: bcrypt vs SHA-256 HMAC for 6-digit numeric OTP.
   - Recommendation: SHA-256 HMAC with a server-side secret (not bcrypt — bcrypt is designed for passwords and is overkill for short-TTL 6-digit codes). The `crypto` Node.js built-in handles this without extra dependencies. This schema decision is noted now but implemented in Phase 7 (INV-03/04).

---

## Sources

### Primary (HIGH confidence)
- [firebase.google.com/docs/web/setup](https://firebase.google.com/docs/web/setup) — Client SDK initialization pattern, `initializeApp`, service getters
- [firebase.google.com/docs/admin/setup](https://firebase.google.com/docs/admin/setup) — Admin SDK initialization, credential strategies, `getApps()` guard
- [firebase.google.com/docs/emulator-suite/connect_firestore](https://firebase.google.com/docs/emulator-suite/connect_firestore) — `connectFirestoreEmulator()` pattern, `FIRESTORE_EMULATOR_HOST` env var
- [firebase.google.com/docs/emulator-suite/connect_auth](https://firebase.google.com/docs/emulator-suite/connect_auth) — `connectAuthEmulator()`, Admin SDK env var
- [firebase.google.com/docs/emulator-suite/install_and_configure](https://firebase.google.com/docs/emulator-suite/install_and_configure) — `firebase.json` structure, Java requirement, emulator ports
- [firebase.google.com/docs/firestore/security/get-started](https://firebase.google.com/docs/firestore/security/get-started) — Rules syntax, `rules_version = '2'`, deny-by-default
- [firebase.google.com/docs/firestore/security/test-rules-emulator](https://firebase.google.com/docs/firestore/security/test-rules-emulator) — `initializeTestEnvironment()`, `assertFails`/`assertSucceeds`, `withSecurityRulesDisabled`
- [firebase.google.com/docs/firestore/security/rules-conditions](https://firebase.google.com/docs/firestore/security/rules-conditions) — `resource.data` vs `request.resource.data`
- [firebase.google.com/docs/firestore/manage-data/transactions](https://firebase.google.com/docs/firestore/manage-data/transactions) — `runTransaction()` modular API, retry behavior
- [firebase.google.com/docs/firestore/query-data/index-overview](https://firebase.google.com/docs/firestore/query-data/index-overview) — When composite indexes are required
- npm registry — versions verified 2026-06-16: firebase@12.14.0, firebase-admin@14.0.0, @firebase/rules-unit-testing@5.0.1, concurrently@10.0.3, tsx@4.22.4
- github.com/firebase/firebase-js-sdk CHANGELOG — v4/v5 breaking changes for rules-unit-testing

### Secondary (MEDIUM confidence)
- [benmvp.com/blog/initializing-firebase-admin-node-sdk-env-vars/](https://www.benmvp.com/blog/initializing-firebase-admin-node-sdk-env-vars/) — Admin SDK env var pattern for Vercel, private key newline handling, `globalThis` cache
- [dev.to/peterj/how-to-configure-firebase-emulators-with-nextjs-6bi](https://dev.to/peterj/how-to-configure-firebase-emulators-with-nextjs-6bi) — Three `connectXxxEmulator` calls with `getApps()` guard
- [dev.to/0x80/how-to-write-clean-typed-firestore-code-37j2](https://dev.to/0x80/how-to-write-clean-typed-firestore-code-37j2) — TypeScript `CollectionReference<T>` typing, Timestamp alias pattern
- [medium.com/firebase-developers/seeding-firestore-data-in-emulator](https://medium.com/firebase-developers/seeding-firestore-data-in-emulator-c8485e797135) — Seed script structure, `withFunctionTriggersDisabled`, tsx execution

### Tertiary (LOW confidence)
- WebSearch results on `concurrently` + firebase — pattern verified conceptually but no authoritative 2025 source for exact flags

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm registry 2026-06-16
- Client SDK singleton pattern: HIGH — verified against official Firebase docs
- Admin SDK credential pattern: MEDIUM — Vercel env var approach verified via community source; `applicationDefault()` vs `cert()` distinction verified via official docs
- Security rules: HIGH — verified against official Firebase docs; rule syntax from docs
- Rules-unit-testing API: HIGH — verified against official docs and npm CHANGELOG
- Composite indexes: MEDIUM — index requirements verified via docs; specific `firestore.indexes.json` format verified via conceptual understanding; confirm during `firebase init`
- Emulator setup: HIGH — `firebase.json` structure verified against official docs; Java requirement confirmed
- TypeScript types: MEDIUM — pattern from community source; no official Firebase TypeScript typing guide exists

**Research date:** 2026-06-16
**Valid until:** 2026-09-16 (Firebase SDK is fairly stable; rules API is stable; major version bumps would invalidate)
