export type SlotStatus = 'available' | 'pending' | 'booked' | 'unavailable'

export type Slot = {
  id: string
  date: string      // UTC date key: "2026-05-19" — always derived from startUtc's UTC date
  startUtc: string  // Full UTC ISO: "2026-05-19T09:00:00Z"
  endUtc: string    // Full UTC ISO: "2026-05-19T10:00:00Z"
  status: SlotStatus
  bookedByLabel?: string
}

export type BookingFormData = {
  subject: string
  notes: string
  durationMinutes: number
}

export type CalendarView = 'month' | 'week'

export type CalendarTheme = 'light' | 'dark' | 'auto'

export type Appointment = {
  id: string
  slotId: string
  userLabel: string
  subject: string
  notes?: string
  durationMinutes: number
  status: 'confirmed' | 'cancelled'
}