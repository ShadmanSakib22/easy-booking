import { useState } from 'react'
import { useCalendarContext } from '../Calendar/CalendarContext'
import type { Slot, BookingFormData } from '../../types'

type Props = {
  slot: Slot | null
  open: boolean
  onClose: () => void
}

export function BookingModal({ slot, open, onClose }: Props) {
  const { onBook, headless } = useCalendarContext()
  const [subject, setSubject] = useState('')
  const [notes, setNotes] = useState('')

  if (!open || !slot) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const durationMinutes = (
      (Number(slot.endTime.split(':')[0]) * 60 + Number(slot.endTime.split(':')[1])) -
      (Number(slot.startTime.split(':')[0]) * 60 + Number(slot.startTime.split(':')[1]))
    )
    const data: BookingFormData = { subject, notes, durationMinutes }
    onBook(slot, data)
    setSubject('')
    setNotes('')
    onClose()
  }

  if (headless) {
    return (
      <div role="dialog" aria-modal="true" aria-label="Book appointment">
        <button type="button" onClick={onClose} aria-label="Close">×</button>
        <h2>Book Appointment</h2>
        <p>{slot.date} · {slot.startTime}–{slot.endTime}</p>
        <form onSubmit={handleSubmit}>
          <label>
            Subject
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              required
              placeholder="Appointment subject"
            />
          </label>
          <label>
            Notes
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional notes"
            />
          </label>
          <div>
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit">Confirm Booking</button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div
      className="rea-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rea-modal-title"
      // Close on backdrop click
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="rea-modal">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="rea-modal__close"
          aria-label="Close"
        >
          <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </button>

        {/* Slot context badge */}
        <div className="rea-modal__slot-badge" aria-hidden="true">
          <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="6" cy="6" r="2.5" fill="currentColor" />
          </svg>
          {slot.date} · {slot.startTime}–{slot.endTime}
        </div>

        {/* Title */}
        <h2 className="rea-modal__title" id="rea-modal-title">
          Book Appointment
        </h2>
        <div className="rea-modal__divider" aria-hidden="true" />

        {/* Form */}
        <form onSubmit={handleSubmit} className="rea-modal__form">
          <label className="rea-modal__label">
            Subject
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              required
              className="rea-modal__input"
              placeholder="Appointment subject"
              autoFocus
            />
          </label>

          <label className="rea-modal__label">
            Notes
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="rea-modal__textarea"
              placeholder="Optional notes"
            />
          </label>

          <div className="rea-modal__actions">
            <button
              type="button"
              onClick={onClose}
              className="rea-modal__btn-cancel"
            >
              Cancel
            </button>
            <button type="submit" className="rea-modal__btn-confirm">
              Confirm
              <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}