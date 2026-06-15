import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type StoredSlot = {
  id: string
  date: string
  startTime: string
  endTime: string
  isBooked: boolean
  bookedByUserId?: string
  bookedByLabel?: string
}

export type StoredAppointment = {
  id: string
  slotId: string
  userId: string
  userLabel: string
  subject: string
  notes: string
  durationMinutes: number
  status: 'confirmed' | 'cancelled'
}

type AppStore = {
  slots: StoredSlot[]
  appointments: StoredAppointment[]
  createSlot: (date: string, startTime: string, endTime: string) => boolean
  createSlots: (newSlots: { date: string; startTime: string; endTime: string }[]) => void
  removeSlot: (id: string) => void
  bookSlot: (
    slotId: string,
    userId: string,
    userLabel: string,
    subject: string,
    notes: string,
    durationMinutes: number,
  ) => void
  cancelAppointment: (id: string) => void
}

function seedSlots(): StoredSlot[] {
  const slots: StoredSlot[] = []
  const times = [
    { startTime: '09:00', endTime: '10:00' },
    { startTime: '11:00', endTime: '12:00' },
    { startTime: '14:00', endTime: '15:00' },
  ]
  let dayOffset = 1
  while (slots.length < 12 && dayOffset <= 30) {
    const d = new Date()
    d.setDate(d.getDate() + dayOffset)
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) {
      const dateStr = d.toISOString().split('T')[0]
      for (const t of times) {
        slots.push({ id: crypto.randomUUID(), date: dateStr, ...t, isBooked: false })
        if (slots.length >= 12) break
      }
    }
    dayOffset++
  }
  return slots
}

function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

function slotsOverlap(
  slot1: { startTime: string; endTime: string },
  slot2: { startTime: string; endTime: string }
): boolean {
  const start1 = timeToMinutes(slot1.startTime)
  const end1 = timeToMinutes(slot1.endTime)
  const start2 = timeToMinutes(slot2.startTime)
  const end2 = timeToMinutes(slot2.endTime)
  return start1 < end2 && start2 < end1
}

export const useAppStore = create<AppStore>()(
  persist(
    set => ({
      slots: seedSlots(),
      appointments: [],

      createSlot: (date, startTime, endTime) => {
        let success = true
        set(s => {
          const hasOverlap = s.slots.some(
            sl => sl.date === date && slotsOverlap(sl, { startTime, endTime })
          )
          if (hasOverlap) {
            success = false
            return {}
          }
          return {
            slots: [
              ...s.slots,
              { id: crypto.randomUUID(), date, startTime, endTime, isBooked: false },
            ],
          }
        })
        return success
      },

      createSlots: (newSlots) =>
        set(s => {
          const currentSlots = s.slots
          const slotsToAdd: StoredSlot[] = []

          for (const newSl of newSlots) {
            const hasOverlap =
              currentSlots.some(
                c => c.date === newSl.date && slotsOverlap(c, newSl)
              ) ||
              slotsToAdd.some(
                a => a.date === newSl.date && slotsOverlap(a, newSl)
              )

            if (!hasOverlap) {
              slotsToAdd.push({
                id: crypto.randomUUID(),
                date: newSl.date,
                startTime: newSl.startTime,
                endTime: newSl.endTime,
                isBooked: false,
              })
            }
          }

          return { slots: [...s.slots, ...slotsToAdd] }
        }),

      removeSlot: (id) =>
        set(s => ({
          slots: s.slots.filter(sl => sl.id !== id || sl.isBooked),
        })),

      bookSlot: (slotId, userId, userLabel, subject, notes, durationMinutes) =>
        set(s => {
          if (s.slots.find(sl => sl.id === slotId)?.isBooked) return s
          return {
            slots: s.slots.map(sl =>
              sl.id === slotId
                ? { ...sl, isBooked: true, bookedByUserId: userId, bookedByLabel: userLabel }
                : sl,
            ),
            appointments: [
              ...s.appointments,
              {
                id: crypto.randomUUID(),
                slotId,
                userId,
                userLabel,
                subject,
                notes,
                durationMinutes,
                status: 'confirmed',
              },
            ],
          }
        }),

      cancelAppointment: (id) =>
        set(s => {
          const appt = s.appointments.find(a => a.id === id)
          return {
            appointments: s.appointments.map(a =>
              a.id === id ? { ...a, status: 'cancelled' } : a,
            ),
            slots: s.slots.map(sl =>
              sl.id === appt?.slotId
                ? { ...sl, isBooked: false, bookedByUserId: undefined, bookedByLabel: undefined }
                : sl,
            ),
          }
        }),
    }),
    { name: 'rea-demo' },
  ),
)

// Force persistence of the initial seeded state on first run
if (typeof window !== 'undefined' && !localStorage.getItem('rea-demo')) {
  useAppStore.setState({ slots: useAppStore.getState().slots })
}
