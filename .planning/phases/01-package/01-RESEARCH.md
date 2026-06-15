# Phase 1: Package (react-easy-appointments) - Research

**Researched:** 2026-06-16
**Domain:** React calendar widget — UTC timestamps, date-range navigation, SSR safety, TypeScript types
**Confidence:** HIGH (all findings verified against actual source files; no external library unknowns)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Replace `startTime: string` and `endTime: string` on the `Slot` type with `startUtc: string` and `endUtc: string` — full UTC ISO 8601 timestamp strings (e.g., `"2026-05-19T09:00:00Z"`). This is a breaking API change.
- **D-02:** Keep `date: string` (UTC date key, e.g., `"2026-05-19"`) on the `Slot` type as an explicit calendar-grid grouping key. It must be derived from `startUtc`'s UTC date, not local date, so grid assignment is consistent regardless of visitor timezone.
- **D-03:** Rendering components use `Intl.DateTimeFormat` with `timeZone: undefined` (system default) to convert `startUtc`/`endUtc` into the visitor's local display time. No timezone prop needed — browser handles it automatically.
- **D-04:** Add `startDate: string` and `endDate: string` props to `<Calendar>` (ISO date strings, e.g., `"2026-05-19"`). These are optional; omitting them keeps current unbounded behavior.
- **D-05:** When `startDate`/`endDate` are set, the Toolbar's prev/next navigation buttons are disabled (not hidden) at the boundary: prev is disabled when the current view already shows `startDate`'s month/week; next is disabled when the current view already shows `endDate`'s month/week.
- **D-06:** On mount, if `startDate` is set, the calendar initializes its view to the month/week containing `startDate` rather than today.
- **D-07:** Dates within the visible grid that fall outside the `startDate`–`endDate` range are visually greyed out and non-interactive (no slot clicks).
- **D-08:** Add `'pending'` to `SlotStatus` now: `'available' | 'pending' | 'booked' | 'unavailable'`. Avoids a second breaking API change in Phase 8 (PAY-03).
- **D-09:** No package changes needed for real-time updates — the host app updates the `slots` prop from a Firestore `onSnapshot` listener and React re-renders. Confirmed working pattern.
- **D-10:** `onSlotClick` callback already exists on `<Calendar>` and fires with the clicked `Slot`. No API change needed.
- **D-11:** Fix `getEffectiveTheme()` to guard `window.matchMedia` with `typeof window !== 'undefined'`; server-side renders default to `'light'`. Move the OS preference change listener into a `useEffect` with proper cleanup so it never runs on server.

### Claude's Discretion

- Exact visual styling of `'pending'` slots (colour, pattern, opacity)
- SSR fix implementation details (guard placement, effect cleanup pattern)
- Whether to export a `deriveDate(startUtc: string): string` utility helper for host apps that need to generate the `date` grouping key

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PKG-01 | Package stores and displays all slot times in UTC internally; renders in visitor's local machine time via `Intl` | D-01 through D-03; Intl.DateTimeFormat pattern documented in §Architecture Patterns |
| PKG-02 | Package accepts a fixed date range (start date, end date) and only renders dates within that range | D-04 through D-07; date-fns boundary helpers documented in §Architecture Patterns |
| PKG-03 | Package supports real-time slot status updates (available / pending / booked) via an external state prop | D-08 and D-09; already a reactive prop; only `pending` status addition needed |
| PKG-04 | Package emits slot selection events that the host app can intercept to trigger booking flow | D-10; `onSlotClick` already exists; no changes needed beyond verifying the callback signature |
| PKG-05 | Package renders correctly on both server (SSR shell) and client (hydration) without mismatch errors | D-11; guard pattern documented in §Architecture Patterns |
</phase_requirements>

---

## Summary

The `react-easy-appointments` package is a compound-component React calendar with MonthView, WeekView, Toolbar, and supporting hooks. The current slot model stores times as local `"HH:MM"` strings (`startTime`/`endTime`) which are fundamentally incompatible with a global SaaS — two users in different timezones would see the same wall-clock string but interpret it as different instants. All five phase requirements address this and related production readiness gaps.

The good news: the architecture is clean and well-factored. Every change flows through a single clear path — `CalendarRoot` props → `CalendarContext` → child components. Breaking changes are confined to `src/types/index.ts` (one file), with cascading read-site updates in `TimeSlotBlock`, `MonthCell`, `WeekView`, and two test helper fixtures. The SSR bug is already partially guarded in `Calendar.tsx` line 38 but leaks through the `useEffect` at line 51 (bare `window.matchMedia` call with no guard). The date-range feature is a pure addition with no existing logic to remove.

**Primary recommendation:** Make all five changes in a single major version bump (2.0.0). The `startTime`/`endTime` → `startUtc`/`endUtc` rename is already breaking; ship all breaking changes together rather than in two separate versions.

