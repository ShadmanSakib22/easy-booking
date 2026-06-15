import { createContext, useContext } from 'react'
import type { Slot, BookingFormData, CalendarView } from '../../types'

export type CalendarContextValue = {
  slots: Slot[]
  view: CalendarView
  setView: (view: CalendarView) => void
  currentDate: Date
  goToPrev: () => void
  goToNext: () => void
  goToToday: () => void
  onSlotClick: (slot: Slot) => void
  onBook: (slot: Slot, data: BookingFormData) => void
  headless: boolean
  weekStartsOn: 0 | 1
  locale: string
  theme: 'light' | 'dark'
  weekHourStart: number
  weekHourEnd: number
}

export const CalendarContext = createContext<CalendarContextValue | null>(null)

export function useCalendarContext(): CalendarContextValue {
  const ctx = useContext(CalendarContext)
  if (!ctx) throw new Error('Calendar components must be used within <Calendar>')
  return ctx
}

export function useOptionalCalendarContext(): CalendarContextValue | null {
  return useContext(CalendarContext)
}