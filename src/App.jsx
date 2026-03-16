import { Routes, Route, Navigate } from 'react-router-dom'
import { isOnboardingComplete } from '@/hooks/useOnboarding'
import AppShell         from '@/components/layout/AppShell'
import OnboardingScreen from '@/screens/OnboardingScreen'
import LibraryScreen    from '@/screens/LibraryScreen'
import BrowseScreen     from '@/screens/BrowseScreen'
import ProfileScreen    from '@/screens/ProfileScreen'
import RadicalsScreen   from '@/screens/RadicalsScreen'
import StudyScreen      from '@/screens/StudyScreen'
import DeckScreen       from '@/screens/DeckScreen'
import SettingsScreen   from '@/screens/SettingsScreen'

// ─── Guard: redirect to onboarding if not complete ───────────────────────
function RequireOnboarding({ children }) {
  if (!isOnboardingComplete()) {
    return <Navigate to="/onboarding" replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      {/* Onboarding — no AppShell, full-screen experience */}
      <Route path="onboarding" element={<OnboardingScreen />} />

      {/* Main app — protected by onboarding guard */}
      <Route
        element={
          <RequireOnboarding>
            <AppShell />
          </RequireOnboarding>
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
      </Route>
    </Routes>
  )
}
