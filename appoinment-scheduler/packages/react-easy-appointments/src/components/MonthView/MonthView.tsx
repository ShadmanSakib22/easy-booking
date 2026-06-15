import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
} from 'date-fns'
import { useCalendarContext } from '../Calendar/CalendarContext'
import { useSlotsByDate } from '../../hooks/useSlotsByDate'
import { MonthCell } from './MonthCell'

const DAY_NAMES_SUN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_NAMES_MON = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function MonthView() {
  const { view, currentDate, slots, weekStartsOn, headless } = useCalendarContext()
  const slotsByDate = useSlotsByDate(slots)

  if (view !== 'month') return null

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const gridStart = startOfWeek(monthStart, { weekStartsOn })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const dayNames = weekStartsOn === 0 ? DAY_NAMES_SUN : DAY_NAMES_MON

  return (
    <div className={headless ? undefined : 'rea-month-view'}>
      <div className={headless ? undefined : 'rea-month-view__header'}>
        {dayNames.map(d => (
          <div key={d} className={headless ? undefined : 'rea-month-view__day-name'}>
            {d}
          </div>
        ))}
      </div>
      <div className={headless ? undefined : 'rea-month-view__grid'}>
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd')
          return (
            <MonthCell
              key={key}
              date={day}
              slots={slotsByDate[key] ?? []}
              isCurrentMonth={isSameMonth(day, currentDate)}
              isToday={isToday(day)}
            />
          )
        })}
      </div>
    </div>
  )
}