---

## Standard Stack

### Already Present (no installation needed)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| date-fns | ^3 (peer dep) | Date arithmetic and formatting | Already used in MonthView, WeekView, Toolbar, useCalendarState. Use `isBefore`, `isAfter`, `startOfMonth`, `endOfMonth`, `startOfWeek`, `endOfWeek`, `parseISO`. |
| vitest | ^2 (dev dep) | Test runner | Config at `vitest.config.ts`; setup file at `tests/setup.ts`; jsdom environment. |
| @testing-library/react | ^16 (dev dep) | Component rendering in tests | Already used in all existing test files. |
| @testing-library/user-event | ^14 (dev dep) | User interaction simulation | Already used in Toolbar.test.tsx and MonthView.test.tsx. |
| TypeScript | ~6.0.2 (dev dep) | Type safety | Strict mode. |

**No new dependencies needed for this phase.** All required tools are already in `devDependencies` or `peerDependencies`.

[VERIFIED: appoinment-scheduler/packages/react-easy-appointments/package.json]

---

## Architecture Patterns

### Compound Component Data Flow

All new props follow the existing pattern:

```
CalendarRoot (props: startDate, endDate)
  → useCalendarState(defaultView, startDate)   ← initializes currentDate to startDate's month
  → CalendarContext.Provider (value: { ..., startDate, endDate })
       → Toolbar          reads startDate/endDate to disable prev/next
       → MonthView        reads startDate/endDate to grey out-of-range cells
       → WeekView         reads startDate/endDate to grey out-of-range cells
```

[VERIFIED: src/components/Calendar/Calendar.tsx, CalendarContext.ts]

### Pattern 1: UTC ISO Timestamp Display (PKG-01)

**What:** Replace `startTime`/`endTime` ("HH:MM") with `startUtc`/`endUtc` (full ISO string "2026-05-19T09:00:00Z"). Render using `Intl.DateTimeFormat` with no explicit `timeZone` — the browser supplies its own timezone automatically.

**Key insight:** `new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' })` without a `timeZone` option uses the runtime's local timezone. On the server (Node.js), this would be the server's timezone — which causes hydration mismatch because the server renders "9:00 AM EST" but the Australian visitor's browser shows "12:00 AM AEST". The fix is to suppress time rendering on the server entirely (render a stable placeholder) and let the client fill in the real local time after hydration.

**The two-step SSR-safe time display:**

```typescript
// src/utils/formatSlotTime.ts

// Returns a stable server-side placeholder that won't mismatch.
// On the client, returns the visitor's local time string.
export function formatSlotTime(utcIso: string, locale: string): string {
  if (typeof window === 'undefined') {
    // Server: return empty string or a non-time placeholder.
    // Do NOT return a formatted time — it would be in the server's TZ.
    return ''
  }
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    // timeZone intentionally absent → uses visitor's system timezone
  }).format(new Date(utcIso))
}
```

Then in TimeSlotBlock and MonthCell, use `formatSlotTime(slot.startUtc, locale)` instead of `slot.startTime`.

**Alternative approach — `suppressHydrationWarning`:** React's `suppressHydrationWarning` prop on a span suppresses the mismatch warning for that node. This is simpler but hides the problem rather than solving it. Prefer the empty-string approach: it renders a skeleton-like blank on SSR and fills in on hydration, which is more honest and avoids the React warning in Next.js production builds.

**`date` field derivation:** The `date` grouping key must come from the UTC date of `startUtc`, not local date. A slot at "2026-05-19T23:00:00Z" is in May 19 UTC, but in UTC+2 it would be May 20 locally. The `date` field MUST always be the UTC date so `useSlotsByDate` is consistent for all visitors:

```typescript
// src/utils/deriveDate.ts
// Export this as a public utility so host apps can generate the date key
// when building Slot objects from their Firestore data.
export function deriveDate(startUtc: string): string {
  // "2026-05-19T23:00:00Z" → "2026-05-19"
  return startUtc.slice(0, 10)
}
```

[VERIFIED: src/hooks/useSlotsByDate.ts — groups by slot.date, not derived from time]

### Pattern 2: Date Range Navigation Constraints (PKG-02)

**Boundary detection logic for Toolbar:**

```typescript
// Inside Toolbar.tsx — reads startDate/endDate from context
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, isBefore, isAfter, parseISO } from 'date-fns'

// isPrevDisabled: current view's first day <= startDate
const isPrevDisabled = startDate
  ? !isAfter(
      view === 'month' ? startOfMonth(currentDate) : startOfWeek(currentDate, { weekStartsOn }),
      parseISO(startDate)
    )
  : false

// isNextDisabled: current view's last day >= endDate
const isNextDisabled = endDate
  ? !isBefore(
      view === 'month' ? endOfMonth(currentDate) : endOfWeek(currentDate, { weekStartsOn }),
      parseISO(endDate)
    )
  : false
```

