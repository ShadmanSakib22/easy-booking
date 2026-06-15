import { useState } from 'react'
import { useOptionalCalendarContext } from '../Calendar/CalendarContext'

type Props = {
  open: boolean
  onClose: () => void
  onGenerate: (slots: { date: string; startTime: string; endTime: string }[]) => void
  defaultDuration?: number
  defaultStartTime?: string
  defaultEndTime?: string
}

const DURATIONS = [
  { label: '15m', value: 15 },
  { label: '30m', value: 30 },
  { label: '45m', value: 45 },
  { label: '1h', value: 60 },
  { label: '1.5h', value: 90 },
  { label: '2h', value: 120 },
]

export function QuickGenerateModal({
  open,
  onClose,
  onGenerate,
  defaultDuration = 30,
  defaultStartTime = '08:00',
  defaultEndTime = '18:00',
}: Props) {
  const { headless = false } = useOptionalCalendarContext() ?? {}

  const [startDate, setStartDate] = useState(getFutureDateString(1))
  const [endDate, setEndDate] = useState(getFutureDateString(7))
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [startTime, setStartTime] = useState(defaultStartTime)
  const [endTime, setEndTime] = useState(defaultEndTime)
  const [duration, setDuration] = useState(defaultDuration)

  if (!open) return null

  function toggleDay(dayIdx: number) {
    setSelectedDays(prev =>
      prev.includes(dayIdx) ? prev.filter(d => d !== dayIdx) : [...prev, dayIdx]
    )
  }

  function handleDurationInput(val: string) {
    const n = parseInt(val, 10)
    if (!isNaN(n) && n > 0) setDuration(n)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!startDate || !endDate || !startTime || !endTime || selectedDays.length === 0) return
    const generated = generateSlotsList(startDate, endDate, selectedDays, startTime, endTime, duration)
    onGenerate(generated)
    onClose()
  }

  return (
    <div
      className={headless ? undefined : 'rea-modal-backdrop'}
      role="dialog"
      aria-modal="true"
      aria-label="Quick generate slots"
    >
      <div className={headless ? undefined : 'rea-modal'}>
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className={headless ? undefined : 'rea-modal__close'}
          aria-label="Close"
        >
          {headless ? '×' : (
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          )}
        </button>

        <h2 className={headless ? undefined : 'rea-modal__title'}>Quick Generate Slots</h2>

        <form onSubmit={handleSubmit} className={headless ? undefined : 'rea-modal__form'}>
          {/* Date range */}
          <div className={headless ? undefined : 'rea-modal__grid-2'}>
            <label className={headless ? undefined : 'rea-modal__label'}>
              Start Date
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                required
                className={headless ? undefined : 'rea-modal__input'}
              />
            </label>
            <label className={headless ? undefined : 'rea-modal__label'}>
              End Date
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                required
                className={headless ? undefined : 'rea-modal__input'}
              />
            </label>
          </div>

          {/* Repeat days */}
          <div className={headless ? undefined : 'rea-modal__label'}>
            Repeat Days
            <div className={headless ? undefined : 'rea-modal__days-grid'}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => {
                const active = selectedDays.includes(idx)
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    aria-pressed={active}
                    className={
                      headless
                        ? undefined
                        : `rea-modal__day-btn${active ? ' rea-modal__day-btn--active' : ''}`
                    }
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Time range */}
          <div className={headless ? undefined : 'rea-modal__grid-2'}>
            <label className={headless ? undefined : 'rea-modal__label'}>
              From
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                required
                className={headless ? undefined : 'rea-modal__input'}
              />
            </label>
            <label className={headless ? undefined : 'rea-modal__label'}>
              Until
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                required
                className={headless ? undefined : 'rea-modal__input'}
              />
            </label>
          </div>

          {/* Duration — segmented presets + custom number input */}
          <div className={headless ? undefined : 'rea-modal__label'}>
            Slot Duration
            {headless ? (
              <input
                type="number"
                min={1}
                value={duration}
                onChange={e => handleDurationInput(e.target.value)}
              />
            ) : (
              <>
                <div className="rea-modal__duration-track" role="group" aria-label="Slot duration presets">
                  {DURATIONS.map(({ label, value }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDuration(value)}
                      aria-pressed={duration === value}
                      className={`rea-modal__duration-btn${duration === value ? ' rea-modal__duration-btn--active' : ''}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="rea-modal__duration-custom">
                  <input
                    type="number"
                    min={1}
                    max={480}
                    value={duration}
                    onChange={e => handleDurationInput(e.target.value)}
                    aria-label="Custom duration in minutes"
                    className="rea-modal__input rea-modal__input--custom-duration"
                  />
                  <span className="rea-modal__duration-unit">min</span>
                </div>
              </>
            )}
          </div>

          {/* Generate button */}
          <button type="submit" className={headless ? undefined : 'rea-modal__btn-generate'}>
            Generate Slots
          </button>
          <div className={headless ? undefined : 'rea-modal__actions'}>
            <button
              type="button"
              onClick={onClose}
              className={headless ? undefined : 'rea-modal__btn-cancel'}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function getFutureDateString(daysOffset: number) {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function generateSlotsList(
  startDateStr: string,
  endDateStr: string,
  selectedDays: number[],
  startDayTime: string,
  endDayTime: string,
  slotDuration: number
) {
  const generated: { date: string; startTime: string; endTime: string }[] = []
  const start = new Date(startDateStr + 'T00:00:00')
  const end = new Date(endDateStr + 'T00:00:00')
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return []

  const current = new Date(start)
  while (current <= end) {
    const dayOfWeek = current.getDay()
    if (selectedDays.includes(dayOfWeek)) {
      const year = current.getFullYear()
      const month = String(current.getMonth() + 1).padStart(2, '0')
      const day = String(current.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`

      const [sh, sm] = startDayTime.split(':').map(Number)
      const [eh, em] = endDayTime.split(':').map(Number)

      let currentMinutes = sh * 60 + sm
      const endMinutes = eh * 60 + em

      while (currentMinutes + slotDuration <= endMinutes) {
        const chunkStartMin = currentMinutes
        const chunkEndMin = currentMinutes + slotDuration
        const shStr = String(Math.floor(chunkStartMin / 60)).padStart(2, '0')
        const smStr = String(chunkStartMin % 60).padStart(2, '0')
        const ehStr = String(Math.floor(chunkEndMin / 60)).padStart(2, '0')
        const emStr = String(chunkEndMin % 60).padStart(2, '0')
        generated.push({ date: dateStr, startTime: `${shStr}:${smStr}`, endTime: `${ehStr}:${emStr}` })
        currentMinutes += slotDuration
      }
    }
    current.setDate(current.getDate() + 1)
  }
  return generated
}
