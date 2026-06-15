import { useState } from 'react'
import { useUserStore } from '../store/userStore'
import { useThemeStore } from '../store/themeStore'

export function UserSwitcher() {
  const { users, activeUser, setActiveUser } = useUserStore()
  const { isDark } = useThemeStore()
  const [expanded, setExpanded] = useState(true)

  const base = isDark
    ? 'bg-[#0c1322] border-white/10 shadow-black/50 text-white'
    : 'bg-white border-gray-300 shadow-black/10 text-gray-900'

  const headerBorder = isDark ? 'border-white/[0.07]' : 'border-gray-200'
  const chevronColor = isDark ? 'text-gray-400' : 'text-gray-500'

  return (
    <div className={`border shadow-2xl overflow-hidden transition-all duration-200 ${base}`}>
      {/* Header — always visible, click to toggle */}
      <button
        onClick={() => setExpanded(v => !v)}
        className={`w-full flex items-center justify-between px-3 py-2.5 border-b ${headerBorder} transition-colors hover:bg-black/5`}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse user switcher' : 'Expand user switcher'}
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest opacity-75">
          Active User
        </span>
        {/* Chevron */}
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${chevronColor} ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {/* User list — collapsible */}
      {expanded && (
        <div className="flex flex-col p-1 gap-0.5">
          {users.map(user => {
            const isActive = activeUser.id === user.id
            const initials = user.label.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

            const rowActive = isDark
              ? 'bg-indigo-600/20 text-white'
              : 'bg-indigo-50 text-indigo-900'
            const rowIdle = isDark
              ? 'text-gray-300 hover:bg-white/[0.05] hover:text-gray-200'
              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            const avatarActive = 'bg-indigo-500 text-white'
            const avatarIdle = isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-200 text-gray-600'

            return (
              <button
                key={user.id}
                onClick={() => setActiveUser(user.id)}
                title={user.label}
                className={`flex items-center gap-2.5 px-2.5 py-2 text-left transition-colors w-full ${isActive ? rowActive : rowIdle}`}
              >
                <span className={`flex-shrink-0 w-6 h-6 flex items-center justify-center text-[10px] font-bold ${isActive ? avatarActive : avatarIdle}`}>
                  {initials}
                </span>
                <span className="text-sm font-medium leading-none">{user.label}</span>
                {isActive && (
                  <span className={`ml-auto w-1.5 h-1.5 ${isDark ? 'bg-indigo-400' : 'bg-indigo-600'} flex-shrink-0`} />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
