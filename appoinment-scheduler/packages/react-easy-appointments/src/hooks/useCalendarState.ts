import { useState } from 'react'
import { addMonths, subMonths, addWeeks, subWeeks } from 'date-fns'
import type { CalendarView } from '../types'

export function useCalendarState(defaultView: CalendarView = 'month') {
  const [view, setView] = useState<CalendarView>(defaultView)
  const [currentDate, setCurrentDate] = useState(() => new Date())

  const goToPrev = () =>
    setCurrentDate(d => (view === 'month' ? subMonths(d, 1) : subWeeks(d, 1)))

  const goToNext = () =>
    setCurrentDate(d => (view === 'month' ? addMonths(d, 1) : addWeeks(d, 1)))

  const goToToday = () => setCurrentDate(new Date())

  return { view, setView, currentDate, goToPrev, goToNext, goToToday }
}
