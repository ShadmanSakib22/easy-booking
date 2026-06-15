import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Calendar } from '../src/components/Calendar'
import type { Slot } from '../src/types'

const slot: Slot = {
  id: 'm1',
  date: '2026-05-19',
  startTime: '09:00',
  endTime: '10:00',
  status: 'available',
}

function renderModal({
  open = true,
  onClose = vi.fn(),
  onBook = vi.fn(),
} = {}) {
  return render(
    <Calendar slots={[]} onBook={onBook}>
      <Calendar.BookingModal slot={slot} open={open} onClose={onClose} />
    </Calendar>
  )
}

describe('BookingModal', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(
      <Calendar slots={[]}>
        <Calendar.BookingModal slot={slot} open={false} onClose={() => {}} />
      </Calendar>
    )
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })

  it('renders dialog when open=true', () => {
    renderModal()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('submits correct BookingFormData via onBook', async () => {
    const onBook = vi.fn()
    renderModal({ onBook })
    await userEvent.type(screen.getByPlaceholderText(/appointment subject/i), 'Checkup')
    await userEvent.type(screen.getByPlaceholderText(/optional notes/i), 'Annual visit')
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(onBook).toHaveBeenCalledWith(slot, {
      subject: 'Checkup',
      notes: 'Annual visit',
      durationMinutes: 60,
    })
  })

  it('calls onClose when X button clicked', async () => {
    const onClose = vi.fn()
    renderModal({ onClose })
    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('closes after successful submission', async () => {
    const onClose = vi.fn()
    renderModal({ onClose })
    await userEvent.type(screen.getByPlaceholderText(/appointment subject/i), 'Test')
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
