import { type ReactNode, useEffect, useState } from 'react'
import { CalendarContext } from './CalendarContext'
import { useCalendarState } from '../../hooks/useCalendarState'
import type { Slot, BookingFormData, CalendarView, CalendarTheme } from '../../types'

type CalendarProps = {
  children: ReactNode
  slots: Slot[]
  onSlotClick?: (slot: Slot) => void
  onBook?: (slot: Slot, data: BookingFormData) => void
  defaultView?: CalendarView
  headless?: boolean
  weekStartsOn?: 0 | 1
  locale?: string
  theme?: CalendarTheme
  weekHourStart?: number
  weekHourEnd?: number
  startDate?: string
  endDate?: string
}

export function CalendarRoot({
  children,
  slots,
  onSlotClick = () => { },
  onBook = () => { },
  defaultView = 'month',
  headless = false,
  weekStartsOn = 0,
  locale = 'en-US',
  theme = 'light',
  weekHourStart = 7,
  weekHourEnd = 20,
  startDate,
  endDate,
}: CalendarProps) {
  const state = useCalendarState(defaultView, startDate)

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    theme === 'auto' ? 'light' : theme
  )

  useEffect(() => {
    if (theme !== 'auto') { setResolvedTheme(theme); return }
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setResolvedTheme(mq.matches ? 'dark' : 'light')
    const handler = (e: MediaQueryListEvent) => setResolvedTheme(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const rootClass = headless
    ? undefined
    : [
      'rea-calendar',
      resolvedTheme === 'dark' ? 'rea-dark' : '',
    ]
      .filter(Boolean)
      .join(' ')

  return (
    <CalendarContext.Provider
      value={{ slots, onSlotClick, onBook, headless, weekStartsOn, locale, theme: resolvedTheme, weekHourStart, weekHourEnd, startDate, endDate, ...state }}
    >
      <div className={rootClass}>{children}</div>
    </CalendarContext.Provider>
  )
}