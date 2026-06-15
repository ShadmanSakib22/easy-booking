# Appointment Scheduler Monorepo

This monorepo contains the `react-easy-appointments` scheduling library and a demo web app that shows a full integration.

## Workspace Structure

| Path | Description |
| :--- | :--- |
| [`packages/react-easy-appointments`](./packages/react-easy-appointments/) | The core npm library — compound-component calendar with `MonthView`, `WeekView`, `BookingModal`, `AdminPanel`, and `QuickGenerateModal` |
| [`apps/web`](./apps/web/) | Demo React SPA (Vite + Tailwind CSS v4) that consumes the local package |

---

## Quick Start

This repository uses **pnpm workspaces**.

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start the demo app

```bash
pnpm dev
```

Runs the web app dev server. Open `http://localhost:5173` (or the port shown in your terminal).

### 3. Build the package

```bash
pnpm build:pkg
```

Outputs the distributable bundles to `packages/react-easy-appointments/dist/`.

### 4. Run package tests

```bash
pnpm test:pkg
```

---

## Demo App (`apps/web`)

The demo is a single-page React app built with Vite, Tailwind CSS v4, and Zustand. It demonstrates a realistic multi-user scheduling flow:

- **Three personas** — two regular users and one admin, switchable via a floating User Switcher
- **Admin Panel** — rendered standalone (outside `<Calendar>`) for the admin user; supports creating single slots, bulk-generating slots via the Quick Generate dialog, deleting available slots, cancelling appointments, and adjusting week view hours
- **Calendar** — month and week views with live dark/light theme switching
- **Booking Modal** — opens when a user clicks an available slot; subject and notes are captured and saved
- **My Appointments** — a list below the calendar showing the active user's confirmed bookings, with per-item cancel support
- **Persistence** — all state (slots, appointments) is stored in `localStorage` under the key `rea-demo` via Zustand `persist`; the store seeds 12 upcoming weekday slots on first load

---

## Package Documentation

See [`packages/react-easy-appointments/README.md`](./packages/react-easy-appointments/README.md) for the full API reference, headless integration guide, and CSS variable token list.

## License

MIT License.
