import { Outlet, NavLink, useLocation } from 'react-router-dom'

const NAV = [
  {
    to: '/library',
    label: 'Library',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="3" width="5" height="14" rx="1" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="8.5" y="3" width="5" height="14" rx="1" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M15.5 5l2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    to: '/browse',
    label: 'Browse',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    to: '/radicals',
    label: 'Radicals',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2v16M2 10h16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.4"/>
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
]

export default function AppShell() {
  return (
    <div className="flex flex-col h-full max-w-md mx-auto relative">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-gold-400/10 shrink-0">
        <div className="flex items-baseline gap-2">
          <span className="font-display italic text-xl text-gold-400 tracking-wide">KanjiQuest</span>
          <span className="font-kanji text-xs text-gold-400/30">漢字</span>
        </div>
        <div className="w-8 h-8 rounded-full border border-gold-400/30 flex items-center justify-center
                        font-kanji text-sm text-gold-400">
          侍
        </div>
      </header>

      {/* Screen content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="shrink-0 border-t border-gold-400/10 bg-ink-900">
        <div className="flex">
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-3 transition-colors duration-200 ` +
                (isActive
                  ? 'text-gold-400'
                  : 'text-parchment-500 hover:text-parchment-300')
              }
            >
              {icon}
              <span className="font-mono text-[9px] tracking-widest uppercase">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
