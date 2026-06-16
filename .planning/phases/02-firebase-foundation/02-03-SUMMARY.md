---
phase: 02-firebase-foundation
plan: "03"
subsystem: security
tags: [firebase, firestore, security-rules, access-control]
dependency_graph:
  requires:
    - 02-01 (firestore.rules stub — replaced here)
  provides:
    - firestore.rules (complete v1 security rules for all 5 collections)
  affects:
    - 02-05 (rules-unit-testing — tests will validate these rules)
    - all future plans that read/write Firestore from client SDK
tech_stack:
  added: []
  patterns:
    - "Admin SDK bypass pattern: allow write: if false on bookings/invites — server is the only writer"
    - "create vs update distinction: request.resource.data on create, resource.data on update/delete"
    - "Public calendar read: status == 'published' && visibility == 'public' dual-field gate"
key_files:
  created: []
  modified:
    - firestore.rules
decisions:
  - "bookings: all writes denied to client SDK — Admin SDK atomic transaction is the only path (enforces BOOK-05 race condition prevention)"
  - "invites: deny read+write to client SDK — OTP tokens must never be readable by any browser client"
  - "slots: public read (if true) — booking pages need slot availability without auth; creator writes still gated"
  - "calendars: dual-field public read gate (status AND visibility) — prevents draft or invite-only calendars from leaking"
metrics:
  duration: "2 minutes"
  completed_date: "2026-06-16"
  tasks_completed: 1
  files_created: 0
  files_modified: 1
---

# Phase 02 Plan 03: Firestore Security Rules Summary

**One-liner:** Complete v1 Firestore security rules replacing deny-all stub — 5 collections with public read gates, creator CRUD, Admin-SDK-only booking/invite writes, and correct create vs update resource data handling.

## What Was Built

Replaced the deny-all `firestore.rules` stub (from Plan 01) with production-grade security rules covering all 5 Firestore collections. Rules implement the access control decisions D-03 and D-04 from the phase context.

### Task 1: Write complete v1 Firestore security rules

- **users**: `request.auth != null && request.auth.uid == userId` — authenticated users can only read/write their own document
- **calendars**: Two read paths — public visitors can read when `status == 'published' && visibility == 'public'`; creator can read/update/delete when `request.auth.uid == resource.data.creatorId`; create rule uses `request.resource.data.creatorId` (resource.data is null on create)
- **slots**: `allow read: if true` — slot availability is public for booking pages; creator write gates use `request.resource.data.creatorId` on create and `resource.data.creatorId` on update/delete
- **bookings**: Creator + booker can read their own bookings; `allow write: if false` — all booking writes go through Admin SDK atomic transactions to prevent race conditions (BOOK-05)
- **invites**: `allow read, write: if false` — OTP tokens are never accessible from client SDK; Admin SDK handles all invite operations (INV-03, INV-04)

## Deviations from Plan

None — plan executed exactly as written.

## Threat Model Verification

| Threat ID | Disposition | Status |
|-----------|-------------|--------|
| T-2-03-01 | mitigate | `request.auth != null && request.auth.uid == userId` — unauthenticated request has null auth, fails |
| T-2-03-02 | mitigate | `request.auth.uid == resource.data.creatorId` on update/delete; `request.resource.data.creatorId` on create |
| T-2-03-03 | mitigate | Public read requires `visibility == 'public'`; invite-only calendars fail this; creator read requires auth |
| T-2-03-04 | mitigate | `allow write: if false` on bookings; Admin SDK bypasses rules and is the only writer |
| T-2-03-05 | mitigate | `allow read, write: if false` on invites; Admin SDK handles OTP (INV-03/INV-04) |
| T-2-03-06 | accept/mitigate | Create rule checks `request.auth.uid == request.resource.data.creatorId`; attacker can only set their own uid |

## Known Stubs

None — this plan's sole output (`firestore.rules`) is complete and production-ready.

The prior stub (deny-all) has been fully replaced. `storage.rules` remains a deny-all stub but is out of scope for this plan.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 4aaea9c | feat(02-03): implement complete v1 Firestore security rules |

## Self-Check: PASSED

- `firestore.rules` exists: FOUND
- Commit `4aaea9c` exists: FOUND (verified via git log)
- `rules_version = '2';` is first line: CONFIRMED
- All 5 match blocks present: CONFIRMED (grep -c each = 1)
- `allow write: if false` on bookings: CONFIRMED
- `allow read, write: if false` on invites: CONFIRMED
- `request.resource.data.creatorId` appears 2 times (create rules): CONFIRMED
- File is 71 lines (> 40): CONFIRMED
