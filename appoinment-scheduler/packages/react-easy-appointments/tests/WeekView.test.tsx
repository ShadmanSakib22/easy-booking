import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Calendar } from '../src/components/Calendar'
import { format } from 'date-fns'
import type { Slot } from '../src/types'

const todayStr = new Date().toISOString().split('T')[0]

const availableSlot: Slot = {
  id: 'w1',
  date: todayStr,
  startTime: '09:00',
  endTime: '10:00',
  status: 'available',
}

function renderWeek(slots: Slot[] = [], onSlotClick = vi.fn()) {
  return render(
    <Calendar slots={slots} defaultView="week" onSlotClick={onSlotClick}>
      <Calendar.Toolbar />
      <Calendar.WeekView />
    </Calendar>
  )
}

describe('WeekView', () => {
  it('renders null in month view', () => {
    const { container } = render(
      <Calendar slots={[]} defaultView="month">
        <Calendar.WeekView />
      </Calendar>
    )
    expect(container.querySelector('.rea-week-view')).toBeNull()
  })

  it('renders 7 day column headers', () => {
    renderWeek()
    const days = screen.getAllByText(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/)
    expect(days).toHaveLength(7)
  })

  it('renders time labels from 7am to 8pm', () => {
    renderWeek()
    expect(screen.getByText('7am')).toBeInTheDocument()
    expect(screen.getByText('8pm')).toBeInTheDocument()
  })

  it('renders an available slot at 9am for today', () => {
    renderWeek([availableSlot])
    expect(screen.getByRole('button', { name: /09:00/i })).toBeInTheDocument()
  })

  it('calls onSlotClick when available slot clicked', async () => {
    const onSlotClick = vi.fn()
    renderWeek([availableSlot], onSlotClick)
    await userEvent.click(screen.getByRole('button', { name: /09:00/i }))
    expect(onSlotClick).toHaveBeenCalledWith(availableSlot)
  })
})
