import { startOfWeek, addDays, format, isToday } from 'date-fns'
import { useState, useEffect } from 'react'
import { useCalendarContext } from '../Calendar/CalendarContext'
import { TimeSlotBlock } from './TimeSlotBlock'

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const ROW_HEIGHT_PX = 60 // must match --rea-week-row-height token

function formatHour(h: number) {
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

function getNowMinutes(): number {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

export function WeekView() {
  const { view, currentDate, slots, weekStartsOn, headless, weekHourStart, weekHourEnd } = useCalendarContext()
  const HOURS = Array.from({ length: weekHourEnd - weekHourStart + 1 }, (_, i) => i + weekHourStart)
  const [nowMinutes, setNowMinutes] = useState(getNowMinutes)

  useEffect(() => {
    const timer = setInterval(() => setNowMinutes(getNowMinutes()), 60_000)
    return () => clearInterval(timer)
  }, [])

  if (view !== 'week') return null

  const weekStart = startOfWeek(currentDate, { weekStartsOn })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const todayInWeek = days.some(d => isToday(d))

  if (headless) {
    return (
      <div>
        <div>
          {days.map(day => (
            <div key={day.toISOString()}>
              <span>{DAY_ABBR[day.getDay()]}</span>
              <span>{format(day, 'd')}</span>
            </div>
          ))}
        </div>
        <div>
          {HOURS.map(hour => {
            const hourStr = `${String(hour).padStart(2, '0')}:00`
            return (
              <div key={hour}>
                <div>{formatHour(hour)}</div>
                {days.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const cellSlots = slots.filter(
                    s => s.date === dateStr && s.startTime === hourStr
                  )
                  return (
                    <div key={day.toISOString()}>
                      {cellSlots.map(slot => (
                        <TimeSlotBlock key={slot.id} slot={slot} />
                      ))}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="rea-week-view">
      {/* Scroll wrapper — header + grid share the same scrollbar so columns align */}
      <div className="rea-week-view__scroll">
      {/* Header — sticky inside scroll wrapper */}
      <div className="rea-week-view__header">
        <div className="rea-week-view__time-gutter-header" />
        {days.map(day => {
          const today = isToday(day)
          return (
            <div
              key={day.toISOString()}
              className={`rea-week-view__day-header${today ? ' rea-week-view__day-header--today' : ''}`}
            >
              <span className="rea-week-view__day-abbr">
                {DAY_ABBR[day.getDay()]}
              </span>
              <span className="rea-week-view__day-num">
                {format(day, 'd')}
              </span>
            </div>
          )
        })}
      </div>

      {/* Grid */}
      <div className="rea-week-view__grid">
        {HOURS.map(hour => {
          const hourStr = `${String(hour).padStart(2, '0')}:00`
          const hourStartMin = hour * 60
          const hourEndMin = (hour + 1) * 60
          const showNow = todayInWeek && nowMinutes >= hourStartMin && nowMinutes < hourEndMin
          const nowTopPx = showNow
            ? ((nowMinutes - hourStartMin) / 60) * ROW_HEIGHT_PX
            : 0

          return (
            <div key={hour} className="rea-week-view__row">
              {showNow && (
                <div
                  className="rea-week-view__now-line"
                  style={{ top: `${nowTopPx}px` }}
                  aria-hidden="true"
                />
              )}
              <div className="rea-week-view__time-label">
                {formatHour(hour)}
              </div>
              {days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const today = isToday(day)
                const cellSlots = slots.filter(
                  s => s.date === dateStr && s.startTime === hourStr
                )
                return (
                  <div
                    key={day.toISOString()}
                    className={`rea-week-view__cell${today ? ' rea-week-view__cell--today' : ''}`}
                  >
                    {cellSlots.map(slot => (
                      <TimeSlotBlock key={slot.id} slot={slot} />
                    ))}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
      </div>{/* end .rea-week-view__scroll */}
    </div>
  )
}
