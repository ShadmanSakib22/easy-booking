# Phase 1: Package - Context

**Gathered:** 2026-06-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden the `react-easy-appointments` npm package for production SaaS use. Deliverables: UTC-correct slot times rendered in the visitor's local timezone, fixed date-range limiting with constrained navigation, real-time slot status via external prop, slot selection event emission, and SSR safety under Next.js. The SaaS website does not begin until this phase is complete.

</domain>

<decisions>
## Implementation Decisions

### Slot Time Format (PKG-01)

- **D-01:** Replace `startTime: string` and `endTime: string` on the `Slot` type with `startUtc: string` and `endUtc: string` — full UTC ISO 8601 timestamp strings (e.g., `"2026-05-19T09:00:00Z"`). This is a breaking API change.
- **D-02:** Keep `date: string` (UTC date key, e.g., `"2026-05-19"`) on the `Slot` type as an explicit calendar-grid grouping key. It must be derived from `startUtc`'s UTC date, not local date, so grid assignment is consistent regardless of visitor timezone.
- **D-03:** Rendering components use `Intl.DateTimeFormat` with `timeZone: undefined` (system default) to convert `startUtc`/`endUtc` into the visitor's local display time. No timezone prop needed — browser handles it automatically.

### Date Range (PKG-02)

- **D-04:** Add `startDate: string` and `endDate: string` props to `<Calendar>` (ISO date strings, e.g., `"2026-05-19"`). These are optional; omitting them keeps current unbounded behavior.
- **D-05:** When `startDate`/`endDate` are set, the Toolbar's prev/next navigation buttons are disabled (not hidden) at the boundary: prev is disabled when the current view already shows `startDate`'s month/week; next is disabled when the current view already shows `endDate`'s month/week.
- **D-06:** On mount, if `startDate` is set, the calendar initializes its view to the month/week containing `startDate` rather than today.
- **D-07:** Dates within the visible grid that fall outside the `startDate`–`endDate` range are visually greyed out and non-interactive (no slot clicks).

### Slot Status — 'pending' (PKG-03)

- **D-08:** Add `'pending'` to `SlotStatus` now: `'available' | 'pending' | 'booked' | 'unavailable'`. Avoids a second breaking API change in Phase 8 (PAY-03 requires pending state for in-progress Stripe checkout). Visual treatment of pending slots is Claude's discretion.

### Real-time State (PKG-03)

- **D-09:** No package changes needed for real-time updates — the host app updates the `slots` prop from a Firestore `onSnapshot` listener and React re-renders. The package already accepts `slots` as a reactive prop. Confirmed working pattern.

### Slot Selection Events (PKG-04)

- **D-10:** `onSlotClick` callback already exists on `<Calendar>` and fires with the clicked `Slot`. No API change needed — confirmed sufficient for the SaaS to intercept and trigger its booking modal.

### SSR Safety (PKG-05)

- **D-11:** Claude's discretion on implementation. Fix `getEffectiveTheme()` to guard `window.matchMedia` with `typeof window !== 'undefined'`; server-side renders default to `'light'`. Move the OS preference change listener into a `useEffect` with proper cleanup so it never runs on server. Goal: zero hydration mismatch errors in Next.js browser console.

### Claude's Discretion

- Exact visual styling of `'pending'` slots (colour, pattern, opacity)
- SSR fix implementation details (guard placement, effect cleanup pattern)
- Whether to export a `deriveDate(startUtc: string): string` utility helper for host apps that need to generate the `date` grouping key

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Package Requirements
- `.planning/REQUIREMENTS.md` §PKG-01–PKG-05 — Five package requirements with acceptance criteria

### Roadmap
- `.planning/ROADMAP.md` §Phase 1 — Success criteria (5 items) that define done for this phase

### Existing Source
- `appoinment-scheduler/packages/react-easy-appointments/src/types/index.ts` — Current `Slot`, `SlotStatus`, `CalendarProps` types (will be modified)
- `appoinment-scheduler/packages/react-easy-appointments/src/components/Calendar/Calendar.tsx` — `CalendarRoot` and `CalendarProps` (add `startDate`, `endDate` props here)
- `appoinment-scheduler/packages/react-easy-appointments/src/components/Calendar/CalendarContext.ts` — Context type (add `startDate`, `endDate` if needed downstream)
- `appoinment-scheduler/packages/react-easy-appointments/src/hooks/useSlotsByDate.ts` — Groups slots by `date` key (used by MonthView and WeekView)
- `appoinment-scheduler/packages/react-easy-appointments/src/components/MonthView/MonthView.tsx` — Renders month grid (add out-of-range greying here)
- `appoinment-scheduler/packages/react-easy-appointments/src/components/Toolbar/` — Navigation buttons (add disabled state for date range boundary)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useSlotsByDate(slots)` hook: already groups `Slot[]` by `slot.date` key — will work unchanged after D-02 as long as `date` stays on the type
- `date-fns`: already a dependency (`addMonths`, `subMonths`, `startOfMonth`, `eachDayOfInterval`, etc.) — use for date boundary comparisons in Toolbar
- `onSlotClick` / `onBook` callbacks: already wired through `CalendarContext` to all child components

### Established Patterns
- Compound component pattern: `<Calendar.Toolbar>`, `<Calendar.MonthView>`, etc. — new props flow through `CalendarRoot` → `CalendarContext` → children
- Headless mode: components skip class names when `headless={true}` — any new UI (pending slot styling, greyed dates) must respect this
- `Intl`-friendly: `locale` prop already passed through context for `date-fns` locale; follow the same pattern for display formatting

### Integration Points
- `appoinment-scheduler/apps/web/` — demo app that imports the package; use this to manually verify SSR behavior and date-range navigation before shipping
- The SaaS (`my-app/`) will import this package in Phase 4+ — the new `startUtc`/`endUtc` field names become the contract all future phases write to Firestore

</code_context>

<specifics>
## Specific Ideas

- "Do what's best" on SSR fix and Slot field naming — Claude has full discretion on implementation details
- Keep `date` as explicit grouping key (not derived at render time) for grid performance

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-package*
*Context gathered: 2026-06-16*
