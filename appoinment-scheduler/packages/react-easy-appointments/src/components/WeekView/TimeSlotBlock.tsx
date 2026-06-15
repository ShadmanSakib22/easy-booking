import { useCalendarContext } from '../Calendar/CalendarContext'
import type { Slot } from '../../types'

type Props = { slot: Slot }

export function TimeSlotBlock({ slot }: Props) {
  const { onSlotClick, headless } = useCalendarContext()

  if (headless) {
    return (
      <button
        onClick={() => slot.status === 'available' && onSlotClick(slot)}
        disabled={slot.status !== 'available'}
        aria-label={`${slot.startTime}–${slot.endTime} ${slot.status}${slot.bookedByLabel ? ` by ${slot.bookedByLabel}` : ''}`}
      >
        {slot.startTime}
        {slot.bookedByLabel && <span>{slot.bookedByLabel}</span>}
      </button>
    )
  }

  return (
    <button
      onClick={() => slot.status === 'available' && onSlotClick(slot)}
      disabled={slot.status !== 'available'}
      className={`rea-slot rea-slot--${slot.status}`}
      aria-label={`${slot.startTime}–${slot.endTime} ${slot.status}${slot.bookedByLabel ? ` booked by ${slot.bookedByLabel}` : ''}`}
    >
      <span className="rea-slot__time">
        {slot.startTime}–{slot.endTime}
      </span>
      {slot.bookedByLabel && (
        <span className="rea-slot__label">{slot.bookedByLabel}</span>
      )}
    </button>
  )
}