Apply to buttons: `<button disabled={isPrevDisabled} ...>`.

**Initialization at startDate's month (D-06):**

`useCalendarState` currently initializes `currentDate` to `new Date()`. Change the initializer to accept an optional `startDate` string:

```typescript
// src/hooks/useCalendarState.ts
export function useCalendarState(defaultView: CalendarView = 'month', startDate?: string) {
  const [view, setView] = useState<CalendarView>(defaultView)
  const [currentDate, setCurrentDate] = useState(() =>
    startDate ? parseISO(startDate) : new Date()
  )
  // ... rest unchanged
}
```

Then in CalendarRoot: `const state = useCalendarState(defaultView, startDate)`.

**Out-of-range date greying in MonthView (D-07):**

MonthView already computes every day in the grid via `eachDayOfInterval`. Pass `startDate`/`endDate` through context, then in `MonthCell`, add an `isOutOfRange` prop:

```typescript
// In MonthView.tsx
const rangeStart = startDate ? parseISO(startDate) : null
const rangeEnd = endDate ? parseISO(endDate) : null

// In the days.map():
const isOutOfRange = Boolean(
  (rangeStart && isBefore(day, rangeStart)) ||
  (rangeEnd && isAfter(day, rangeEnd))
)

<MonthCell
  key={key}
  date={day}
  slots={isOutOfRange ? [] : (slotsByDate[key] ?? [])}
  isCurrentMonth={isSameMonth(day, currentDate)}
  isToday={isToday(day)}
  isOutOfRange={isOutOfRange}
/>
```

In MonthCell, when `isOutOfRange` is true: add a CSS class `rea-month-cell--out-of-range`, and skip rendering the slot buttons entirely (pass `slots={[]}` or guard in the map). The cell date number still renders so the grid fills correctly.

WeekView must apply the same guard: slots for days outside the range are filtered out so no TimeSlotBlock renders on out-of-range days.

[VERIFIED: src/components/MonthView/MonthView.tsx — eachDayOfInterval pattern confirmed]

### Pattern 3: 'pending' SlotStatus (PKG-03)

**Type change:** `SlotStatus = 'available' | 'pending' | 'booked' | 'unavailable'`

**Rendering:** `pending` slots should be non-interactive (disabled) but visually distinct from `booked`. Recommended visual treatment: amber/yellow tone to signal "someone is checking out, hold on". This communicates transience — the slot might open up again if payment is abandoned.

```css
/* In base.css — add pending tokens */
--rea-slot-pending-bg: #d97706;       /* amber-600 */
--rea-slot-pending-text: #ffffff;
--rea-slot-pending-bg-hover: #b45309; /* amber-700 */
```

CSS class `.rea-slot--pending` follows existing `.rea-slot--booked` pattern.

**Interaction:** Pending slots are disabled (same as booked). In TimeSlotBlock and MonthCell, the existing guard `slot.status === 'available' && onSlotClick(slot)` already handles this correctly — pending is not 'available' so clicks are swallowed. The `disabled` prop on the button also blocks keyboard activation.

**aria-label update:** The aria-label currently reads `${slot.startTime}–${slot.endTime}`. After the UTC rename, update to use the formatted local time string from `formatSlotTime`.

[VERIFIED: src/components/WeekView/TimeSlotBlock.tsx, src/components/MonthView/MonthCell.tsx]

### Pattern 4: onSlotClick Verification (PKG-04)

No code changes needed. The existing `onSlotClick: (slot: Slot) => void` in `CalendarProps` already fires when an available slot is clicked. The SaaS host app wires it like:

```typescript
<Calendar
  slots={slots}
  onSlotClick={(slot) => {
    setSelectedSlot(slot)
    setBookingModalOpen(true)
  }}
>
```

The full `Slot` object (including `id`, `date`, `startUtc`, `endUtc`, `status`) is passed to the callback, giving the host app all it needs to start a booking flow.

**Verification task:** Confirm the existing tests in MonthView.test.tsx and WeekView.test.tsx cover `onSlotClick` firing. They do (confirmed in test file read). New tests must update fixture `Slot` shapes to use `startUtc`/`endUtc` after the type change.

[VERIFIED: src/components/Calendar/Calendar.tsx line 9; tests/MonthView.test.tsx]

### Pattern 5: SSR Safety Fix (PKG-05)

**Current bug location:** `Calendar.tsx` lines 51–56 — the `useEffect` body calls `window.matchMedia` directly without a guard. On SSR (Node.js) `useEffect` does not run, so this specific call is actually safe. However, `getEffectiveTheme()` is called synchronously at render time (line 46) and already has a guard at line 38–43. The current guard is actually present in `getEffectiveTheme()`. The real SSR risk is the `useEffect` call to `window.matchMedia` if something changes the execution model (e.g., React Server Components calling it). The safest fix is to make the guard belt-and-suspenders:

