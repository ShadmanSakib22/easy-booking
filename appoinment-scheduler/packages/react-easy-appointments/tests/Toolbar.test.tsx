import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Calendar } from '../src/components/Calendar'

function renderToolbar(props: Record<string, unknown> = {}) {
  return render(
    <Calendar slots={[]} defaultView="month" {...props}>
      <Calendar.Toolbar />
      <Calendar.MonthView />
      <Calendar.WeekView />
    </Calendar>
  )
}

describe('Toolbar', () => {
  it('renders prev, today, next, month and week buttons', () => {
    renderToolbar()
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /today/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /month view/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /week view/i })).toBeInTheDocument()
  })

  it('displays current year in the title', () => {
    renderToolbar()
    const year = new Date().getFullYear().toString()
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument()
  })

  it('switches to week view when Week clicked', async () => {
    renderToolbar()
    await userEvent.click(screen.getByRole('button', { name: /week view/i }))
    expect(screen.getByText(/week of/i)).toBeInTheDocument()
  })

  it('switches back to month view when Month clicked', async () => {
    renderToolbar({ defaultView: 'week' })
    await userEvent.click(screen.getByRole('button', { name: /month view/i }))
    expect(screen.getByText(new RegExp(new Date().getFullYear().toString()))).toBeInTheDocument()
  })
})
