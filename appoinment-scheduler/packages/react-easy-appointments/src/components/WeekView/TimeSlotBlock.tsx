import { useCalendarContext } from '../Calendar/CalendarContext'
import { formatSlotTime } from '../../utils/formatSlotTime'
import type { Slot } from '../../types'

type Props = { slot: Slot }

export function TimeSlotBlock({ slot }: Props) {
  const { onSlotClick, headless, locale } = useCalendarContext()

  if (headless) {
    return (
      <button
        onClick={() => slot.status === 'available' && onSlotClick(slot)}
        disabled={slot.status !== 'available'}
        aria-label={`${formatSlotTime(slot.startUtc, locale)}–${formatSlotTime(slot.endUtc, locale)} ${slot.status}${slot.bookedByLabel ? ` by ${slot.bookedByLabel}` : ''}`}
      >
        {formatSlotTime(slot.startUtc, locale)}
        {slot.bookedByLabel && <span>{slot.bookedByLabel}</span>}
      </button>
    )
  }

  return (
    <button
      onClick={() => slot.status === 'available' && onSlotClick(slot)}
      disabled={slot.status !== 'available'}
      className={`rea-slot rea-slot--${slot.status}`}
      aria-label={`${formatSlotTime(slot.startUtc, locale)}–${formatSlotTime(slot.endUtc, locale)} ${slot.status}${slot.bookedByLabel ? ` booked by ${slot.bookedByLabel}` : ''}`}
    >
      <span className="rea-slot__time">
        {formatSlotTime(slot.startUtc, locale)}–{formatSlotTime(slot.endUtc, locale)}
      </span>
      {slot.bookedByLabel && (
        <span className="rea-slot__label">{slot.bookedByLabel}</span>
      )}
    </button>
  )
}
