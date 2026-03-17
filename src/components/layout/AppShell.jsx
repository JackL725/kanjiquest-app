import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import RadicalsScreen from '@/screens/RadicalsScreen'

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

// Routes where we should NOT navigate away — open tabs as overlays instead
const PROTECTED_ROUTES = ['/study/', '/combo-blitz/', '/memory-test/']

function isProtectedRoute(pathname) {
  return PROTECTED_ROUTES.some(r => pathname.startsWith(r))
}

export default function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const [overlay, setOverlay] = useState(null) // 'radicals' | null

  const onProtected = isProtectedRoute(location.pathname)

  // Close overlay when route changes (user quits study, etc.)
  // We track this by checking if we left the protected route

  function handleTabClick(e, to) {
    // If we're on a study screen, open tabs as overlays instead of navigating
    if (onProtected) {
      e.preventDefault()

      if (to === '/radicals') {
        setOverlay(prev => prev === 'radicals' ? null : 'radicals')
      } else if (to === '/library') {
        // "Library" while studying = close any overlay, stay on study screen
        setOverlay(null)
      } else {
        // Other tabs: just close overlay and stay
        setOverlay(null)
      }
      return
    }

    // Normal navigation when not on a protected route
    if (to === '/library' && location.pathname !== '/library') {
      // Already on a tab page, go back
      e.preventDefault()
      navigate(-1)
      return
    }
    // Default: NavLink handles navigation normally
  }

  return (
    <div className="flex flex-col h-full max-w-md mx-auto relative">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-gold-400/10 shrink-0">
        <button
          onClick={() => { setOverlay(null); navigate('/library') }}
          className="flex items-baseline gap-2 touch-manipulation"
        >
          <span className="font-display italic text-xl text-gold-400 tracking-wide">KanjiQuest</span>
          <span className="font-kanji text-xs text-gold-400/30">漢字</span>
        </button>

        {/* Settings gear */}
        <button
          onClick={() => navigate('/settings')}
          className="w-8 h-8 rounded-full border border-gold-400/20 flex items-center justify-center
                     text-parchment-500/50 hover:text-gold-400 hover:border-gold-400/40
                     transition-colors duration-200 touch-manipulation"
          title="Settings"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="7.5" cy="7.5" r="2.2" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M2.87 2.87l1.06 1.06M11.07 11.07l1.06 1.06M11.07 3.93l-1.06 1.06M4.93 11.07l-1.06 1.06"
                  stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </button>
      </header>

      {/* Screen content */}
      <main className="flex-1 overflow-y-auto relative">
        <Outlet />

        {/* Radicals overlay — renders on TOP of the current screen without unmounting it */}
        {overlay === 'radicals' && (
          <div className="absolute inset-0 z-40 bg-ink-950 overflow-y-auto">
            <RadicalsScreen />
          </div>
        )}
      </main>

      {/* Bottom nav */}
      <nav className="shrink-0 border-t border-gold-400/10 bg-ink-900 relative z-50">
        <div className="flex">
          {NAV.map(({ to, label, icon }) => {
            // Highlight logic: on protected route with overlay, highlight the overlay tab
            const isActive = overlay
              ? (to === '/radicals' && overlay === 'radicals')
              : location.pathname === to || location.pathname.startsWith(to + '/')

            return (
              <button
                key={to}
                onClick={(e) => handleTabClick(e, to)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors duration-200 touch-manipulation ` +
                  (isActive ? 'text-gold-400' : 'text-parchment-500 hover:text-parchment-300')
                }
              >
                {icon}
                <span className="font-mono text-[9px] tracking-widest uppercase">{label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
