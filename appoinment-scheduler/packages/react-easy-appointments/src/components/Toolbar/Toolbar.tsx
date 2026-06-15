import { format } from 'date-fns'
import { useCalendarContext } from '../Calendar/CalendarContext'

export function Toolbar() {
  const { view, setView, currentDate, goToPrev, goToNext, goToToday, headless } =
    useCalendarContext()

  const title =
    view === 'month'
      ? format(currentDate, 'MMMM yyyy')
      : `Week of ${format(currentDate, 'MMM d, yyyy')}`

  if (headless) {
    return (
      <div>
        <div>
          <button onClick={goToPrev} aria-label="Previous">‹</button>
          <button onClick={goToToday}>Today</button>
          <button onClick={goToNext} aria-label="Next">›</button>
        </div>
        <span>{title}</span>
        <div>
          <button
            onClick={() => setView('month')}
            aria-pressed={view === 'month'}
            aria-label="Month view"
          >
            Month
          </button>
          <button
            onClick={() => setView('week')}
            aria-pressed={view === 'week'}
            aria-label="Week view"
          >
            Week
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rea-toolbar">
      {/* Nav cluster */}
      <div className="rea-toolbar__nav">
        <button
          className="rea-toolbar__btn rea-toolbar__btn--nav"
          onClick={goToPrev}
          aria-label="Previous"
        >
          <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button className="rea-toolbar__btn" onClick={goToToday} aria-label="Today">
          Today
        </button>
        <button
          className="rea-toolbar__btn rea-toolbar__btn--nav"
          onClick={goToNext}
          aria-label="Next"
        >
          <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Title */}
      <span className="rea-toolbar__title">{title}</span>

      {/* Segmented view control */}
      <div className="rea-toolbar__views" role="group" aria-label="Calendar view">
        <button
          className={`rea-toolbar__view-btn${view === 'month' ? ' rea-toolbar__view-btn--active' : ''}`}
          onClick={() => setView('month')}
          aria-pressed={view === 'month'}
          aria-label="Month view"
        >
          Month
        </button>
        <button
          className={`rea-toolbar__view-btn${view === 'week' ? ' rea-toolbar__view-btn--active' : ''}`}
          onClick={() => setView('week')}
          aria-pressed={view === 'week'}
          aria-label="Week view"
        >
          Week
        </button>
      </div>
    </div>
  )
}