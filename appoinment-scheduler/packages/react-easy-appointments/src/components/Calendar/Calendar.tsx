import { type ReactNode, useEffect } from 'react'
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
}: CalendarProps) {
  const state = useCalendarState(defaultView)

  // Resolve effective theme for auto mode
  const getEffectiveTheme = (): 'light' | 'dark' => {
    if (theme === 'auto') {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }
      return 'light'
    }
    return theme
  }

  const effectiveTheme = getEffectiveTheme()

  // For auto mode, listen for OS preference changes
  useEffect(() => {
    if (theme !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    // Force re-render on change — we rely on the class being re-evaluated
    const handler = () => { /* state update triggers re-render */ state.setView(state.view) }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme, state])

  const rootClass = headless
    ? undefined
    : [
      'rea-calendar',
      effectiveTheme === 'dark' ? 'rea-dark' : '',
    ]
      .filter(Boolean)
      .join(' ')

  return (
    <CalendarContext.Provider
      value={{ slots, onSlotClick, onBook, headless, weekStartsOn, locale, theme: effectiveTheme, weekHourStart, weekHourEnd, ...state }}
    >
      <div className={rootClass}>{children}</div>
    </CalendarContext.Provider>
  )
}