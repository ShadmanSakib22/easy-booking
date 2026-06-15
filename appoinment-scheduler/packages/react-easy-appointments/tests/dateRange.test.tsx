import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
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

describe('dateRange', () => {
  it('prev button is disabled when current view is at startDate boundary', () => {
    render(
      <Calendar slots={slots} startDate="2026-05-01" endDate="2026-05-31">
        <Calendar.Toolbar />
        <Calendar.MonthView />
      </Calendar>
    )
    const prevBtn = screen.getByLabelText('Previous')
    expect(prevBtn).toBeDisabled()
  })

  it('next button is disabled when current view is at endDate boundary', () => {
    render(
      <Calendar slots={slots} startDate="2026-05-01" endDate="2026-05-31">
        <Calendar.Toolbar />
        <Calendar.MonthView />
      </Calendar>
    )
    const nextBtn = screen.getByLabelText('Next')
    expect(nextBtn).toBeDisabled()
  })

  it('renders out-of-range cells with rea-month-cell--out-of-range class', () => {
    const { container } = render(
      <Calendar slots={slots} startDate="2026-05-10" endDate="2026-05-20">
        <Calendar.Toolbar />
        <Calendar.MonthView />
      </Calendar>
    )
    expect(container.querySelectorAll('.rea-month-cell--out-of-range').length).toBeGreaterThan(0)
  })

  it('calendar initializes to startDate month, not today', () => {
    render(
      <Calendar slots={slots} startDate="2026-05-01" endDate="2026-05-31">
        <Calendar.Toolbar />
        <Calendar.MonthView />
      </Calendar>
    )
    expect(screen.getByText(/May 2026/)).toBeInTheDocument()
  })

  it('WeekView renders no slots for days outside the range', () => {
    // The slot is on 2026-05-22 which is OUTSIDE the range 2026-05-19 to 2026-05-19
    const outOfRangeSlots: Slot[] = [
      {
        id: 's2',
        date: '2026-05-22',
        startUtc: '2026-05-22T09:00:00Z',
        endUtc: '2026-05-22T10:00:00Z',
        status: 'available',
      },
    ]
    render(
      <Calendar slots={outOfRangeSlots} defaultView="week" startDate="2026-05-19" endDate="2026-05-19">
        <Calendar.Toolbar />
        <Calendar.WeekView />
      </Calendar>
    )
    // The out-of-range slot button should not be rendered
    const slotBtn = screen.queryByRole('button', { name: /s2/i })
    expect(slotBtn).toBeNull()
  })
})
