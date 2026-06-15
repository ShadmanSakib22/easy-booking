import { useState } from 'react'
import type { FormEvent } from 'react'
import { useOptionalCalendarContext } from '../Calendar/CalendarContext'
import { QuickGenerateModal } from '../QuickGenerateModal/QuickGenerateModal'
import type { Slot, Appointment } from '../../types'

type Props = {
  /** Required when used outside <Calendar>. Inside <Calendar> falls back to context. */
  slots?: Slot[]
  /** Required when used outside <Calendar>. Inside <Calendar> falls back to context. */
  theme?: 'light' | 'dark'
  /** Defaults to false. */
  headless?: boolean
  weekHourStart?: number
  weekHourEnd?: number
  appointments?: Appointment[]
  onCreateSlot: (date: string, startTime: string, endTime: string) => boolean
  onCreateSlots: (slots: { date: string; startTime: string; endTime: string }[]) => void
  onRemoveSlot?: (slotId: string) => void
  onCancelAppointment?: (appointmentId: string) => void
  onWeekHourStartChange?: (h: number) => void
  onWeekHourEndChange?: (h: number) => void
}

function ChevronIcon() {
  return (
    <svg className="rea-admin__chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 6l4 4 4-4" />
    </svg>
  )
}

export function AdminPanel({
  slots: slotsProp,
  theme: themeProp,
  headless: headlessProp,
  weekHourStart: weekHourStartProp,
  weekHourEnd: weekHourEndProp,
  appointments = [],
  onCreateSlot,
  onCreateSlots,
  onRemoveSlot,
  onCancelAppointment,
  onWeekHourStartChange,
  onWeekHourEndChange,
}: Props) {
  const ctx = useOptionalCalendarContext()
  const slots = slotsProp ?? ctx?.slots ?? []
  const theme = themeProp ?? ctx?.theme ?? 'light'
  const headless = headlessProp ?? ctx?.headless ?? false
  const weekHourStart = weekHourStartProp ?? ctx?.weekHourStart ?? 7
  const weekHourEnd = weekHourEndProp ?? ctx?.weekHourEnd ?? 20
  const isStandalone = !ctx
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [quickCreateOpen, setQuickCreateOpen] = useState(false)
  const [overlapError, setOverlapError] = useState(false)
  const [selectedSlotIds, setSelectedSlotIds] = useState<Set<string>>(new Set())
  const [selectedApptIds, setSelectedApptIds] = useState<Set<string>>(new Set())

  function handleCreateSlot(e: FormEvent) {
    e.preventDefault()
    if (!date || !startTime || !endTime) return
    const success = onCreateSlot(date, startTime, endTime)
    if (!success) { setOverlapError(true); return }
    setOverlapError(false)
    setDate('')
    setStartTime('')
    setEndTime('')
  }

  const confirmedAppts = appointments.filter(a => a.status === 'confirmed')
  const sortedSlots = [...slots].sort(
    (a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
  )
  const deletableSlots = sortedSlots.filter(s => s.status === 'available')
  const allSlotsSelected = deletableSlots.length > 0 && deletableSlots.every(s => selectedSlotIds.has(s.id))
  const someSlotsSelected = deletableSlots.some(s => selectedSlotIds.has(s.id))
  const allApptsSelected = confirmedAppts.length > 0 && confirmedAppts.every(a => selectedApptIds.has(a.id))
  const someApptsSelected = confirmedAppts.some(a => selectedApptIds.has(a.id))
  const showHourControls = !!(onWeekHourStartChange || onWeekHourEndChange)

  function toggleSlot(id: string) {
    setSelectedSlotIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAllSlots() {
    setSelectedSlotIds(allSlotsSelected ? new Set() : new Set(deletableSlots.map(s => s.id)))
  }

  function deleteSelectedSlots() {
    if (!onRemoveSlot) return
    selectedSlotIds.forEach(id => onRemoveSlot(id))
    setSelectedSlotIds(new Set())
  }

  function toggleAppt(id: string) {
    setSelectedApptIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAllAppts() {
    setSelectedApptIds(allApptsSelected ? new Set() : new Set(confirmedAppts.map(a => a.id)))
  }

  function cancelSelectedAppts() {
    if (!onCancelAppointment) return
    selectedApptIds.forEach(id => onCancelAppointment(id))
    setSelectedApptIds(new Set())
  }

  if (headless) {
    return (
      <div>
        <button type="button" onClick={() => setQuickCreateOpen(true)}>Quick Generate Slots</button>
        {showHourControls && (
          <div>
            <label>Start hour <input type="number" min={0} max={(weekHourEnd ?? 24) - 1} value={weekHourStart ?? 0} onChange={e => onWeekHourStartChange?.(Number(e.target.value))} /></label>
            <label>End hour <input type="number" min={(weekHourStart ?? 0) + 1} max={24} value={weekHourEnd ?? 24} onChange={e => onWeekHourEndChange?.(Number(e.target.value))} /></label>
          </div>
        )}
        <form onSubmit={handleCreateSlot}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
          <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
          <button type="submit">Add slot</button>
          {overlapError && <span>Overlaps with an existing slot on this date.</span>}
        </form>
        <div>
          {selectedSlotIds.size > 0 && onRemoveSlot && (
            <button type="button" onClick={deleteSelectedSlots}>Delete {selectedSlotIds.size} selected</button>
          )}
          {sortedSlots.map(slot => (
            <div key={slot.id}>
              {slot.status === 'available' && onRemoveSlot && (
                <input type="checkbox" checked={selectedSlotIds.has(slot.id)} onChange={() => toggleSlot(slot.id)} />
              )}
              {slot.date} {slot.startTime}–{slot.endTime} [{slot.status}{slot.bookedByLabel ? ` · ${slot.bookedByLabel}` : ''}]
            </div>
          ))}
        </div>
        <div>
          {selectedApptIds.size > 0 && onCancelAppointment && (
            <button type="button" onClick={cancelSelectedAppts}>Cancel {selectedApptIds.size} selected</button>
          )}
          {confirmedAppts.map(appt => (
            <div key={appt.id}>
              {onCancelAppointment && (
                <input type="checkbox" checked={selectedApptIds.has(appt.id)} onChange={() => toggleAppt(appt.id)} />
              )}
              {appt.userLabel} — {appt.subject} ({appt.durationMinutes}min)
            </div>
          ))}
        </div>
        <QuickGenerateModal open={quickCreateOpen} onClose={() => setQuickCreateOpen(false)} onGenerate={onCreateSlots} />
      </div>
    )
  }

  const content = (
    <div className="rea-admin">
      <div className="rea-admin__header">
        <span className="rea-admin__title">Admin Panel</span>
      </div>

      <button type="button" onClick={() => setQuickCreateOpen(true)} className="rea-admin__btn-generate">
        Quick Generate Slots
      </button>

      {showHourControls && (
        <details className="rea-admin__section">
          <summary className="rea-admin__section-summary">
            <span className="rea-admin__section-title">Week View Hours</span>
            <ChevronIcon />
          </summary>
          <div className="rea-admin__section-body rea-admin__hour-row">
            <label className="rea-admin__field">
              <span className="rea-admin__field-label">Start (0–23)</span>
              <input type="number" min={0} max={(weekHourEnd ?? 24) - 1} value={weekHourStart ?? 0}
                onChange={e => onWeekHourStartChange?.(Math.min(Number(e.target.value), (weekHourEnd ?? 24) - 1))}
                className="rea-admin__input rea-admin__input--sm" />
            </label>
            <label className="rea-admin__field">
              <span className="rea-admin__field-label">End (1–24)</span>
              <input type="number" min={(weekHourStart ?? 0) + 1} max={24} value={weekHourEnd ?? 24}
                onChange={e => onWeekHourEndChange?.(Math.max(Number(e.target.value), (weekHourStart ?? 0) + 1))}
                className="rea-admin__input rea-admin__input--sm" />
            </label>
            <span className="rea-admin__hour-hint">Currently {weekHourStart ?? 0}:00 – {weekHourEnd ?? 24}:00</span>
          </div>
        </details>
      )}

      <details className="rea-admin__section">
        <summary className="rea-admin__section-summary">
          <span className="rea-admin__section-title">Create Single Slot</span>
          <ChevronIcon />
        </summary>
        <div className="rea-admin__section-body">
          <form onSubmit={handleCreateSlot} className="rea-admin__form">
            <label className="rea-admin__field">
              <span className="rea-admin__field-label">Date</span>
              <input type="date" value={date} onChange={e => { setDate(e.target.value); setOverlapError(false) }} required className="rea-admin__input" />
            </label>
            <label className="rea-admin__field">
              <span className="rea-admin__field-label">Start time</span>
              <input type="time" value={startTime} onChange={e => { setStartTime(e.target.value); setOverlapError(false) }} required className="rea-admin__input" />
            </label>
            <label className="rea-admin__field">
              <span className="rea-admin__field-label">End time</span>
              <input type="time" value={endTime} onChange={e => { setEndTime(e.target.value); setOverlapError(false) }} required className="rea-admin__input" />
            </label>
            <button type="submit" className="rea-admin__btn-add">Add slot</button>
          </form>
          {overlapError && <p className="rea-admin__error">Overlaps with an existing slot on this date.</p>}
        </div>
      </details>

      {/* All Slots */}
      <details className="rea-admin__section" open>
        <summary className="rea-admin__section-summary">
          <span className="rea-admin__section-title">All Slots ({slots.length})</span>
          <ChevronIcon />
        </summary>
        <div className="rea-admin__section-body">
          {someSlotsSelected && onRemoveSlot && (
            <div className="rea-admin__bulk-bar">
              <span className="rea-admin__bulk-count">{selectedSlotIds.size} selected</span>
              <button type="button" onClick={deleteSelectedSlots} className="rea-admin__btn-bulk-danger">
                Delete selected
              </button>
              <button type="button" onClick={() => setSelectedSlotIds(new Set())} className="rea-admin__btn-bulk-clear">
                Clear
              </button>
            </div>
          )}
          {sortedSlots.length === 0 ? (
            <p className="rea-admin__empty">No slots yet.</p>
          ) : (
            <div className="rea-admin__table-wrap">
              <table className="rea-admin__table">
                <thead>
                  <tr>
                    {onRemoveSlot && (
                      <th className="rea-admin__th--check">
                        <input
                          type="checkbox"
                          className="rea-admin__checkbox"
                          checked={allSlotsSelected}
                          ref={el => { if (el) el.indeterminate = someSlotsSelected && !allSlotsSelected }}
                          onChange={toggleAllSlots}
                          aria-label="Select all available slots"
                          disabled={deletableSlots.length === 0}
                        />
                      </th>
                    )}
                    <th>Date</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSlots.map(slot => (
                    <tr key={slot.id} className={selectedSlotIds.has(slot.id) ? 'rea-admin__tr--selected' : ''}>
                      {onRemoveSlot && (
                        <td className="rea-admin__td--check">
                          {slot.status === 'available' && (
                            <input
                              type="checkbox"
                              className="rea-admin__checkbox"
                              checked={selectedSlotIds.has(slot.id)}
                              onChange={() => toggleSlot(slot.id)}
                              aria-label={`Select slot ${slot.date} ${slot.startTime}`}
                            />
                          )}
                        </td>
                      )}
                      <td>{slot.date}</td>
                      <td>{slot.startTime}</td>
                      <td>{slot.endTime}</td>
                      <td>
                        {slot.status === 'booked' ? (
                          <span className="rea-admin__badge rea-admin__badge--booked">
                            Booked{slot.bookedByLabel ? ` · ${slot.bookedByLabel}` : ''}
                          </span>
                        ) : (
                          <span className="rea-admin__badge rea-admin__badge--available">Available</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </details>

      {/* Active Appointments */}
      <details className="rea-admin__section" open>
        <summary className="rea-admin__section-summary">
          <span className="rea-admin__section-title">Active Appointments ({confirmedAppts.length})</span>
          <ChevronIcon />
        </summary>
        <div className="rea-admin__section-body">
          {someApptsSelected && onCancelAppointment && (
            <div className="rea-admin__bulk-bar">
              <span className="rea-admin__bulk-count">{selectedApptIds.size} selected</span>
              <button type="button" onClick={cancelSelectedAppts} className="rea-admin__btn-bulk-danger">
                Cancel selected
              </button>
              <button type="button" onClick={() => setSelectedApptIds(new Set())} className="rea-admin__btn-bulk-clear">
                Clear
              </button>
            </div>
          )}
          {confirmedAppts.length === 0 ? (
            <p className="rea-admin__empty">No active appointments.</p>
          ) : (
            <div className="rea-admin__table-wrap">
              <table className="rea-admin__table">
                <thead>
                  <tr>
                    {onCancelAppointment && (
                      <th className="rea-admin__th--check">
                        <input
                          type="checkbox"
                          className="rea-admin__checkbox"
                          checked={allApptsSelected}
                          ref={el => { if (el) el.indeterminate = someApptsSelected && !allApptsSelected }}
                          onChange={toggleAllAppts}
                          aria-label="Select all appointments"
                        />
                      </th>
                    )}
                    <th>User</th>
                    <th>Subject</th>
                    <th>Notes</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {confirmedAppts.map(appt => (
                    <tr key={appt.id} className={selectedApptIds.has(appt.id) ? 'rea-admin__tr--selected' : ''}>
                      {onCancelAppointment && (
                        <td className="rea-admin__td--check">
                          <input
                            type="checkbox"
                            className="rea-admin__checkbox"
                            checked={selectedApptIds.has(appt.id)}
                            onChange={() => toggleAppt(appt.id)}
                            aria-label={`Select appointment ${appt.subject}`}
                          />
                        </td>
                      )}
                      <td>{appt.userLabel}</td>
                      <td>{appt.subject}</td>
                      <td className="rea-admin__td--truncate">{appt.notes || '—'}</td>
                      <td>{appt.durationMinutes}min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </details>

      <QuickGenerateModal open={quickCreateOpen} onClose={() => setQuickCreateOpen(false)} onGenerate={onCreateSlots} />
    </div>
  )

  if (isStandalone) {
    return (
      <div className={`rea-calendar${theme === 'dark' ? ' rea-dark' : ''}`}>
        {content}
      </div>
    )
  }
  return content
}
