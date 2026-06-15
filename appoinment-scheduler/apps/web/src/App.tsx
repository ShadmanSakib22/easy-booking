import { useEffect, useState } from 'react'
import { Calendar } from 'react-easy-appointments'
import 'react-easy-appointments/styles'
import type { Slot, BookingFormData } from 'react-easy-appointments'
import { useAppStore } from './store/appStore'
import { useUserStore } from './store/userStore'
import { useThemeStore } from './store/themeStore'
import { UserSwitcher } from './components/UserSwitcher'
import { DarkModeToggle } from './components/DarkModeToggle'

export default function App() {
  const { activeUser } = useUserStore()
  const { slots: storedSlots, appointments, bookSlot, cancelAppointment, createSlot, createSlots, removeSlot } = useAppStore()
  const { isDark } = useThemeStore()
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [weekHourStart, setWeekHourStart] = useState(7)
  const [weekHourEnd, setWeekHourEnd] = useState(20)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  const slots: Slot[] = storedSlots.map(s => ({
    id: s.id,
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime,
    status: s.isBooked ? 'booked' : 'available',
    bookedByLabel: s.bookedByLabel,
  }))

  const myAppointments = appointments.filter(
    a => a.userId === activeUser.id && a.status === 'confirmed',
  )

  function handleSlotClick(slot: Slot) {
    if (slot.status !== 'available') return
    setSelectedSlot(slot)
    setModalOpen(true)
  }

  function handleBook(slot: Slot, data: BookingFormData) {
    bookSlot(slot.id, activeUser.id, activeUser.label, data.subject, data.notes, data.durationMinutes)
    setModalOpen(false)
    setSelectedSlot(null)
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <div className="fixed bottom-5 right-5 z-50 w-[160px] space-y-2">
        <DarkModeToggle />
        <UserSwitcher />
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Admin Panel — standalone, full width, outside Calendar */}
        {activeUser.role === 'admin' && (
          <Calendar.AdminPanel
            slots={slots}
            theme={isDark ? 'dark' : 'light'}
            weekHourStart={weekHourStart}
            weekHourEnd={weekHourEnd}
            appointments={appointments}
            onCreateSlot={createSlot}
            onCreateSlots={createSlots}
            onRemoveSlot={removeSlot}
            onCancelAppointment={cancelAppointment}
            onWeekHourStartChange={setWeekHourStart}
            onWeekHourEndChange={setWeekHourEnd}
          />
        )}

        {/* Calendar */}
        <div className="w-full overflow-x-auto">
          <div className="min-w-3xl">
            <Calendar
              slots={slots}
              onSlotClick={handleSlotClick}
              onBook={handleBook}
              defaultView="month"
              theme={isDark ? 'dark' : 'light'}
              weekHourStart={weekHourStart}
              weekHourEnd={weekHourEnd}
            >
              <Calendar.Toolbar />
              <Calendar.MonthView />
              <Calendar.WeekView />
              <Calendar.BookingModal
                slot={selectedSlot}
                open={modalOpen}
                onClose={() => { setModalOpen(false); setSelectedSlot(null) }}
              />
            </Calendar>
          </div>
        </div>

        {/* My Appointments sidebar */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider px-1">
            My Appointments
          </h2>

          {myAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-gray-500 dark:text-gray-400">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <p className="text-sm">No appointments yet</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {myAppointments.map(appt => {
                const slot = storedSlots.find(s => s.id === appt.slotId)
                return (
                  <li
                    key={appt.id}
                    className="group relative bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 border-l-[3px] border-l-green-700 p-[14px_16px] space-y-1"
                  >
                    <button
                      onClick={() => cancelAppointment(appt.id)}
                      aria-label="Cancel appointment"
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-lg leading-none font-bold"
                    >
                      ×
                    </button>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white pr-5">{appt.subject}</p>
                    {slot && (
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        {slot.date} · {slot.startTime}–{slot.endTime}
                      </p>
                    )}
                    <span className="inline-block text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5">
                      {appt.durationMinutes}min
                    </span>
                    {appt.notes && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 italic">{appt.notes}</p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

      </main>
    </div>
  )
}
