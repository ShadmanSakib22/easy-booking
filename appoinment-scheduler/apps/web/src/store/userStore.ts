import { create } from 'zustand'

export type AppUser = { id: string; label: string; role: 'user' | 'admin' }

const USERS: AppUser[] = [
  { id: 'user1', label: 'Test User 1', role: 'user' },
  { id: 'user2', label: 'Test User 2', role: 'user' },
  { id: 'admin', label: 'Admin', role: 'admin' },
]

type UserStore = {
  activeUser: AppUser
  users: AppUser[]
  setActiveUser: (id: string) => void
}

export const useUserStore = create<UserStore>(set => ({
  activeUser: USERS[0],
  users: USERS,
  setActiveUser: id => set({ activeUser: USERS.find(u => u.id === id)! }),
}))
