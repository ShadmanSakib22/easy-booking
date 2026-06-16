# react-easy-appointments

A flexible, high-contrast, fully typed React compound-component calendar for appointment scheduling. Features month and week views, a built-in admin panel, bulk slot generation, and a dual-mode engine (Headless & Styled).

[![npm version](https://img.shields.io/npm/v/react-easy-appointments.svg)](https://www.npmjs.com/package/react-easy-appointments)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## v2.0.0 Breaking Changes

- **`Slot.startTime` / `Slot.endTime`** (HH:MM strings) have been **removed**. Replace with `startUtc` / `endUtc` (full UTC ISO 8601 strings, e.g. `"2026-05-19T09:00:00Z"`).
- **`SlotStatus`** now includes `'pending'` in addition to `'available'`, `'booked'`, and `'unavailable'`. Pending slots render with a distinct visual style and are non-interactive (their button is disabled).
- Two new utility exports are available: `formatSlotTime` and `deriveDate` (see [Utilities](#utilities) below).
- New `startDate` / `endDate` props on `<Calendar>` for bounded date ranges.

---

## Installation

```bash
npm install react-easy-appointments date-fns
# or
pnpm add react-easy-appointments date-fns
# or
yarn add react-easy-appointments date-fns
```

Make sure `react` and `react-dom` (v18 or v19) are installed in your project.

---

## Slot Shape

Every slot must conform to this shape:

```typescript
export type SlotStatus = 'available' | 'pending' | 'booked' | 'unavailable'

export interface Slot {
  id: string
  date: string       // UTC date key: "YYYY-MM-DD" — always derived from startUtc's UTC date
  startUtc: string   // Full UTC ISO 8601: "2026-05-19T09:00:00Z"
  endUtc: string     // Full UTC ISO 8601: "2026-05-19T10:00:00Z"
  status: SlotStatus
  bookedByLabel?: string
}
```

Use the exported `deriveDate` helper to build the `date` field:

```typescript
import { deriveDate } from 'react-easy-appointments'

const slot: Slot = {
  id: crypto.randomUUID(),
  startUtc: '2026-05-19T09:00:00Z',
  endUtc: '2026-05-19T10:00:00Z',
  date: deriveDate('2026-05-19T09:00:00Z'), // → "2026-05-19"
  status: 'available',
}
```

---

## Utilities

### `formatSlotTime(utcString, locale?)`

SSR-safe formatter that converts a UTC ISO timestamp to the visitor's local time using `Intl.DateTimeFormat`. Returns `''` on the server (no timezone shift risk during SSR/hydration).

```typescript
import { formatSlotTime } from 'react-easy-appointments'

formatSlotTime('2026-05-19T09:00:00Z')           // → "9:00 AM" (visitor local time, en-US)
formatSlotTime('2026-05-19T09:00:00Z', 'de-DE')  // → "09:00"
```

### `deriveDate(utcString)`

Extracts the UTC date key (`"YYYY-MM-DD"`) from a full UTC ISO timestamp using string slicing — never shifts by local timezone.

```typescript
import { deriveDate } from 'react-easy-appointments'

deriveDate('2026-05-19T09:00:00Z') // → "2026-05-19"
```

---

## Dual Mode: Styled vs Headless

### 1. Styled Mode (Default)

Import the ready-to-use stylesheet. The component applies high-contrast, modern styles using a Slate color palette that dynamically adapts to light and dark modes.

```tsx
import { Calendar } from 'react-easy-appointments'
import 'react-easy-appointments/styles'
import { useState } from 'react'
import type { Slot } from 'react-easy-appointments'
import { deriveDate } from 'react-easy-appointments'

function App() {
  const [slots, setSlots] = useState<Slot[]>([
    {
      id: '1',
      startUtc: '2026-06-20T09:00:00Z',
      endUtc: '2026-06-20T10:00:00Z',
      date: deriveDate('2026-06-20T09:00:00Z'),
      status: 'available',
    },
  ])
  const [selected, setSelected] = useState<Slot | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto' }}>
      <Calendar
        slots={slots}
        onSlotClick={(slot) => {
          setSelected(slot)
          setModalOpen(true)
        }}
        onBook={(slot, data) => {
          // Handle booking confirmation
          setModalOpen(false)
        }}
      >
        <Calendar.Toolbar />
        <Calendar.MonthView />
        <Calendar.WeekView />

        <Calendar.BookingModal
          slot={selected}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      </Calendar>
    </div>
  )
}
```

### 2. Headless Mode

Set `headless={true}` to strip away all default class names, rendering only raw semantic HTML. Style everything yourself with plain CSS, Tailwind CSS, or any other approach.

```tsx
import { Calendar } from 'react-easy-appointments'
// Do NOT import 'react-easy-appointments/styles'

function HeadlessApp() {
  return (
    <Calendar slots={slots} headless={true}>
      <Calendar.Toolbar />
      <Calendar.MonthView />
      <Calendar.WeekView />
    </Calendar>
  )
}
```

---

## Bounded Date Range

Pass `startDate` and `endDate` (both `"YYYY-MM-DD"`) to restrict the calendar to a specific range:

- The calendar initializes to the month containing `startDate`.
- Navigation is disabled at both boundaries (Prev at `startDate`'s month, Next at `endDate`'s month).
- Days outside the range are rendered greyed out and are non-interactive.

```tsx
<Calendar
  slots={slots}
  startDate="2026-06-01"
  endDate="2026-08-31"
>
  <Calendar.Toolbar />
  <Calendar.MonthView />
</Calendar>
```

Both props are optional. Omit them for an unbounded calendar.

---

## Admin Control Panel

`Calendar.AdminPanel` lets you manage appointment availability, bulk-generate slots, view current bookings, cancel appointments, and configure week view hours.

```tsx
import { deriveDate, formatSlotTime } from 'react-easy-appointments'

<Calendar.AdminPanel
  slots={slots}
  appointments={appointments}
  weekHourStart={7}
  weekHourEnd={20}
  onCreateSlot={(date, startTime, endTime) => {
    // startTime and endTime are local HH:MM strings from the time input
    // Convert to UTC before storing if needed
    return addSlot(date, startTime, endTime)
  }}
  onCreateSlots={(newSlots) => {
    // newSlots: { date, startTime, endTime }[] — convert to UTC before storing
    setSlots(prev => [...prev, ...newSlots.map(s => ({
      ...s,
      id: crypto.randomUUID(),
      status: 'available' as const,
      startUtc: new Date(`${s.date}T${s.startTime}`).toISOString(),
      endUtc: new Date(`${s.date}T${s.endTime}`).toISOString(),
    }))])
  }}
  onRemoveSlot={(slotId) => removeSlot(slotId)}
  onCancelAppointment={(apptId) => cancelAppointment(apptId)}
  onWeekHourStartChange={(h) => setWeekHourStart(h)}
  onWeekHourEndChange={(h) => setWeekHourEnd(h)}
/>
```

**Standalone usage** (outside `<Calendar>`): pass `slots`, `theme`, and `headless` explicitly — they will not be inherited from context.

```tsx
<Calendar.AdminPanel
  slots={slots}
  theme="dark"
  headless={false}
  onCreateSlot={...}
  onCreateSlots={...}
/>
```

---

## Quick Generate Modal

`Calendar.QuickGenerateModal` is a standalone dialog for bulk-creating slots over a date range. It is used internally by `Calendar.AdminPanel` but can also be rendered independently.

```tsx
<Calendar.QuickGenerateModal
  open={open}
  onClose={() => setOpen(false)}
  onGenerate={(slots) => {
    // slots: { date, startTime, endTime }[] — convert to UTC before storing
  }}
  defaultDuration={30}
  defaultStartTime="08:00"
  defaultEndTime="18:00"
/>
```

The modal lets the user pick a date range, repeat days of the week, a time window, and slot duration (preset buttons: 15m, 30m, 45m, 1h, 1.5h, 2h — plus a custom minutes input).

---

## Component API

### `<Calendar>` Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `slots` | `Slot[]` | **Required** | Array of slots (available, pending, booked, unavailable) |
| `onSlotClick` | `(slot: Slot) => void` | — | Callback when a slot button is clicked |
| `onBook` | `(slot: Slot, data: BookingFormData) => void` | — | Callback when BookingModal form submits |
| `defaultView` | `'month' \| 'week'` | `'month'` | Initial view layout |
| `headless` | `boolean` | `false` | Disable all default stylesheets and BEM classes |
| `weekStartsOn` | `0 \| 1` | `0` (Sunday) | Start day of the week |
| `locale` | `string` | `'en-US'` | Language code for formatting titles and day names |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'light'` | Color scheme — `'auto'` follows OS preference and updates live |
| `weekHourStart` | `number` | `7` | First hour shown on the week view (0–23) |
| `weekHourEnd` | `number` | `20` | Last hour shown on the week view (1–24, inclusive) |
| `startDate` | `string` | — | Optional lower bound `"YYYY-MM-DD"` — initializes view and disables back-nav at this month |
| `endDate` | `string` | — | Optional upper bound `"YYYY-MM-DD"` — disables forward-nav at this month; out-of-range days are greyed |

### `<Calendar.BookingModal>` Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `slot` | `Slot \| null` | **Required** | The target slot to book |
| `open` | `boolean` | **Required** | Shows or hides the modal dialog |
| `onClose` | `() => void` | **Required** | Called when the close button or backdrop is clicked |

### `<Calendar.AdminPanel>` Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `onCreateSlot` | `(date: string, startTime: string, endTime: string) => boolean` | **Required** | Called when a single slot is submitted. Return `false` to signal an overlap. |
| `onCreateSlots` | `(slots: { date: string; startTime: string; endTime: string }[]) => void` | **Required** | Called with the array of slots generated by the Quick Generate dialog |
| `slots` | `Slot[]` | context | Slot list. Falls back to the parent `<Calendar>` context when nested. |
| `appointments` | `Appointment[]` | `[]` | Active appointments to display and manage |
| `theme` | `'light' \| 'dark'` | context | Theme for standalone use |
| `headless` | `boolean` | context | Headless mode for standalone use |
| `weekHourStart` | `number` | context | Week view start hour |
| `weekHourEnd` | `number` | context | Week view end hour |
| `onRemoveSlot` | `(slotId: string) => void` | — | Called with each selected slot ID when bulk-deleting. Omit to hide delete controls. |
| `onCancelAppointment` | `(apptId: string) => void` | — | Called with each selected appointment ID when bulk-cancelling. |
| `onWeekHourStartChange` | `(h: number) => void` | — | Called when the user changes the start-hour input. Providing this prop reveals the Week View Hours section. |
| `onWeekHourEndChange` | `(h: number) => void` | — | Called when the user changes the end-hour input. |

### `<Calendar.QuickGenerateModal>` Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `open` | `boolean` | **Required** | Shows or hides the modal |
| `onClose` | `() => void` | **Required** | Called when the modal is dismissed |
| `onGenerate` | `(slots: { date: string; startTime: string; endTime: string }[]) => void` | **Required** | Called with the generated slot data on submit |
| `defaultDuration` | `number` | `30` | Pre-selected duration in minutes |
| `defaultStartTime` | `string` | `'08:00'` | Default daily start time (24h HH:MM) |
| `defaultEndTime` | `string` | `'18:00'` | Default daily end time (24h HH:MM) |

---

## Theme Customization (CSS Variables)

In **Styled Mode**, override any CSS variable on `.rea-calendar` in your own stylesheet:

```css
.rea-calendar {
  --rea-btn-primary-bg:        #7c3aed;
  --rea-btn-primary-bg-hover:  #6d28d9;
  --rea-slot-available-bg:     #15803d;
  --rea-slot-booked-bg:        #7c3aed;
  --rea-today-indicator:       #7c3aed;
  --rea-border-default:        #cbd5e1;
  --rea-bg-base:               #ffffff;
  --rea-cell-min-height:       88px;
  --rea-week-row-height:       60px;
}
```

**Complete token categories:**

| Category | Variables |
| :--- | :--- |
| Surfaces | `--rea-bg-base`, `--rea-bg-elevated`, `--rea-bg-subtle`, `--rea-bg-wash`, `--rea-bg-overlay` |
| Borders | `--rea-border-default`, `--rea-border-focus` |
| Text | `--rea-text-primary`, `--rea-text-secondary`, `--rea-text-disabled`, `--rea-text-on-accent` |
| Slot states | `--rea-slot-available-bg/text`, `--rea-slot-booked-bg/text`, `--rea-slot-unavailable-bg/text` |
| Buttons | `--rea-btn-primary-bg/text`, `--rea-btn-ghost-border` |
| Accents | `--rea-today-indicator` |
| Motion | `--rea-duration-fast`, `--rea-duration-base`, `--rea-ease-out` |
| Shadows | `--rea-shadow-sm`, `--rea-shadow-modal`, `--rea-shadow-focus` |
| Shape | `--rea-radius-sm/md/lg/btn/pill` |
| Layout | `--rea-cell-min-height`, `--rea-cell-padding`, `--rea-toolbar-height`, `--rea-time-gutter-width`, `--rea-week-row-height` |
| Typography | `--rea-font-family`, `--rea-font-size-base/sm/xs` |

---

## Types

```typescript
export type SlotStatus = 'available' | 'pending' | 'booked' | 'unavailable'

export interface Slot {
  id: string
  date: string       // UTC date key: "YYYY-MM-DD" (use deriveDate() to build this)
  startUtc: string   // Full UTC ISO 8601: "2026-05-19T09:00:00Z"
  endUtc: string     // Full UTC ISO 8601: "2026-05-19T10:00:00Z"
  status: SlotStatus
  bookedByLabel?: string
}

export interface BookingFormData {
  subject: string
  notes: string
  durationMinutes: number
}

export interface Appointment {
  id: string
  slotId: string
  userLabel: string
  subject: string
  notes?: string
  durationMinutes: number
  status: 'confirmed' | 'cancelled'
}

export type CalendarView = 'month' | 'week'
export type CalendarTheme = 'light' | 'dark' | 'auto'
```

---

## License

MIT License.
