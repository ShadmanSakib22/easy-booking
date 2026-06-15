# Phase 1: Package - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-16
**Phase:** 01-package
**Areas discussed:** Slot time format (UTC), Date range visual behavior, 'pending' status timing, SSR fix approach

---

## Slot Time Format (UTC)

| Option | Description | Selected |
|--------|-------------|----------|
| UTC ISO timestamps | Replace startTime/endTime with startUtc/endUtc full ISO strings | ✓ |
| Keep string format, document as UTC | Keep date+startTime+endTime but treat as UTC in rendering | |

**User's choice:** Change to UTC ISO timestamps (breaking API change accepted)
**Notes:** Keep `date` as explicit grouping key alongside UTC timestamps — Claude's discretion on field naming.

---

## Date Range Visual Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Disable navigation outside range | Toolbar prev/next buttons disabled at boundaries | ✓ |
| Grey out out-of-range dates | Show all months, grey non-interactive dates outside range | |
| Hide out-of-range months | Only show months within the range | |

**User's choice:** Disable navigation outside the range
**Notes:** Calendar initializes to startDate's month on mount (also Claude's discretion per D-06). Out-of-range dates within a visible boundary month are greyed and non-interactive (D-07).

---

## 'pending' Status — Add Now or Phase 8?

| Option | Description | Selected |
|--------|-------------|----------|
| Add pending now (Phase 1) | Extend SlotStatus with 'pending' now; avoids second breaking change | ✓ |
| Wait until Phase 8 | Add only when paid booking is implemented | |

**User's choice:** Add pending status now in Phase 1

---

## SSR Fix Approach

| Option | Description | Selected |
|--------|-------------|----------|
| typeof window guard | Add guard, default server render to 'light' | |
| useEffect + state | Move theme resolution into effect so server always renders light | |
| Claude's discretion | Do what's best | ✓ |

**User's choice:** Claude's discretion — "do what's best"

---

## Claude's Discretion

- SSR fix implementation details
- Exact visual styling for 'pending' slots
- Whether to export a `deriveDate()` utility for host apps
- Field naming specifics (startUtc/endUtc chosen by Claude)

## Deferred Ideas

None.
