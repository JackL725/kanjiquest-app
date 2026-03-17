import { Routes, Route, Navigate } from 'react-router-dom'
import { isOnboardingComplete } from '@/hooks/useOnboarding'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { isGuestMode } from '@/screens/AuthScreen'
import AppShell            from '@/components/layout/AppShell'
import AuthScreen          from '@/screens/AuthScreen'
import OnboardingScreen    from '@/screens/OnboardingScreen'
import PrimerGuideScreen   from '@/screens/PrimerGuideScreen'
import LibraryScreen       from '@/screens/LibraryScreen'
import BrowseScreen        from '@/screens/BrowseScreen'
import ProfileScreen       from '@/screens/ProfileScreen'
import RadicalsScreen      from '@/screens/RadicalsScreen'
import StudyScreen         from '@/screens/StudyScreen'
import ComboBlitzScreen    from '@/screens/ComboBlitzScreen'
import MemoryTestScreen    from '@/screens/MemoryTestScreen'
import DeckScreen          from '@/screens/DeckScreen'
import SettingsScreen      from '@/screens/SettingsScreen'

// ─── Guard: redirect to auth if not signed in and not guest ──────────────
function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center h-full bg-ink-950">
      <div className="flex flex-col items-center gap-4">
        <span className="w-6 h-6 border-2 border-gold-400/30 border-t-gold-400 rounded-full animate-spin" />
        <span className="font-mono text-[10px] text-parchment-500/50 tracking-widest uppercase">Loading...</span>
      </div>
    </div>
  )
  if (!isAuthenticated && !isGuestMode()) {
    return <Navigate to="/auth" replace />
  }
  return children
}

// ─── Guard: redirect to onboarding if not complete ───────────────────────
function RequireOnboarding({ children }) {
  if (!isOnboardingComplete()) {
    return <Navigate to="/onboarding" replace />
  }
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Auth — full-screen, no shell */}
      <Route path="auth" element={<AuthScreen />} />

      {/* Onboarding — no AppShell, full-screen experience */}
      <Route path="onboarding" element={
        <RequireAuth><OnboardingScreen /></RequireAuth>
      } />

      {/* Primer guide — full-screen, protected */}
      <Route path="primer-guide" element={
        <RequireAuth><RequireOnboarding><PrimerGuideScreen /></RequireOnboarding></RequireAuth>
      } />

      {/* Main app — protected by auth + onboarding */}
      <Route
        element={
          <RequireAuth>
            <RequireOnboarding>
              <AppShell />
            </RequireOnboarding>
          </RequireAuth>
        }
      >
        <Route index            element={<Navigate to="/library" replace />} />
        <Route path="library"   element={<LibraryScreen />} />
        <Route path="browse"    element={<BrowseScreen />} />
        <Route path="profile"   element={<ProfileScreen />} />
        <Route path="radicals"  element={<RadicalsScreen />} />
        <Route path="settings"  element={<SettingsScreen />} />
        <Route path="deck/:id"  element={<DeckScreen />} />
        <Route path="study/:id" element={<StudyScreen />} />
        <Route path="combo-blitz/:id" element={<ComboBlitzScreen />} />
        <Route path="memory-test/:id" element={<MemoryTestScreen />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
