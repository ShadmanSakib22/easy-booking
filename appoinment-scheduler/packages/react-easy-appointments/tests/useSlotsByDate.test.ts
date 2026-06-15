import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSlotsByDate } from '../src/hooks/useSlotsByDate'
import type { Slot } from '../src/types'

const makeSlot = (id: string, date: string, status: Slot['status'] = 'available'): Slot => ({
  id,
  date,
  startTime: '09:00',
  endTime: '10:00',
  status,
})

describe('useSlotsByDate', () => {
  it('returns empty object for no slots', () => {
    const { result } = renderHook(() => useSlotsByDate([]))
    expect(result.current).toEqual({})
  })

  it('groups slots by date key', () => {
    const slots = [
      makeSlot('1', '2026-05-19'),
      makeSlot('2', '2026-05-20'),
      makeSlot('3', '2026-05-19'),
    ]
    const { result } = renderHook(() => useSlotsByDate(slots))
    expect(result.current['2026-05-19']).toHaveLength(2)
    expect(result.current['2026-05-20']).toHaveLength(1)
  })

  it('preserves slot order within a date', () => {
    const slots = [makeSlot('a', '2026-05-19'), makeSlot('b', '2026-05-19')]
    const { result } = renderHook(() => useSlotsByDate(slots))
    expect(result.current['2026-05-19'][0].id).toBe('a')
    expect(result.current['2026-05-19'][1].id).toBe('b')
  })

  it('returns undefined for dates with no slots', () => {
    const slots = [makeSlot('1', '2026-05-19')]
    const { result } = renderHook(() => useSlotsByDate(slots))
    expect(result.current['2026-05-20']).toBeUndefined()
  })
})
