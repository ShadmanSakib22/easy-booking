import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Calendar } from '../src'
import type { Slot } from '../src'

const slots: Slot[] = [
  {
    id: 's1',
    date: '2026-05-19',
    startUtc: '2026-05-19T09:00:00Z',
    endUtc: '2026-05-19T10:00:00Z',
    status: 'available',
  },
]

describe('SSR safety', () => {
  it("renders without throwing when theme='auto'", () => {
    expect(() =>
      render(
        <Calendar slots={slots} theme="auto">
          <Calendar.Toolbar />
          <Calendar.MonthView />
        </Calendar>
      )
    ).not.toThrow()
  })

  it("renders without throwing when theme='auto' and window.matchMedia is undefined", () => {
    const orig = window.matchMedia
    try {
      ;(window as any).matchMedia = undefined
      expect(() =>
        render(
          <Calendar slots={slots} theme="auto">
            <Calendar.Toolbar />
            <Calendar.MonthView />
          </Calendar>
        )
      ).not.toThrow()
    } finally {
      window.matchMedia = orig
    }
  })
})
