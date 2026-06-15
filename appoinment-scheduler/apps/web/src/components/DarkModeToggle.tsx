import { useThemeStore } from '../store/themeStore'

export function DarkModeToggle() {
  const { isDark, toggleTheme } = useThemeStore()

  const base = isDark
    ? 'bg-[#0c1322] border-white/10 shadow-black/50 text-white'
    : 'bg-white border-gray-300 shadow-black/10 text-gray-900'

  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <div className={`border shadow-2xl overflow-hidden transition-all duration-200 ${base}`}>
      <button
        onClick={toggleTheme}
        aria-label={label}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-black/5 transition-colors"
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest opacity-75">
          {isDark ? 'Dark Mode' : 'Light Mode'}
        </span>
        {isDark ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>
    </div>
  )
}
