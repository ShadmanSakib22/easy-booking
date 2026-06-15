import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Calendar } from '../src/components/Calendar'
import type { Slot } from '../src/types'

const todayStr = new Date().toISOString().split('T')[0]

// startUtc uses T09:00:00Z so getUTCHours() === 9, placing it in the 9am grid row
const availableSlot: Slot = {
  id: 'w1',
  date: todayStr,
  startUtc: `${todayStr}T09:00:00Z`,
  endUtc: `${todayStr}T10:00:00Z`,
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

  it('renders an available slot button for today', () => {
    renderWeek([availableSlot])
    // Query by status in aria-label — time text is locale-dependent
    const btn = screen.getByRole('button', { name: /available/i })
    expect(btn).toBeInTheDocument()
    expect(btn).not.toBeDisabled()
  })

  it('calls onSlotClick when available slot clicked', async () => {
    const onSlotClick = vi.fn()
    renderWeek([availableSlot], onSlotClick)
    const btn = screen.getByRole('button', { name: /available/i })
    await userEvent.click(btn)
    expect(onSlotClick).toHaveBeenCalledWith(availableSlot)
  })
})
