import { describe, it, expectTypeOf } from 'vitest'
import type { Slot, SlotStatus, BookingFormData, CalendarView } from '../src/types'

describe('public types', () => {
  it('Slot has required shape', () => {
    const slot: Slot = {
      id: '1',
      date: '2026-05-19',
      startTime: '09:00',
      endTime: '10:00',
      status: 'available',
    }
    expectTypeOf(slot).toMatchTypeOf<Slot>()
  })

  it('SlotStatus union is exact', () => {
    expectTypeOf<SlotStatus>().toEqualTypeOf<'available' | 'booked' | 'unavailable'>()
  })

  it('BookingFormData has subject, notes, durationMinutes', () => {
    const data: BookingFormData = { subject: 'x', notes: 'y', durationMinutes: 30 }
    expectTypeOf(data).toMatchTypeOf<BookingFormData>()
  })

  it('CalendarView union is exact', () => {
    expectTypeOf<CalendarView>().toEqualTypeOf<'month' | 'week'>()
  })
})