```typescript
// BEFORE (Calendar.tsx line 51):
useEffect(() => {
  if (theme !== 'auto') return
  const mq = window.matchMedia('(prefers-color-scheme: dark)')  // ← bare call, no guard
  ...
}, [theme, state])

// AFTER:
useEffect(() => {
  if (theme !== 'auto') return
  if (typeof window === 'undefined' || !window.matchMedia) return  // ← explicit guard
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = () => { /* force re-render */ }
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}, [theme])  // ← remove `state` from deps — it causes infinite re-render
```

**The `state` dependency bug:** The existing `useEffect` depends on `[theme, state]`. The `state` object from `useCalendarState` is recreated on every render (it's not memoized), so this dependency causes the effect to re-run every render — which is a bug independent of SSR. Remove `state` from the dependency array. The handler doesn't need `state`; it just needs to trigger a re-render. The cleanest approach is to track `effectiveTheme` in state:

```typescript
// Recommended refactor for Calendar.tsx:
const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
  if (theme === 'auto') return 'light' // server default
  return theme
})

useEffect(() => {
  if (theme !== 'auto') {
    setResolvedTheme(theme)
    return
  }
  if (typeof window === 'undefined' || !window.matchMedia) return
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  setResolvedTheme(mq.matches ? 'dark' : 'light')
  const handler = (e: MediaQueryListEvent) => setResolvedTheme(e.matches ? 'dark' : 'light')
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}, [theme])
```

This pattern: (1) always renders 'light' on server to avoid hydration mismatch, (2) immediately resolves the real theme in a `useEffect` (client-only), (3) reacts to OS theme changes correctly, (4) has a clean dependency array.

[VERIFIED: src/components/Calendar/Calendar.tsx lines 36–56; SSR safety pattern is ASSUMED standard React practice]

### Anti-Patterns to Avoid

- **Deriving `date` from local time:** `new Date(startUtc).toLocaleDateString('en-CA')` will give the local date, not UTC date. In timezones west of UTC, this will shift late-night UTC slots to the previous day. Always use `startUtc.slice(0, 10)` or `startUtc.substring(0, 10)` for UTC date extraction.
- **Using `date-fns/format` for display times:** `date-fns` works in local time by default. `format(new Date(utcIso), 'h:mm a')` produces local time — but is not SSR-safe (server vs. client TZ mismatch). Use `Intl.DateTimeFormat` with the empty-string server guard.
- **Using `date-fns-tz`:** Don't add this dependency — `Intl.DateTimeFormat` achieves the same with zero extra package weight.
- **Hiding nav buttons instead of disabling them:** D-05 is explicit: disabled, not hidden. Hidden buttons cause layout shift; disabled buttons preserve layout and communicate affordance.
- **Forgetting WeekView's slot filter:** WeekView filters slots by `s.date === dateStr && s.startTime === hourStr`. After the rename, `s.startTime` no longer exists. WeekView must be updated to filter using a UTC-hour comparison derived from `s.startUtc`.
- **Exporting `CalendarTheme` without updating it:** `CalendarTheme = 'light' | 'dark' | 'auto'` is already correct. No change needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date boundary comparison | Custom date math | `date-fns` `isBefore`/`isAfter`/`startOfMonth`/`endOfMonth` | Already a peer dep; handles edge cases (month boundaries, DST) correctly |
| UTC date extraction from ISO string | Date parsing | `startUtc.slice(0, 10)` (string slice, not Date object) | A `Date` object conversion goes through local timezone; string slice does not |
| Locale-aware time formatting | Custom formatter | `Intl.DateTimeFormat` | Native browser API; no dependency; automatically uses visitor's locale and timezone |

---

## File-by-File Change Summary

### Files that MUST change

| File | What Changes | Why |
|------|-------------|-----|
| `src/types/index.ts` | Remove `startTime`, `endTime`; add `startUtc`, `endUtc` on `Slot`. Add `'pending'` to `SlotStatus`. | D-01, D-02, D-08 — breaking API changes |
| `src/components/Calendar/Calendar.tsx` | Add `startDate?`, `endDate?` to `CalendarProps`. Pass them into context. Refactor `getEffectiveTheme`/`useEffect` into state-based pattern. Pass `startDate` to `useCalendarState`. | D-04, D-06, D-11 |
| `src/components/Calendar/CalendarContext.ts` | Add `startDate?: string`, `endDate?: string` to `CalendarContextValue`. | Required for Toolbar/MonthView/WeekView to read range |
| `src/hooks/useCalendarState.ts` | Accept optional `startDate` param; initialize `currentDate` from `parseISO(startDate)` if provided. | D-06 |
| `src/components/Toolbar/Toolbar.tsx` | Read `startDate`/`endDate` from context; compute `isPrevDisabled`/`isNextDisabled`; apply `disabled` to buttons. | D-05 |
| `src/components/MonthView/MonthView.tsx` | Pass `isOutOfRange` to `MonthCell`; filter slots to `[]` for out-of-range days. | D-07 |
| `src/components/MonthView/MonthCell.tsx` | Accept `isOutOfRange` prop; apply `rea-month-cell--out-of-range` class; suppress slots when out-of-range. Update `aria-label` to use `formatSlotTime`. Update `startTime` references to `startUtc`. | D-01, D-07 |
| `src/components/WeekView/WeekView.tsx` | Replace `s.startTime === hourStr` filter with UTC-hour comparison from `startUtc`. Apply out-of-range day suppression. | D-01, D-07 |
| `src/components/WeekView/TimeSlotBlock.tsx` | Replace `slot.startTime`/`slot.endTime` display and aria-label with `formatSlotTime(slot.startUtc)`. Add `rea-slot--pending` CSS class support. | D-01, D-08 |
| `src/styles/base.css` | Add `--rea-slot-pending-bg`, `--rea-slot-pending-text` tokens. Add `.rea-slot--pending` rule. Add `.rea-month-cell--out-of-range` rule. | D-07, D-08 |

### New files to create

| File | Purpose |
|------|---------|
| `src/utils/formatSlotTime.ts` | SSR-safe `Intl.DateTimeFormat` wrapper; returns `''` on server |
| `src/utils/deriveDate.ts` | `deriveDate(startUtc: string): string` — extracts UTC date key for host apps |

### Files that update export surface

| File | What Changes |
|------|-------------|
| `src/index.ts` | Export `deriveDate` utility (optional per D-11 discretion area) |
| `package.json` | Bump version from `1.0.0` to `2.0.0` (semver: breaking API change) |

### Files that MUST update test fixtures

| File | What Changes |
|------|-------------|
| `tests/types.test.ts` | Update `Slot` fixture to use `startUtc`/`endUtc`; update `SlotStatus` expectation to include `'pending'` |
| `tests/MonthView.test.tsx` | Update slot fixtures; add date-range tests |
| `tests/WeekView.test.tsx` | Update slot fixtures |
| `tests/Toolbar.test.tsx` | Add disabled-button tests for date range boundaries |
| `tests/Calendar.test.tsx` | Add SSR theme test (render with `theme="auto"`, confirm no crash) |

---

## Common Pitfalls

### Pitfall 1: WeekView Slot Matching After UTC Rename

**What goes wrong:** WeekView currently finds slots with `s.date === dateStr && s.startTime === hourStr`. After removing `startTime`, this filter breaks silently — no slots render.

**Why it happens:** The slot-to-cell matching in WeekView is hour-based, mapping slots to grid rows. The old `startTime` string ("09:00") was directly comparable to `hourStr`. The new `startUtc` is a full ISO string and requires UTC hour extraction.

**How to avoid:** Extract the UTC hour from `startUtc` using `new Date(s.startUtc).getUTCHours()` (this is safe server-side because we only use it to determine the grid position in UTC, not local display). Compare to `hour` (the integer from the HOURS array). Do NOT use `getHours()` — that's local time.

**Warning signs:** WeekView renders but shows no slots even when slots exist for that week.

### Pitfall 2: `date` Field UTC vs Local Mismatch

**What goes wrong:** Host app generates `date` field using `new Date(startUtc).toLocaleDateString('en-CA')`. In a UTC-5 timezone, a slot at "2026-05-20T02:00:00Z" has local date May 19 but UTC date May 20. The `date` field says "2026-05-19" but `useSlotsByDate` puts it in the May 19 bucket. MonthView renders it on May 19. A US visitor sees the slot on May 19; a UTC visitor sees nothing on May 19 (slot.date is "2026-05-19" but the UTC date would be "2026-05-20" for a UTC+6 visitor creating the slot).

**Why it happens:** Inconsistent derivation of `date` — sometimes local, sometimes UTC.

**How to avoid:** Always set `date: startUtc.slice(0, 10)` (UTC date). Export `deriveDate` from the package. Document prominently in README.

### Pitfall 3: SSR Hydration Mismatch on Time Display

**What goes wrong:** Server renders "9:00 AM" (Node.js runs in UTC on Vercel), client renders "5:00 PM" (Australian visitor). React warns "Text content did not match" in production.

**Why it happens:** `Intl.DateTimeFormat` without explicit `timeZone` uses runtime's local timezone. Server and client are different runtimes.

**How to avoid:** Return `''` from `formatSlotTime` when `typeof window === 'undefined'`. Accept the brief blank-then-fill flicker on hydration — it's imperceptible for < 100ms hydration time and avoids the warning.

### Pitfall 4: `state` in useEffect Dependency Array (Infinite Loop)

**What goes wrong:** The existing `useEffect` in Calendar.tsx has `[theme, state]` in the deps. `state` is the return value of `useCalendarState()` — an object created fresh each render. Adding an object ref to a dependency array that changes every render causes the effect to re-run on every render, creating an infinite loop with the state setter inside.

**Why it happens:** The `state` reference is not stable (not wrapped in `useMemo`/`useRef`).

**How to avoid:** Remove `state` from the effect's dependency array. The handler inside the effect never needs to read from `state`; it just triggers a re-render via `setResolvedTheme`.

### Pitfall 5: Forgetting to Update Test Fixtures

**What goes wrong:** Tests pass because the test fixture `Slot` objects still have `startTime`/`endTime`. TypeScript catches this at compile time, but if tests are running against JavaScript build output or if `expectTypeOf` checks are missing, tests can pass while the actual type is wrong.

**Why it happens:** Test fixtures are manually written; TypeScript errors in test files don't always block CI if the test runner is run without type-check.

**How to avoid:** Run `tsc --noEmit` as part of the test suite or CI. Update `types.test.ts` first (it will type-error immediately, confirming the change propagated).

---

## Code Examples

### Updated Slot type (PKG-01)

```typescript
// src/types/index.ts — after change
export type SlotStatus = 'available' | 'pending' | 'booked' | 'unavailable'

export type Slot = {
  id: string
  date: string      // UTC date key: "2026-05-19" — always derived from startUtc's UTC date
  startUtc: string  // Full UTC ISO: "2026-05-19T09:00:00Z"
  endUtc: string    // Full UTC ISO: "2026-05-19T10:00:00Z"
  status: SlotStatus
  bookedByLabel?: string
}
```

### SSR-safe time formatter (PKG-01, PKG-05)

```typescript
// src/utils/formatSlotTime.ts
export function formatSlotTime(utcIso: string, locale: string = 'en-US'): string {
  if (typeof window === 'undefined') return ''
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(utcIso))
}
```

### UTC date derivation utility (PKG-01)

```typescript
// src/utils/deriveDate.ts
export function deriveDate(startUtc: string): string {
  return startUtc.slice(0, 10) // "2026-05-19T09:00:00Z" → "2026-05-19"
}
```

### Toolbar boundary detection (PKG-02)

```typescript
// Inside Toolbar.tsx
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, isBefore, isAfter, parseISO } from 'date-fns'

const { startDate, endDate, view, currentDate, weekStartsOn } = useCalendarContext()

const viewStart = view === 'month'
  ? startOfMonth(currentDate)
  : startOfWeek(currentDate, { weekStartsOn })

const viewEnd = view === 'month'
  ? endOfMonth(currentDate)
  : endOfWeek(currentDate, { weekStartsOn })

const isPrevDisabled = startDate
  ? !isAfter(viewStart, parseISO(startDate))
  : false

const isNextDisabled = endDate
  ? !isBefore(viewEnd, parseISO(endDate))
  : false
```

### CalendarRoot with startDate initialization (PKG-02, PKG-05)

```typescript
// Calendar.tsx — updated CalendarRoot
type CalendarProps = {
  // ... existing props ...
  startDate?: string
  endDate?: string
}

export function CalendarRoot({ startDate, endDate, theme = 'light', ...rest }: CalendarProps) {
  const state = useCalendarState(rest.defaultView, startDate)
  
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    theme === 'auto' ? 'light' : theme
  )

  useEffect(() => {
    if (theme !== 'auto') { setResolvedTheme(theme); return }
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setResolvedTheme(mq.matches ? 'dark' : 'light')
    const handler = (e: MediaQueryListEvent) => setResolvedTheme(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  return (
    <CalendarContext.Provider value={{ ...state, startDate, endDate, theme: resolvedTheme, ... }}>
      ...
    </CalendarContext.Provider>
  )
}
```

### WeekView slot matching after UTC rename (PKG-01)

```typescript
// WeekView.tsx — updated slot matching
const cellSlots = slots.filter(s => {
  if (s.date !== dateStr) return false
  const slotHour = new Date(s.startUtc).getUTCHours()
  return slotHour === hour
})
```

### Test fixture update pattern (for test files)

```typescript
// Old fixture (will type-error after type change):
const slot: Slot = { id: 's1', date: '2026-05-19', startTime: '09:00', endTime: '10:00', status: 'available' }

// New fixture:
const slot: Slot = { id: 's1', date: '2026-05-19', startUtc: '2026-05-19T09:00:00Z', endUtc: '2026-05-19T10:00:00Z', status: 'available' }
```

---

## Version Strategy

**Bump to 2.0.0.** The `startTime`/`endTime` → `startUtc`/`endUtc` rename is a breaking change to the public `Slot` type and every consumer that constructs `Slot` objects. All other changes in this phase (new props, new status value) are non-breaking additions. Ship them all in one major version to avoid forcing consumers through two major bumps.

[ASSUMED: semver convention that breaking public type changes require major version; no external semver policy to verify]

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^2 + @testing-library/react ^16 |
| Config file | `appoinment-scheduler/packages/react-easy-appointments/vitest.config.ts` |
| Setup file | `tests/setup.ts` (imports `@testing-library/jest-dom`) |
| Environment | jsdom |
| Quick run command | `cd appoinment-scheduler && pnpm --filter react-easy-appointments test` |
| Full suite command | `cd appoinment-scheduler && pnpm --filter react-easy-appointments test` (same — no separate suite config) |
| Type check command | `cd appoinment-scheduler && pnpm --filter react-easy-appointments exec tsc --noEmit` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File |
|--------|----------|-----------|-------------------|------|
| PKG-01 | `Slot` type has `startUtc`/`endUtc`, not `startTime`/`endTime` | type (vitest `expectTypeOf`) | `pnpm --filter react-easy-appointments test` | `tests/types.test.ts` — UPDATE |
| PKG-01 | `SlotStatus` includes `'pending'` | type | same | `tests/types.test.ts` — UPDATE |
| PKG-01 | `formatSlotTime` returns `''` when `window` is undefined | unit | same | `tests/formatSlotTime.test.ts` — CREATE |
| PKG-01 | `formatSlotTime` returns local time string in browser | unit (jsdom) | same | `tests/formatSlotTime.test.ts` — CREATE |
| PKG-01 | `deriveDate` extracts UTC date from ISO string | unit | same | `tests/deriveDate.test.ts` — CREATE |
| PKG-02 | Prev button disabled at startDate boundary | component | same | `tests/Toolbar.test.tsx` — ADD CASES |
| PKG-02 | Next button disabled at endDate boundary | component | same | `tests/Toolbar.test.tsx` — ADD CASES |
| PKG-02 | Calendar initializes to startDate month when startDate provided | component | same | `tests/Calendar.test.tsx` — ADD CASES |
| PKG-02 | Out-of-range dates in MonthView receive `rea-month-cell--out-of-range` class | component | same | `tests/MonthView.test.tsx` — ADD CASES |
| PKG-02 | Out-of-range MonthCell slots are not interactive | component | same | `tests/MonthView.test.tsx` — ADD CASES |
| PKG-03 | Pending slot button is disabled | component | same | `tests/MonthView.test.tsx` — ADD CASE |
| PKG-03 | Pending slot has `rea-slot--pending` CSS class | component | same | `tests/MonthView.test.tsx` — ADD CASE |
| PKG-03 | Slots prop change causes re-render without page reload | component (state update) | same | `tests/Calendar.test.tsx` — ADD CASE |
| PKG-04 | `onSlotClick` fires with full Slot object on available slot click | component | same | `tests/MonthView.test.tsx` — EXISTS (update fixture) |
| PKG-04 | `onSlotClick` does not fire on pending/booked/unavailable slot | component | same | `tests/MonthView.test.tsx` — EXISTS (update fixture, add pending case) |
| PKG-05 | Calendar renders without error when `theme="auto"` (simulates SSR env) | unit | same | `tests/Calendar.test.tsx` — ADD CASE |
| PKG-05 | `formatSlotTime` returns `''` on server (no `window`) | unit | same | `tests/formatSlotTime.test.ts` — CREATE |

### Wave 0 Gaps (test files to create)

- [ ] `tests/formatSlotTime.test.ts` — covers PKG-01 (UTC display) and PKG-05 (SSR safety)
- [ ] `tests/deriveDate.test.ts` — covers PKG-01 (`date` key derivation correctness)

*(All other required test cases are additions to existing test files — no new files needed beyond these two.)*

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `useEffect` never runs on Node.js server during SSR, making the bare `window.matchMedia` call in the existing effect safe in practice | SSR Safety Fix | Low — this is fundamental React behavior, but RSC or streaming scenarios could differ |
| A2 | Version bump to 2.0.0 is appropriate for the breaking Slot type change | Version Strategy | Low — only affects npm publish; internal monorepo use is unaffected |
| A3 | `new Date(utcIso).getUTCHours()` returns the correct UTC hour for WeekView slot matching | WeekView Slot Matching | Low — `getUTCHours()` is a standard JS Date method; behavior is well-defined |

---

## Open Questions (RESOLVED)

1. **BookingModal and QuickGenerateModal — do they reference `startTime`/`endTime`?**
   - What we know: These components exist (`src/components/BookingModal/`, `src/components/QuickGenerateModal/`) but were not read during research.
   - What's unclear: Whether they display or otherwise reference the old time field names.
   - Recommendation: Read both files before starting the rename task. If they reference `startTime`/`endTime`, add them to the change list.
   - **RESOLVED:** BookingModal is covered in Plan 01 Task 2 (duration math + display switched to `startUtc`/`endUtc` via `formatSlotTime`). AdminPanel is also covered in Plan 01 Task 2 (slot-listing reads switched to `startUtc`; creation callbacks deliberately left as local-time strings). QuickGenerateModal emits local-time creation callbacks only (no `Slot` read site) so it is out of scope per the Plan 01 scope note.

2. **AdminPanel — same concern.**
   - What we know: `AdminPanel` is exported from the Calendar compound component (`src/components/AdminPanel/`).
   - What's unclear: Whether it references slot time fields.
   - Recommendation: Read before starting implementation.
   - **RESOLVED:** AdminPanel slot-listing read sites (sort comparator, list display, aria-label, table cells) are migrated in Plan 01 Task 2. The AdminPanel creation form state and `onCreateSlot`/`onCreateSlots` callback contracts stay as local-time strings (host app owns UTC conversion).

3. **Demo app (`appoinment-scheduler/apps/web/`) — current slot data format.**
   - What we know: The demo app imports the package and was mentioned as the manual SSR verification target.
   - What's unclear: Whether its mock slot data uses `startTime`/`endTime` and needs updating.
   - Recommendation: Update demo app fixtures as part of this phase to serve as the integration smoke test.
   - **RESOLVED:** Demo app migration is covered in Plan 03 Task 2 — `appStore.ts` `StoredSlot`/seed/create helpers move to `startUtc`/`endUtc`, and `App.tsx` maps to the UTC `Slot` shape and uses the exported `formatSlotTime`. The demo app serves as the SSR + timezone smoke test in Plan 03 Task 4 (human verify).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | pnpm / vitest | ✓ | (system) | — |
| pnpm | monorepo workspace | ✓ | (see pnpm-lock.yaml) | — |
| date-fns ^3 | boundary math | ✓ (devDep + peerDep) | ^3 | — |
| vitest ^2 | test runner | ✓ (devDep) | ^2 | — |

Step 2.6: All required dependencies are already installed. No external services needed for this phase.

---

## Security Domain

Step skipped: This phase modifies a standalone UI component package. There are no network calls, authentication flows, data persistence, or user input validation pathways in scope. ASVS controls do not apply to a client-side calendar rendering library.

---

## Sources

### Primary (HIGH confidence — verified against actual source files)
- `appoinment-scheduler/packages/react-easy-appointments/src/types/index.ts` — Current Slot, SlotStatus types confirmed
- `appoinment-scheduler/packages/react-easy-appointments/src/components/Calendar/Calendar.tsx` — SSR bug location confirmed (lines 36–56)
- `appoinment-scheduler/packages/react-easy-appointments/src/components/Calendar/CalendarContext.ts` — Context shape confirmed
- `appoinment-scheduler/packages/react-easy-appointments/src/hooks/useCalendarState.ts` — `new Date()` init confirmed
- `appoinment-scheduler/packages/react-easy-appointments/src/components/MonthView/MonthView.tsx` — `eachDayOfInterval` pattern confirmed
- `appoinment-scheduler/packages/react-easy-appointments/src/components/WeekView/WeekView.tsx` — `s.startTime === hourStr` filter confirmed
- `appoinment-scheduler/packages/react-easy-appointments/src/components/WeekView/TimeSlotBlock.tsx` — `slot.startTime`/`slot.endTime` references confirmed
- `appoinment-scheduler/packages/react-easy-appointments/src/components/MonthView/MonthCell.tsx` — slot rendering pattern confirmed
- `appoinment-scheduler/packages/react-easy-appointments/src/components/Toolbar/Toolbar.tsx` — nav buttons confirmed (no disabled state)
- `appoinment-scheduler/packages/react-easy-appointments/package.json` — vitest ^2, date-fns ^3 confirmed
- `appoinment-scheduler/packages/react-easy-appointments/vitest.config.ts` — jsdom environment, setupFiles confirmed
- `appoinment-scheduler/packages/react-easy-appointments/tests/` — 9 test files confirmed

### Secondary (ASSUMED — standard patterns, well-established)
- `Intl.DateTimeFormat` without `timeZone` uses runtime's local timezone — MDN-established behavior [ASSUMED]
- `useEffect` does not run on server during Next.js SSR — React-established behavior [ASSUMED]
- `string.slice(0, 10)` on a UTC ISO string yields the UTC date — string indexing behavior [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- Type changes (PKG-01, PKG-03): HIGH — current types read directly from source
- Architecture patterns (PKG-02): HIGH — existing date-fns usage pattern confirmed in source
- SSR fix (PKG-05): HIGH for problem location, MEDIUM for recommended `useState` refactor (pattern is standard but not verified against Next.js SSR test)
- Test infrastructure: HIGH — vitest config and all 9 existing test files confirmed

**Research date:** 2026-06-16
**Valid until:** Stable — no external services; package source won't change without commits
