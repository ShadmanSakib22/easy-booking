import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { addMonths, subMonths, addWeeks, subWeeks, format } from 'date-fns'
import { useCalendarState } from '../src/hooks/useCalendarState'

describe('useCalendarState', () => {
  it('initializes with the given default view', () => {
    const { result } = renderHook(() => useCalendarState('week'))
    expect(result.current.view).toBe('week')
  })

  it('defaults to month view', () => {
    const { result } = renderHook(() => useCalendarState('month'))
    expect(result.current.view).toBe('month')
  })

  it('goToNext advances one month in month view', () => {
    const { result } = renderHook(() => useCalendarState('month'))
    const before = result.current.currentDate
    act(() => result.current.goToNext())
    expect(format(result.current.currentDate, 'yyyy-MM')).toBe(
      format(addMonths(before, 1), 'yyyy-MM')
    )
  })

  it('goToPrev goes back one month in month view', () => {
    const { result } = renderHook(() => useCalendarState('month'))
    const before = result.current.currentDate
    act(() => result.current.goToPrev())
    expect(format(result.current.currentDate, 'yyyy-MM')).toBe(
      format(subMonths(before, 1), 'yyyy-MM')
    )
  })

  it('goToNext advances one week in week view', () => {
    const { result } = renderHook(() => useCalendarState('week'))
    const before = result.current.currentDate
    act(() => result.current.goToNext())
    expect(format(result.current.currentDate, 'yyyy-MM-dd')).toBe(
      format(addWeeks(before, 1), 'yyyy-MM-dd')
    )
  })

  it('goToPrev goes back one week in week view', () => {
    const { result } = renderHook(() => useCalendarState('week'))
    const before = result.current.currentDate
    act(() => result.current.goToPrev())
    expect(format(result.current.currentDate, 'yyyy-MM-dd')).toBe(
      format(subWeeks(before, 1), 'yyyy-MM-dd')
    )
  })

  it('goToToday resets to today after navigation', () => {
    const { result } = renderHook(() => useCalendarState('month'))
    act(() => result.current.goToNext())
    act(() => result.current.goToToday())
    expect(format(result.current.currentDate, 'yyyy-MM-dd')).toBe(
      format(new Date(), 'yyyy-MM-dd')
    )
  })

  it('setView switches view', () => {
    const { result } = renderHook(() => useCalendarState('month'))
    act(() => result.current.setView('week'))
    expect(result.current.view).toBe('week')
  })
})
