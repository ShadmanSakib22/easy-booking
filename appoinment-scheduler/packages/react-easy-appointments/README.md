# react-easy-appointments

A flexible, high-contrast, fully typed React compound-component calendar for appointment scheduling. It features month and week views, a built-in admin panel, bulk slot generation, and a dual-mode engine (Headless & Styled).

[![npm version](https://img.shields.io/npm/v/react-easy-appointments.svg)](https://www.npmjs.com/package/react-easy-appointments)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

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

## Dual Mode: Styled vs Headless

`react-easy-appointments` offers two different integration styles:

### 1. Styled Mode (Default)

Import the ready-to-use stylesheet. The component applies high-contrast, modern styles using a Slate color palette that dynamically adapts to light and dark modes.

```tsx
import { Calendar } from 'react-easy-appointments'
import 'react-easy-appointments/styles'
import { useState } from 'react'
import type { Slot } from 'react-easy-appointments'

function App() {
  const [slots, setSlots] = useState<Slot[]>([])
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
          // Book slot handler
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

Set `headless={true}` to strip away all default class names, rendering only raw semantic HTML. Style everything yourself with plain CSS, TailwindCSS, or any other approach.

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

## Admin Control Panel

`Calendar.AdminPanel` lets you manage appointment availability, bulk-generate slots, view current bookings, cancel appointments, and configure week view hours. It can be placed inside a `<Calendar>` or used as a standalone component.

```tsx
<Calendar.AdminPanel
  slots={slots}
  appointments={appointments}
  weekHourStart={7}
  weekHourEnd={20}
  onCreateSlot={(date, start, end) => {
    // Return true on success, false if the slot overlaps an existing one
    return addSlot(date, start, end)
  }}
  onCreateSlots={(newSlots) => {
    setSlots(prev => [...prev, ...newSlots.map(s => ({ ...s, id: uuid(), status: 'available' }))])
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
    setSlots(prev => [...prev, ...slots.map(s => ({ ...s, id: uuid(), status: 'available' }))])
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
| `slots` | `Slot[]` | **Required** | Array of available, booked, and unavailable slots |
| `onSlotClick` | `(slot: Slot) => void` | — | Callback when a slot element is clicked |
| `onBook` | `(slot: Slot, data: BookingFormData) => void` | — | Callback when BookingModal form submits |
| `defaultView` | `'month' \| 'week'` | `'month'` | Initial view layout |
| `headless` | `boolean` | `false` | Disable all default stylesheets and BEM classes |
| `weekStartsOn` | `0 \| 1` | `0` (Sunday) | Start day of the week — `0` = Sunday, `1` = Monday |
| `locale` | `string` | `'en-US'` | Language code for formatting titles and day names |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'light'` | Color scheme — `'auto'` follows the OS preference and updates live |
| `weekHourStart` | `number` | `7` | First hour shown on the week view (0–23) |
| `weekHourEnd` | `number` | `20` | Last hour shown on the week view (1–24, inclusive) |

### `<Calendar.BookingModal>` Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `slot` | `Slot \| null` | **Required** | The target slot to book |
| `open` | `boolean` | **Required** | Shows or hides the modal dialog |
| `onClose` | `() => void` | **Required** | Called when the close button or backdrop is clicked |

### `<Calendar.AdminPanel>` Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `onCreateSlot` | `(date: string, start: string, end: string) => boolean` | **Required** | Called when a single slot is submitted. Return `false` to signal an overlap — the panel will show an error. |
| `onCreateSlots` | `(slots: { date: string; startTime: string; endTime: string }[]) => void` | **Required** | Called with the array of slots generated by the Quick Generate dialog |
| `slots` | `Slot[]` | context | Slot list. Falls back to the parent `<Calendar>` context when nested. |
| `appointments` | `Appointment[]` | `[]` | Active appointments to display and manage |
| `theme` | `'light' \| 'dark'` | context | Theme for standalone use (inherited from context when nested) |
| `headless` | `boolean` | context | Headless mode for standalone use |
| `weekHourStart` | `number` | context | Week view start hour (for the hour-range control) |
| `weekHourEnd` | `number` | context | Week view end hour (for the hour-range control) |
| `onRemoveSlot` | `(slotId: string) => void` | — | Called with each selected slot ID when bulk-deleting. Omit to hide delete controls. |
| `onCancelAppointment` | `(apptId: string) => void` | — | Called with each selected appointment ID when bulk-cancelling. Omit to hide cancel controls. |
| `onWeekHourStartChange` | `(h: number) => void` | — | Called when the user changes the start-hour input. Providing this prop reveals the Week View Hours section. |
| `onWeekHourEndChange` | `(h: number) => void` | — | Called when the user changes the end-hour input. Providing this prop reveals the Week View Hours section. |

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

In **Styled Mode**, override any CSS variable on `.rea-calendar` in your own stylesheet. All variables are listed in [variables.css](./src/styles/variables.css).

```css
.rea-calendar {
  /* Color accents */
  --rea-btn-primary-bg:        #7c3aed;
  --rea-btn-primary-bg-hover:  #6d28d9;
  --rea-slot-available-bg:     #15803d;
  --rea-slot-booked-bg:        #7c3aed;
  --rea-today-indicator:       #7c3aed;

  /* Borders & backgrounds */
  --rea-border-default:        #cbd5e1;
  --rea-bg-base:               #ffffff;
  --rea-bg-subtle:             #f1f5f9;

  /* Shape */
  --rea-radius-btn:            6px;
  --rea-radius-lg:             10px;

  /* Layout */
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

> **Deprecated (removed in v0.3):** The old `--rea-color-*` aliases (`--rea-color-available`, `--rea-color-booked`, `--rea-color-bg`, etc.) still work but will be removed. Migrate to the `--rea-slot-*`, `--rea-bg-*` naming shown above.

---

## Types

```typescript
export type SlotStatus = 'available' | 'booked' | 'unavailable'

export interface Slot {
  id: string
  date: string          // ISO date: "YYYY-MM-DD"
  startTime: string     // 24h format: "HH:MM"
  endTime: string       // 24h format: "HH:MM"
  status: SlotStatus
  bookedByLabel?: string
}

export interface BookingFormData {
  subject: string
  notes: string
  durationMinutes: number  // auto-computed from slot start/end times
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
