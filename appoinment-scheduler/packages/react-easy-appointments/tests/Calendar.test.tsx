import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Calendar } from '../src/components/Calendar'

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
