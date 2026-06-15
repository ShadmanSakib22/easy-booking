import { useMemo } from 'react'
import type { Slot } from '../types'

export function useSlotsByDate(slots: Slot[]): Record<string, Slot[]> {
  return useMemo(
    () =>
      slots.reduce<Record<string, Slot[]>>((acc, slot) => {
        if (!acc[slot.date]) acc[slot.date] = []
        acc[slot.date].push(slot)
        return acc
      }, {}),
    [slots]
  )
}
