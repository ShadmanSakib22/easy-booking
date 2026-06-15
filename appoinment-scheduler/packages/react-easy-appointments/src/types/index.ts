export type SlotStatus = 'available' | 'booked' | 'unavailable'

export type Slot = {
  id: string
  date: string           // ISO 8601: "2026-05-19"
  startTime: string      // 24h: "09:00"
  endTime: string        // 24h: "10:00"
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