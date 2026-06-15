import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Calendar } from '../src/components/Calendar'
import type { Slot } from '../src/types'

const todayStr = new Date().toISOString().split('T')[0]

const availableSlot: Slot = {
  id: 's1',
  date: todayStr,
  startTime: '09:00',
  endTime: '10:00',
  status: 'available',
}

const bookedSlot: Slot = {
  id: 's2',
  date: todayStr,
  startTime: '11:00',
  endTime: '12:00',
  status: 'booked',
  bookedByLabel: 'Test User 1',
}

function renderMonth(slots: Slot[] = [], onSlotClick = vi.fn()) {
  return render(
    <Calendar slots={slots} defaultView="month" onSlotClick={onSlotClick}>
      <Calendar.MonthView />
    </Calendar>
  )
}

describe('MonthView', () => {
  it('renders 7 day-name headers', () => {
    renderMonth()
    const headers = screen.getAllByText(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/)
    expect(headers).toHaveLength(7)
  })

  it('renders null when view is week', () => {
    const { container } = render(
      <Calendar slots={[]} defaultView="week">
        <Calendar.MonthView />
      </Calendar>
    )
    expect(container.querySelector('.rea-month-view')).toBeNull()
  })

  it('shows available slot button for today', () => {
    renderMonth([availableSlot])
    expect(screen.getByRole('button', { name: /09:00/i })).toBeInTheDocument()
  })

  it('calls onSlotClick when available slot is clicked', async () => {
    const onSlotClick = vi.fn()
    renderMonth([availableSlot], onSlotClick)
    await userEvent.click(screen.getByRole('button', { name: /09:00/i }))
    expect(onSlotClick).toHaveBeenCalledWith(availableSlot)
  })

  it('does not call onSlotClick for booked slot', async () => {
    const onSlotClick = vi.fn()
    renderMonth([bookedSlot], onSlotClick)
    const btn = screen.getByRole('button', { name: /11:00/i })
    expect(btn).toBeDisabled()
    await userEvent.click(btn)
    expect(onSlotClick).not.toHaveBeenCalled()
  })
})
