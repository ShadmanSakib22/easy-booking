import { format } from 'date-fns'
import { useCalendarContext } from '../Calendar/CalendarContext'
import type { Slot } from '../../types'

const MAX_VISIBLE = 3

type Props = {
  date: Date
  slots: Slot[]
  isCurrentMonth: boolean
  isToday: boolean
}

export function MonthCell({ date, slots, isCurrentMonth, isToday }: Props) {
  const { onSlotClick, headless, setView, goToToday: _goToToday, currentDate: _cd } = useCalendarContext()

  const visibleSlots = slots.slice(0, MAX_VISIBLE)
  const overflowCount = slots.length - MAX_VISIBLE

  // Navigate to week view — we call setView which will show the week
  // containing the current date. The toolbar already has a goToDate-style
  // mechanism via setView; we just switch to week view and let the user
  // see the day. A full "jump to date" hook can be added later.
  function handleOverflowClick() {
    setView('week')
  }

  if (headless) {
    return (
      <div>
        <span>{format(date, 'd')}</span>
        <div>
          {slots.map(slot => (
            <button
              key={slot.id}
              onClick={() => slot.status === 'available' && onSlotClick(slot)}
              disabled={slot.status !== 'available'}
              aria-label={`${slot.startTime}–${slot.endTime} ${slot.status}`}
            >
              {slot.startTime}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const cellClass = [
    'rea-month-cell',
    !isCurrentMonth && 'rea-month-cell--outside',
    isToday && 'rea-month-cell--today',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cellClass}>
      {/* Date number */}
      <div className="rea-month-cell__date">
        <span className="rea-month-cell__date-number">
          {format(date, 'd')}
        </span>
      </div>

      {/* Slots */}
      <div className="rea-month-cell__slots">
        {visibleSlots.map(slot => (
          <button
            key={slot.id}
            onClick={() => slot.status === 'available' && onSlotClick(slot)}
            disabled={slot.status !== 'available'}
            className={`rea-slot rea-slot--${slot.status}`}
            aria-label={`${slot.startTime}–${slot.endTime} ${slot.status}${slot.bookedByLabel ? ` booked by ${slot.bookedByLabel}` : ''}`}
          >
            <span aria-hidden="true">
              {slot.status === 'available' ? '▸' : slot.status === 'booked' ? '✓' : ''}
            </span>
            {slot.startTime}
            {slot.bookedByLabel && (
              <span className="rea-slot__label">{slot.bookedByLabel}</span>
            )}
          </button>
        ))}

        {/* Overflow pill */}
        {overflowCount > 0 && (
          <button
            className="rea-month-cell__overflow"
            onClick={handleOverflowClick}
            aria-label={`${overflowCount} more slot${overflowCount > 1 ? 's' : ''}, switch to week view`}
          >
            +{overflowCount} more
          </button>
        )}
      </div>
    </div>
  )
}