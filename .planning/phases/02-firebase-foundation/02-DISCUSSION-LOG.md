# Phase 2: Firebase Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-16
**Phase:** 02-firebase-foundation
**Mode:** auto (user: "make decisions independently and go to planning")
**Areas discussed:** Slot storage location, Schema completeness, Security rules scope, Emulator workflow depth, Firebase SDK wiring

---

## Pre-Discussion

**User question:** "Would it be better to use a SQL DB instead like NeonDB Postgres or Convex?"

| Option | Description | Selected |
|--------|-------------|----------|
| Firebase/Firestore | Current stack decision — real-time + auth + storage integrated | ✓ |
| Supabase (Postgres + Realtime) | SQL power + real-time, strong alternative | |
| NeonDB alone | Postgres only — no built-in real-time or auth | |
| Convex | Reactive queries, TypeScript-native, newer ecosystem | |

**User's choice:** Stay with Firebase — "let's stick with firebase"

---

## Slot Storage Location

| Option | Description | Selected |
|--------|-------------|----------|
| Top-level `slots` collection | Enables compound queries (calendarId + status + orderBy); required for BOOK-02 and PAY-03 | ✓ |
| Subcollection `calendars/{id}/slots` | Natural hierarchy but forces collection group queries; makes cross-calendar ops harder | |

**Auto-selected:** Top-level collection

---

## Schema Completeness

| Option | Description | Selected |
|--------|-------------|----------|
| Full upfront (all 5 collections) | Single source of truth; all 11 remaining phases write against this contract | ✓ |
| Lean now, extend per-phase | Less upfront work but guarantees schema drift and migration pain across phases | |

**Auto-selected:** Full upfront

---

## Security Rules Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full v1 ruleset now | Done once, tested once, correct from the start; avoids rushing rules under phase pressure | ✓ |
| Minimal now, expand per-phase | Simpler to start but security holes between phases; rules added under time pressure are error-prone | |

**Auto-selected:** Full v1 ruleset with test suite

---

## Emulator Workflow Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Enhanced (concurrent dev script + seed data) | All subsequent phases start with working test data; worth the setup investment | ✓ |
| Basic (firebase.json + manual start) | Faster now, slower every day after | |

**Auto-selected:** Enhanced

---

## Claude's Discretion

- OTP hashing strategy (plaintext vs hashed 6-digit code)
- Exact Firestore index definitions
- `concurrently` script flags

## Deferred Ideas

- Supabase/NeonDB/Convex as alternatives — considered and declined; Firebase confirmed
- Google OAuth app publication — pre-Phase-10 blocker (noted for STATE.md)
