import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ThemeStore = {
  isDark: boolean
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      isDark: true,
      toggleTheme: () => set(state => ({ isDark: !state.isDark })),
    }),
    { name: 'rea-demo-theme' }
  )
)
