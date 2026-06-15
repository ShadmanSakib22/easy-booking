import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Calendar } from '../src/components/Calendar'
import type { Slot } from '../src/types'

describe('Calendar context guard', () => {
  it('throws when Toolbar used outside Calendar', () => {
    expect(() => render(<Calendar.Toolbar />)).toThrow(
      'Calendar components must be used within <Calendar>'
    )
  })

  it('renders children without crashing', () => {
    render(
      <Calendar slots={[]} defaultView="month">
        <span data-testid="child">hello</span>
      </Calendar>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('applies rea-calendar class when not headless', () => {
    const { container } = render(
      <Calendar slots={[]} defaultView="month">
        <span />
      </Calendar>
    )
    expect(container.firstChild).toHaveClass('rea-calendar')
  })

  it('omits rea-calendar class when headless', () => {
    const { container } = render(
      <Calendar slots={[]} headless defaultView="month">
        <span />
      </Calendar>
    )
    expect(container.firstChild).not.toHaveClass('rea-calendar')
  })
})

describe('Calendar slots prop real-time update (PKG-03)', () => {
  const todayStr = new Date().toISOString().split('T')[0]

  const slot1: Slot = {
    id: 's1',
    date: todayStr,
    startUtc: `${todayStr}T09:00:00Z`,
    endUtc: `${todayStr}T10:00:00Z`,
    status: 'available',
  }

  const slot2: Slot = {
    id: 's2',
    date: todayStr,
    startUtc: `${todayStr}T11:00:00Z`,
    endUtc: `${todayStr}T12:00:00Z`,
    status: 'available',
  }

  it('slots prop update re-renders without remount', () => {
    const { rerender } = render(
      <Calendar slots={[slot1]} defaultView="month">
        <Calendar.MonthView />
      </Calendar>
    )

    // Initially one available slot button
    expect(screen.getAllByRole('button', { name: /available/i })).toHaveLength(1)

    // Rerender with two slots — no remount needed
    rerender(
      <Calendar slots={[slot1, slot2]} defaultView="month">
        <Calendar.MonthView />
      </Calendar>
    )

    // Now two available slot buttons visible
    expect(screen.getAllByRole('button', { name: /available/i })).toHaveLength(2)
  })
})
